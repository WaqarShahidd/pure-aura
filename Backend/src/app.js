import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env, isProduction, isTest } from './config/env.js'
import { storage, PUBLIC_PREFIXES } from './lib/storage/index.js'
import { localRoot } from './lib/storage/localDisk.js'
import { errorHandler, notFoundHandler, requestId } from './middleware/errorHandler.js'
import { sequelize } from './db/index.js'
import publicRoutes from './routes/public/index.js'
import adminRoutes from './routes/admin/index.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(requestId)
  app.use(
    helmet({
      // Images are served from this origin to a different one (the storefront), so the
      // default same-origin policy would block every product photo.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(compression())
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  // Both apps send credentials, so the origin must be echoed explicitly - a wildcard is
  // rejected by browsers the moment credentials are involved.
  //
  // In development any localhost port is accepted, because the two configured origins are
  // not the only ones that legitimately appear: the screenshot script deliberately serves
  // on its own port (5199) so it can never capture another project's dev server by
  // mistake, and Vite picks a different port whenever the default is taken. In production
  // the allowlist is exactly the two origins and nothing else.
  const allowedOrigins = [env.STOREFRONT_ORIGIN, env.ADMIN_ORIGIN]
  const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

  app.use(
    cors({
      origin(origin, callback) {
        // A missing Origin means a same-origin or non-browser request (curl, health checks).
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        if (!isProduction && isLocalhost(origin)) return callback(null, true)
        return callback(null, false)
      },
      credentials: true,
      exposedHeaders: ['x-request-id'],
    }),
  )

  if (!isTest) {
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 300,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      }),
    )
  }

  // Under the local driver the API also serves the files. Scoped to the public prefixes
  // only: private/ holds bank transfer proofs and is fetched through an authenticated
  // admin route instead, under BOTH drivers.
  if (storage.name === 'local') {
    for (const prefix of PUBLIC_PREFIXES) {
      app.use(
        `/media/${prefix}`,
        express.static(`${localRoot}/${prefix}`, {
          maxAge: '1y',
          immutable: true,
          fallthrough: false,
          index: false,
          dotfiles: 'deny',
        }),
      )
    }
  }

  app.get('/api/health', async (req, res) => {
    const checks = { database: 'down', storage: 'down' }

    try {
      await sequelize.authenticate()
      checks.database = 'up'
    } catch {
      checks.database = 'down'
    }

    try {
      // exists() on a key that will not be there still proves the driver is reachable
      // and configured - a missing file returns false, a broken driver throws.
      await storage.exists('healthcheck/.keep')
      checks.storage = 'up'
    } catch {
      checks.storage = 'down'
    }

    const healthy = Object.values(checks).every((value) => value === 'up')

    res.status(healthy ? 200 : 503).json({
      data: {
        status: healthy ? 'ok' : 'degraded',
        checks,
        driver: storage.name,
        env: env.NODE_ENV,
      },
    })
  })

  // Admin mounts first: '/api/admin/products' must not be swallowed by a public route.
  app.use('/api/admin', adminRoutes)
  app.use('/api', publicRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
