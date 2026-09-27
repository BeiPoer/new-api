import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { getArticles } from '@/features/articles/api'
import { requireServerSuccess } from '@/lib/server-error-message'
import dayjs from '@/lib/dayjs'

export const Route = createFileRoute('/articles/')({ component: ArticlesPage })

function ArticlesPage() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['articles'],
    queryFn: async () => requireServerSuccess(await getArticles()),
  })

  return (
    <PublicLayout>
      <div className='mx-auto max-w-4xl space-y-6 py-8'>
        <h1 className='text-3xl font-semibold'>{t('News')}</h1>
        {query.isLoading && <Skeleton className='h-32 w-full' />}
        {query.isError && <p className='text-destructive'>{t('Failed to load articles')}</p>}
        {!query.isLoading && !query.isError && query.data?.data.length === 0 && (
          <p className='text-muted-foreground'>{t('No articles yet')}</p>
        )}
        <div className='space-y-3'>
          {query.data?.data.map((article) => (
            <Link
              key={article.id}
              to='/articles/$slug'
              params={{ slug: article.slug || String(article.id) }}
              className='border-border hover:border-primary/50 block rounded-lg border p-5 transition-colors'
            >
              <h2 className='text-xl font-medium'>{article.title}</h2>
              <time className='text-muted-foreground mt-2 block text-sm'>
                {dayjs(article.publish_time).format('YYYY-MM-DD')}
              </time>
            </Link>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
