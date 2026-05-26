package controller

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestBuildPagePayParamsPutsCommonParamsInGatewayURL(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatalf("GenerateKey() error = %v", err)
	}
	client := &alipayClient{
		appID:      "2021000123456789",
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
		gatewayURL: "https://openapi.alipay.com/gateway.do",
	}

	gatewayURL, postParams, err := client.BuildPagePayParams(&alipayPagePayArgs{
		OutTradeNo:  "ALI123456",
		Subject:     "account topup",
		TotalAmount: 1.23,
		NotifyURL:   "https://example.com/api/user/alipay/notify",
		ReturnURL:   "https://example.com/api/user/alipay/return",
		Body:        "new-api topup",
	})
	if err != nil {
		t.Fatalf("BuildPagePayParams() error = %v", err)
	}

	parsedURL, err := url.Parse(gatewayURL)
	if err != nil {
		t.Fatalf("Parse(%q) error = %v", gatewayURL, err)
	}
	query := parsedURL.Query()
	for _, key := range []string{"app_id", "charset", "format", "method", "sign", "sign_type", "timestamp", "version", "notify_url", "return_url"} {
		if query.Get(key) == "" {
			t.Fatalf("gateway query missing %q in %q", key, gatewayURL)
		}
	}
	if query.Get("charset") != alipayCharset {
		t.Fatalf("gateway query charset = %q, want %q", query.Get("charset"), alipayCharset)
	}
	if _, ok := postParams["charset"]; ok {
		t.Fatalf("postParams must not contain charset: %#v", postParams)
	}
	if _, ok := postParams["sign"]; ok {
		t.Fatalf("postParams must not contain sign: %#v", postParams)
	}
	if postParams["biz_content"] == "" {
		t.Fatalf("postParams missing biz_content: %#v", postParams)
	}

	allParams := map[string]string{}
	for key, values := range query {
		if len(values) > 0 {
			allParams[key] = values[0]
		}
	}
	for key, value := range postParams {
		allParams[key] = value
	}
	signatureBytes, err := base64.StdEncoding.DecodeString(allParams["sign"])
	if err != nil {
		t.Fatalf("DecodeString(sign) error = %v", err)
	}
	signContent := buildAlipayRequestSignContent(allParams)
	hash := sha256.Sum256([]byte(signContent))
	if err := rsa.VerifyPKCS1v15(client.publicKey, crypto.SHA256, hash[:], signatureBytes); err != nil {
		t.Fatalf("request signature verification error = %v", err)
	}
}

func TestBuildPrecreateQRCodePostsSignedRequest(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatalf("GenerateKey() error = %v", err)
	}

	var posted url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		if got := r.Header.Get("Content-Type"); got != "application/x-www-form-urlencoded;charset=utf-8" {
			t.Fatalf("Content-Type = %q, want form utf-8", got)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm() error = %v", err)
		}
		posted = r.PostForm
		_, _ = io.WriteString(w, `{"alipay_trade_precreate_response":{"code":"10000","msg":"Success","out_trade_no":"ALI123456","qr_code":"https://qr.alipay.example/precreate-token"},"sign":"ignored"}`)
	}))
	defer server.Close()

	client := &alipayClient{
		appID:      "2021000123456789",
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
		gatewayURL: server.URL,
	}
	qrCode, err := client.BuildPrecreateQRCode(context.Background(), &alipayPagePayArgs{
		OutTradeNo:  "ALI123456",
		Subject:     "account topup",
		TotalAmount: 1.23,
		NotifyURL:   "https://example.com/api/user/alipay/notify",
		Body:        "new-api topup",
	})
	if err != nil {
		t.Fatalf("BuildPrecreateQRCode() error = %v", err)
	}
	if qrCode != "https://qr.alipay.example/precreate-token" {
		t.Fatalf("qrCode = %q", qrCode)
	}
	if posted.Get("method") != alipayMethodPrecreate {
		t.Fatalf("posted method = %q, want %q", posted.Get("method"), alipayMethodPrecreate)
	}
	if !strings.Contains(posted.Get("biz_content"), alipayProductCodePrecreate) {
		t.Fatalf("biz_content missing precreate product code: %q", posted.Get("biz_content"))
	}
	if posted.Get("return_url") != "" {
		t.Fatalf("precreate request must not include return_url: %q", posted.Get("return_url"))
	}

	allParams := map[string]string{}
	for key, values := range posted {
		if len(values) > 0 {
			allParams[key] = values[0]
		}
	}
	signatureBytes, err := base64.StdEncoding.DecodeString(allParams["sign"])
	if err != nil {
		t.Fatalf("DecodeString(sign) error = %v", err)
	}
	signContent := buildAlipayRequestSignContent(allParams)
	hash := sha256.Sum256([]byte(signContent))
	if err := rsa.VerifyPKCS1v15(client.publicKey, crypto.SHA256, hash[:], signatureBytes); err != nil {
		t.Fatalf("precreate signature verification error = %v", err)
	}
}

