import { useState } from 'react'
import TextField from '../../Common/TextField/TextField'
import Button from '../../Common/Button/Button'
import FormStatus from '../../Common/FormStatus/FormStatus'

const TREATMENTS = [
  { value: 'consultation', label: 'Skin consultation — 30 min, free' },
  { value: 'facial', label: 'Signature facial — 60 min, Rs 26,600' },
  { value: 'deep-clean', label: 'Deep cleanse and extraction — 75 min, Rs 33,600' },
  { value: 'peel', label: 'Enzyme peel — 45 min, Rs 22,400' },
]
const TIMES = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00']

const EMPTY = { name: '', email: '', phone: '', treatment: TREATMENTS[0].value, date: '', time: TIMES[0], notes: '' }

export default function BookingForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [booked, setBooked] = useState(false)

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }))
  const today = new Date().toISOString().slice(0, 10)

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!values.name.trim()) next.name = 'Please tell us your name'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) next.email = 'Enter a valid email address'
    if (!values.date) next.date = 'Choose a date'
    else if (values.date < today) next.date = 'Choose a date in the future'

    setErrors(next)
    if (Object.keys(next).length === 0) setBooked(true)
  }

  if (booked) {
    const treatment = TREATMENTS.find((t) => t.value === values.treatment)
    return (
      <FormStatus
        title="Request received"
        body={`${treatment.label.split(' — ')[0]} on ${values.date} at ${values.time}. This demo store has no booking system behind it, so nothing was actually reserved.`}
      />
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField id="book-name" label="Your name" required value={values.name} onChange={set('name')} error={errors.name} placeholder="Jamie Fletcher" />
        <TextField id="book-email" label="Email address" type="email" required value={values.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField id="book-phone" label="Phone (optional)" value={values.phone} onChange={set('phone')} placeholder="+1 555 0134" />
        <TextField id="book-treatment" label="Treatment" as="select" value={values.treatment} onChange={set('treatment')} options={TREATMENTS} />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField id="book-date" label="Preferred date" type="date" required min={today} value={values.date} onChange={set('date')} error={errors.date} />
        <TextField id="book-time" label="Preferred time" as="select" value={values.time} onChange={set('time')} options={TIMES} />
      </div>

      <TextField id="book-notes" label="Anything we should know? (optional)" as="textarea" rows={4} value={values.notes} onChange={set('notes')} placeholder="Allergies, sensitivities, what you would like to work on" />

      <div>
        <Button type="submit" variant="solid-dark">Request appointment</Button>
      </div>
    </form>
  )
}
