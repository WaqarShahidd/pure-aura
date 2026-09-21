import SearchIcon from '@mui/icons-material/Search'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import { Link } from 'react-router-dom'
import AnnouncementBar from './AnnouncementBar'
import NavDropdown from './NavDropdown'
import { navigation } from '../../config/navigation'
import { site } from '../../config/site'
import { ROUTES } from '../../config/routes'
import { useScrollPosition } from '../../utils/useScrollPosition'
import { cn } from '../../utils/classNames'

export default function Header({ overlay = false }) {
  const scrolled = useScrollPosition(40)
  const transparent = overlay && !scrolled

  return (
    <header
      className={cn(
        'z-40 w-full',
        overlay ? 'absolute left-0 top-0' : 'relative',
        transparent ? 'bg-transparent' : 'bg-white shadow-sm',
      )}
    >
      {!transparent && <AnnouncementBar />}

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link
          to={ROUTES.home}
          className={cn(
            'text-2xl font-semibold lowercase',
            transparent ? 'text-white' : 'text-charcoal',
          )}
        >
          {site.name.split(' ')[0].toLowerCase()}
          <span className="text-accent">.</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <NavDropdown key={item.label} item={item} dark={!transparent} />
          ))}
        </nav>

        <div
          className={cn(
            'flex items-center gap-4',
            transparent ? 'text-white' : 'text-charcoal',
          )}
        >
          <button type="button" aria-label="Search">
            <SearchIcon />
          </button>
          <Link to={ROUTES.account} aria-label="Account">
            <PersonOutlineIcon />
          </Link>
          <Link to={ROUTES.cart} aria-label="Cart">
            <ShoppingBagOutlinedIcon />
          </Link>
        </div>
      </div>
    </header>
  )
}
