import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import PageHero from '../../components/Page/PageHero/PageHero'
import TextField from '../../components/Common/TextField/TextField'
import Button from '../../components/Common/Button/Button'
import SectionHeading from '../../components/Common/SectionHeading/SectionHeading'
import { useAuth } from '../../context/useAuth'
import { ROUTES } from '../../config/routes'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { resetPassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  // A bare visit with no token has nothing to do here - same as OrderConfirmed's guard
  // against a stale or missing link.
  if (!token) return <Navigate to={ROUTES.home} replace />

  const submit = async (event) => {
    event.preventDefault()

    const next = {}
    if (password.length < 8) next.password = 'Use at least 8 characters'
    if (confirm !== password) next.confirm = 'Passwords do not match'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      await resetPassword(token, password)
      navigate(ROUTES.account, { replace: true })
    } catch (error) {
      const details = error.details ?? []
      setErrors(
        details.length > 0
          ? Object.fromEntries(details.map((detail) => [detail.field, detail.message]))
          : { form: error.message ?? 'That reset link is invalid or has expired' },
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHero title="Reset your password" />
      <section className="mx-auto max-w-md px-6 py-16 md:px-10">
        <SectionHeading size="md" className="mb-6 text-center">
          Choose a new password
        </SectionHeading>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {errors.form && <p className="text-sm text-accent">{errors.form}</p>}

          <TextField
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            required
          />
          <TextField
            id="confirm-password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={errors.confirm}
            required
          />

          <Button variant="solid-dark" type="submit" className="mt-2" disabled={busy}>
            {busy ? 'One moment…' : 'Reset password'}
          </Button>
        </form>
      </section>
    </>
  )
}
