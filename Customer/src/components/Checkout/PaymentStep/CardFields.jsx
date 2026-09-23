import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import TextField from '../../Common/TextField/TextField'

// The card form, moved here VERBATIM from PaymentStep rather than rewritten.
//
// No gateway is enabled, so this never renders today - it is reachable only when a
// gateway method is both switched on by the merchant and turned on by its feature flag.
// Keeping it byte-identical means enabling Stripe later is wiring a tokenising element in
// place of these inputs, not rebuilding a form from memory.
//
// Worth stating plainly: raw PAN and CVC in React state is fine for a demo and is NOT
// acceptable against a real processor. These fields must be replaced by hosted elements
// (Stripe Elements or equivalent) before any gateway goes live, or the PCI scope of this
// application changes completely.
export default function CardFields({ values, errors, onChange }) {
  const set = (field) => (event) => onChange(field, event.target.value)

  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-center gap-2 rounded-2xl bg-sage px-4 py-3 text-xs text-charcoal">
        <LockOutlinedIcon sx={{ fontSize: 16 }} />
        This is a demo store. Do not enter real card details — nothing is transmitted or charged.
      </p>

      <TextField
        id="co-card-name"
        label="Name on card"
        required
        value={values.cardName}
        onChange={set('cardName')}
        error={errors.cardName}
        autoComplete="off"
      />

      <TextField
        id="co-card-number"
        label="Card number"
        required
        inputMode="numeric"
        value={values.cardNumber}
        onChange={set('cardNumber')}
        error={errors.cardNumber}
        placeholder="4242 4242 4242 4242"
        autoComplete="off"
      />

      <div className="grid grid-cols-2 gap-5">
        <TextField
          id="co-card-expiry"
          label="Expiry (MM/YY)"
          required
          value={values.cardExpiry}
          onChange={set('cardExpiry')}
          error={errors.cardExpiry}
          placeholder="04/29"
          autoComplete="off"
        />
        <TextField
          id="co-card-cvc"
          label="CVC"
          required
          inputMode="numeric"
          value={values.cardCvc}
          onChange={set('cardCvc')}
          error={errors.cardCvc}
          placeholder="123"
          autoComplete="off"
        />
      </div>
    </div>
  )
}
