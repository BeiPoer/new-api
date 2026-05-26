package controller

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

const (
	PaymentMethodEnterpriseAlipay    = "enterprise_alipay"
	PaymentMethodEnterpriseAlipayCNY = "enterprise_alipay_cny"
	alipayCharset                    = "utf-8"
	alipaySignType                   = "RSA2"
	alipayVersion                    = "1.0"
	alipayMethodPrecreate            = "alipay.trade.precreate"
	alipayMethodPagePay              = "alipay.trade.page.pay"
	alipayGatewayURL                 = "https://openapi.alipay.com/gateway.do"
	alipayProductCodePrecreate       = "FACE_TO_FACE_PAYMENT"
	alipayProductCodePagePay         = "FAST_INSTANT_TRADE_PAY"
	alipayPayModeQRCode              = "qrcode"
	alipayPayModePagePay             = "page_pay"
	alipayResponseCodeSuccess        = "10000"
	alipayTradeStatusSuccess         = "TRADE_SUCCESS"
	alipayTradeStatusFinished        = "TRADE_FINISHED"
	alipayTradeStatusClosed          = "TRADE_CLOSED"
)

var alipayHTTPClient = &http.Client{Timeout: 15 * time.Second}

type alipayClient struct {
	appID      string
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	gatewayURL string
}

type alipayPagePayArgs struct {
	OutTradeNo  string
	Subject     string
	TotalAmount float64
	NotifyURL   string
	ReturnURL   string
	Body        string
}

type alipayPayLaunch struct {
	PayMode string            `json:"pay_mode"`
	QRCode  string            `json:"qr_code,omitempty"`
	URL     string            `json:"url,omitempty"`
	Data    map[string]string `json:"data,omitempty"`
}

type alipayPrecreateResponse struct {
	AlipayTradePrecreateResponse struct {
		Code       string `json:"code"`
		Msg        string `json:"msg"`
		SubCode    string `json:"sub_code"`
		SubMsg     string `json:"sub_msg"`
		OutTradeNo string `json:"out_trade_no"`
		QRCode     string `json:"qr_code"`
	} `json:"alipay_trade_precreate_response"`
	ErrorResponse struct {
		Code    string `json:"code"`
		Msg     string `json:"msg"`
		SubCode string `json:"sub_code"`
		SubMsg  string `json:"sub_msg"`
	} `json:"error_response"`
	Sign string `json:"sign"`
}

type alipayVerifyInfo struct {
	OutTradeNo  string
	TradeNo     string
	TradeStatus string
	TotalAmount float64
	AppID       string
	BuyerID     string
	RawParams   map[string]string
}

func isAlipayEnabled() bool {
	return setting.AlipayEnabled &&
		strings.TrimSpace(setting.AlipayAppID) != "" &&
		strings.TrimSpace(setting.AlipayPrivateKey) != "" &&
		strings.TrimSpace(setting.AlipayPublicKey) != ""
}

func GetAlipayClient() (*alipayClient, error) {
	if !isAlipayEnabled() {
		return nil, nil
	}

	privateKey, err := parseAlipayPrivateKey(setting.AlipayPrivateKey)
	if err != nil {
		return nil, err
	}
	publicKey, err := parseAlipayPublicKey(setting.AlipayPublicKey)
	if err != nil {
		return nil, err
	}

	return &alipayClient{
		appID:      strings.TrimSpace(setting.AlipayAppID),
		privateKey: privateKey,
		publicKey:  publicKey,
		gatewayURL: alipayGatewayURL,
	}, nil
}

