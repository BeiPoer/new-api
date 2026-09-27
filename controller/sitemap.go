package controller

import (
	"encoding/xml"
	"net/http"
	"time"
	"strconv"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type sitemapURL struct { Loc string `xml:"loc"`; LastMod string `xml:"lastmod,omitempty"` }
type sitemap struct { XMLName xml.Name `xml:"urlset"`; Xmlns string `xml:"xmlns,attr"`; URLs []sitemapURL `xml:"url"` }

func GetSitemap(c *gin.Context) {
	articles, err := model.ListPublishedArticles(time.Now()); if err != nil { c.Status(http.StatusInternalServerError); return }
	base := requestOrigin(c)
	urls := []sitemapURL{{Loc: base + "/articles"}}
	for _, article := range articles { slug := article.Slug; if slug == "" { slug = strconv.FormatUint(uint64(article.ID), 10) }; urls = append(urls, sitemapURL{Loc: base + "/articles/" + slug, LastMod: article.UpdatedAt.UTC().Format("2006-01-02")}) }
	data, err := xml.Marshal(sitemap{Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9", URLs: urls}); if err != nil { c.Status(http.StatusInternalServerError); return }
	c.Data(http.StatusOK, "application/xml; charset=utf-8", append([]byte(xml.Header), data...))
}

func requestOrigin(c *gin.Context) string { scheme := "http"; if c.Request.TLS != nil { scheme = "https" }; return scheme + "://" + c.Request.Host }