func TestBuildDesktopPayLaunchFallsBackToPagePay(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatalf("GenerateKey() error = %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"alipay_trade_precreate_response":{"code":"40004","msg":"Business Failed","sub_code":"ACQ.PRODUCT_AMOUNT_LIMIT_ERROR","sub_msg":"face to face unavailable"},"sign":"ignored"}`)
	}))
	defer server.Close()

	client := &alipayClient{
		appID:      "2021000123456789",
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
		gatewayURL: server.URL,
	}
	launch, err := client.BuildDesktopPayLaunch(context.Background(), &alipayPagePayArgs{
		OutTradeNo:  "ALI123456",
		Subject:     "account topup",
		TotalAmount: 1.23,
		NotifyURL:   "https://example.com/api/user/alipay/notify",
		ReturnURL:   "https://example.com/api/user/alipay/return",
		Body:        "new-api topup",
	})
	if err != nil {
		t.Fatalf("BuildDesktopPayLaunch() error = %v", err)
	}
	if launch.PayMode != alipayPayModePagePay {
		t.Fatalf("PayMode = %q, want %q", launch.PayMode, alipayPayModePagePay)
	}
	if launch.URL == "" {
		t.Fatal("fallback launch URL is empty")
	}
	if launch.QRCode != launch.URL {
		t.Fatalf("fallback QRCode = %q, want URL %q", launch.QRCode, launch.URL)
	}
	if launch.Data["biz_content"] == "" {
		t.Fatalf("fallback launch data missing biz_content: %#v", launch.Data)
	}
	parsedURL, err := url.Parse(launch.URL)
	if err != nil {
		t.Fatalf("Parse(%q) error = %v", launch.URL, err)
	}
	if parsedURL.Query().Get("method") != alipayMethodPagePay {
		t.Fatalf("fallback method = %q, want %q", parsedURL.Query().Get("method"), alipayMethodPagePay)
	}
}

func TestBuildDesktopPayLaunchReturnsQRCode(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatalf("GenerateKey() error = %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"alipay_trade_precreate_response":{"code":"10000","msg":"Success","out_trade_no":"ALI123456","qr_code":"https://qr.alipay.example/precreate-token"},"sign":"ignored"}`)
	}))
	defer server.Close()

	client := &alipayClient{
		appID:      "2021000123456789",
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
		gatewayURL: server.URL,
	}
	launch, err := client.BuildDesktopPayLaunch(context.Background(), &alipayPagePayArgs{
		OutTradeNo:  "ALI123456",
		Subject:     "account topup",
		TotalAmount: 1.23,
		NotifyURL:   "https://example.com/api/user/alipay/notify",
		ReturnURL:   "https://example.com/api/user/alipay/return",
		Body:        "new-api topup",
	})
	if err != nil {
		t.Fatalf("BuildDesktopPayLaunch() error = %v", err)
	}
	if launch.PayMode != alipayPayModeQRCode {
		t.Fatalf("PayMode = %q, want %q", launch.PayMode, alipayPayModeQRCode)
	}
	if launch.QRCode != "https://qr.alipay.example/precreate-token" {
		t.Fatalf("QRCode = %q", launch.QRCode)
	}
	if launch.URL != "" {
		t.Fatalf("precreate URL = %q, want empty", launch.URL)
	}
	if len(launch.Data) != 0 {
		t.Fatalf("precreate data = %#v, want empty", launch.Data)
	}
}

