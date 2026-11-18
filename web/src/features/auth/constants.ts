import { z } from 'zod'

import { accountPasswordSchema } from '@/lib/password-policy'

// ============================================================================
// Form Schemas
// ============================================================================

export const PHONE_NUMBER_REGEX = /^1[3-9]\d{9}$/

export const loginFormSchema = z.object({
  username: z.string().min(1, 'Please enter your username or email'),
  password: z.string().min(1, 'Please enter your password'),
})

export function createRegisterFormSchema(
  phoneEnabled: boolean,
  phoneRequired: boolean
) {
  return z
    .object({
      username: z.string().min(1, 'Please enter your username'),
      phone: z
        .string()
        .trim()
        .superRefine((value, ctx) => {
          if (!phoneEnabled) return
          if (!value) {
            if (phoneRequired) {
              ctx.addIssue({
                code: 'custom',
                message: 'Please enter your phone number',
              })
            }
            return
          }
          if (!PHONE_NUMBER_REGEX.test(value)) {
            ctx.addIssue({
              code: 'custom',
              message: 'Please enter a valid phone number',
            })
          }
        }),
      email: z.string().optional(),
      password: accountPasswordSchema,
      confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match.",
      path: ['confirmPassword'],
    })
}

export const registerFormSchema = createRegisterFormSchema(false, false)

export const forgotPasswordFormSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address',
  }),
})

export const otpFormSchema = z.object({
  otp: z.string().min(1, 'Please enter a code.'),
})

// ============================================================================
// Validation Constants
// ============================================================================

export const PASSWORD_MIN_LENGTH = 8
export const OTP_LENGTH = 6
export const BACKUP_CODE_LENGTH = 9 // XXXX-XXXX format
export const BACKUP_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i
export const OTP_REGEX = /^\d{6}$/

// ============================================================================
// Countdown Constants
// ============================================================================

export const EMAIL_VERIFICATION_COUNTDOWN = 30 // seconds
export const PASSWORD_RESET_COUNTDOWN = 30 // seconds

// ============================================================================
// OAuth Constants
// ============================================================================

export const OAUTH_POPUP_CALLBACK_MESSAGE = 'oauth:popup:callback'
export const OAUTH_POPUP_RESULT_MESSAGE = 'oauth:popup:result'
export const TELEGRAM_BIND_RESULT_MESSAGE = 'telegram:binding:result'
