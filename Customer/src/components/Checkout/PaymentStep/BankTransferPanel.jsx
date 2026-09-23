// Bank details come from the payment method's config, so changing the account is an admin
// edit rather than a deploy. The reference number is issued when the order is placed, which
// is why it is shown on the confirmation page rather than here.
export default function BankTransferPanel({ method }) {
  const bank = method?.config ?? {}

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        {method?.instructions ??
          'Transfer the total to the account below and upload your receipt.'}
      </p>

      <dl className="rounded-2xl border border-charcoal/15 px-5 py-4 text-sm">
        {[
          ['Bank', bank.bankName],
          ['Account title', bank.accountTitle],
          ['IBAN', bank.iban],
        ]
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-1">
              <dt className="text-text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
      </dl>

      <p className="text-xs text-text-muted">
        You will get a reference number on the next screen. Include it with your transfer and
        upload the receipt so we can confirm it.
      </p>
    </div>
  )
}
