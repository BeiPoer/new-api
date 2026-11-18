import type { TFunction } from 'i18next'

import type {
  PluginDocumentFormatError,
  PluginDocumentProblemCode,
} from './plugin-document'

/** Where a usage guide or changelog breaks a rule, such as "README.md line 5: HTML is not allowed". */
export function describePluginDocumentProblem(
  t: TFunction,
  error: PluginDocumentFormatError
): string {
  const readme = error.file.startsWith('README')
  const reasons: Record<PluginDocumentProblemCode, string> = {
    encoding: t('The file is not UTF-8 text'),
    front_matter: t('The metadata at the top of the file is invalid'),
    changelog_version: t('changelogVersion must be 1'),
    identity: readme
      ? t('The language in the metadata does not match the file')
      : t('The plugin, version or language in the metadata does not match'),
    translation: t('The list of translations is invalid'),
    title: readme
      ? t('The guide must start with a level-1 heading')
      : t('The # Changelog heading is missing'),
    release_heading: t(
      'The version heading is missing or names another version'
    ),
    unknown_category: t('Unknown category heading'),
    category_order: t('Categories are out of order'),
    category_list: t('Each category needs one bulleted list below it'),
    entry: t('Each entry must be one paragraph of text'),
    html: t('HTML is not allowed'),
    image: t('Images are not allowed'),
    unsupported: t('This content is not allowed here'),
    link: t('Links must use http, https or mailto, or be relative'),
    no_change: t('No changes are listed'),
  }
  const reason = reasons[error.code]
  if (error.line === null) {
    return t('{{file}}: {{reason}}', { file: error.file, reason })
  }
  return t('{{file}} line {{line}}: {{reason}}', {
    file: error.file,
    line: error.line,
    reason,
  })
}
