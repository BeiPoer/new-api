import {
  resolveLocalizedText,
  type LocalizedTextValue,
} from '@/lib/localized-text'

/** A plugin's name in the interface language, or its plain name without one. */
export function localizedPluginName(
  plugin: { name: string; name_i18n?: LocalizedTextValue | null },
  language: string
): string {
  return resolveLocalizedText(plugin.name_i18n, language) || plugin.name
}
