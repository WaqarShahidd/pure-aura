import { useState } from 'react'
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { cn } from '../../../utils/classNames'

export default function CartActions({
  note,
  onNoteChange,
  discountCodes,
  onApplyDiscount,
  onRemoveDiscount,
}) {
  const [panel, setPanel] = useState(null)
  const [code, setCode] = useState('')
  const [shared, setShared] = useState(false)

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

  const submitCode = (event) => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    onApplyDiscount(trimmed.toUpperCase())
    setCode('')
  }

  const actions = [
    { id: 'share', label: shared ? 'Link copied' : 'Share cart', Icon: ReplyOutlinedIcon, onClick: share },
    { id: 'note', label: 'Order note', Icon: EditOutlinedIcon, onClick: () => toggle('note') },
    {
      id: 'discount',
      label: `Discount(${discountCodes.length})`,
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
          <form onSubmit={submitCode} className="flex gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Discount code"
              className="min-w-0 flex-1 rounded-full border border-charcoal/20 px-4 py-2 text-sm outline-none transition-colors placeholder:text-text-muted focus:border-charcoal"
            />
            <button
              type="submit"
              className="rounded-full bg-charcoal px-4 py-2 text-sm text-white transition-opacity hover:opacity-85"
            >
              Apply
            </button>
          </form>

          {discountCodes.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {discountCodes.map((applied) => (
                <li
                  key={applied}
                  className="flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-xs"
                >
                  {applied}
                  <button
                    type="button"
                    aria-label={`Remove ${applied}`}
                    onClick={() => onRemoveDiscount(applied)}
                  >
                    <CloseIcon sx={{ fontSize: 13 }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
