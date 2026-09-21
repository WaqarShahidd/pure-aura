import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header/Header'
import Footer from './Footer/Footer'
import ScrollToTop from '../components/Common/ScrollToTop/ScrollToTop'
import { ROUTES } from '../config/routes'

export default function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === ROUTES.home

  return (
    <div className="flex min-h-screen flex-col">
      <Header overlay={isHome} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}
