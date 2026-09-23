import { useState } from 'react'
import Button from '../../Common/Button/Button'
import TextField from '../../Common/TextField/TextField'
import Checkbox from '../../Common/Checkbox/Checkbox'
import EmptyState from '../../Common/EmptyState/EmptyState'
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
} from '../../../data/useAccount'

// Add, Edit and Remove have been on this screen since it was written, as bare <button>
// elements with no onClick at all. They do something now.

const EMPTY = {
  label: 'Home',
  name: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postcode: '',
  country: 'Pakistan',
  phone: '',
  isDefault: false,
}

const FIELDS = [
  { id: 'label', label: 'Label' },
  { id: 'name', label: 'Full name', required: true },
  { id: 'line1', label: 'Address', required: true },
  { id: 'line2', label: 'Apartment, suite etc.' },
  { id: 'city', label: 'City', required: true },
  { id: 'region', label: 'Region' },
  { id: 'postcode', label: 'Postcode' },
  { id: 'country', label: 'Country', required: true },
  { id: 'phone', label: 'Phone' },
]

export default function AddressBook() {
  const { data: addresses = [], isPending } = useAddresses()
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const deleteAddress = useDeleteAddress()

  const [editing, setEditing] = useState(null)
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const set = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  const open = (address = null) => {
    setEditing(address ?? 'new')
    setValues(address ? { ...EMPTY, ...address } : EMPTY)
    setErrors({})
  }

  const submit = async (event) => {
    event.preventDefault()

    const next = {}
    for (const field of FIELDS) {
      if (field.required && !values[field.id]?.trim()) next[field.id] = 'Required'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    try {
      if (editing === 'new') await createAddress.mutateAsync(values)
      else await updateAddress.mutateAsync({ id: editing.id, ...values })
      setEditing(null)
    } catch (error) {
      const details = error.details ?? []
      setErrors(
        details.length > 0
          ? Object.fromEntries(details.map((detail) => [detail.field, detail.message]))
          : { form: error.message ?? 'Could not save that address' },
      )
    }
  }

  if (isPending) return <div className="min-h-[12rem]" />

  if (editing) {
    return (
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">
          {editing === 'new' ? 'Add an address' : 'Edit address'}
        </h2>

        {errors.form && <p className="text-sm text-accent">{errors.form}</p>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FIELDS.map((field) => (
            <TextField
              key={field.id}
              id={`address-${field.id}`}
              label={field.label}
              value={values[field.id] ?? ''}
              onChange={set(field.id)}
              error={errors[field.id]}
              required={field.required}
              className={field.id === 'line1' || field.id === 'line2' ? 'md:col-span-2' : ''}
            />
          ))}
        </div>

        <Checkbox
          label="Use this as my default address"
          checked={Boolean(values.isDefault)}
          onChange={(checked) => setValues((current) => ({ ...current, isDefault: checked }))}
        />

        <div className="flex gap-3">
          <Button variant="solid-dark" type="submit">
            Save address
          </Button>
          <Button variant="outline-dark" type="button" onClick={() => setEditing(null)}>
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Addresses</h2>
        <Button variant="solid-dark" onClick={() => open()}>
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          title="No addresses saved"
          body="Add one and checkout will fill itself in next time."
          actionLabel="Add address"
          onAction={() => open()}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-2xl border border-charcoal/15 p-5">
              <div className="flex items-center gap-2">
                <p className="font-medium">{address.label}</p>
                {address.isDefault && (
                  <span className="rounded-full bg-sage px-2 py-0.5 text-xs">Default</span>
                )}
              </div>

              <address className="mt-2 not-italic text-sm text-text-muted">
                {address.name}
                <br />
                {address.line1}
                {address.line2 && (
                  <>
                    <br />
                    {address.line2}
                  </>
                )}
                <br />
                {[address.city, address.region, address.postcode].filter(Boolean).join(', ')}
                <br />
                {address.country}
              </address>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => open(address)}
                  className="underline underline-offset-4"
                >
                  Edit
                </button>

                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => updateAddress.mutate({ id: address.id, isDefault: true })}
                    className="underline underline-offset-4"
                  >
                    Make default
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Remove this address?')) deleteAddress.mutate(address.id)
                  }}
                  className="text-accent underline underline-offset-4"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
