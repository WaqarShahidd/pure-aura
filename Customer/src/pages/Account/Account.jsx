import { useParams } from 'react-router-dom'
import PageHero from '../../components/Page/PageHero/PageHero'
import AccountNav from '../../components/Account/AccountNav/AccountNav'
import AccountOverview from '../../components/Account/AccountOverview/AccountOverview'
import OrderList from '../../components/Account/OrderList/OrderList'
import OrderDetail from '../../components/Account/OrderDetail/OrderDetail'
import AddressBook from '../../components/Account/AddressBook/AddressBook'
import ProfileForm from '../../components/Account/ProfileForm/ProfileForm'
import NotFound from '../NotFound/NotFound'
import { getOrderById } from '../../data/account'

// One page renders the whole account area; `section` comes from /account/:section and `id`
// from /account/orders/:id. There is no auth, so this is a signed-in shell throughout.
export default function Account({ view = 'overview' }) {
  const { section, id } = useParams()

  let body
  if (view === 'order') {
    const order = getOrderById(id)
    if (!order) return <NotFound />
    body = <OrderDetail order={order} />
  } else if (section === 'orders') {
    body = (
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-medium">Orders</h2>
        <OrderList />
      </div>
    )
  } else if (section === 'addresses') {
    body = <AddressBook />
  } else if (section === 'profile') {
    body = <ProfileForm />
  } else if (section) {
    return <NotFound />
  } else {
    body = <AccountOverview />
  }

  return (
    <>
      <PageHero title="Your account" accent="account" />

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-[14rem_1fr] md:px-10">
        <AccountNav />
        <div>{body}</div>
      </section>
    </>
  )
}