func (c *alipayClient) BuildDesktopPayLaunch(ctx context.Context, args *alipayPagePayArgs) (*alipayPayLaunch, error) {
	tradeNo, totalAmount := getAlipayLaunchLogFields(args)
	qrCode, precreateErr := c.BuildPrecreateQRCode(ctx, args)
	if precreateErr == nil {
		logger.LogInfo(ctx, fmt.Sprintf("Alipay precreate succeeded trade_no=%s amount=%.2f", tradeNo, totalAmount))
		return &alipayPayLaunch{
			PayMode: alipayPayModeQRCode,
			QRCode:  qrCode,
			Data:    map[string]string{},
		}, nil
	}

	logger.LogWarn(ctx, fmt.Sprintf("Alipay precreate failed, fallback to page.pay trade_no=%s amount=%.2f error=%q", tradeNo, totalAmount, precreateErr.Error()))
	gatewayURL, params, pagePayErr := c.BuildPagePayParams(args)
	if pagePayErr == nil {
		return &alipayPayLaunch{
			PayMode: alipayPayModePagePay,
			QRCode:  gatewayURL,
			URL:     gatewayURL,
			Data:    params,
		}, nil
	}

	logger.LogError(ctx, fmt.Sprintf("Alipay page.pay fallback failed trade_no=%s amount=%.2f error=%q", tradeNo, totalAmount, pagePayErr.Error()))
	return nil, fmt.Errorf("alipay desktop payment failed: precreate=%v; pagepay=%w", precreateErr, pagePayErr)
}

