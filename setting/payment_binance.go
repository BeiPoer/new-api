package setting

import (
	"errors"
	"math"
	"slices"
	"strconv"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

// Binance Pay orders are denominated in USDT. Keeping the currency fixed also
// lets outstanding orders settle safely after an administrator changes prices.
const BinancePayCurrency = "USDT"

type BinancePayConfig struct {
	Enabled        bool
	APIKey         string
	SecretKey      string
	AllowedUserIDs string
	UnitPrice      float64
	MinTopUp       int
}

var binancePayMutex sync.RWMutex
var binancePayConfig = BinancePayConfig{AllowedUserIDs: "[]", UnitPrice: 1, MinTopUp: 1}

func GetBinancePayConfig() BinancePayConfig {
	binancePayMutex.RLock()
	defer binancePayMutex.RUnlock()
	return binancePayConfig
}

func (cfg BinancePayConfig) Configured() bool {
	return cfg.APIKey != "" && cfg.SecretKey != ""
}

func (cfg BinancePayConfig) AllowsUser(userID int) bool {
	if userID <= 0 {
		return false
	}
	var userIDs []int
	return common.UnmarshalJsonStr(cfg.AllowedUserIDs, &userIDs) == nil && slices.Contains(userIDs, userID)
}

func BinancePayOptionDefaults() map[string]string {
	cfg := GetBinancePayConfig()
	return map[string]string{
		"BinancePayEnabled":        strconv.FormatBool(cfg.Enabled),
		"BinancePayAPIKey":         cfg.APIKey,
		"BinancePaySecretKey":      cfg.SecretKey,
		"BinancePayAllowedUserIDs": cfg.AllowedUserIDs,
		"BinancePayUnitPrice":      strconv.FormatFloat(cfg.UnitPrice, 'f', -1, 64),
		"BinancePayMinTopUp":       strconv.Itoa(cfg.MinTopUp),
	}
}

func ValidateBinancePayOption(key, value string) error {
	switch key {
	case "BinancePayEnabled":
		if value != "true" && value != "false" {
			return errors.New("Binance Pay enabled must be true or false")
		}
	case "BinancePayAPIKey", "BinancePaySecretKey":
		if strings.ContainsAny(value, "\r\n") {
			return errors.New("invalid Binance Pay API credentials")
		}
	case "BinancePayAllowedUserIDs":
		var userIDs []int
		if err := common.UnmarshalJsonStr(value, &userIDs); err != nil || userIDs == nil {
			return errors.New("Binance Pay allowed user IDs must be a JSON array of positive integers")
		}
		for _, userID := range userIDs {
			if userID <= 0 || int64(userID) > int64(common.MaxWalletQuota) {
				return errors.New("Binance Pay allowed user IDs must be positive safe integers")
			}
		}
	case "BinancePayUnitPrice":
		price, err := strconv.ParseFloat(value, 64)
		if err != nil || price <= 0 || math.IsNaN(price) || math.IsInf(price, 0) {
			return errors.New("Binance Pay unit price must be finite and greater than zero")
		}
	case "BinancePayMinTopUp":
		amount, err := strconv.Atoi(value)
		if err != nil || amount < 1 || int64(amount) > int64(common.MaxWalletQuota) {
			return errors.New("invalid Binance Pay minimum top-up amount")
		}
	default:
		return errors.New("unknown Binance Pay option")
	}
	return nil
}

func UpdateBinancePayOption(key, value string) error {
	if err := ValidateBinancePayOption(key, value); err != nil {
		return err
	}
	binancePayMutex.Lock()
	defer binancePayMutex.Unlock()
	switch key {
	case "BinancePayEnabled":
		binancePayConfig.Enabled = value == "true"
	case "BinancePayAPIKey":
		binancePayConfig.APIKey = strings.TrimSpace(value)
	case "BinancePaySecretKey":
		binancePayConfig.SecretKey = strings.TrimSpace(value)
	case "BinancePayAllowedUserIDs":
		binancePayConfig.AllowedUserIDs = value
	case "BinancePayUnitPrice":
		binancePayConfig.UnitPrice, _ = strconv.ParseFloat(value, 64)
	case "BinancePayMinTopUp":
		binancePayConfig.MinTopUp, _ = strconv.Atoi(value)
	}
	return nil
}
