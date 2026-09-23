import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header/Header'
import Footer from './Footer/Footer'
import ScrollToTop from '../components/Common/ScrollToTop/ScrollToTop'
import CartDrawer from '../components/Cart/CartDrawer/CartDrawer'
import ErrorBoundary from '../components/Common/ErrorBoundary/ErrorBoundary'
import { ROUTES } from '../config/routes'
import { useScrollToTopOnRouteChange } from '../utils/useScrollToTopOnRouteChange'

export default function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === ROUTES.home

  useScrollToTopOnRouteChange()

  return (
    <div className="flex min-h-screen flex-col">
      <Header overlay={isHome} />
      <main className="flex-1">
        {/*
          Keyed on pathname so navigating away from a crashed page clears the error —
          without the key the boundary stays tripped and every subsequent route renders
          the fallback instead of the page.
        */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <CartDrawer />
      <ScrollToTop />
    </div>
  )
}
