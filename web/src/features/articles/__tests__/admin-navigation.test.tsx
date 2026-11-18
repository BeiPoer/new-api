import { renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'

import { ROLE } from '@/lib/roles'

import { useSidebarData } from '../../../hooks/use-sidebar-data'

it.each([
  [ROLE.ADMIN, true],
  [ROLE.SUPER_ADMIN, true],
  [ROLE.USER, false],
  [ROLE.GUEST, false],
])('shows article management for role %i: %s', (role, visible) => {
  const { result } = renderHook(() => useSidebarData())
  const item = result.current.navGroups
    .find((group) => group.id === 'admin')
    ?.items.find((entry) => entry.title === 'Article Management')

  expect(item).toMatchObject({ requiredRole: ROLE.ADMIN })
  expect(role >= ROLE.ADMIN).toBe(visible)
})
