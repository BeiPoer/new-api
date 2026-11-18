import type { LogOtherData } from '../types'

export type ResponseModelObservation = NonNullable<
  LogOtherData['response_model']
>

/**
 * Decide whether an upstream response model deserves a mismatch warning.
 *
 * Mirrors relay/common/response_model.go: ignoring case, the returned name is
 * compatible when it starts with the requested or upstream model (dated
 * versions, variants) or ends with it (provider paths such as
 * "deepseek/deepseek-v4.1-flash"). Nothing is stored; every row is judged
 * with the current rule.
 */
export function isResponseModelMismatch(
  observation: ResponseModelObservation | undefined
): boolean {
  if (!observation) return false
  const returned = (observation.returned_model ?? '').toLowerCase()
  if (returned.trim() === '') return false
  for (const candidate of [
    observation.requested_model,
    observation.upstream_model,
  ]) {
    const expected = (candidate ?? '').toLowerCase()
    if (expected === '') continue
    if (returned.startsWith(expected) || returned.endsWith(expected)) {
      return false
    }
  }
  return true
}
