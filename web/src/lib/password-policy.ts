import { z } from 'zod'

export const ACCOUNT_PASSWORD_MIN_LENGTH = 8
export const ACCOUNT_PASSWORD_MAX_LENGTH = 128

// Match the backend's Unicode character count without modifying the password.
export function countPasswordCharacters(password: string): number {
  return [...password].length
}

export const accountPasswordSchema = z.string().refine((password) => {
  const length = countPasswordCharacters(password)
  return (
    length >= ACCOUNT_PASSWORD_MIN_LENGTH &&
    length <= ACCOUNT_PASSWORD_MAX_LENGTH
  )
}, 'Password must contain between 8 and 128 characters.')
