import { z } from 'zod'

/**
 * Zod schema for bearer credentials.
 */
export const bearerCredentialSchema = z.object({
  token: z.string(),
  type: z.literal('bearer'),
})

/**
 * Zod schema for basic auth credentials.
 */
export const basicCredentialSchema = z.object({
  password: z.string(),
  type: z.literal('basic'),
  username: z.string(),
})

/**
 * Zod schema for API key credentials.
 */
export const apiKeyCredentialSchema = z.object({
  headerName: z.string(),
  key: z.string(),
  type: z.literal('api-key'),
})

/**
 * Zod schema for custom header credentials.
 */
export const customCredentialSchema = z.object({
  headers: z.record(z.string(), z.string()),
  type: z.literal('custom'),
})

/**
 * Zod discriminated union schema for validating auth.json credential payloads.
 * Validates against all four credential types using the `type` field as discriminator.
 */
export const authCredentialSchema = z.discriminatedUnion('type', [
  bearerCredentialSchema,
  basicCredentialSchema,
  apiKeyCredentialSchema,
  customCredentialSchema,
])
