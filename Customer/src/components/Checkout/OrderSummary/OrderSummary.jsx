import ImagePlaceholder from '../../Common/ImagePlaceholder/ImagePlaceholder'
import { formatPrice } from '../../../utils/formatPrice'

// The rail beside the form. Reads live cart state, so changing delivery method updates it.
export default function OrderSummary({ items, subtotal, savings, shipping, tax, total }) {
  return (
    <aside className="rounded-2xl border border-charcoal/15 p-5 md:sticky md:top-6">
      <h2 className="mb-4 text-sm font-medium">Order summary</h2>

      <ul className="flex flex-col gap-4">
        {items.map((line) => (
          <li key={line.key} className="flex items-center gap-3">
            <div className="relative w-14 shrink-0">
              <ImagePlaceholder
                src={line.image}
                alt={line.title}
                seed={line.handle}
                rounded="rounded-xl"
              />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-charcoal px-1 text-[10px] text-white">
                {line.quantity}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{line.title}</p>
              <p className="truncate text-xs text-text-muted">{line.variantSummary}</p>
            </div>

            <span className="text-sm">{formatPrice(line.price * line.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 flex flex-col gap-1.5 border-t border-charcoal/10 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">Subtotal</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>

        {/* Subtotal is already net of the discount, so this is stated as information
            rather than as another deduction. */}
        {savings > 0 && (
          <div className="flex justify-between text-accent">
            <dt>You saved</dt>
            <dd>{formatPrice(savings)}</dd>
          </div>
        )}

        <div className="flex justify-between">
          <dt className="text-text-muted">Shipping</dt>
          <dd>{shipping === 0 ? 'Free' : formatPrice(shipping)}</dd>
        </div>

        <div className="flex justify-between">
          <dt className="text-text-muted">Estimated tax</dt>
          <dd>{formatPrice(tax)}</dd>
        </div>

        <div className="mt-2 flex justify-between border-t border-charcoal/10 pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
    </aside>
  )
}
