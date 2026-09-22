import CheckIcon from '@mui/icons-material/Check'
import { productPageCopy } from '../../../config/productPage'
import { ROUTES } from '../../../config/routes'
import { Link } from 'react-router-dom'

export default function PickupInfo() {
  const { pickup } = productPageCopy

  return (
    <div className="flex gap-3 text-sm">
      <CheckIcon fontSize="small" className="mt-0.5 shrink-0 text-olive" />
      <div>
        <p className="text-charcoal">{pickup.title}</p>
        <p className="text-text-muted">{pickup.subtitle}</p>
        <Link to={ROUTES.contact} className="text-text-muted underline underline-offset-4">
          {pickup.link}
        </Link>
      </div>
    </div>
  )
}
