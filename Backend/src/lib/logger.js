import pino from 'pino'
import { env, isProduction } from '../config/env.js'

// Pretty output is deliberately not used even in development: pino-pretty is a
// transport that spawns a worker, which makes an unhandled boot error harder to
// read, not easier. Pipe through `npx pino-pretty` when you want it.
export const logger = pino({
  level: env.LOG_LEVEL,
  base: undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.cardNumber',
      '*.cardCvc',
    ],
    censor: '[redacted]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: isProduction ? undefined : { level: (label) => ({ level: label }) },
})
