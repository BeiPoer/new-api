package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"math"
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

func TestGetAlipayPayMoneyUsesCNYDisplayAsOneToOne(t *testing.T) {
	oldDisplayType := operation_setting.GetGeneralSetting().QuotaDisplayType
	oldUSDExchangeRate := operation_setting.USDExchangeRate
	oldAlipayExchangeRate := setting.AlipayExchangeRate
	oldDiscount := operation_setting.GetPaymentSetting().AmountDiscount
	defer func() {
		operation_setting.GetGeneralSetting().QuotaDisplayType = oldDisplayType
		operation_setting.USDExchangeRate = oldUSDExchangeRate
		setting.AlipayExchangeRate = oldAlipayExchangeRate
		operation_setting.GetPaymentSetting().AmountDiscount = oldDiscount
	}()

	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeCNY
	operation_setting.USDExchangeRate = 7.3
	setting.AlipayExchangeRate = 9.9
	operation_setting.GetPaymentSetting().AmountDiscount = map[int]float64{}

	payMoney := getAlipayPayMoney(1, "default", false)
	if math.Abs(payMoney-1) > 0.000001 {
		t.Fatalf("payMoney = %v, want 1", payMoney)
	}
}

func TestGetAlipayPayMoneyUsesAlipayExchangeRateForUSDDisplay(t *testing.T) {
	oldDisplayType := operation_setting.GetGeneralSetting().QuotaDisplayType
	oldPrice := operation_setting.Price
	oldAlipayExchangeRate := setting.AlipayExchangeRate
	oldDiscount := operation_setting.GetPaymentSetting().AmountDiscount
	defer func() {
		operation_setting.GetGeneralSetting().QuotaDisplayType = oldDisplayType
		operation_setting.Price = oldPrice
		setting.AlipayExchangeRate = oldAlipayExchangeRate
		operation_setting.GetPaymentSetting().AmountDiscount = oldDiscount
	}()

	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD
	operation_setting.Price = 99
	setting.AlipayExchangeRate = 7.3
	operation_setting.GetPaymentSetting().AmountDiscount = map[int]float64{}

	payMoney := getAlipayPayMoney(2, "default", false)
	if math.Abs(payMoney-14.6) > 0.000001 {
		t.Fatalf("payMoney = %v, want 14.6", payMoney)
	}
}

func TestValidateAlipayTopUpQuota(t *testing.T) {
	oldDisplay, oldRate, oldUnit := operation_setting.GetGeneralSetting().QuotaDisplayType, operation_setting.USDExchangeRate, common.QuotaPerUnit
	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeCNY
	operation_setting.USDExchangeRate, common.QuotaPerUnit = 7, 500000
	t.Cleanup(func() {
		operation_setting.GetGeneralSetting().QuotaDisplayType = oldDisplay
		operation_setting.USDExchangeRate, common.QuotaPerUnit = oldRate, oldUnit
	})
	quota, err := validateAlipayTopUpQuota(14, true)
	require.NoError(t, err)
	assert.Equal(t, 1000000, quota)
	for _, amount := range []int64{0, -1, 9223372036854775807} {
		_, err := validateAlipayTopUpQuota(amount, true)
		require.Error(t, err)
	}
}
