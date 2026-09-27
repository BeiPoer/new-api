/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
*/
package controller

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type articleRequest struct {
	Title       string    `json:"title" binding:"required,max=200"`
	Slug        string    `json:"slug" binding:"max=220"`
	Summary     string    `json:"summary" binding:"max=500"`
	SEOTitle    string    `json:"seo_title" binding:"max=200"`
	SEODescription string `json:"seo_description" binding:"max=500"`
	CoverImage  string    `json:"cover_image" binding:"max=500"`
	Content     string    `json:"content" binding:"required"`
	PublishTime time.Time `json:"publish_time" binding:"required"`
	Status      string    `json:"status" binding:"required,oneof=draft published"`
}

func GetArticles(c *gin.Context) {
	articles, err := model.ListPublishedArticles(time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to load articles"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": articles})
}

func GetArticle(c *gin.Context) {
	article, err := model.GetPublishedArticleBySlug(c.Param("slug"), time.Now())
	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		if id, parseErr := strconv.ParseUint(c.Param("slug"), 10, 32); parseErr == nil { article, err = model.GetPublishedArticle(uint(id), time.Now()) }
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "article not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to load article"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": article})
}

func AdminListArticles(c *gin.Context) {
	articles, err := model.ListArticles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to load articles"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": articles})
}

func AdminCreateArticle(c *gin.Context) {
	var request articleRequest
	if err := c.ShouldBindJSON(&request); err != nil || strings.TrimSpace(request.Title) == "" || len(request.Content) > 1000000 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid article"})
		return
	}
	slug := ""; if request.Slug != "" { slug = model.MakeArticleSlug(request.Slug) }
	article := model.Article{Title: strings.TrimSpace(request.Title), Slug: slug, Summary: request.Summary, SEOTitle: request.SEOTitle, SEODescription: request.SEODescription, CoverImage: request.CoverImage, Content: request.Content, PublishTime: request.PublishTime, Status: request.Status}
	if err := model.DB.Create(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to create article"})
		return
	}
	scheduleArticleAIMetadata(article.ID, article.Title, article.Content)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": article})
}

func AdminUpdateArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid article id"})
		return
	}
	var request articleRequest
	if err := c.ShouldBindJSON(&request); err != nil || strings.TrimSpace(request.Title) == "" || len(request.Content) > 1000000 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid article"})
		return
	}
	var article model.Article
	if err := model.DB.First(&article, uint(id)).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "article not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to load article"})
		return
	}
	article.Title = strings.TrimSpace(request.Title)
	if request.Slug != "" { article.Slug = model.MakeArticleSlug(request.Slug) }
	article.Summary, article.SEOTitle, article.SEODescription, article.CoverImage = request.Summary, request.SEOTitle, request.SEODescription, request.CoverImage
	article.Content = request.Content
	article.PublishTime = request.PublishTime
	article.Status = request.Status
	if err := model.DB.Save(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to update article"})
		return
	}
	scheduleArticleAIMetadata(article.ID, article.Title, article.Content)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": article})
}

func AdminDeleteArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid article id"})
		return
	}
	result := model.DB.Delete(&model.Article{}, uint(id))
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to delete article"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "article not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
