import { api } from '@/lib/http-client'

export type Article = {
  id: number
  title: string
  slug: string
  summary: string
  seo_title: string
  seo_description: string
  cover_image: string
  content: string
  publish_time: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

type ArticleResponse = { success: boolean; data: Article }
type ArticlesResponse = { success: boolean; data: Article[] }

export async function getArticles(): Promise<ArticlesResponse> {
  return (await api.get('/api/articles')).data
}

export async function getArticle(slug: string): Promise<ArticleResponse> {
  return (await api.get(`/api/articles/${encodeURIComponent(slug)}`)).data
}

export async function getAdminArticles(): Promise<ArticlesResponse> {
  return (await api.get('/api/admin/articles')).data
}

export type ArticleInput = Pick<Article, 'title' | 'slug' | 'summary' | 'seo_title' | 'seo_description' | 'cover_image' | 'content' | 'publish_time' | 'status'>

export async function createArticle(input: ArticleInput): Promise<ArticleResponse> {
  return (await api.post('/api/admin/articles', input)).data
}

export async function updateArticle(id: number, input: ArticleInput): Promise<ArticleResponse> {
  return (await api.put(`/api/admin/articles/${id}`, input)).data
}

export async function deleteArticle(id: number): Promise<{ success: boolean }> {
  return (await api.delete(`/api/admin/articles/${id}`)).data
}

export type ArticleAIConfig = { api_url: string; model: string; has_api_key: boolean }
export async function getArticleAIConfig(): Promise<{ success: boolean; data: ArticleAIConfig }> { return (await api.get('/api/admin/articles/ai-config')).data }
export async function updateArticleAIConfig(input: { api_url: string; api_key?: string; model: string }): Promise<{ success: boolean; data: ArticleAIConfig }> { return (await api.put('/api/admin/articles/ai-config', input)).data }
export async function generateArticleMetadata(input: Pick<Article, 'title' | 'content'>): Promise<{ success: boolean; data: Pick<Article, 'slug' | 'summary' | 'seo_title' | 'seo_description'> }> { return (await api.post('/api/admin/articles/generate-metadata', input)).data }
