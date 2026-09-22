import { NavLink } from 'react-router-dom'
import { ROUTES } from '../../../config/routes'
import { cn } from '../../../utils/classNames'

const LINKS = [
  { to: ROUTES.account, label: 'Overview', end: true },
  { to: ROUTES.accountOrders, label: 'Orders' },
  { to: ROUTES.accountAddresses, label: 'Addresses' },
  { to: ROUTES.accountProfile, label: 'Profile' },
]

export default function AccountNav() {
  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto md:flex-col md:gap-0">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cn(
              'whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition-colors md:rounded-none md:border-b md:border-charcoal/10 md:px-0 md:py-3',
              isActive ? 'bg-charcoal text-white md:bg-transparent md:font-semibold md:text-charcoal' : 'text-text-muted hover:text-charcoal',
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
