import TextField from '../../Common/TextField/TextField'
import { COUNTRIES } from '../../../config/checkout'

export default function ShippingStep({ values, errors, onChange }) {
  const set = (field) => (event) => onChange(field, event.target.value)

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-medium">Shipping address</h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField id="co-first" label="First name" required value={values.firstName} onChange={set('firstName')} error={errors.firstName} />
        <TextField id="co-last" label="Last name" required value={values.lastName} onChange={set('lastName')} error={errors.lastName} />
      </div>

      <TextField id="co-line1" label="Address" required value={values.line1} onChange={set('line1')} error={errors.line1} placeholder="42 Chancery Lane" />
      <TextField id="co-line2" label="Apartment, suite, etc. (optional)" value={values.line2} onChange={set('line2')} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <TextField id="co-city" label="City" required value={values.city} onChange={set('city')} error={errors.city} />
        <TextField id="co-region" label="State / Region" required value={values.region} onChange={set('region')} error={errors.region} />
        <TextField id="co-postcode" label="Postcode" required value={values.postcode} onChange={set('postcode')} error={errors.postcode} />
      </div>

      <TextField id="co-country" label="Country" as="select" value={values.country} onChange={set('country')} options={COUNTRIES} className="md:w-1/2" />
    </div>
  )
}
