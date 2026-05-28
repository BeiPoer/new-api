package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

func TestNormalizeRegisterPhoneDisabled(t *testing.T) {
	generalSetting := operation_setting.GetGeneralSetting()
	originalEnabled := generalSetting.RegisterPhoneEnabled
	originalRequired := generalSetting.RegisterPhoneRequired
	t.Cleanup(func() {
		generalSetting.RegisterPhoneEnabled = originalEnabled
		generalSetting.RegisterPhoneRequired = originalRequired
	})

	generalSetting.RegisterPhoneEnabled = false
	generalSetting.RegisterPhoneRequired = true

	phone, errKey := normalizeRegisterPhone("not-a-phone")
	if errKey != "" {
		t.Fatalf("expected no error when phone registration is disabled, got %q", errKey)
	}
	if phone != "" {
		t.Fatalf("expected disabled phone registration to discard submitted phone, got %q", phone)
	}
}

func TestNormalizeRegisterPhoneOptional(t *testing.T) {
	generalSetting := operation_setting.GetGeneralSetting()
	originalEnabled := generalSetting.RegisterPhoneEnabled
	originalRequired := generalSetting.RegisterPhoneRequired
	t.Cleanup(func() {
		generalSetting.RegisterPhoneEnabled = originalEnabled
		generalSetting.RegisterPhoneRequired = originalRequired
	})

	generalSetting.RegisterPhoneEnabled = true
	generalSetting.RegisterPhoneRequired = false

	phone, errKey := normalizeRegisterPhone("")
	if errKey != "" {
		t.Fatalf("expected empty optional phone to be accepted, got %q", errKey)
	}
	if phone != "" {
		t.Fatalf("expected empty optional phone to stay empty, got %q", phone)
	}

	phone, errKey = normalizeRegisterPhone("bad-phone")
	if errKey != i18n.MsgUserPhoneInvalid {
		t.Fatalf("expected invalid phone error, got phone=%q err=%q", phone, errKey)
	}

	phone, errKey = normalizeRegisterPhone(" 13800138000 ")
	if errKey != "" {
		t.Fatalf("expected valid optional phone to be accepted, got %q", errKey)
	}
	if phone != "13800138000" {
		t.Fatalf("expected phone to be trimmed, got %q", phone)
	}
}

func TestNormalizeRegisterPhoneRequired(t *testing.T) {
	generalSetting := operation_setting.GetGeneralSetting()
	originalEnabled := generalSetting.RegisterPhoneEnabled
	originalRequired := generalSetting.RegisterPhoneRequired
	t.Cleanup(func() {
		generalSetting.RegisterPhoneEnabled = originalEnabled
		generalSetting.RegisterPhoneRequired = originalRequired
	})

	generalSetting.RegisterPhoneEnabled = true
	generalSetting.RegisterPhoneRequired = true

	phone, errKey := normalizeRegisterPhone(" ")
	if errKey != i18n.MsgUserPhoneRequired {
		t.Fatalf("expected required phone error, got phone=%q err=%q", phone, errKey)
	}

	phone, errKey = normalizeRegisterPhone("13800138000")
	if errKey != "" {
		t.Fatalf("expected valid required phone to be accepted, got %q", errKey)
	}
	if phone != "13800138000" {
		t.Fatalf("expected phone to be kept, got %q", phone)
	}
}
