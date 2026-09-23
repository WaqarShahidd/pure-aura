import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { useAuth } from '../../auth/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [values, setValues] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(values.email, values.password)
    } catch (caught) {
      // The server answers identically for an unknown email and a wrong password, so
      // there is nothing more specific to say here even if we wanted to.
      setError(caught.message ?? 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 380 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 20, mb: 0.5 }}>
            pure<Box component="span" sx={{ color: 'secondary.main' }}>.</Box> admin
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 3 }}>
            Sign in to manage the shop.
          </Typography>

          <form onSubmit={submit} noValidate>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="Email"
                type="email"
                value={values.email}
                onChange={set('email')}
                autoComplete="username"
                autoFocus
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={values.password}
                onChange={set('password')}
                autoComplete="current-password"
                required
                fullWidth
              />

              <Button type="submit" variant="contained" size="large" disabled={busy} fullWidth>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
