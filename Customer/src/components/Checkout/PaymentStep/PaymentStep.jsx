import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import TextField from '../../Common/TextField/TextField'
import Checkbox from '../../Common/Checkbox/Checkbox'
import PaymentIcons from '../../Common/PaymentIcons/PaymentIcons'

export default function PaymentStep({ values, errors, onChange }) {
  const set = (field) => (event) => onChange(field, event.target.value)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Payment</h2>
        <PaymentIcons />
      </div>

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

      <Checkbox
        label="Billing address is the same as shipping"
        checked={values.billingSame}
        onChange={(checked) => onChange('billingSame', checked)}
      />
    </div>
  )
}
