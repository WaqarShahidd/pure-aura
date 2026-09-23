import { randomUUID } from 'node:crypto'
import { ValidationError as SequelizeValidationError, UniqueConstraintError } from 'sequelize'
import { ApiError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { isProduction } from '../config/env.js'

export function requestId(req, res, next) {
  req.id = req.get('x-request-id') ?? randomUUID()
  res.set('x-request-id', req.id)
  next()
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route for ${req.method} ${req.path}`,
      requestId: req.id,
    },
  })
}

// Mounted last. Anything that is not an ApiError is a bug, so it becomes a 500 with a
// request id and the real cause goes to the log, never to the client.
export function errorHandler(error, req, res, _next) {
  if (error instanceof ApiError) {
    if (error.status >= 500) logger.error({ err: error, requestId: req.id }, error.message)
    else logger.debug({ requestId: req.id, code: error.code }, error.message)

    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: req.id,
      },
    })
  }

  // A unique violation is a user-visible conflict, not a crash - most often a handle or
  // an email that is already taken.
  if (error instanceof UniqueConstraintError) {
    const fields = Object.keys(error.fields ?? {})
    return res.status(409).json({
      error: {
        code: 'ALREADY_EXISTS',
        message: 'That already exists',
        details: fields.map((field) => ({ field, message: 'Already taken' })),
        requestId: req.id,
      },
    })
  }

  if (error instanceof SequelizeValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Some fields need attention',
        details: error.errors.map((item) => ({ field: item.path, message: item.message })),
        requestId: req.id,
      },
    })
  }

  // express.json() raises this for malformed bodies before any route sees them.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Malformed JSON body', requestId: req.id },
    })
  }

  logger.error({ err: error, requestId: req.id }, 'unhandled error')

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      requestId: req.id,
      ...(isProduction ? {} : { debug: error.message }),
    },
  })
}
