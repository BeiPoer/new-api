package service

import (
	"bytes"
	"context"
	"crypto"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/shopspring/decimal"
)

const binancePayAPIBase = "https://bpay.binanceapi.com"

type BinancePayClient struct {
	APIKey    string
	SecretKey string
}

type BinancePayCheckout struct {
	PrepayID    string `json:"prepayId"`
	CheckoutURL string `json:"checkoutUrl"`
	ExpireTime  int64  `json:"expireTime"`
}

type BinancePayNotification struct {
	BizType   string `json:"bizType"`
	BizStatus string `json:"bizStatus"`
	Data      string `json:"data"`
}

type BinancePayPayment struct {
	MerchantTradeNo string          `json:"merchantTradeNo"`
	TotalFee        decimal.Decimal `json:"totalFee"`
	Currency        string          `json:"currency"`
}

func (client BinancePayClient) request(ctx context.Context, path string, input, output any) error {
	body, err := common.Marshal(input)
	if err != nil {
		return err
	}
	var nonceBytes [16]byte
	if _, err := rand.Read(nonceBytes[:]); err != nil {
		return err
	}
	nonce := hex.EncodeToString(nonceBytes[:])
	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	mac := hmac.New(sha512.New, []byte(client.SecretKey))
	_, _ = fmt.Fprintf(mac, "%s\n%s\n%s\n", timestamp, nonce, body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, binancePayAPIBase+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("BinancePay-Timestamp", timestamp)
	req.Header.Set("BinancePay-Nonce", nonce)
	req.Header.Set("BinancePay-Certificate-SN", client.APIKey)
	req.Header.Set("BinancePay-Signature", strings.ToUpper(hex.EncodeToString(mac.Sum(nil))))
	httpClient := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	response, err := httpClient.Do(req)
	if err != nil {
		return errors.New("Binance Pay API request failed")
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("Binance Pay API HTTP status %d", response.StatusCode)
	}
	const maxResponseBytes = 1 << 20
	data, err := io.ReadAll(io.LimitReader(response.Body, maxResponseBytes+1))
	if err != nil || len(data) > maxResponseBytes {
		return errors.New("invalid Binance Pay API response")
	}
	var result struct {
		Status string          `json:"status"`
		Code   string          `json:"code"`
		Data   json.RawMessage `json:"data"`
	}
	if err := common.Unmarshal(data, &result); err != nil {
		return errors.New("invalid Binance Pay API response")
	}
	if result.Status != "SUCCESS" || result.Code != "000000" {
		return fmt.Errorf("Binance Pay API rejected request (code %s)", result.Code)
	}
	return common.Unmarshal(result.Data, output)
}

func (client BinancePayClient) CreateCheckout(ctx context.Context, tradeNo string, amount decimal.Decimal, webhookURL, returnURL string) (*BinancePayCheckout, error) {
	input := map[string]any{
		"env":             map[string]string{"terminalType": "WEB"},
		"merchantTradeNo": tradeNo,
		"orderAmount":     json.Number(amount.StringFixed(2)),
		"currency":        setting.BinancePayCurrency,
		"description":     "new-api balance recharge",
		"goodsDetails": []map[string]string{{
			"goodsType": "02", "goodsCategory": "6000",
			"referenceGoodsId": "newapiBalance", "goodsName": "new-api balance recharge",
		}},
		"webhookUrl": webhookURL,
		"returnUrl":  returnURL,
		"cancelUrl":  returnURL,
	}
	var checkout BinancePayCheckout
	if err := client.request(ctx, "/binancepay/openapi/v3/order", input, &checkout); err != nil {
		return nil, err
	}
	checkoutURL, err := url.Parse(checkout.CheckoutURL)
	if err != nil || checkoutURL.Scheme != "https" || checkoutURL.Host == "" || checkoutURL.User != nil || checkout.PrepayID == "" {
		return nil, errors.New("invalid Binance Pay checkout URL")
	}
	return &checkout, nil
}

// VerifyNotification uses the certificate serial sent by Binance to select a
// public key obtained directly from its authenticated HTTPS certificate API.
func (client BinancePayClient) VerifyNotification(ctx context.Context, headers http.Header, body []byte) (*BinancePayNotification, error) {
	timestamp := headers.Get("BinancePay-Timestamp")
	nonce := headers.Get("BinancePay-Nonce")
	serial := headers.Get("BinancePay-Certificate-SN")
	millis, err := strconv.ParseInt(timestamp, 10, 64)
	now := time.Now().UnixMilli()
	if err != nil || millis < now-5*time.Minute.Milliseconds() || millis > now+5*time.Minute.Milliseconds() || len(nonce) != 32 || serial == "" {
		return nil, errors.New("invalid or expired Binance Pay notification headers")
	}
	signature, err := base64.StdEncoding.DecodeString(headers.Get("BinancePay-Signature"))
	if err != nil || len(signature) == 0 {
		return nil, errors.New("invalid Binance Pay signature")
	}
	var certificates []struct {
		Serial    string `json:"certSerial"`
		PublicKey string `json:"certPublic"`
	}
	if err := client.request(ctx, "/binancepay/openapi/certificates", struct{}{}, &certificates); err != nil {
		return nil, err
	}
	for _, certificate := range certificates {
		if certificate.Serial != serial {
			continue
		}
		block, _ := pem.Decode([]byte(certificate.PublicKey))
		if block == nil {
			return nil, errors.New("invalid Binance Pay certificate")
		}
		key, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			return nil, errors.New("invalid Binance Pay public key")
		}
		publicKey, ok := key.(*rsa.PublicKey)
		if !ok {
			return nil, errors.New("invalid Binance Pay RSA public key")
		}
		digest := sha256.Sum256([]byte(timestamp + "\n" + nonce + "\n" + string(body) + "\n"))
		if err := rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, digest[:], signature); err != nil {
			return nil, errors.New("invalid Binance Pay signature")
		}
		var notification BinancePayNotification
		if err := common.Unmarshal(body, &notification); err != nil {
			return nil, errors.New("invalid Binance Pay notification")
		}
		return &notification, nil
	}
	return nil, errors.New("unknown Binance Pay certificate serial")
}