func (c *alipayClient) BuildPrecreateQRCode(ctx context.Context, args *alipayPagePayArgs) (string, error) {
	if c == nil {
		return "", fmt.Errorf("alipay client is nil")
	}
	if args == nil ||
		strings.TrimSpace(args.OutTradeNo) == "" ||
		strings.TrimSpace(args.Subject) == "" ||
		args.TotalAmount < 0.01 {
		return "", fmt.Errorf("invalid alipay precreate args")
	}
	if ctx == nil {
		ctx = context.Background()
	}

	bizContent := map[string]string{
		"out_trade_no": args.OutTradeNo,
		"product_code": alipayProductCodePrecreate,
		"subject":      args.Subject,
		"total_amount": formatAlipayMoney(args.TotalAmount),
	}
	if strings.TrimSpace(args.Body) != "" {
		bizContent["body"] = args.Body
	}
	bizContentJSON, err := common.Marshal(bizContent)
	if err != nil {
		return "", err
	}

	params := map[string]string{
		"app_id":      c.appID,
		"biz_content": string(bizContentJSON),
		"charset":     alipayCharset,
		"format":      "JSON",
		"method":      alipayMethodPrecreate,
		"sign_type":   alipaySignType,
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     alipayVersion,
	}
	if strings.TrimSpace(args.NotifyURL) != "" {
		params["notify_url"] = args.NotifyURL
	}

	sign, err := c.sign(params)
	if err != nil {
		return "", err
	}
	params["sign"] = sign

	form := url.Values{}
	for key, value := range params {
		if strings.TrimSpace(value) != "" {
			form.Set(key, value)
		}
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.gatewayURL,
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded;charset="+alipayCharset)

	resp, err := alipayHTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("alipay precreate http status: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var result alipayPrecreateResponse
	if err := common.Unmarshal(bodyBytes, &result); err != nil {
		return "", fmt.Errorf("alipay precreate decode failed: %w body=%s", err, truncateAlipayResponseBody(bodyBytes))
	}

	response := result.AlipayTradePrecreateResponse
	if response.Code == "" && result.ErrorResponse.Code != "" {
		return "", fmt.Errorf(
			"alipay precreate failed: %s",
			formatAlipayResponseError(
				result.ErrorResponse.Code,
				result.ErrorResponse.Msg,
				result.ErrorResponse.SubCode,
				result.ErrorResponse.SubMsg,
			),
		)
	}
	if response.Code != alipayResponseCodeSuccess {
		return "", fmt.Errorf(
			"alipay precreate failed: %s",
			formatAlipayResponseError(
				response.Code,
				response.Msg,
				response.SubCode,
				response.SubMsg,
			),
		)
	}
	qrCode := strings.TrimSpace(response.QRCode)
	if qrCode == "" {
		return "", fmt.Errorf("alipay precreate empty qr_code")
	}
	return qrCode, nil
}

func (c *alipayClient) BuildPagePayParams(args *alipayPagePayArgs) (string, map[string]string, error) {
	if c == nil {
		return "", nil, fmt.Errorf("alipay client is nil")
	}
	if args == nil ||
		strings.TrimSpace(args.OutTradeNo) == "" ||
		strings.TrimSpace(args.Subject) == "" ||
		args.TotalAmount < 0.01 {
		return "", nil, fmt.Errorf("invalid alipay page pay args")
	}

	bizContent := map[string]string{
		"out_trade_no": args.OutTradeNo,
		"product_code": alipayProductCodePagePay,
		"subject":      args.Subject,
		"total_amount": formatAlipayMoney(args.TotalAmount),
	}
	if strings.TrimSpace(args.Body) != "" {
		bizContent["body"] = args.Body
	}
	bizContentJSON, err := common.Marshal(bizContent)
	if err != nil {
		return "", nil, err
	}

	params := map[string]string{
		"app_id":      c.appID,
		"biz_content": string(bizContentJSON),
		"charset":     alipayCharset,
		"format":      "JSON",
		"method":      alipayMethodPagePay,
		"sign_type":   alipaySignType,
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     alipayVersion,
	}
	if strings.TrimSpace(args.NotifyURL) != "" {
		params["notify_url"] = args.NotifyURL
	}
	if strings.TrimSpace(args.ReturnURL) != "" {
		params["return_url"] = args.ReturnURL
	}

	sign, err := c.sign(params)
	if err != nil {
		return "", nil, err
	}
	params["sign"] = sign

	return buildAlipayPagePaySubmit(c.gatewayURL, params)
}

func (c *alipayClient) Verify(params map[string]string) (*alipayVerifyInfo, error) {
	if c == nil {
		return nil, fmt.Errorf("alipay client is nil")
	}
	signature := strings.TrimSpace(params["sign"])
	if signature == "" {
		return nil, fmt.Errorf("missing sign")
	}
	signType := strings.ToUpper(strings.TrimSpace(params["sign_type"]))
	if signType != "" && signType != alipaySignType {
		return nil, fmt.Errorf("unsupported sign_type: %s", signType)
	}

	signatureBytes, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return nil, err
	}

	signContent := buildAlipayVerifySignContent(params)
	hash := sha256.Sum256([]byte(signContent))
	if err := rsa.VerifyPKCS1v15(c.publicKey, crypto.SHA256, hash[:], signatureBytes); err != nil {
		return nil, err
	}

	appID := strings.TrimSpace(params["app_id"])
	if appID != "" && appID != c.appID {
		return nil, fmt.Errorf("app_id mismatch")
	}

	totalAmount := 0.0
	if strings.TrimSpace(params["total_amount"]) != "" {
		totalAmount, err = strconv.ParseFloat(strings.TrimSpace(params["total_amount"]), 64)
		if err != nil {
			return nil, err
		}
	}

	raw := make(map[string]string, len(params))
	for key, value := range params {
		raw[key] = value
	}

	return &alipayVerifyInfo{
		OutTradeNo:  strings.TrimSpace(params["out_trade_no"]),
		TradeNo:     strings.TrimSpace(params["trade_no"]),
		TradeStatus: strings.TrimSpace(params["trade_status"]),
		TotalAmount: totalAmount,
		AppID:       appID,
		BuyerID:     strings.TrimSpace(params["buyer_id"]),
		RawParams:   raw,
	}, nil
}

func (c *alipayClient) sign(params map[string]string) (string, error) {
	signContent := buildAlipayRequestSignContent(params)
	hash := sha256.Sum256([]byte(signContent))
	signature, err := rsa.SignPKCS1v15(rand.Reader, c.privateKey, crypto.SHA256, hash[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

func buildAlipaySignContent(params map[string]string) string {
	return buildAlipaySignContentWithOptions(params, false)
}

func buildAlipayRequestSignContent(params map[string]string) string {
	return buildAlipaySignContentWithOptions(params, false)
}

func buildAlipayVerifySignContent(params map[string]string) string {
	return buildAlipaySignContentWithOptions(params, true)
}

func buildAlipaySignContentWithOptions(params map[string]string, excludeSignType bool) string {
	keys := make([]string, 0, len(params))
	for key, value := range params {
		if key == "sign" || (excludeSignType && key == "sign_type") || strings.TrimSpace(value) == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", key, params[key]))
	}
	return strings.Join(parts, "&")
}

func formatAlipayResponseError(code, msg, subCode, subMsg string) string {
	parts := make([]string, 0, 4)
	for _, part := range []string{code, msg, subCode, subMsg} {
		part = strings.TrimSpace(part)
		if part != "" {
			parts = append(parts, part)
		}
	}
	if len(parts) == 0 {
		return "unknown error"
	}
	return strings.Join(parts, ": ")
}

func getAlipayLaunchLogFields(args *alipayPagePayArgs) (string, float64) {
	if args == nil {
		return "", 0
	}
	return args.OutTradeNo, args.TotalAmount
}

func truncateAlipayResponseBody(body []byte) string {
	const maxAlipayResponseLogLen = 512
	text := strings.TrimSpace(string(body))
	if len(text) <= maxAlipayResponseLogLen {
		return text
	}
	return text[:maxAlipayResponseLogLen] + "...(truncated)"
}

func buildAlipayPagePaySubmit(gatewayURL string, params map[string]string) (string, map[string]string, error) {
	endpoint, err := url.Parse(gatewayURL)
	if err != nil {
		return "", nil, err
	}

	query := endpoint.Query()
	postParams := map[string]string{}
	for key, value := range params {
		if strings.TrimSpace(value) == "" {
			continue
		}
		if key == "biz_content" {
			postParams[key] = value
			continue
		}
		query.Set(key, value)
	}

	endpoint.RawQuery = query.Encode()
	return endpoint.String(), postParams, nil
}

func parseAlipayPrivateKey(key string) (*rsa.PrivateKey, error) {
	derBytes, err := parseAlipayKeyBytes(key)
	if err != nil {
		return nil, err
	}

	if privateKey, err := x509.ParsePKCS1PrivateKey(derBytes); err == nil {
		return privateKey, nil
	}

	privateKeyAny, err := x509.ParsePKCS8PrivateKey(derBytes)
	if err != nil {
		return nil, err
	}
	privateKey, ok := privateKeyAny.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("alipay private key is not rsa private key")
	}
	return privateKey, nil
}

func parseAlipayPublicKey(key string) (*rsa.PublicKey, error) {
	derBytes, err := parseAlipayKeyBytes(key)
	if err != nil {
		return nil, err
	}

	if publicKey, err := x509.ParsePKCS1PublicKey(derBytes); err == nil {
		return publicKey, nil
	}

	publicKeyAny, err := x509.ParsePKIXPublicKey(derBytes)
	if err != nil {
		return nil, err
	}
	publicKey, ok := publicKeyAny.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("alipay public key is not rsa public key")
	}
	return publicKey, nil
}

func parseAlipayKeyBytes(key string) ([]byte, error) {
	normalized := strings.TrimSpace(strings.ReplaceAll(key, `\n`, "\n"))
	if normalized == "" {
		return nil, fmt.Errorf("key is empty")
	}

	if strings.Contains(normalized, "BEGIN") {
		for {
			block, rest := pem.Decode([]byte(normalized))
			if block == nil {
				break
			}
			if len(block.Bytes) > 0 {
				return block.Bytes, nil
			}
			normalized = string(rest)
		}
		return nil, fmt.Errorf("invalid pem key")
	}

	if decoded, err := base64.StdEncoding.DecodeString(normalized); err == nil {
		return decoded, nil
	}
	if decoded, err := base64.RawStdEncoding.DecodeString(normalized); err == nil {
		return decoded, nil
	}
	return nil, fmt.Errorf("invalid base64 key")
}

func getAlipayRequestParams(c *gin.Context) (map[string]string, error) {
	params := map[string]string{}
	if c.Request.Method == "POST" {
		if err := c.Request.ParseForm(); err != nil {
			return nil, err
		}
		for key, values := range c.Request.PostForm {
			if len(values) > 0 {
				params[key] = values[0]
			}
		}
		return params, nil
	}

	for key, values := range c.Request.URL.Query() {
		if len(values) > 0 {
			params[key] = values[0]
		}
	}
	return params, nil
}

func formatAlipayMoney(amount float64) string {
	return fmt.Sprintf("%.2f", amount)
}

func isAlipayTradeSuccess(status string) bool {
	return status == alipayTradeStatusSuccess || status == alipayTradeStatusFinished
}

func isAlipayTradeClosed(status string) bool {
	return status == alipayTradeStatusClosed
}
