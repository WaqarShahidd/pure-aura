import Badge from '../../Common/Badge/Badge'
import Button from '../../Common/Button/Button'
import { addresses } from '../../../data/account'

export default function AddressBook() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Addresses</h2>
        <Button variant="outline-dark">Add address</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="flex flex-col gap-3 rounded-2xl border border-charcoal/15 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{address.label}</span>
              {address.isDefault && <Badge tone="light">Default</Badge>}
            </div>

            <address className="text-sm not-italic text-text-muted">
              <span className="block text-charcoal">{address.name}</span>
              {address.line1}
              {address.line2 && <>, {address.line2}</>}
              <br />
              {address.city}, {address.region} {address.postcode}
              <br />
              {address.country}
              <br />
              {address.phone}
            </address>

            <div className="flex gap-3 text-sm">
              <button type="button" className="text-accent underline underline-offset-4">Edit</button>
              <button type="button" className="text-text-muted underline underline-offset-4">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
