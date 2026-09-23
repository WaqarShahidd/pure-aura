function Block({ title, onEdit, children }) {
  return (
    <div className="rounded-2xl border border-charcoal/15 px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-accent underline underline-offset-4"
        >
          Edit
        </button>
      </div>
      <div className="text-sm text-text-muted">{children}</div>
    </div>
  )
}

// What the payment block shows depends on the method's kind, not just whether a card
// number was typed - COD and bank transfer never touch the card fields at all.
function paymentSummary(values, paymentMethods) {
  const method = paymentMethods.find((candidate) => candidate.code === values.paymentMethod)
  if (!method) return 'No payment method chosen'
  if (method.kind !== 'gateway') return method.label

  const last4 = values.cardNumber.replace(/\s+/g, '').slice(-4)
  return last4 ? `${method.label} ending ${last4}` : method.label
}

export default function ReviewStep({ values, onEditStep, deliveryMethods = [], paymentMethods = [] }) {
  const method = deliveryMethods.find((candidate) => candidate.id === values.delivery)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Review your order</h2>

      <Block title="Contact" onEdit={() => onEditStep(0)}>
        {values.email}
        {values.phone && <> · {values.phone}</>}
      </Block>

      <Block title="Shipping to" onEdit={() => onEditStep(1)}>
        <span className="block text-charcoal">
          {values.firstName} {values.lastName}
        </span>
        {values.line1}
        {values.line2 && <>, {values.line2}</>}
        <br />
        {values.city}, {values.region} {values.postcode}
        <br />
        {values.country}
      </Block>

      <Block title="Delivery" onEdit={() => onEditStep(2)}>
        {method?.label} — {method?.detail}
      </Block>

      <Block title="Payment" onEdit={() => onEditStep(3)}>
        {paymentSummary(values, paymentMethods)}
        <br />
        {values.billingSame ? 'Billing address same as shipping' : 'Separate billing address'}
      </Block>
    </div>
  )
}
