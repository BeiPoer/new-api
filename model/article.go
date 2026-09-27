/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
*/
package model

import (
	"strings"
	"unicode"
	"time"

	"gorm.io/gorm"
)

const (
	ArticleStatusDraft     = "draft"
	ArticleStatusPublished = "published"
)

type Article struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Title       string         `json:"title" gorm:"size:200;not null"`
	Slug        string         `json:"slug" gorm:"size:220"`
	Summary     string         `json:"summary" gorm:"size:500"`
	SEOTitle    string         `json:"seo_title" gorm:"size:200"`
	SEODescription string      `json:"seo_description" gorm:"size:500"`
	CoverImage  string         `json:"cover_image" gorm:"size:500"`
	Content     string         `json:"content" gorm:"type:text;not null"`
	PublishTime time.Time      `json:"publish_time" gorm:"index;not null"`
	Status      string         `json:"status" gorm:"size:20;index;not null"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func MakeArticleSlug(title string) string {
	var builder strings.Builder
	for _, r := range strings.ToLower(strings.TrimSpace(title)) {
		if unicode.IsLetter(r) || unicode.IsNumber(r) { builder.WriteRune(r) } else if builder.Len() > 0 && !strings.HasSuffix(builder.String(), "-") { builder.WriteByte('-') }
	}
	slug := strings.Trim(builder.String(), "-")
	if slug == "" { return "article" }
	return slug
}

func ListPublishedArticles(now time.Time) ([]Article, error) {
	var articles []Article
	err := DB.Where("status = ? AND publish_time <= ?", ArticleStatusPublished, now).
		Order("publish_time DESC").Find(&articles).Error
	return articles, err
}

func GetPublishedArticle(id uint, now time.Time) (*Article, error) {
	var article Article
	err := DB.Where("id = ? AND status = ? AND publish_time <= ?", id, ArticleStatusPublished, now).
		First(&article).Error
	if err != nil {
		return nil, err
	}
	return &article, nil
}

func GetPublishedArticleBySlug(slug string, now time.Time) (*Article, error) {
	var article Article
	err := DB.Where("slug = ? AND status = ? AND publish_time <= ?", slug, ArticleStatusPublished, now).First(&article).Error
	if err != nil { return nil, err }
	return &article, nil
}

func ListArticles() ([]Article, error) {
	var articles []Article
	err := DB.Order("publish_time DESC").Order("id DESC").Find(&articles).Error
	return articles, err
}
