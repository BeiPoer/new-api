package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// Exercise the real route/middleware chain, including direct requests that bypass
// the UI (OWASP Authorization Cheat Sheet: validate permissions on every request).
func TestArticleManagementPermissions(t *testing.T) {
	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousMain, previousLog := common.MainDatabaseType(), common.LogDatabaseType()
	previousRedis, previousRateLimit, previousMaster := common.RedisEnabled, common.GlobalApiRateLimitEnable, common.IsMasterNode
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	require.NoError(t, db.AutoMigrate(&model.User{}, &model.Article{}, &model.AuditLog{}, &model.Log{}))
	model.DB, model.LOG_DB = db, db
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.RedisEnabled, common.GlobalApiRateLimitEnable, common.IsMasterNode = false, false, true
	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.SetDatabaseTypes(previousMain, previousLog)
		common.RedisEnabled, common.GlobalApiRateLimitEnable, common.IsMasterNode = previousRedis, previousRateLimit, previousMaster
		require.NoError(t, sqlDB.Close())
	})

	gin.SetMode(gin.TestMode)
	engine := gin.New()
	registerArticleRoutes(engine.Group("/api"))
	for _, actor := range []struct {
		name string
		role int
	}{
		{"visitor", 0},
		{"user", common.RoleCommonUser},
		{"admin", common.RoleAdminUser},
		{"root", common.RoleRootUser},
	} {
		t.Run(actor.name, func(t *testing.T) {
			token := "article-permissions-" + actor.name
			if actor.role != 0 {
				user := model.User{Username: actor.name, Password: "unused", Role: actor.role, Status: common.UserStatusEnabled, Group: "default", AccessToken: &token, AuthVersion: 1, AffCode: actor.name}
				require.NoError(t, db.Create(&user).Error)
			}
			for _, endpoint := range []struct {
				method        string
				path          string
				allowedStatus int
				rootOnly      bool
			}{
				{http.MethodGet, "/api/admin/articles", http.StatusOK, false},
				{http.MethodPost, "/api/admin/articles", http.StatusBadRequest, false},
				{http.MethodPut, "/api/admin/articles/0", http.StatusBadRequest, false},
				{http.MethodDelete, "/api/admin/articles/0", http.StatusNotFound, false},
				{http.MethodPost, "/api/admin/articles/generate-metadata", http.StatusBadRequest, false},
				{http.MethodGet, "/api/admin/articles/ai-config", http.StatusOK, true},
				{http.MethodPut, "/api/admin/articles/ai-config", http.StatusOK, true},
			} {
				t.Run(endpoint.method+endpoint.path, func(t *testing.T) {
					request := httptest.NewRequest(endpoint.method, endpoint.path, strings.NewReader(`{}`))
					request.Header.Set("Content-Type", "application/json")
					if actor.role != 0 {
						request.Header.Set("Authorization", "Bearer "+token)
					}
					response := httptest.NewRecorder()
					engine.ServeHTTP(response, request)
					want := endpoint.allowedStatus
					if actor.role == 0 {
						want = http.StatusUnauthorized
					} else if actor.role < common.RoleAdminUser || (endpoint.rootOnly && actor.role < common.RoleRootUser) {
						want = http.StatusForbidden
					}
					assert.Equal(t, want, response.Code, response.Body.String())
				})
			}
		})
	}
}
