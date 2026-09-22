import { useState } from 'react'
import TextField from '../../Common/TextField/TextField'
import Button from '../../Common/Button/Button'
import FormStatus from '../../Common/FormStatus/FormStatus'

const TOPICS = ['An existing order', 'A product question', 'Wholesale and stockists', 'Something else']
const EMPTY = { name: '', email: '', topic: TOPICS[0], orderNumber: '', message: '' }

export default function ContactForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }))

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!values.name.trim()) next.name = 'Please tell us your name'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) next.email = 'Enter a valid email address'
    if (values.message.trim().length < 10) next.message = 'A little more detail would help'

    setErrors(next)
    if (Object.keys(next).length === 0) setSent(true)
  }

  if (sent) {
    return (
      <FormStatus
        title="Thanks — we have your message"
        body="This demo store has no mail server behind it, so nothing was actually sent. On a live site you would hear back within one working day."
      />
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          id="contact-name"
          label="Your name"
          required
          value={values.name}
          onChange={set('name')}
          error={errors.name}
          placeholder="Jamie Fletcher"
        />
        <TextField
          id="contact-email"
          label="Email address"
          type="email"
          required
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          placeholder="you@example.com"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          id="contact-topic"
          label="What is it about?"
          as="select"
          value={values.topic}
          onChange={set('topic')}
          options={TOPICS}
        />
        <TextField
          id="contact-order"
          label="Order number (optional)"
          value={values.orderNumber}
          onChange={set('orderNumber')}
          placeholder="PA-10248"
        />
      </div>

      <TextField
        id="contact-message"
        label="Message"
        as="textarea"
        rows={6}
        required
        value={values.message}
        onChange={set('message')}
        error={errors.message}
        placeholder="How can we help?"
      />

      <div>
        <Button type="submit" variant="solid-dark">
          Send message
        </Button>
      </div>
    </form>
  )
}
