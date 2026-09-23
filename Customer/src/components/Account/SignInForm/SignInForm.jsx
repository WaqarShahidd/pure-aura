import { useState } from 'react'
import TextField from '../../Common/TextField/TextField'
import Checkbox from '../../Common/Checkbox/Checkbox'
import Button from '../../Common/Button/Button'
import SectionHeading from '../../Common/SectionHeading/SectionHeading'

// Follows the form pattern the storefront already uses three times over (ContactForm,
// BookingForm, ProfileForm): an EMPTY const, a values object, an errors object, a curried
// `set`, and validation that builds a `next` object and submits only when it is empty.
const EMPTY = { email: '', password: '', firstName: '', lastName: '', marketingOptIn: false }

// Copy-pasted inline in every other form in this codebase; kept identical here on purpose.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function SignInForm({ onSignIn, onRegister }) {
  const [mode, setMode] = useState('signIn')
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'
  const set = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()

    const next = {}
    if (!EMAIL_RE.test(values.email)) next.email = 'Enter a valid email address'
    if (!values.password) next.password = 'Required'
    if (isRegister) {
      if (values.password.length < 8) next.password = 'Use at least 8 characters'
      if (!values.firstName.trim()) next.firstName = 'Required'
      if (!values.lastName.trim()) next.lastName = 'Required'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      if (isRegister) {
        await onRegister({
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          marketingOptIn: values.marketingOptIn,
        })
      } else {
        await onSignIn(values.email, values.password)
      }
    } catch (error) {
      // The server answers with field-level details whose text matches this form's own
      // copy, so they drop straight in. Anything else becomes a form-level message.
      const details = error.details ?? []
      if (details.length > 0) {
        setErrors(Object.fromEntries(details.map((d) => [d.field, d.message])))
      } else {
        setErrors({ form: error.message ?? 'Could not sign in' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="mb-8 text-center">
        <SectionHeading size="md">{isRegister ? 'Create an account' : 'Sign in'}</SectionHeading>
        <p className="mt-2 text-sm text-text-muted">
          {isRegister
            ? 'Save your details and keep track of your orders.'
            : 'Welcome back — sign in to see your orders.'}
        </p>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {errors.form && <p className="text-sm text-accent">{errors.form}</p>}

        {isRegister && (
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="first-name"
              label="First name"
              value={values.firstName}
              onChange={set('firstName')}
              error={errors.firstName}
              required
            />
            <TextField
              id="last-name"
              label="Last name"
              value={values.lastName}
              onChange={set('lastName')}
              error={errors.lastName}
              required
            />
          </div>
        )}

        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          required
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          required
        />

        {isRegister && (
          <Checkbox
            label="Email me about new products and offers"
            checked={values.marketingOptIn}
            onChange={(checked) =>
              setValues((current) => ({ ...current, marketingOptIn: checked }))
            }
          />
        )}

        <Button variant="solid-dark" type="submit" className="mt-2" disabled={busy}>
          {busy ? 'One moment…' : isRegister ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        {isRegister ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(isRegister ? 'signIn' : 'register')
            setErrors({})
          }}
          className="underline underline-offset-4"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </button>
      </p>
    </div>
  )
}
