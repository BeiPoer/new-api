import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { HtmlContent } from '@/components/html-content'
import { Skeleton } from '@/components/ui/skeleton'
import { getArticle } from '@/features/articles/api'
import { requireServerSuccess } from '@/lib/server-error-message'
import dayjs from '@/lib/dayjs'

export const Route = createFileRoute('/articles/$slug')({ component: ArticlePage })

function ArticlePage() {
  const { t } = useTranslation()
  const { slug } = Route.useParams()
  const query = useQuery({
    queryKey: ['articles', slug],
    queryFn: async () => requireServerSuccess(await getArticle(slug)),
  })
  const article = query.data?.data

  useEffect(() => {
    if (!article) return
    const title = article.seo_title || article.title
    const description = article.seo_description || article.summary
    document.title = title
    const setMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) {
        element = document.createElement('meta')
        if (property) element.setAttribute('property', name)
        else element.setAttribute('name', name)
        document.head.appendChild(element)
      }
      element.content = content
    }
    setMeta('description', description)
    setMeta('og:title', title, true); setMeta('og:description', description, true); setMeta('og:type', 'article', true); setMeta('og:url', window.location.href, true)
    if (article.cover_image) setMeta('og:image', article.cover_image, true)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = window.location.href
    const script = document.createElement('script'); script.type = 'application/ld+json'; script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: title, description, datePublished: article.publish_time, dateModified: article.updated_at, image: article.cover_image || undefined, mainEntityOfPage: window.location.href }); document.head.appendChild(script)
    return () => script.remove()
  }, [article])

  return (
    <PublicLayout>
      <div className='mx-auto max-w-4xl py-8'>
        <Link to='/articles' className='text-muted-foreground hover:text-foreground text-sm'>
          {t('Back to articles')}
        </Link>
        {query.isLoading && <Skeleton className='mt-6 h-10 w-2/3' />}
        {query.isError && <p className='text-destructive mt-6'>{t('Article not found')}</p>}
        {article && (
          <article className='mt-6 space-y-5'>
            <div>
              <h1 className='text-3xl font-semibold'>{article.title}</h1>
              <time className='text-muted-foreground mt-2 block text-sm'>
                {dayjs(article.publish_time).format('YYYY-MM-DD')}
              </time>
            </div>
            <HtmlContent content={article.content} variant='isolated' />
          </article>
        )}
      </div>
    </PublicLayout>
  )
}
