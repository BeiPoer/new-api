package controller

import (
	"bytes"
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
	"fmt"
	"io"
	"maps"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type binancePayTestTransport func(*http.Request) (*http.Response, error)

func (transport binancePayTestTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	return transport(req)
}

func binancePayTestRequest(t *testing.T, handler gin.HandlerFunc, userID int, body string) *httptest.ResponseRecorder {
	t.Helper()
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("id", userID)
	handler(ctx)
	return response
}

func binancePaySignedNotification(t *testing.T, key *rsa.PrivateKey, data map[string]any, status string, age time.Duration) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	payment, err := common.Marshal(data)
	require.NoError(t, err)
	body, err := common.Marshal(map[string]any{
		"bizType": "PAY", "bizStatus": status, "data": string(payment),
		"bizId": json.Number("29383937493038367292"), "bizIdStr": "29383937493038367292",
	})
	require.NoError(t, err)
	timestamp := strconv.FormatInt(time.Now().Add(age).UnixMilli(), 10)
	nonce := strings.Repeat("a", 32)
	digest := sha256.Sum256([]byte(timestamp + "\n" + nonce + "\n" + string(body) + "\n"))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	require.NoError(t, err)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/binance-pay/webhook", bytes.NewReader(body))
	ctx.Request.Header.Set("BinancePay-Timestamp", timestamp)
	ctx.Request.Header.Set("BinancePay-Nonce", nonce)
	ctx.Request.Header.Set("BinancePay-Certificate-SN", "binance-cert")
	ctx.Request.Header.Set("BinancePay-Signature", base64.StdEncoding.EncodeToString(signature))
	return ctx, response
}

func TestBinancePayPaymentFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			var driver gorm.Dialector
			dbType := common.DatabaseTypeSQLite
			switch dialect {
			case "sqlite":
				driver = sqlite.Open(":memory:")
			case "mysql":
				if os.Getenv("TEST_MYSQL_DSN") == "" {
					t.Skip("TEST_MYSQL_DSN is not configured")
				}
				driver = mysql.Open(os.Getenv("TEST_MYSQL_DSN"))
				dbType = common.DatabaseTypeMySQL
			case "postgres":
				if os.Getenv("TEST_POSTGRES_DSN") == "" {
					t.Skip("TEST_POSTGRES_DSN is not configured")
				}
				driver = postgres.Open(os.Getenv("TEST_POSTGRES_DSN"))
				dbType = common.DatabaseTypePostgreSQL
			}
			db, err := gorm.Open(driver, &gorm.Config{})
			require.NoError(t, err)
			logDB := db
			switch {
			case dialect == "sqlite":
				logDB, err = gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
			case dialect == "mysql" && os.Getenv("TEST_MYSQL_LOG_DSN") != "":
				logDB, err = gorm.Open(mysql.Open(os.Getenv("TEST_MYSQL_LOG_DSN")), &gorm.Config{})
			case dialect == "postgres" && os.Getenv("TEST_POSTGRES_LOG_DSN") != "":
				logDB, err = gorm.Open(postgres.Open(os.Getenv("TEST_POSTGRES_LOG_DSN")), &gorm.Config{})
			}
			require.NoError(t, err)
			if logDB != db {
				logSQL, err := logDB.DB()
				require.NoError(t, err)
				t.Cleanup(func() { require.NoError(t, logSQL.Close()) })
			}
			sqlDB, err := db.DB()
			require.NoError(t, err)
			if dialect == "sqlite" {
				sqlDB.SetMaxOpenConns(1)
			}
			t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })
			var version string
			query := "SELECT version()"
			if dialect == "sqlite" {
				query = "SELECT sqlite_version()"
			}
			require.NoError(t, db.Raw(query).Scan(&version).Error)
			t.Logf("database version: %s", version)
			for _, table := range []any{&model.User{}, &model.TopUp{}, &model.Option{}} {
				require.False(t, db.Migrator().HasTable(table), "use an empty test database")
				require.NoError(t, db.AutoMigrate(table))
				t.Cleanup(func() { require.NoError(t, db.Migrator().DropTable(table)) })
			}
			require.False(t, logDB.Migrator().HasTable(&model.Log{}), "use an empty test log database")
			require.NoError(t, logDB.AutoMigrate(&model.Log{}))
			t.Cleanup(func() { require.NoError(t, logDB.Migrator().DropTable(&model.Log{})) })
			oldDB, oldLogDB := model.DB, model.LOG_DB
			oldMain, oldLog := common.MainDatabaseType(), common.LogDatabaseType()
			oldRedis, oldQuota := common.RedisEnabled, common.QuotaPerUnit
			oldMaster, oldSQLite := common.IsMasterNode, common.SQLitePath
			oldPayment := *operation_setting.GetPaymentSetting()
			oldDisplay := operation_setting.GetGeneralSetting().QuotaDisplayType
			oldServer, oldCallback := system_setting.ServerAddress, operation_setting.CustomCallbackAddress
			oldConfig := setting.BinancePayOptionDefaults()
			oldOptions := maps.Clone(common.OptionMap)
			oldPayMethods := operation_setting.PayMethods
			oldGroupRatios := common.TopupGroupRatio2JSONString()
			common.IsMasterNode = false
			switch dialect {
			case "sqlite":
				common.SQLitePath = ":memory:"
				t.Setenv("SQL_DSN", "local")
			case "mysql":
				t.Setenv("SQL_DSN", os.Getenv("TEST_MYSQL_DSN"))
			case "postgres":
				t.Setenv("SQL_DSN", os.Getenv("TEST_POSTGRES_DSN"))
			}
			t.Setenv("LOG_SQL_DSN", "")
			require.NoError(t, model.InitDB())
			initializationDB, err := model.DB.DB()
			require.NoError(t, err)
			require.NoError(t, initializationDB.Close())
			model.DB, model.LOG_DB = db, logDB
			common.SetDatabaseTypes(dbType, dbType)
			common.RedisEnabled, common.QuotaPerUnit = false, 500000
			operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD
			system_setting.ServerAddress, operation_setting.CustomCallbackAddress = "https://api.example.com", ""
			*operation_setting.GetPaymentSetting() = operation_setting.PaymentSetting{
				ComplianceConfirmed: true, ComplianceTermsVersion: operation_setting.CurrentComplianceTermsVersion,
				AmountOptions: []int{10}, AmountDiscount: map[int]float64{10: 0.9},
			}
			common.OptionMap = map[string]string{}
			t.Cleanup(func() {
				model.DB, model.LOG_DB = oldDB, oldLogDB
				common.SetDatabaseTypes(oldMain, oldLog)
				common.RedisEnabled, common.QuotaPerUnit = oldRedis, oldQuota
				common.IsMasterNode, common.SQLitePath = oldMaster, oldSQLite
				*operation_setting.GetPaymentSetting() = oldPayment
				operation_setting.GetGeneralSetting().QuotaDisplayType = oldDisplay
				system_setting.ServerAddress, operation_setting.CustomCallbackAddress = oldServer, oldCallback
				common.OptionMap, operation_setting.PayMethods = oldOptions, oldPayMethods
				require.NoError(t, common.UpdateTopupGroupRatioByJSONString(oldGroupRatios))
				for key, value := range oldConfig {
					require.NoError(t, setting.UpdateBinancePayOption(key, value))
				}
			})
			require.NoError(t, common.UpdateTopupGroupRatioByJSONString(`{"binance-test":1.25}`))
			require.NoError(t, model.UpdateOptionsBulk(map[string]string{
				"BinancePayAPIKey": "merchant-key", "BinancePaySecretKey": "merchant-secret",
				"BinancePayAllowedUserIDs": "[42]", "BinancePayUnitPrice": "1", "BinancePayMinTopUp": "1", "BinancePayEnabled": "true",
			}))
			require.NoError(t, db.Create(&model.User{Id: 42, Username: "binance-test", Group: "binance-test", Status: common.UserStatusEnabled, Quota: 3}).Error)
			t.Run("rejects invalid settings before saving", func(t *testing.T) {
				for _, value := range []string{"null", "{}", "[0]", "[-1]", "[1.5]", `["42"]`, "[9007199254740992]"} {
					require.Error(t, model.UpdateOption("BinancePayAllowedUserIDs", value))
				}
				for _, value := range []string{"NaN", "+Inf", "0", "-1"} {
					require.Error(t, model.UpdateOption("BinancePayUnitPrice", value))
				}
				assert.True(t, setting.GetBinancePayConfig().AllowsUser(42))
				response := binancePayTestRequest(t, GetOptions, 42, "")
				assert.NotContains(t, response.Body.String(), "merchant-key")
				assert.NotContains(t, response.Body.String(), "merchant-secret")
			})

			privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
			require.NoError(t, err)
			publicDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
			require.NoError(t, err)
			publicPEM := string(pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: publicDER}))
			oldTransport := http.DefaultTransport
			t.Cleanup(func() { http.DefaultTransport = oldTransport })
			var checkoutTradeNo string
			var upstreamCalls int
			failCheckout := false
			http.DefaultTransport = binancePayTestTransport(func(req *http.Request) (*http.Response, error) {
				upstreamCalls++
				assert.Equal(t, "https", req.URL.Scheme)
				assert.Equal(t, "bpay.binanceapi.com", req.URL.Host)
				assert.Equal(t, http.MethodPost, req.Method)
				assert.Equal(t, "merchant-key", req.Header.Get("BinancePay-Certificate-SN"))
				body, err := io.ReadAll(req.Body)
				require.NoError(t, err)
				mac := hmac.New(sha512.New, []byte("merchant-secret"))
				_, err = fmt.Fprintf(mac, "%s\n%s\n%s\n", req.Header.Get("BinancePay-Timestamp"), req.Header.Get("BinancePay-Nonce"), body)
				require.NoError(t, err)
				assert.Equal(t, strings.ToUpper(hex.EncodeToString(mac.Sum(nil))), req.Header.Get("BinancePay-Signature"))
				assert.Len(t, req.Header.Get("BinancePay-Nonce"), 32)
				var data any
				switch req.URL.Path {
				case "/binancepay/openapi/v3/order":
					if failCheckout {
						return nil, io.ErrUnexpectedEOF
					}
					var order struct {
						TradeNo    string          `json:"merchantTradeNo"`
						Amount     decimal.Decimal `json:"orderAmount"`
						Currency   string          `json:"currency"`
						WebhookURL string          `json:"webhookUrl"`
					}
					require.NoError(t, common.Unmarshal(body, &order))
					assert.Regexp(t, `^[A-Za-z0-9]{32}$`, order.TradeNo)
					assert.True(t, decimal.RequireFromString("11.25").Equal(order.Amount))
					assert.Equal(t, "USDT", order.Currency)
					assert.Equal(t, "https://api.example.com/api/binance-pay/webhook", order.WebhookURL)
					checkoutTradeNo = order.TradeNo
					data = map[string]any{"prepayId": "123", "checkoutUrl": "https://pay.binance.com/checkout/test", "expireTime": time.Now().Add(time.Hour).UnixMilli()}
				case "/binancepay/openapi/certificates":
					data = []map[string]string{{"certSerial": "binance-cert", "certPublic": publicPEM}}
				default:
					t.Errorf("unexpected Binance Pay endpoint: %s", req.URL.Path)
				}
				body, err = common.Marshal(map[string]any{"status": "SUCCESS", "code": "000000", "data": data})
				require.NoError(t, err)
				return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body)), Header: http.Header{}}, nil
			})

			t.Run("allowlist protects info quotes and checkout against user ID spoofing", func(t *testing.T) {
				for _, userID := range []int{0, 41, 42} {
					response := binancePayTestRequest(t, GetTopUpInfo, userID, "")
					var info struct {
						Data struct {
							Enabled bool                `json:"enable_binance_pay_topup"`
							Methods []map[string]string `json:"pay_methods"`
						} `json:"data"`
					}
					require.NoError(t, common.Unmarshal(response.Body.Bytes(), &info))
					assert.Equal(t, userID == 42, info.Data.Enabled)
					assert.Equal(t, userID == 42, containsPayMethodType(info.Data.Methods, model.PaymentMethodBinancePay))
					if userID == 42 {
						continue
					}
					for _, handler := range []gin.HandlerFunc{RequestBinancePayAmount, RequestBinancePay} {
						response := binancePayTestRequest(t, handler, userID, `{"amount":10,"user_id":42}`)
						assert.Contains(t, response.Body.String(), `"success":false`)
					}
				}
				assert.Zero(t, upstreamCalls)
				require.NoError(t, setting.UpdateBinancePayOption("BinancePayAllowedUserIDs", "[]"))
				response := binancePayTestRequest(t, RequestBinancePay, 42, `{"amount":10}`)
				assert.Contains(t, response.Body.String(), `"success":false`)
				require.NoError(t, setting.UpdateBinancePayOption("BinancePayAllowedUserIDs", "[42]"))
			})
			t.Run("legacy payment configuration cannot bypass Binance Pay access controls", func(t *testing.T) {
				oldMethods := operation_setting.PayMethods
				oldAddress, oldID, oldKey := operation_setting.PayAddress, operation_setting.EpayId, operation_setting.EpayKey
				oldMinimum := operation_setting.MinTopUp
				t.Cleanup(func() {
					operation_setting.PayMethods = oldMethods
					operation_setting.PayAddress, operation_setting.EpayId, operation_setting.EpayKey = oldAddress, oldID, oldKey
					operation_setting.MinTopUp = oldMinimum
				})
				operation_setting.PayMethods = []map[string]string{{"name": "Binance Pay", "type": model.PaymentMethodBinancePay}}
				operation_setting.PayAddress, operation_setting.EpayId, operation_setting.EpayKey = "https://epay.example.com", "1", "test"
				operation_setting.MinTopUp = 1
				response := binancePayTestRequest(t, GetTopUpInfo, 41, "")
				var info struct {
					Data struct {
						Methods []map[string]string `json:"pay_methods"`
					} `json:"data"`
				}
				require.NoError(t, common.Unmarshal(response.Body.Bytes(), &info))
				assert.False(t, containsPayMethodType(info.Data.Methods, model.PaymentMethodBinancePay))
				response = binancePayTestRequest(t, RequestEpay, 42, `{"amount":10,"payment_method":"binance_pay"}`)
				assert.Contains(t, response.Body.String(), "支付方式不存在")
				assert.Zero(t, upstreamCalls)
			})
			t.Run("quotes and creates a discounted checkout with the credited quantity", func(t *testing.T) {
				response := binancePayTestRequest(t, RequestBinancePayAmount, 42, `{"amount":10}`)
				assert.JSONEq(t, `{"success":true,"message":"","data":"11.25"}`, response.Body.String())
				operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeTokens
				infoResponse := binancePayTestRequest(t, GetTopUpInfo, 42, "")
				assert.Contains(t, infoResponse.Body.String(), `"binance_pay_min_topup":500000`)
				response = binancePayTestRequest(t, RequestBinancePayAmount, 42, `{"amount":5500000}`)
				assert.Contains(t, response.Body.String(), `"data":"13.75"`)
				operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD
				for _, amount := range []int64{0, -1, 9223372036854775807} {
					response = binancePayTestRequest(t, RequestBinancePay, 42, fmt.Sprintf(`{"amount":%d}`, amount))
					assert.Contains(t, response.Body.String(), `"success":false`)
				}
				response = binancePayTestRequest(t, RequestBinancePay, 42, `{"amount":10}`)
				assert.Contains(t, response.Body.String(), `"pay_link":"https://pay.binance.com/checkout/test"`)
				order := model.GetTopUpByTradeNo(checkoutTradeNo)
				require.NotNil(t, order)
				assert.Equal(t, int64(10), order.Amount)
				assert.Equal(t, 11.25, order.Money)
				assert.Equal(t, model.PaymentProviderBinancePay, order.PaymentProvider)
			})
			require.NotEmpty(t, checkoutTradeNo, "checkout creation is required for webhook and settlement cases")
			t.Run("upstream failure leaves the order pending without crediting quota", func(t *testing.T) {
				failCheckout = true
				t.Cleanup(func() { failCheckout = false })
				response := binancePayTestRequest(t, RequestBinancePay, 42, `{"amount":10}`)
				assert.Contains(t, response.Body.String(), `"success":false`)
				var order model.TopUp
				require.NoError(t, db.Order("id DESC").First(&order).Error)
				assert.NotEqual(t, checkoutTradeNo, order.TradeNo)
				assert.Equal(t, common.TopUpStatusPending, order.Status)
				var user model.User
				require.NoError(t, db.First(&user, 42).Error)
				assert.Equal(t, 3, user.Quota)
			})

			t.Run("webhook rejects tampering expired signatures and mismatched payments", func(t *testing.T) {
				for _, tc := range []struct {
					name, currency, fee, serial, status string
					age                                 time.Duration
					tamper                              bool
					want                                int
				}{
					{name: "tampered body", currency: "USDT", fee: "11.25", tamper: true, want: 401},
					{name: "expired signature", currency: "USDT", fee: "11.25", age: -10 * time.Minute, want: 401},
					{name: "future signature", currency: "USDT", fee: "11.25", age: 10 * time.Minute, want: 401},
					{name: "wrong certificate", currency: "USDT", fee: "11.25", serial: "other-cert", want: 401},
					{name: "wrong currency", currency: "BTC", fee: "11.25", want: 500},
					{name: "wrong amount", currency: "USDT", fee: "1", want: 500},
					{name: "closed order notification", currency: "USDT", fee: "11.25", status: "PAY_CLOSED", want: 200},
				} {
					t.Run(tc.name, func(t *testing.T) {
						status := tc.status
						if status == "" {
							status = "PAY_SUCCESS"
						}
						ctx, response := binancePaySignedNotification(t, privateKey, map[string]any{
							"merchantTradeNo": checkoutTradeNo, "currency": tc.currency, "totalFee": json.Number(tc.fee),
						}, status, tc.age)
						if tc.tamper {
							body, err := io.ReadAll(ctx.Request.Body)
							require.NoError(t, err)
							ctx.Request.Body = io.NopCloser(bytes.NewReader(append(body, ' ')))
						}
						if tc.serial != "" {
							ctx.Request.Header.Set("BinancePay-Certificate-SN", tc.serial)
						}
						BinancePayWebhook(ctx)
						assert.Equal(t, tc.want, response.Code)
						order := model.GetTopUpByTradeNo(checkoutTradeNo)
						require.NotNil(t, order)
						assert.Equal(t, common.TopUpStatusPending, order.Status)
					})
				}
			})

			t.Run("settles once under duplicate callbacks and enforces wallet limits", func(t *testing.T) {
				require.NoError(t, setting.UpdateBinancePayOption("BinancePayAllowedUserIDs", "[]"))
				require.NoError(t, setting.UpdateBinancePayOption("BinancePayEnabled", "false"))
				var workers sync.WaitGroup
				for range 2 {
					workers.Go(func() {
						assert.NoError(t, model.RechargeBinancePay(checkoutTradeNo, "USDT", decimal.RequireFromString("11.25"), "127.0.0.1"))
					})
				}
				workers.Wait()
				// Replaying an authentic webhook must also acknowledge success,
				// including after its user is removed and checkout is disabled.
				for range 2 {
					ctx, response := binancePaySignedNotification(t, privateKey, map[string]any{
						"merchantTradeNo": checkoutTradeNo, "currency": "USDT", "totalFee": json.Number("11.25"),
					}, "PAY_SUCCESS", 0)
					BinancePayWebhook(ctx)
					assert.Equal(t, http.StatusOK, response.Code)
					assert.JSONEq(t, `{"returnCode":"SUCCESS"}`, response.Body.String())
				}
				// Verify a first successful payment through the signed webhook too.
				webhookOrder := model.TopUp{UserId: 42, Amount: 1, Money: 1, TradeNo: "BINANCEWEBHOOK", PaymentMethod: model.PaymentMethodBinancePay, PaymentProvider: model.PaymentProviderBinancePay, Status: common.TopUpStatusPending}
				require.NoError(t, webhookOrder.Insert())
				ctx, response := binancePaySignedNotification(t, privateKey, map[string]any{
					"merchantTradeNo": webhookOrder.TradeNo, "currency": "USDT", "totalFee": json.Number("1.00"),
				}, "PAY_SUCCESS", 0)
				BinancePayWebhook(ctx)
				assert.JSONEq(t, `{"returnCode":"SUCCESS"}`, response.Body.String())
				var user model.User
				require.NoError(t, db.First(&user, 42).Error)
				assert.Equal(t, 5_500_003, user.Quota)
				var logCount int64
				require.NoError(t, logDB.Model(&model.Log{}).Where("user_id = ? AND type = ?", 42, model.LogTypeTopup).Count(&logCount).Error)
				assert.Equal(t, int64(2), logCount)
				for _, tc := range []struct {
					name, provider, status string
					amount                 int64
					quota                  int
					wantErr                error
				}{
					{"foreign", model.PaymentProviderStripe, common.TopUpStatusPending, 1, 3, model.ErrPaymentMethodMismatch},
					{"expired", model.PaymentProviderBinancePay, common.TopUpStatusExpired, 1, 3, model.ErrTopUpStatusInvalid},
					{"wallet limit", model.PaymentProviderBinancePay, common.TopUpStatusPending, 1, common.MaxWalletQuota, model.ErrTopUpQuotaLimitExceeded},
					{"oversized quantity", model.PaymentProviderBinancePay, common.TopUpStatusPending, 9223372036854775807, 3, model.ErrInvalidTopUpQuota},
				} {
					t.Run(tc.name, func(t *testing.T) {
						require.NoError(t, db.Model(&model.User{}).Where("id = ?", 42).Update("quota", tc.quota).Error)
						order := model.TopUp{UserId: 42, Amount: tc.amount, Money: 1, TradeNo: "BINANCE" + tc.name, PaymentMethod: model.PaymentMethodBinancePay, PaymentProvider: tc.provider, Status: tc.status}
						require.NoError(t, order.Insert())
						assert.ErrorIs(t, model.RechargeBinancePay(order.TradeNo, "USDT", decimal.NewFromInt(1), "127.0.0.1"), tc.wantErr)
						require.NoError(t, db.First(&user, 42).Error)
						assert.Equal(t, tc.quota, user.Quota)
						assert.Equal(t, tc.status, model.GetTopUpByTradeNo(order.TradeNo).Status)
					})
				}
			})
		})
	}
}
