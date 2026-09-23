// Cash on delivery needs no fields at all - the whole interaction happens at the door.
export default function CodPanel({ method }) {
  return (
    <p className="rounded-2xl bg-sage px-5 py-4 text-sm text-text-muted">
      {method?.instructions ??
        'Pay the courier in cash when your order arrives. Please have the exact amount ready.'}
    </p>
  )
}
