import axios from 'axios'

const BASE_URL = import.meta.env.VITE_ADMIN_API_URL ?? 'http://localhost:4000/api'

// withCredentials so the httpOnly refresh cookie rides along on /auth calls. The ACCESS
// token is never stored - it lives in AuthProvider state and is attached here.
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

let accessToken = null
let onSessionLost = () => {}

export function setAccessToken(token) {
  accessToken = token
}

export function setSessionLostHandler(handler) {
  onSessionLost = handler
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// ONE in-flight refresh for the whole app, shared by the interceptor and by the boot
// check in AuthProvider. This is not an optimisation - it is required for correctness.
//
// Refresh tokens rotate, and presenting an already-rotated one is indistinguishable from
// a stolen token being replayed, so the server revokes the entire family. Anything that
// fires two refreshes with the same token therefore logs the user out. Two things do that
// readily: a screen whose queries all 401 at once, and React StrictMode double-invoking
// the boot effect in development. Two browser tabs opened together would manage it in
// production too.
//
// Callers must go through this rather than posting to /auth/refresh themselves.
let refreshing = null

export async function refreshSession() {
  refreshing =
    refreshing ??
    api
      .post('/admin/auth/refresh')
      .then((response) => {
        const { accessToken, admin } = response.data.data
        setAccessToken(accessToken)
        return { accessToken, admin }
      })
      .finally(() => {
        refreshing = null
      })

  return refreshing
}

async function refreshOnce() {
  const { accessToken } = await refreshSession()
  return accessToken
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    const isAuthCall = original?.url?.includes('/auth/')

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true
      try {
        const token = await refreshOnce()
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch {
        setAccessToken(null)
        onSessionLost()
      }
    }

    // Unwrap the server's error envelope so callers see { code, message, details }
    // rather than having to dig through an axios error every time.
    const payload = error.response?.data?.error
    return Promise.reject(
      Object.assign(new Error(payload?.message ?? error.message ?? 'Request failed'), {
        status,
        code: payload?.code,
        details: payload?.details,
      }),
    )
  },
)

// Every endpoint returns { data, meta? }; unwrap once here.
export async function get(url, config) {
  const response = await api.get(url, config)
  return response.data
}

export async function post(url, body, config) {
  const response = await api.post(url, body, config)
  return response.data?.data
}

export async function patch(url, body, config) {
  const response = await api.patch(url, body, config)
  return response.data?.data
}

export async function del(url, config) {
  const response = await api.delete(url, config)
  return response.data?.data ?? null
}
