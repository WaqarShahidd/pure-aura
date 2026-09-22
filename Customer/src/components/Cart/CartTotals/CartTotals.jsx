import { cartCopy } from '../../../config/cart'
import { formatPrice } from '../../../utils/formatPrice'

// formatPrice already renders the currency, so no suffix is appended here — that was how
// "USD" ended up hardcoded beside a rupee figure.
export default function CartTotals({ subtotal, compareSubtotal, savings }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">Total</span>
        <span className="text-lg font-semibold">{formatPrice(subtotal)}</span>
      </div>

      {savings > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-accent">{cartCopy.savings(formatPrice(savings))}</span>
          <span className="text-text-muted line-through">{formatPrice(compareSubtotal)}</span>
        </div>
      )}

      <p className="mt-1 text-xs text-text-muted">{cartCopy.taxNote}</p>
    </div>
  )
}
