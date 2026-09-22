import { Link } from 'react-router-dom'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ImagePlaceholder from '../../Common/ImagePlaceholder/ImagePlaceholder'
import QuantityStepper from '../../Common/QuantityStepper/QuantityStepper'
import PriceTag from '../../Common/PriceTag/PriceTag'
import { productPath } from '../../../config/routes'

export default function CartLineItem({ line, onQuantityChange, onRemove, onNavigate }) {
  return (
    <div className="flex gap-4 px-5 py-5">
      <Link to={productPath(line.handle)} onClick={onNavigate} className="w-20 shrink-0">
        <ImagePlaceholder
          src={line.image}
          alt={line.title}
          seed={line.handle}
          rounded="rounded-xl"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              to={productPath(line.handle)}
              onClick={onNavigate}
              className="text-sm font-medium"
            >
              {line.title}
            </Link>
            <p className="text-xs text-text-muted">{line.variantSummary}</p>
            {line.giftWrap && <p className="text-xs text-text-muted">Gift wrapped</p>}
            {line.giftCard && <p className="text-xs text-text-muted">With gift card</p>}
          </div>

          <button
            type="button"
            aria-label={`Remove ${line.title}`}
            onClick={() => onRemove(line.key)}
            className="text-text-muted transition-colors hover:text-charcoal"
          >
            <DeleteOutlineIcon fontSize="small" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <QuantityStepper
            value={line.quantity}
            size="sm"
            onChange={(quantity) => onQuantityChange(line.key, quantity)}
            min={0}
          />
          <PriceTag
            price={line.price * line.quantity}
            compareAtPrice={
              line.compareAtPrice ? line.compareAtPrice * line.quantity : null
            }
          />
        </div>
      </div>
    </div>
  )
}
