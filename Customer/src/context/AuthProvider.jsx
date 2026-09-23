import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthContext } from './authContext'
import { api, refreshSession, setAccessToken, setSessionLostHandler } from '../lib/api'

// Replaces the "already signed in" shell the account pages used to render over mock data.
//
// The access token lives in memory and is reissued from the httpOnly refresh cookie on
// boot, so the cost of not storing it is one request at startup.
export default function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [customer, setCustomer] = useState(null)
  const [status, setStatus] = useState('checking')

  const forgetSession = useCallback(() => {
    setAccessToken(null)
    setCustomer(null)
    setStatus('signed-out')
    // Account data is per-customer; leaving it cached would show the previous person's
    // orders to whoever signs in next on the same browser.
    queryClient.removeQueries({ queryKey: ['account'] })
  }, [queryClient])

  useEffect(() => {
    setSessionLostHandler(forgetSession)
  }, [forgetSession])

  // A 401 here is the ordinary "not signed in" case, not an error. Going through
  // refreshSession() rather than calling the endpoint directly is what stops StrictMode's
  // double-invoked effect from racing two rotations and revoking the session.
  useEffect(() => {
    let cancelled = false

    refreshSession()
      .then((data) => {
        if (cancelled) return
        setCustomer(data.customer)
        setStatus('signed-in')
      })
      .catch(() => {
        if (!cancelled) setStatus('signed-out')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(
    async (email, password) => {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } })
      setAccessToken(data.accessToken)
      setCustomer(data.customer)
      setStatus('signed-in')
      queryClient.removeQueries({ queryKey: ['account'] })
      return data.customer
    },
    [queryClient],
  )

  const register = useCallback(
    async (values) => {
      const data = await api('/auth/register', { method: 'POST', body: values })
      setAccessToken(data.accessToken)
      setCustomer(data.customer)
      setStatus('signed-in')
      return data.customer
    },
    [],
  )

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      forgetSession()
    }
  }, [forgetSession])

  const value = useMemo(
    () => ({
      customer,
      status,
      isSignedIn: status === 'signed-in',
      isChecking: status === 'checking',
      signIn,
      register,
      signOut,
      setCustomer,
    }),
    [customer, status, signIn, register, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
