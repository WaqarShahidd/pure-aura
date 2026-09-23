import { formatPrice } from '../../../utils/formatPrice'
import { cn } from '../../../utils/classNames'

export default function DeliveryStep({ value, onChange, subtotal, methods = [] }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-lg font-medium">Delivery method</legend>

      {methods.map((method) => {
        const cost = (method.freeOver != null && subtotal >= method.freeOver ? 0 : method.price)
        const selected = value === method.id

        return (
          <label
            key={method.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 transition-colors',
              selected ? 'border-charcoal bg-sage/40' : 'border-charcoal/20 hover:border-charcoal/40',
            )}
          >
            <input
              type="radio"
              name="delivery"
              value={method.id}
              checked={selected}
              onChange={() => onChange(method.id)}
              className="h-4 w-4 accent-charcoal"
            />
            <span className="flex-1">
              <span className="block text-sm font-medium">{method.label}</span>
              <span className="block text-xs text-text-muted">{method.detail}</span>
            </span>
            <span className="text-sm font-medium">
              {cost === 0 ? 'Free' : formatPrice(cost)}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
