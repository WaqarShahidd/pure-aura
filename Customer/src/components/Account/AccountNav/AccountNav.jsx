import { NavLink, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../config/routes'
import { useAuth } from '../../../context/useAuth'
import { cn } from '../../../utils/classNames'

const LINKS = [
  { to: ROUTES.account, label: 'Overview', end: true },
  { to: ROUTES.accountOrders, label: 'Orders' },
  { to: ROUTES.accountAddresses, label: 'Addresses' },
  { to: ROUTES.accountProfile, label: 'Profile' },
]

export default function AccountNav() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

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
      <button
        type="button"
        onClick={async () => {
          await signOut()
          navigate(ROUTES.home)
        }}
        className="whitespace-nowrap rounded-full px-4 py-2.5 text-left text-sm text-text-muted transition-colors hover:text-charcoal md:rounded-none md:px-0 md:py-3"
      >
        Sign out
      </button>
    </nav>
  )
}
