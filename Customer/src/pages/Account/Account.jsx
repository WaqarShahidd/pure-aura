import { useParams } from 'react-router-dom'
import PageHero from '../../components/Page/PageHero/PageHero'
import AccountNav from '../../components/Account/AccountNav/AccountNav'
import AccountOverview from '../../components/Account/AccountOverview/AccountOverview'
import OrderList from '../../components/Account/OrderList/OrderList'
import OrderDetail from '../../components/Account/OrderDetail/OrderDetail'
import AddressBook from '../../components/Account/AddressBook/AddressBook'
import ProfileForm from '../../components/Account/ProfileForm/ProfileForm'
import SignInForm from '../../components/Account/SignInForm/SignInForm'
import NotFound from '../NotFound/NotFound'
import { useAuth } from '../../context/useAuth'
import { useOrder } from '../../data/useAccount'

// One page renders the whole account area; `section` comes from /account/:section and `id`
// from /account/orders/:id. It used to be a signed-in shell over mock data with no auth
// behind it at all - now it either shows the real account or asks you to sign in.
export default function Account({ view = 'overview' }) {
  const { section, id } = useParams()
  const { isSignedIn, isChecking, signIn, register, forgotPassword } = useAuth()

  // Hooks run unconditionally, before any early return, or the hook order changes between
  // the signed-out and signed-in renders.
  const orderQuery = useOrder(view === 'order' ? id : null)

  // Nothing renders until the boot refresh settles, otherwise a signed-in reload flashes
  // the sign-in form for the length of one request.
  if (isChecking) return <div className="min-h-[50vh]" />

  if (!isSignedIn) {
    return (
      <>
        <PageHero title="Your account" accent="account" />
        <SignInForm onSignIn={signIn} onRegister={register} onForgotPassword={forgotPassword} />
      </>
    )
  }

  let body
  if (view === 'order') {
    if (orderQuery.isPending) body = <div className="min-h-[40vh]" />
    else if (orderQuery.isError) return <NotFound />
    else body = <OrderDetail order={orderQuery.data} />
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
