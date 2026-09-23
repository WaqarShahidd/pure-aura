import 'dotenv/config'
import { z } from 'zod'

// The whole environment is parsed once, here, and the process refuses to start if
// anything is missing or malformed. A misconfigured deploy should fail on the first
// line of output, not as a 500 on the first request that happens to touch S3.

const bool = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    DATABASE_URL: z.string().url(),
    DATABASE_URL_TEST: z.string().url().optional(),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_ADMIN_SECRET: z.string().min(32, 'JWT_ADMIN_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_ADMIN_ACCESS_TTL: z.string().default('30m'),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

    STOREFRONT_ORIGIN: z.string().url(),
    ADMIN_ORIGIN: z.string().url(),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: bool.default('false'),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_ROOT: z.string().default('./storage'),
    MEDIA_PUBLIC_BASE_URL: z.string().url(),

    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),

    SEED_ADMIN_EMAIL: z.string().email().default('admin@pureaura.test'),
    SEED_ADMIN_PASSWORD: z.string().optional(),

    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default('Pure Aura <no-reply@pureaura.test>'),
  })
  // The S3 credentials are only required when the driver actually needs them, but
  // when it does they are ALL required. Half-configured S3 is the failure mode worth
  // preventing: it would otherwise surface as uploads succeeding and URLs 404ing.
  .superRefine((value, ctx) => {
    if (value.STORAGE_DRIVER !== 's3') return

    for (const key of ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
      if (!value[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when STORAGE_DRIVER=s3`,
        })
      }
    }
  })

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
  console.error(`Invalid environment:\n${lines.join('\n')}`)
  process.exit(1)
}

export const env = parsed.data

export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

// The test suite points at a different database entirely, because it truncates
// every table between suites and must never be able to reach the dev data.
export const databaseUrl = isTest ? (env.DATABASE_URL_TEST ?? env.DATABASE_URL) : env.DATABASE_URL
