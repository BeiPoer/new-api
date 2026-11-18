import { resolveModelProvider } from '@/lib/model-provider'

export function getModelCategory(modelName: string): string {
  return resolveModelProvider(modelName)?.name ?? 'Other'
}

export function categorizeModels(
  models: readonly string[]
): Record<string, string[]> {
  const categories: Record<string, string[]> = {}

  for (const model of models) {
    const category = getModelCategory(model)
    categories[category] ??= []
    categories[category].push(model)
  }

  return categories
}
