import { Link } from 'react-router-dom'
import OrderList from '../OrderList/OrderList'
import { useAddresses, useOrders } from '../../../data/useAccount'
import { useAuth } from '../../../context/useAuth'
import { ROUTES } from '../../../config/routes'

function Stat({ label, value, href, linkLabel }) {
  return (
    <div className="rounded-2xl border border-charcoal/15 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
      {href && (
        <Link to={href} className="mt-1 inline-block text-xs text-accent underline underline-offset-4">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

export default function AccountOverview() {
  const { customer } = useAuth()
  const { data: orders = [] } = useOrders()
  const { data: addresses = [] } = useAddresses()

  const account = customer ?? {}
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0]

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-xl font-medium">Hello, {account.firstName}</h2>
        <p className="mt-1 text-sm text-text-muted">Member since {account.memberSince ? new Date(account.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Orders" value={orders.length} href={ROUTES.accountOrders} linkLabel="View all orders" />
        <Stat label="Aura points" value={account.rewardPoints} href={ROUTES.promotions} linkLabel="How points work" />
        <Stat label="Saved addresses" value={addresses.length} href={ROUTES.accountAddresses} linkLabel="Manage addresses" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-medium">Recent orders</h3>
          <Link to={ROUTES.accountOrders} className="text-sm text-accent underline underline-offset-4">
            View all
          </Link>
        </div>
        <OrderList limit={2} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-medium">Default address</h3>
          <Link to={ROUTES.accountAddresses} className="text-sm text-accent underline underline-offset-4">
            Manage
          </Link>
        </div>
        {/*
          Guarded, where this used to dereference defaultAddress.name directly. With mock
          data there was always an address; now the list arrives asynchronously and a new
          customer legitimately has none, so both states have to render.
        */}
        <address className="rounded-2xl border border-charcoal/15 px-5 py-4 text-sm not-italic text-text-muted">
          {defaultAddress ? (
            <>
              <span className="block text-charcoal">{defaultAddress.name}</span>
              {defaultAddress.line1}
              {defaultAddress.line2 && <>, {defaultAddress.line2}</>}
              <br />
              {[defaultAddress.city, defaultAddress.region, defaultAddress.postcode]
                .filter(Boolean)
                .join(', ')}
              <br />
              {defaultAddress.country}
            </>
          ) : (
            'No address saved yet.'
          )}
        </address>
      </section>
    </div>
  )
}
