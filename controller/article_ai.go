package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

const (
	articleAIURLKey   = "article_ai.api_url"
	articleAIKeyKey   = "article_ai.api_key"
	articleAIModelKey = "article_ai.model"
)

type articleAIMetadata struct {
	Slug           string `json:"slug"`
	Summary        string `json:"summary"`
	SEOTitle       string `json:"seo_title"`
	SEODescription string `json:"seo_description"`
}

type articleAIRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

type articleAIConfigRequest struct {
	APIURL string `json:"api_url"`
	APIKey string `json:"api_key"`
	Model  string `json:"model"`
}

func articleAIConfig() (string, string, string) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	return strings.TrimRight(strings.TrimSpace(common.OptionMap[articleAIURLKey]), "/"), strings.TrimSpace(common.OptionMap[articleAIKeyKey]), strings.TrimSpace(common.OptionMap[articleAIModelKey])
}

func GetArticleAIConfig(c *gin.Context) {
	apiURL, apiKey, modelName := articleAIConfig()
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"api_url": apiURL, "model": modelName, "has_api_key": apiKey != ""}})
}

func UpdateArticleAIConfig(c *gin.Context) {
	var request articleAIConfigRequest
	if err := c.ShouldBindJSON(&request); err != nil { c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid AI configuration"}); return }
	if request.APIURL != "" {
		parsed, err := url.Parse(strings.TrimSpace(request.APIURL)); if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" { c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid API URL"}); return }
		if err := model.UpdateOption(articleAIURLKey, strings.TrimRight(strings.TrimSpace(request.APIURL), "/")); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()}); return }
	}
	if request.APIKey != "" { if err := model.UpdateOption(articleAIKeyKey, strings.TrimSpace(request.APIKey)); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()}); return } }
	if request.Model != "" { if err := model.UpdateOption(articleAIModelKey, strings.TrimSpace(request.Model)); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()}); return } }
	GetArticleAIConfig(c)
}

func GenerateArticleAIMetadata(c *gin.Context) {
	var request articleAIRequest
	if err := c.ShouldBindJSON(&request); err != nil || strings.TrimSpace(request.Title) == "" || strings.TrimSpace(request.Content) == "" { c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "title and content are required"}); return }
	metadata, err := generateArticleAIMetadata(c.Request.Context(), request.Title, request.Content)
	if err != nil { c.JSON(http.StatusBadGateway, gin.H{"success": false, "message": err.Error()}); return }
	c.JSON(http.StatusOK, gin.H{"success": true, "data": metadata})
}

func generateArticleAIMetadata(ctx context.Context, title, content string) (articleAIMetadata, error) {
	apiURL, apiKey, modelName := articleAIConfig()
	if apiURL == "" || apiKey == "" { return articleAIMetadata{}, errors.New("article AI is not configured") }
	if modelName == "" { modelName = "gpt-4o-mini" }
	payload := map[string]any{"model": modelName, "temperature": 0.2, "messages": []map[string]string{{"role": "system", "content": "Generate SEO metadata for an article. Return JSON only with exactly these string fields: slug, summary, seo_title, seo_description. Use a URL-safe lowercase slug. Do not include markdown fences."}, {"role": "user", "content": fmt.Sprintf("Title:\n%s\n\nArticle HTML:\n%s", title, content)}}}
	body, err := common.Marshal(payload); if err != nil { return articleAIMetadata{}, err }
	endpoint := apiURL + "/v1/chat/completions"
	if strings.HasSuffix(apiURL, "/v1") { endpoint = apiURL + "/chat/completions" } else if strings.HasSuffix(apiURL, "/chat/completions") { endpoint = apiURL }
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body)); if err != nil { return articleAIMetadata{}, err }
	req.Header.Set("Authorization", "Bearer "+apiKey); req.Header.Set("Content-Type", "application/json")
	response, err := service.GetSSRFProtectedHTTPClient().Do(req); if err != nil { return articleAIMetadata{}, err }; defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 { return articleAIMetadata{}, fmt.Errorf("AI API returned status %d", response.StatusCode) }
	var result struct { Choices []struct { Message struct { Content string `json:"content"` } `json:"message"` } `json:"choices"` }
	if err := common.DecodeJson(response.Body, &result); err != nil || len(result.Choices) == 0 { return articleAIMetadata{}, errors.New("invalid AI response") }
	var metadata articleAIMetadata
	if err := common.Unmarshal([]byte(strings.TrimSpace(result.Choices[0].Message.Content)), &metadata); err != nil { return articleAIMetadata{}, errors.New("AI response was not valid metadata JSON") }
	metadata.Slug = model.MakeArticleSlug(metadata.Slug); if metadata.Summary == "" || metadata.SEOTitle == "" || metadata.SEODescription == "" { return articleAIMetadata{}, errors.New("AI response missing metadata") }
	return metadata, nil
}

func fillArticleAIMetadata(ctx context.Context, request *articleRequest) error {
	if request.Slug != "" && request.Summary != "" && request.SEOTitle != "" && request.SEODescription != "" { return nil }
	metadata, err := generateArticleAIMetadata(ctx, request.Title, request.Content); if err != nil { return err }
	if request.Slug == "" { request.Slug = metadata.Slug }; if request.Summary == "" { request.Summary = metadata.Summary }; if request.SEOTitle == "" { request.SEOTitle = metadata.SEOTitle }; if request.SEODescription == "" { request.SEODescription = metadata.SEODescription }
	return nil
}

func scheduleArticleAIMetadata(id uint, title, content string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		metadata, err := generateArticleAIMetadata(ctx, title, content)
		if err != nil { logger.LogWarn(ctx, "article AI metadata generation failed: %v", err); return }
		updates := map[string]any{}
		if metadata.Slug != "" { updates["slug"] = metadata.Slug }
		if metadata.Summary != "" { updates["summary"] = metadata.Summary }
		if metadata.SEOTitle != "" { updates["seo_title"] = metadata.SEOTitle }
		if metadata.SEODescription != "" { updates["seo_description"] = metadata.SEODescription }
		for field, value := range updates {
			model.DB.Model(&model.Article{}).Where("id = ? AND ("+field+" = '' OR "+field+" IS NULL)", id).Update(field, value)
		}
	}()
}
