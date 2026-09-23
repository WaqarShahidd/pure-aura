import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SearchIcon from '@mui/icons-material/Search'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import AnnouncementBar from './AnnouncementBar'
import NavItem from './NavItem'
import { layoutOf } from './navLayout'
import MegaPanel from './MegaPanel'
import FlyoutPanel from './FlyoutPanel'
import MobileNav from './MobileNav'
import { useBootstrap } from '../../data/useContent'
import { ROUTES } from '../../config/routes'
import { useScrollPosition } from '../../utils/useScrollPosition'
import { useCart } from '../../context/useCart'
import { cn } from '../../utils/classNames'

// Leaving the nav row closes the panel after a beat, so the mouse can cross the gap between the
// row and the panel below it without the menu snapping shut.
const CLOSE_DELAY_MS = 120

export default function Header({ overlay = false }) {
  const { settings, navigation } = useBootstrap()
  const scrolled = useScrollPosition(40)
  const { count, openCart } = useCart()
  const { pathname } = useLocation()

  const [openLabel, setOpenLabel] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef(null)

  // One shared value guarantees a single open panel and makes moving between nav items instant.
  const openItem = navigation.find((item) => item.label === openLabel) ?? null
  const openLayout = openItem ? layoutOf(openItem) : null
  const transparent = overlay && !scrolled && !openLabel

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const open = useCallback(
    (label) => {
      cancelClose()
      setOpenLabel(label)
    },
    [cancelClose],
  )

  const close = useCallback(() => {
    cancelClose()
    setOpenLabel(null)
  }, [cancelClose])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpenLabel(null), CLOSE_DELAY_MS)
  }, [cancelClose])

  useEffect(() => cancelClose, [cancelClose])

  // Close on route change. Done during render rather than in an effect so it lands in the same
  // commit as the navigation, and so it covers back/forward as well as link clicks.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpenLabel(null)
  }

  useEffect(() => {
    if (!openLabel) return undefined
    const onKeyDown = (event) => event.key === 'Escape' && close()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openLabel, close])

  return (
    <>
      {openLabel && <div className="fixed inset-0 z-30 bg-black/20" aria-hidden="true" />}

      <header
        className={cn('z-50 w-full', overlay ? 'absolute left-0 top-0' : 'relative')}
        onMouseLeave={scheduleClose}
        onMouseEnter={cancelClose}
      >
        <AnnouncementBar />

        {/* Background sits on a full-width wrapper, not on the max-w-7xl container, so the
            solid state reads as a bar rather than a centred white box. */}
        <div
          className={cn(
            'transition-colors duration-200',
            transparent ? 'bg-transparent' : 'bg-white shadow-sm',
          )}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
                className={cn('lg:hidden', transparent ? 'text-white' : 'text-charcoal')}
              >
                <MenuIcon />
              </button>

              <Link
                to={ROUTES.home}
                className={cn(
                  'text-2xl font-semibold lowercase',
                  transparent ? 'text-white' : 'text-charcoal',
                )}
              >
                {settings.name.split(' ')[0].toLowerCase()}
                <span className="text-accent">.</span>
              </Link>
            </div>

            <nav className="hidden items-center gap-7 lg:flex">
              {navigation.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  dark={!transparent}
                  open={openLabel === item.label}
                  onOpen={open}
                  onClose={close}
                />
              ))}
            </nav>

            <div
              className={cn(
                'flex items-center gap-4',
                transparent ? 'text-white' : 'text-charcoal',
              )}
            >
              <Link to={ROUTES.search} aria-label="Search">
                <SearchIcon />
              </Link>
              <Link to={ROUTES.account} aria-label="Account">
                <PersonOutlineIcon />
              </Link>
              <button
                type="button"
                aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
                onClick={openCart}
                className="relative"
              >
                <ShoppingBagOutlinedIcon />
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mega and flyout panels span the viewport, so they anchor to the header itself.
            `top-full` lands below the announcement bar as well as the nav row. */}
        {openItem && (openLayout === 'mega' || openLayout === 'flyout') && (
          <div className="absolute left-0 top-full w-full">
            {openLayout === 'mega' ? (
              <MegaPanel item={openItem} onNavigate={close} />
            ) : (
              <FlyoutPanel item={openItem} onNavigate={close} />
            )}
          </div>
        )}
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}
