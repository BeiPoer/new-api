import type { PermissionMatrixGroup } from '@/components/permission-matrix'

import type { AccessTokenCatalog, AccessTokenGroup } from '../api'

const GROUP_LABELS: Record<AccessTokenGroup, string> = {
  personal: 'Personal',
  admin: 'Administration',
  system: 'System',
}

// accessTokenPermissionGroups lists the catalog groups that offer at least one
// resource, labelled for the permission picker.
export function accessTokenPermissionGroups(
  catalog: AccessTokenCatalog
): PermissionMatrixGroup[] {
  return catalog.groups
    .filter((group) => group.resources.length > 0)
    .map((group) => ({
      key: group.group,
      labelKey: GROUP_LABELS[group.group],
      resources: group.resources,
    }))
}
