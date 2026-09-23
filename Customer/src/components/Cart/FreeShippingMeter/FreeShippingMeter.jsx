import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import ProgressBar from '../../Common/ProgressBar/ProgressBar'
import { useCartCopy } from '../../../data/useContent'
import { fill } from '../../../utils/template'
import { formatPrice } from '../../../utils/formatPrice'

export default function FreeShippingMeter({ remaining, progress }) {
  const copy = useCartCopy()
  const reached = remaining <= 0

  return (
    <div className="flex flex-col gap-2 bg-charcoal/5 px-5 py-3">
      <p className="flex items-center gap-2 text-sm">
        <LocalShippingOutlinedIcon fontSize="small" className="text-charcoal" />
        {reached
          ? copy.freeShippingReached
          : fill(copy.freeShippingProgress, { amount: formatPrice(remaining) })}
      </p>
      <ProgressBar value={progress} />
    </div>
  )
}
