import { useState } from 'react'
import TextField from '../../Common/TextField/TextField'
import Checkbox from '../../Common/Checkbox/Checkbox'
import Button from '../../Common/Button/Button'
import { useAuth } from '../../../context/useAuth'
import { useUpdateProfile } from '../../../data/useAccount'

export default function ProfileForm() {
  const { customer } = useAuth()
  const updateProfile = useUpdateProfile()
  const [values, setValues] = useState(customer ?? {})

  // Render-phase sync rather than an effect, matching how Collection.jsx and the admin
  // product editor hydrate from fetched data.
  const [hydratedFrom, setHydratedFrom] = useState(customer)
  if (customer && customer !== hydratedFrom) {
    setHydratedFrom(customer)
    setValues(customer)
  }
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  const set = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }))
    setSaved(false)
  }
  const setFlag = (field) => (checked) => {
    setValues((v) => ({ ...v, [field]: checked }))
    setSaved(false)
  }

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!values.firstName?.trim()) next.firstName = 'First name is required'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email ?? '')) {
      next.email = 'Enter a valid email address'
    }

    setErrors(next)
    setSaved(false)
    if (Object.keys(next).length > 0) return

    // Email is deliberately not sent: changing the address someone signs in with needs a
    // verification step, and silently moving it would be worse than not offering it.
    try {
      await updateProfile.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || null,
        marketingOptIn: Boolean(values.marketingOptIn),
        smsOptIn: Boolean(values.smsOptIn),
      })
      setSaved(true)
    } catch (error) {
      const details = error.details ?? []
      setErrors(
        details.length > 0
          ? Object.fromEntries(details.map((detail) => [detail.field, detail.message]))
          : { form: error.message ?? 'Could not save' },
      )
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <h2 className="text-xl font-medium">Profile</h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField id="first-name" label="First name" required value={values.firstName} onChange={set('firstName')} error={errors.firstName} />
        <TextField id="last-name" label="Last name" value={values.lastName} onChange={set('lastName')} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField id="email" label="Email address" type="email" required value={values.email} onChange={set('email')} error={errors.email} />
        <TextField id="phone" label="Phone" value={values.phone} onChange={set('phone')} />
      </div>

      <TextField id="birthday" label="Birthday" type="date" value={values.birthday} onChange={set('birthday')} className="md:w-1/2" />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Contact preferences</legend>
        <Checkbox label="Email me about new products and offers" checked={values.marketingOptIn} onChange={setFlag('marketingOptIn')} />
        <Checkbox label="Text me about order updates" checked={values.smsOptIn} onChange={setFlag('smsOptIn')} />
      </fieldset>

      <div className="flex items-center gap-4">
        <Button type="submit" variant="solid-dark">Save changes</Button>
        {saved && (
          <span className="text-sm text-olive">
            Saved.
          </span>
        )}
      </div>
    </form>
  )
}
