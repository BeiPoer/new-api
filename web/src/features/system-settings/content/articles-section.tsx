import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { StaticDataTable } from '@/components/data-table/static/static-data-table'
import { StaticRowActions } from '@/components/data-table/static/static-row-actions'
import { Dialog } from '@/components/dialog'
import { RichTextEditor } from '@/components/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAdminArticles, createArticle, deleteArticle, updateArticle, getArticleAIConfig, updateArticleAIConfig, generateArticleMetadata, type Article, type ArticleInput } from '@/features/articles/api'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'
import dayjs from '@/lib/dayjs'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { SettingsSection } from '../components/settings-section'

const emptyArticle: ArticleInput = {
  title: '',
  slug: '',
  summary: '',
  seo_title: '',
  seo_description: '',
  cover_image: '',
  content: '',
  publish_time: new Date().toISOString(),
  status: 'draft',
}

function toInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 16)
}

export function ArticlesSection() {
  const { t } = useTranslation()
  const canConfigureAI = useAuthStore((state) => state.auth.user?.role === ROLE.SUPER_ADMIN)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Article | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ArticleInput>(emptyArticle)
  const [aiConfig, setAiConfig] = useState({ api_url: '', api_key: '', model: 'gpt-4o-mini', has_api_key: false })
  const [aiGenerating, setAiGenerating] = useState(false)
  const aiConfigQuery = useQuery({ queryKey: ['article-ai-config'], queryFn: async () => requireServerSuccess(await getArticleAIConfig()), enabled: canConfigureAI })
  const query = useQuery({
    queryKey: ['admin-articles'],
    queryFn: async () => requireServerSuccess(await getAdminArticles()),
  })
  const save = useMutation({
    mutationFn: (input: ArticleInput) =>
      editing ? updateArticle(editing.id, input) : createArticle(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['articles'] })
      setEditing(null)
      setDialogOpen(false)
      toast.success(t('Article saved'))
    },
    onError: (error) => handleServerError(error, t('Failed to save article')),
  })
  const remove = useMutation({
    mutationFn: deleteArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['articles'] })
      toast.success(t('Article deleted'))
    },
    onError: (error) => handleServerError(error, t('Failed to delete article')),
  })
  const saveAIConfig = useMutation({ mutationFn: updateArticleAIConfig, onSuccess: (result) => { setAiConfig((current) => ({ ...current, ...result.data, api_key: '' })); toast.success(t('AI settings saved')) }, onError: (error) => handleServerError(error, t('Failed to save AI settings')) })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyArticle)
    setDialogOpen(true)
  }
  const generateMetadata = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error(t('Title and content are required')); return }
    setAiGenerating(true)
    try { const result = await generateArticleMetadata({ title: form.title, content: form.content }); setForm((current) => ({ ...current, ...result.data })); toast.success(t('Metadata generated')) } catch (error) { handleServerError(error, t('Failed to generate metadata')) } finally { setAiGenerating(false) }
  }
  const openEdit = (article: Article) => {
    setEditing(article)
    setForm({ title: article.title, slug: article.slug, summary: article.summary, seo_title: article.seo_title, seo_description: article.seo_description, cover_image: article.cover_image, content: article.content, publish_time: article.publish_time, status: article.status })
    setDialogOpen(true)
  }

  return (
    <SettingsSection title={t('Article Management')}>
      {canConfigureAI && (
      <div className='space-y-3 rounded-lg border p-4'>
        <h4 className='font-medium'>{t('AI metadata generation')}</h4>
        <div className='grid gap-3 md:grid-cols-3'>
          <Input aria-label={t('AI API URL')} placeholder='https://api.openai.com' value={aiConfig.api_url || aiConfigQuery.data?.data.api_url || ''} onChange={(event) => setAiConfig({ ...aiConfig, api_url: event.target.value })} />
          <Input aria-label={t('AI API key')} type='password' placeholder={aiConfig.has_api_key ? t('Key is configured') : t('AI API key')} value={aiConfig.api_key} onChange={(event) => setAiConfig({ ...aiConfig, api_key: event.target.value })} />
          <Input aria-label={t('AI model')} placeholder='gpt-4o-mini' value={aiConfig.model || aiConfigQuery.data?.data.model || ''} onChange={(event) => setAiConfig({ ...aiConfig, model: event.target.value })} />
        </div>
        <Button size='sm' variant='secondary' disabled={saveAIConfig.isPending} onClick={() => saveAIConfig.mutate({ api_url: aiConfig.api_url || aiConfigQuery.data?.data.api_url || '', api_key: aiConfig.api_key || undefined, model: aiConfig.model || aiConfigQuery.data?.data.model || 'gpt-4o-mini' })}>{t('Save AI settings')}</Button>
      </div>
      )}
      <div className='flex items-center justify-between'>
        <Button onClick={openCreate} size='sm'><Plus className='mr-2 size-4' />{t('Add Article')}</Button>
      </div>
      <StaticDataTable
        data={query.data?.data ?? []}
        getRowKey={(article) => article.id}
        emptyContent={t('No articles yet')}
        columns={[
          { id: 'title', header: t('Title'), cell: (article) => article.title },
          { id: 'publish-time', header: t('Publish Date'), cell: (article) => dayjs(article.publish_time).format('YYYY-MM-DD HH:mm') },
          { id: 'status', header: t('Status'), cell: (article) => t(article.status === 'published' ? 'Published' : 'Draft') },
          { id: 'actions', header: t('Actions'), cell: (article) => <StaticRowActions editLabel={t('Edit')} deleteLabel={t('Delete')} menuLabel={t('Open menu')} onEdit={() => openEdit(article)} onDelete={() => remove.mutate(article.id)} /> },
        ]}
      />
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }} title={editing ? t('Edit Article') : t('Add Article')} contentClassName='max-w-2xl' footer={<><Button variant='outline' onClick={() => setDialogOpen(false)}>{t('Cancel')}</Button><Button disabled={save.isPending} onClick={() => save.mutate(form)}>{t('Save')}</Button></>}>
        <div className='space-y-4'>
          <Input aria-label={t('Title')} placeholder={t('Title')} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <Input aria-label={t('Slug')} placeholder={t('Slug (optional)')} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
          <Input aria-label={t('Summary')} placeholder={t('Summary')} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
          <Input aria-label={t('SEO title')} placeholder={t('SEO title (optional)')} value={form.seo_title} onChange={(event) => setForm({ ...form, seo_title: event.target.value })} />
          <Input aria-label={t('SEO description')} placeholder={t('SEO description (optional)')} value={form.seo_description} onChange={(event) => setForm({ ...form, seo_description: event.target.value })} />
          <Input aria-label={t('Cover image URL')} placeholder={t('Cover image URL (optional)')} value={form.cover_image} onChange={(event) => setForm({ ...form, cover_image: event.target.value })} />
          <div className='space-y-2'><RichTextEditor value={form.content} onChange={(content) => setForm({ ...form, content })} /><Button type='button' variant='outline' size='sm' disabled={aiGenerating} onClick={() => void generateMetadata()}><Sparkles className='mr-2 size-4' />{aiGenerating ? t('Generating...') : t('Generate metadata with AI')}</Button></div>
          <Input aria-label={t('Publish Date')} type='datetime-local' value={toInputValue(form.publish_time)} onChange={(event) => setForm({ ...form, publish_time: new Date(event.target.value).toISOString() })} />
          <label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={form.status === 'published'} onChange={(event) => setForm({ ...form, status: event.target.checked ? 'published' : 'draft' })} />{t('Published')}</label>
        </div>
      </Dialog>
    </SettingsSection>
  )
}
