import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import { cartCopy } from '../../../config/cart'
import { useCountdown } from '../../../utils/useCountdown'

export default function ReservationBanner({ reservedUntil }) {
  const { label, done, active } = useCountdown(reservedUntil)
  if (!reservedUntil) return null

  return (
    <div className="flex items-center gap-2 bg-sage px-5 py-3 text-sm">
      <LocalFireDepartmentIcon fontSize="small" className="text-accent" />
      <span>{active ? cartCopy.reservation(label) : done && cartCopy.reservationExpired}</span>
    </div>
  )
}
