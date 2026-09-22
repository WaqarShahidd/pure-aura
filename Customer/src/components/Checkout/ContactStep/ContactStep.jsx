import TextField from '../../Common/TextField/TextField'
import Checkbox from '../../Common/Checkbox/Checkbox'

export default function ContactStep({ values, errors, onChange }) {
  const set = (field) => (event) => onChange(field, event.target.value)

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-medium">Contact</h2>

      <TextField
        id="co-email"
        label="Email address"
        type="email"
        required
        value={values.email}
        onChange={set('email')}
        error={errors.email}
        placeholder="you@example.com"
      />

      <TextField
        id="co-phone"
        label="Phone (for delivery updates)"
        value={values.phone}
        onChange={set('phone')}
        error={errors.phone}
        placeholder="+1 555 0134"
      />

      <Checkbox
        label="Email me about new products and offers"
        checked={values.marketingOptIn}
        onChange={(checked) => onChange('marketingOptIn', checked)}
      />
    </div>
  )
}
