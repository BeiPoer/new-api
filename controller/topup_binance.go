package controller

import (
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/thanhpk/randstr"
)

func isBinancePayTopUpEnabled(userID int, cfg setting.BinancePayConfig) bool {
	return isPaymentComplianceConfirmed() && cfg.Enabled && cfg.Configured() && cfg.AllowsUser(userID)
}

func binancePayQuote(c *gin.Context, cfg setting.BinancePayConfig) (*model.TopUp, error) {
	if !isBinancePayTopUpEnabled(c.GetInt("id"), cfg) {
		return nil, errors.New("Binance Pay is not available for this user")
	}
	var req AmountRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		return nil, errors.New("参数错误")
	}
	amount := req.Amount
	if common.QuotaPerUnit <= 0 || math.IsNaN(common.QuotaPerUnit) || math.IsInf(common.QuotaPerUnit, 0) {
		return nil, errors.New("invalid quota conversion rate")
	}
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		// Store exactly the quantity that will be credited, as other wallet
		// top-ups do; discard fractional balance units before quoting payment.
		amount = decimal.NewFromInt(req.Amount).Div(decimal.NewFromFloat(common.QuotaPerUnit)).IntPart()
	}
	if amount < int64(cfg.MinTopUp) {
		return nil, fmt.Errorf("充值数量不能小于 %d", cfg.MinTopUp)
	}
	quota, err := common.WalletQuotaFromDecimalStrict(decimal.NewFromInt(amount).Mul(decimal.NewFromFloat(common.QuotaPerUnit)))
	if err != nil || quota <= 0 {
		return nil, errors.New("充值数量无效")
	}
	userID := c.GetInt("id")
	if err := model.ValidateTopUpQuotaCapacity(userID, quota); err != nil {
		return nil, err
	}
	group, err := model.GetUserGroup(userID, true)
	if err != nil {
		return nil, errors.New("获取用户分组失败")
	}
	ratio := common.GetTopupGroupRatio(group)
	if ratio == 0 {
		ratio = 1
	}
	discount := 1.0
	if value, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(req.Amount)]; ok && value > 0 {
		discount = value
	}
	for _, value := range []float64{cfg.UnitPrice, ratio, discount} {
		if value <= 0 || math.IsNaN(value) || math.IsInf(value, 0) {
			return nil, errors.New("invalid Binance Pay price configuration")
		}
	}
	money := decimal.NewFromInt(amount).Mul(decimal.NewFromFloat(cfg.UnitPrice)).
		Mul(decimal.NewFromFloat(ratio)).Mul(decimal.NewFromFloat(discount)).Round(2)
	// Avoid converting amounts beyond the wallet's exact numeric domain.
	if money.LessThan(decimal.NewFromFloat(0.01)) || money.GreaterThan(decimal.NewFromInt(common.MaxWalletQuota).Div(decimal.NewFromInt(100))) {
		return nil, errors.New("invalid Binance Pay payment amount")
	}
	if !decimal.NewFromFloat(money.InexactFloat64()).Equal(money) {
		return nil, errors.New("Binance Pay payment amount exceeds supported precision")
	}
	return &model.TopUp{
		UserId:          userID,
		Amount:          amount,
		Money:           money.InexactFloat64(),
		PaymentMethod:   model.PaymentMethodBinancePay,
		PaymentProvider: model.PaymentProviderBinancePay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}, nil
}

func RequestBinancePayAmount(c *gin.Context) {
	quote, err := binancePayQuote(c, setting.GetBinancePayConfig())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, decimal.NewFromFloat(quote.Money).StringFixed(2))
}

func RequestBinancePay(c *gin.Context) {
	cfg := setting.GetBinancePayConfig()
	quote, err := binancePayQuote(c, cfg)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	webhookURL := strings.TrimRight(service.GetCallbackAddress(), "/") + "/api/binance-pay/webhook"
	returnURL := strings.TrimRight(system_setting.ServerAddress, "/") + "/wallet"
	for _, address := range []string{webhookURL, returnURL} {
		parsed, err := url.Parse(address)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil || len(address) > 256 {
			common.ApiErrorMsg(c, "Binance Pay requires HTTPS server and callback addresses")
			return
		}
	}
	quote.TradeNo = "BP" + randstr.Hex(30)
	if err := quote.Insert(); err != nil {
		common.ApiErrorMsg(c, "创建订单失败")
		return
	}
	client := service.BinancePayClient{APIKey: cfg.APIKey, SecretKey: cfg.SecretKey}
	checkout, err := client.CreateCheckout(c.Request.Context(), quote.TradeNo, decimal.NewFromFloat(quote.Money), webhookURL, returnURL)
	if err != nil {
		// An upstream timeout may follow successful order creation. Leave the
		// order pending so a verified payment notification can still settle it.
		logger.LogError(c.Request.Context(), fmt.Sprintf("Binance Pay checkout failed user_id=%d trade_no=%s error=%q", quote.UserId, quote.TradeNo, err.Error()))
		common.ApiErrorMsg(c, "拉起支付失败")
		return
	}
	common.ApiSuccess(c, gin.H{"pay_link": checkout.CheckoutURL, "order_id": quote.TradeNo})
}

func BinancePayWebhook(c *gin.Context) {
	cfg := setting.GetBinancePayConfig()
	// An already-paid order must still settle if its user is removed from
	// the allowlist or new checkouts are disabled in the meantime.
	if !cfg.Configured() || !isPaymentComplianceConfirmed() {
		c.JSON(http.StatusForbidden, gin.H{"returnCode": "FAIL"})
		return
	}
	const maxBodyBytes = 1 << 20
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, maxBodyBytes+1))
	if err != nil || len(body) > maxBodyBytes {
		c.JSON(http.StatusBadRequest, gin.H{"returnCode": "FAIL"})
		return
	}
	client := service.BinancePayClient{APIKey: cfg.APIKey, SecretKey: cfg.SecretKey}
	notification, err := client.VerifyNotification(c.Request.Context(), c.Request.Header, body)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Binance Pay webhook rejected error=%q", err.Error()))
		c.JSON(http.StatusUnauthorized, gin.H{"returnCode": "FAIL"})
		return
	}
	if notification.BizType != "PAY" {
		c.JSON(http.StatusBadRequest, gin.H{"returnCode": "FAIL"})
		return
	}
	if notification.BizStatus != "PAY_SUCCESS" {
		c.JSON(http.StatusOK, gin.H{"returnCode": "SUCCESS"})
		return
	}
	var payment service.BinancePayPayment
	if err := common.UnmarshalJsonStr(notification.Data, &payment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"returnCode": "FAIL"})
		return
	}
	if err := model.RechargeBinancePay(payment.MerchantTradeNo, payment.Currency, payment.TotalFee, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Binance Pay settlement failed trade_no=%s error=%q", payment.MerchantTradeNo, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"returnCode": "FAIL"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"returnCode": "SUCCESS"})
}
