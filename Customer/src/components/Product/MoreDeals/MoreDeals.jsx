import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import AddIcon from '@mui/icons-material/Add'
import { productPageCopy } from '../../../config/productPage'
import { formatPrice } from '../../../utils/formatPrice'

export default function MoreDeals({ product, onAdd }) {
  if (!product) return null

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-charcoal/15 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <LocalOfferOutlinedIcon fontSize="small" className="text-accent" />
        <span>{productPageCopy.moreDeals.title}</span>
      </div>

      <button
        type="button"
        onClick={() => onAdd(product)}
        className="flex items-center gap-1 rounded-full border border-charcoal/20 px-3 py-1.5 text-xs transition-colors hover:border-charcoal"
      >
        <AddIcon sx={{ fontSize: 14 }} />
        {productPageCopy.moreDeals.action} · {formatPrice(product.price)}
      </button>
    </div>
  )
}
