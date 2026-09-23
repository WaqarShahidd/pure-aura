import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { api, refreshSession, setAccessToken, setSessionLostHandler } from '../lib/api'
import { queryClient } from '../lib/queryClient'

// The access token is held in memory only - never localStorage, never a readable cookie.
// It is short-lived and reissued from the httpOnly refresh cookie on boot, so the cost of
// keeping it out of storage is one request at startup and the benefit is that a script
// injected into this page cannot read it.
export default function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [status, setStatus] = useState('checking')

  const signOutLocally = useCallback(() => {
    setAccessToken(null)
    setAdmin(null)
    setStatus('signed-out')
    queryClient.clear()
  }, [])

  useEffect(() => {
    setSessionLostHandler(signOutLocally)
  }, [signOutLocally])

  // One refresh attempt on boot. A 401 here is the ordinary "not signed in" case, not an
  // error worth surfacing - it just means the login form should render.
  //
  // This MUST go through refreshSession(), which de-duplicates concurrent calls. Posting
  // to /auth/refresh directly meant StrictMode's double-invoked effect sent two requests
  // carrying the same rotating token; the server read the second as a replay, revoked the
  // whole family, and every navigation bounced back to the login screen.
  useEffect(() => {
    let cancelled = false

    refreshSession()
      .then(({ admin: account }) => {
        if (cancelled) return
        setAdmin(account)
        setStatus('signed-in')
      })
      .catch(() => {
        if (!cancelled) setStatus('signed-out')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const response = await api.post('/admin/auth/login', { email, password })
    const { accessToken, admin: account } = response.data.data
    setAccessToken(accessToken)
    setAdmin(account)
    setStatus('signed-in')
    return account
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.post('/admin/auth/logout')
    } finally {
      signOutLocally()
    }
  }, [signOutLocally])

  const value = useMemo(
    () => ({
      admin,
      status,
      isSignedIn: status === 'signed-in',
      isChecking: status === 'checking',
      signIn,
      signOut,
      // Roles are cumulative, matching the server's ranking, so a screen can ask
      // "at least manager?" instead of listing every role that qualifies.
      can: (minimum) => {
        const rank = { staff: 1, manager: 2, owner: 3 }
        return (rank[admin?.role] ?? 0) >= (rank[minimum] ?? Infinity)
      },
    }),
    [admin, status, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
