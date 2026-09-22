import Checkbox from '../../Common/Checkbox/Checkbox'
import { productPageCopy } from '../../../config/productPage'

export default function ProductOptions({ options, onChange }) {
  const set = (field) => (value) => onChange({ ...options, [field]: value })

  return (
    <div className="flex flex-col gap-4">
      <Checkbox
        label={productPageCopy.giftWrapLabel}
        checked={options.giftWrap}
        onChange={set('giftWrap')}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{productPageCopy.giftCardHeading}</p>
        <Checkbox
          label={productPageCopy.giftCardLabel}
          checked={options.giftCard}
          onChange={set('giftCard')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="gift-message" className="text-sm">
          {productPageCopy.giftMessageLabel}
        </label>
        <textarea
          id="gift-message"
          rows={3}
          value={options.giftMessage}
          onChange={(event) => set('giftMessage')(event.target.value)}
          placeholder={productPageCopy.giftMessagePlaceholder}
          className="w-full resize-y rounded-2xl border border-charcoal/20 px-4 py-3 text-sm outline-none transition-colors placeholder:text-text-muted focus:border-charcoal"
        />
      </div>
    </div>
  )
}
