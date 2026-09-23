// One error class for everything the API deliberately returns. Anything else that
// reaches the error handler is a bug and becomes a 500 with a request id.
//
// `details` carries field-level messages whose text matches the storefront's existing
// inline validation copy verbatim ('Required', 'Enter a valid email address'), so a
// server response can be dropped straight into a form's errors object without a
// translation layer.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message = 'Malformed request', details) =>
  new ApiError(400, 'BAD_REQUEST', message, details)

export const unauthorized = (message = 'Sign in to continue') =>
  new ApiError(401, 'UNAUTHORIZED', message)

export const forbidden = (message = 'You do not have access to that') =>
  new ApiError(403, 'FORBIDDEN', message)

export const notFound = (message = 'Not found') => new ApiError(404, 'NOT_FOUND', message)

export const conflict = (code, message, details) => new ApiError(409, code, message, details)

export const unprocessable = (code, message, details) => new ApiError(422, code, message, details)

export const validationFailed = (details) =>
  new ApiError(400, 'VALIDATION_FAILED', 'Some fields need attention', details)
