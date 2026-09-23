import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import { useCartCopy } from '../../../data/useContent'
import { useCountdown } from '../../../utils/useCountdown'
import { fill } from '../../../utils/template'

export default function ReservationBanner({ reservedUntil }) {
  const copy = useCartCopy()
  const { label, done, active } = useCountdown(reservedUntil)
  if (!reservedUntil) return null

  return (
    <div className="flex items-center gap-2 bg-sage px-5 py-3 text-sm">
      <LocalFireDepartmentIcon fontSize="small" className="text-accent" />
      <span>{active ? fill(copy.reservation, { time: label }) : done && copy.reservationExpired}</span>
    </div>
  )
}
