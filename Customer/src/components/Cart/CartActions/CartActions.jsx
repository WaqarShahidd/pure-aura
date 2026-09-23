import { useState } from 'react'
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useValidateDiscount } from '../../../data/useCheckout'
import { cn } from '../../../utils/classNames'

// An order carries exactly one discount_code, not a list - orders.discount_code is a
// single column - so applying a second code replaces the first rather than stacking.
export default function CartActions({
  note,
  onNoteChange,
  discount,
  subtotal,
  onApplyDiscount,
  onRemoveDiscount,
}) {
  const [panel, setPanel] = useState(null)
  const [code, setCode] = useState('')
  const [shared, setShared] = useState(false)
  const [error, setError] = useState(null)
  const validate = useValidateDiscount()

  const toggle = (id) => setPanel((current) => (current === id ? null : id))

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      // Clipboard blocked (insecure origin or denied permission) — fail quietly.
    }
  }

  const submitCode = async (event) => {
    event.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setError(null)
    const result = await validate.mutateAsync({ code: trimmed, subtotal })

    if (!result.valid) {
      setError(result.message)
      return
    }

    onApplyDiscount({ code: trimmed, kind: result.kind, amount: result.amount })
    setCode('')
  }

  const actions = [
    { id: 'share', label: shared ? 'Link copied' : 'Share cart', Icon: ReplyOutlinedIcon, onClick: share },
    { id: 'note', label: 'Order note', Icon: EditOutlinedIcon, onClick: () => toggle('note') },
    {
      id: 'discount',
      label: discount ? 'Discount(1)' : 'Discount',
      Icon: LocalOfferOutlinedIcon,
      onClick: () => toggle('discount'),
    },
  ]

  return (
    <div className="border-y border-charcoal/10">
      <div className="grid grid-cols-3 divide-x divide-charcoal/10">
        {actions.map(({ id, label, Icon, onClick }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 py-3 text-xs transition-colors hover:bg-sage/50',
              panel === id && 'bg-sage/50',
            )}
          >
            <Icon sx={{ fontSize: 16 }} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {panel === 'note' && (
        <div className="border-t border-charcoal/10 px-5 py-4">
          <textarea
            rows={3}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Add a note to your order"
            className="w-full resize-y rounded-xl border border-charcoal/20 px-3 py-2 text-sm outline-none transition-colors placeholder:text-text-muted focus:border-charcoal"
          />
        </div>
      )}

      {panel === 'discount' && (
        <div className="border-t border-charcoal/10 px-5 py-4">
          {discount ? (
            <div className="flex items-center justify-between gap-2 rounded-full bg-sage px-4 py-2 text-sm">
              <span>{discount.code}</span>
              <button
                type="button"
                aria-label={`Remove ${discount.code}`}
                onClick={() => onRemoveDiscount()}
                className="flex h-5 w-5 items-center justify-center"
              >
                <CloseIcon sx={{ fontSize: 15 }} />
              </button>
            </div>
          ) : (
            <>
              <form
                onSubmit={submitCode}
                className="flex gap-2"
              >
                <input
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value)
                    setError(null)
                  }}
                  placeholder="Discount code"
                  className="min-w-0 flex-1 rounded-full border border-charcoal/20 px-4 py-2 text-sm outline-none transition-colors placeholder:text-text-muted focus:border-charcoal"
                />
                <button
                  type="submit"
                  disabled={validate.isPending}
                  className="rounded-full bg-charcoal px-4 py-2 text-sm text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                >
                  {validate.isPending ? 'Checking…' : 'Apply'}
                </button>
              </form>
              {error && <p className="mt-2 text-xs text-accent">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
