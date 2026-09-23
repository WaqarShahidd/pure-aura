// The single place the storefront talks to the API.
//
// Every response is { data, meta? } and every error is { error: { code, message, details } }.
// Unwrapping both here means component code sees bare objects and a thrown ApiError, and
// never has to know about the envelope.

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// Held in memory only - never localStorage. The cart already lives there and is readable
// by any script on the page; an access token should not be.
let accessToken = null
let onSessionLost = () => {}

export function setAccessToken(token) {
  accessToken = token
}

export function setSessionLostHandler(handler) {
  onSessionLost = handler
}

// ONE in-flight refresh for the whole app, shared by the 401 retry below and by the boot
// check in AuthProvider. This is correctness, not tuning: refresh tokens rotate, and
// presenting an already-rotated one is indistinguishable from a replay, so the server
// revokes the entire family. Two concurrent refreshes therefore sign the customer out.
// React StrictMode double-invoking an effect is enough to cause it, as is two tabs
// opening together.
let refreshing = null

export async function refreshSession() {
  refreshing =
    refreshing ??
    request('/auth/refresh', { method: 'POST', skipAuthRetry: true })
      .then((data) => {
        setAccessToken(data.accessToken)
        return data
      })
      .finally(() => {
        refreshing = null
      })

  return refreshing
}

async function request(path, { method = 'GET', body, signal, headers, skipAuthRetry } = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      // The refresh token lives in an httpOnly cookie, so every request has to carry
      // credentials for a session to survive a reload.
      credentials: 'include',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    // fetch only rejects for network-level failures, which is the case worth naming
    // plainly: the API being down reads very differently from a 500.
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server', undefined)
  }

  if (response.status === 204) return null

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new ApiError(response.status, 'BAD_RESPONSE', 'The server sent something unreadable')
  }

  if (!response.ok) {
    const error = payload?.error ?? {}

    // One retry after refreshing. skipAuthRetry stops the refresh call itself from
    // recursing when it is the thing returning 401.
    if (response.status === 401 && !skipAuthRetry && accessToken) {
      try {
        await refreshSession()
        return request(path, { method, body, signal, headers, skipAuthRetry: true })
      } catch {
        setAccessToken(null)
        onSessionLost()
      }
    }

    throw new ApiError(
      response.status,
      error.code ?? 'UNKNOWN',
      error.message ?? 'Something went wrong',
      error.details,
    )
  }

  return payload.data
}

export function api(path, options) {
  return request(path, options)
}

export function buildQuery(params) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}
