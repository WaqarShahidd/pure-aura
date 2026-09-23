import Checkbox from '../../Common/Checkbox/Checkbox'
import PaymentIcons from '../../Common/PaymentIcons/PaymentIcons'
import { cn } from '../../../utils/classNames'
import CardFields from './CardFields'
import BankTransferPanel from './BankTransferPanel'
import CodPanel from './CodPanel'

// This step used to be an unconditional card form with no way to choose anything else.
// It is now a radio list built from whatever the API says is live, and the card form is
// one option among them rather than the only path.
//
// The icons shown here are a CAPABILITY list - the methods actually enabled. The footer's
// strip is a separate, admin-ordered TRUST signal. Two different questions that used to
// share one source.
const PANELS = {
  offline: CodPanel,
  manual_transfer: BankTransferPanel,
  gateway: CardFields,
}

export default function PaymentStep({ values, errors, onChange, methods = [] }) {
  const selected = methods.find((method) => method.code === values.paymentMethod) ?? null
  const Panel = selected ? PANELS[selected.kind] : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Payment</h2>
        <PaymentIcons icons={methods.map((method) => ({ id: method.iconKey, label: method.label }))} />
      </div>

      {errors.paymentMethod && <p className="text-sm text-accent">{errors.paymentMethod}</p>}

      <div className="flex flex-col gap-3">
        {methods.map((method) => {
          const isSelected = method.code === values.paymentMethod
          return (
            <button
              key={method.code}
              type="button"
              onClick={() => onChange('paymentMethod', method.code)}
              aria-pressed={isSelected}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors',
                isSelected ? 'border-charcoal bg-sage/40' : 'border-charcoal/15 hover:bg-sage/20',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  isSelected ? 'border-charcoal' : 'border-charcoal/40',
                )}
              >
                {isSelected && <span className="h-2 w-2 rounded-full bg-charcoal" />}
              </span>

              <span className="flex-1">
                <span className="block text-sm font-medium">{method.label}</span>
                {method.surcharge > 0 && (
                  <span className="block text-xs text-text-muted">
                    + Rs {method.surcharge} handling
                  </span>
                )}
              </span>
            </button>
          )
        })}

        {methods.length === 0 && (
          <p className="text-sm text-text-muted">No payment methods are available right now.</p>
        )}
      </div>

      {Panel && <Panel values={values} errors={errors} onChange={onChange} method={selected} />}

      <Checkbox
        label="Billing address is the same as shipping"
        checked={values.billingSame}
        onChange={(checked) => onChange('billingSame', checked)}
      />
    </div>
  )
}