func TestBuildAlipayRequestSignContentIncludesSignType(t *testing.T) {
	params := map[string]string{
		"app_id":      "2021006147633929",
		"biz_content": `{"body":"new-api topup","out_trade_no":"ALIUSR1NOfZTbH21777394692","product_code":"FAST_INSTANT_TRADE_PAY","subject":"账户充值 1","total_amount":"1.00"}`,
		"charset":     "utf-8",
		"format":      "JSON",
		"method":      "alipay.trade.page.pay",
		"notify_url":  "http://localhost:3000/api/user/alipay/notify",
		"return_url":  "http://localhost:3000/api/user/alipay/return",
		"sign":        "ignored",
		"sign_type":   "RSA2",
		"timestamp":   "2026-04-29 00:44:52",
		"version":     "1.0",
	}

	want := `app_id=2021006147633929&biz_content={"body":"new-api topup","out_trade_no":"ALIUSR1NOfZTbH21777394692","product_code":"FAST_INSTANT_TRADE_PAY","subject":"账户充值 1","total_amount":"1.00"}&charset=utf-8&format=JSON&method=alipay.trade.page.pay&notify_url=http://localhost:3000/api/user/alipay/notify&return_url=http://localhost:3000/api/user/alipay/return&sign_type=RSA2&timestamp=2026-04-29 00:44:52&version=1.0`
	if got := buildAlipayRequestSignContent(params); got != want {
		t.Fatalf("buildAlipayRequestSignContent() = %q, want %q", got, want)
	}
}

func TestBuildAlipayRequestSignContentForPrecreate(t *testing.T) {
	params := map[string]string{
		"app_id":      "2021006147633929",
		"biz_content": `{"body":"new-api topup","out_trade_no":"ALIUSR1NOfZTbH21777394692","product_code":"FACE_TO_FACE_PAYMENT","subject":"账户充值 1","total_amount":"1.00"}`,
		"charset":     "utf-8",
		"format":      "JSON",
		"method":      "alipay.trade.precreate",
		"notify_url":  "http://localhost:3000/api/user/alipay/notify",
		"sign":        "ignored",
		"sign_type":   "RSA2",
		"timestamp":   "2026-04-29 00:44:52",
		"version":     "1.0",
	}

	want := `app_id=2021006147633929&biz_content={"body":"new-api topup","out_trade_no":"ALIUSR1NOfZTbH21777394692","product_code":"FACE_TO_FACE_PAYMENT","subject":"账户充值 1","total_amount":"1.00"}&charset=utf-8&format=JSON&method=alipay.trade.precreate&notify_url=http://localhost:3000/api/user/alipay/notify&sign_type=RSA2&timestamp=2026-04-29 00:44:52&version=1.0`
	if got := buildAlipayRequestSignContent(params); got != want {
		t.Fatalf("buildAlipayRequestSignContent() = %q, want %q", got, want)
	}
}

func TestBuildAlipaySignContentForReturnVerify(t *testing.T) {
	params := map[string]string{
		"app_id":       "2021006147633929",
		"auth_app_id":  "2021006147633929",
		"charset":      "utf-8",
		"method":       "alipay.trade.page.pay.return",
		"out_trade_no": "ALIUSR1NOhTqqU21777398396",
		"seller_id":    "2088480800445650",
		"sign":         "ignored",
		"sign_type":    "RSA2",
		"timestamp":    "2026-04-29 01:46:53",
		"total_amount": "1.00",
		"trade_no":     "2026042922001476631454719538",
		"version":      "1.0",
	}

	want := `app_id=2021006147633929&auth_app_id=2021006147633929&charset=utf-8&method=alipay.trade.page.pay.return&out_trade_no=ALIUSR1NOhTqqU21777398396&seller_id=2088480800445650&timestamp=2026-04-29 01:46:53&total_amount=1.00&trade_no=2026042922001476631454719538&version=1.0`
	if got := buildAlipayVerifySignContent(params); got != want {
		t.Fatalf("buildAlipayVerifySignContent() = %q, want %q", got, want)
	}
}
