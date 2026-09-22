import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import ProgressBar from '../../Common/ProgressBar/ProgressBar'
import { cartCopy } from '../../../config/cart'
import { formatPrice } from '../../../utils/formatPrice'

export default function FreeShippingMeter({ remaining, progress }) {
  const reached = remaining <= 0

  return (
    <div className="flex flex-col gap-2 bg-charcoal/5 px-5 py-3">
      <p className="flex items-center gap-2 text-sm">
        <LocalShippingOutlinedIcon fontSize="small" className="text-charcoal" />
        {reached
          ? cartCopy.freeShippingReached
          : cartCopy.freeShippingProgress(formatPrice(remaining))}
      </p>
      <ProgressBar value={progress} />
    </div>
  )
}
