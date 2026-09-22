import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header/Header'
import Footer from './Footer/Footer'
import ScrollToTop from '../components/Common/ScrollToTop/ScrollToTop'
import CartDrawer from '../components/Cart/CartDrawer/CartDrawer'
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
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <ScrollToTop />
    </div>
  )
}
