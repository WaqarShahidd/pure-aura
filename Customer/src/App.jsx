import { Routes, Route } from 'react-router-dom'
import Layout from './layout/Layout'
import Home from './pages/Home/Home'
import Collection from './pages/Collection/Collection'
import Product from './pages/Product/Product'
import Cart from './pages/Cart/Cart'
import Checkout from './pages/Checkout/Checkout'
import OrderConfirmed from './pages/OrderConfirmed/OrderConfirmed'
import Account from './pages/Account/Account'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import Search from './pages/Search/Search'
import Page from './pages/Page/Page'
import NotFound from './pages/NotFound/NotFound'
import { ROUTE_PATTERNS } from './config/routes'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={ROUTE_PATTERNS.home} element={<Home />} />

        {/* Bare /collections renders the same page; the handle defaults to 'all'. */}
        <Route path={ROUTE_PATTERNS.collections} element={<Collection />} />
        <Route path={ROUTE_PATTERNS.collection} element={<Collection />} />
        <Route path={ROUTE_PATTERNS.product} element={<Product />} />
        <Route path={ROUTE_PATTERNS.search} element={<Search />} />

        <Route path={ROUTE_PATTERNS.cart} element={<Cart />} />
        <Route path={ROUTE_PATTERNS.checkout} element={<Checkout />} />
        <Route path={ROUTE_PATTERNS.orderConfirmed} element={<OrderConfirmed />} />

        {/* More specific routes first, so neither /account/orders/:id nor
            /account/reset-password is swallowed by the generic :section. */}
        <Route path={ROUTE_PATTERNS.orderDetail} element={<Account view="order" />} />
        <Route path={ROUTE_PATTERNS.resetPassword} element={<ResetPassword />} />
        <Route path={ROUTE_PATTERNS.account} element={<Account />} />
        <Route path={ROUTE_PATTERNS.accountSection} element={<Account />} />

        {/* One component renders every static page, keyed off the slug. */}
        <Route path={ROUTE_PATTERNS.policy} element={<Page kind="policy" />} />
        <Route path={ROUTE_PATTERNS.page} element={<Page />} />

        <Route path={ROUTE_PATTERNS.notFound} element={<NotFound />} />
      </Route>
    </Routes>
  )
}
