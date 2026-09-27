import { createFileRoute, redirect } from '@tanstack/react-router'

import { ArticlesSection } from '@/features/system-settings/content/articles-section'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/article-management')({
  beforeLoad: () => {
    if (useAuthStore.getState().auth.user?.role !== ROLE.SUPER_ADMIN) {
      throw redirect({ to: '/403' })
    }
  },
  component: ArticleManagement,
})

function ArticleManagement() {
  return <ArticlesSection />
}
