import { validationFailed } from '../lib/errors.js'

// Query strings are all strings, so coercion has to happen before parsing or every
// numeric filter fails validation. zod's .coerce handles it per-field in the schemas.
//
// The shape of `details` matters: { field, message } with the message written to match
// the storefront's existing inline copy ('Required', 'Enter a valid email address'), so
// a response can be dropped straight into a form's errors object with no mapping layer.
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      return next(
        validationFailed(
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || source,
            message: issue.message,
          })),
        ),
      )
    }

    // Assigning to req.query is a getter-only trap on Express 5; this codebase is on 4,
    // where it is a plain property. Keeping the parsed value on req.validated as well
    // means route handlers never depend on which one it was.
    req[source] = result.data
    req.validated = { ...req.validated, [source]: result.data }
    return next()
  }
}
