import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHero from '../../components/Page/PageHero/PageHero'
import CheckoutSteps from '../../components/Checkout/CheckoutSteps/CheckoutSteps'
import OrderSummary from '../../components/Checkout/OrderSummary/OrderSummary'
import ContactStep from '../../components/Checkout/ContactStep/ContactStep'
import ShippingStep from '../../components/Checkout/ShippingStep/ShippingStep'
import DeliveryStep from '../../components/Checkout/DeliveryStep/DeliveryStep'
import PaymentStep from '../../components/Checkout/PaymentStep/PaymentStep'
import ReviewStep from '../../components/Checkout/ReviewStep/ReviewStep'
import Button from '../../components/Common/Button/Button'
import EmptyState from '../../components/Common/EmptyState/EmptyState'
import { useCart } from '../../context/useCart'
import { CHECKOUT_STEPS, COUNTRIES, TAX_RATE, shippingCostFor } from '../../config/checkout'
import { ROUTES, collectionPath } from '../../config/routes'

const INITIAL = {
  email: '',
  phone: '',
  marketingOptIn: false,
  firstName: '',
  lastName: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postcode: '',
  country: COUNTRIES[0],
  delivery: 'standard',
  cardName: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvc: '',
  billingSame: true,
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const EXPIRY_RE = /^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/

// Only the step being left is validated, so someone is never blocked by a field they have not
// reached yet.
function validateStep(stepId, values) {
  const errors = {}

  if (stepId === 'contact') {
    if (!EMAIL_RE.test(values.email)) errors.email = 'Enter a valid email address'
  }

  if (stepId === 'shipping') {
    if (!values.firstName.trim()) errors.firstName = 'Required'
    if (!values.lastName.trim()) errors.lastName = 'Required'
    if (!values.line1.trim()) errors.line1 = 'Required'
    if (!values.city.trim()) errors.city = 'Required'
    if (!values.region.trim()) errors.region = 'Required'
    if (!values.postcode.trim()) errors.postcode = 'Required'
  }

  if (stepId === 'payment') {
    if (!values.cardName.trim()) errors.cardName = 'Required'
    const digits = values.cardNumber.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19) errors.cardNumber = 'Enter a card number'
    if (!EXPIRY_RE.test(values.cardExpiry)) errors.cardExpiry = 'Use MM/YY'
    if (!/^\d{3,4}$/.test(values.cardCvc)) errors.cardCvc = '3 or 4 digits'
  }

  return errors
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, subtotal, savings, clearCart } = useCart()

  const [stepIndex, setStepIndex] = useState(0)
  const [values, setValues] = useState(INITIAL)
  const [errors, setErrors] = useState({})

  const step = CHECKOUT_STEPS[stepIndex]

  const onChange = useCallback((field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const shipping = shippingCostFor(values.delivery, subtotal)
  // PKR has no subunit, so tax rounds to whole rupees.
  const tax = useMemo(() => Math.round(subtotal * TAX_RATE), [subtotal])
  const total = subtotal + shipping + tax

  const goNext = () => {
    const found = validateStep(step.id, values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (stepIndex < CHECKOUT_STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
      return
    }

    // Final step: hand the order to the confirmation page and empty the cart.
    const orderId = `PA-${Math.floor(10000 + Math.random() * 89999)}`
    clearCart()
    navigate(ROUTES.orderConfirmed, {
      replace: true,
      state: { orderId, email: values.email, total, delivery: values.delivery },
    })
  }

  if (items.length === 0) {
    return (
      <>
        <PageHero title="Checkout" />
        <section className="mx-auto max-w-3xl px-6 py-16 md:px-10">
          <EmptyState
            title="There is nothing to check out"
            body="Add something to your cart and it will show up here."
            actionLabel="Start shopping"
            onAction={() => navigate(collectionPath('all'))}
          />
        </section>
      </>
    )
  }

  return (
    <>
      <PageHero title="Checkout" />

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <CheckoutSteps currentIndex={stepIndex} onGoTo={setStepIndex} />

        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-[1fr_22rem]">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              goNext()
            }}
            noValidate
            className="flex flex-col gap-8"
          >
            {step.id === 'contact' && (
              <ContactStep values={values} errors={errors} onChange={onChange} />
            )}
            {step.id === 'shipping' && (
              <ShippingStep values={values} errors={errors} onChange={onChange} />
            )}
            {step.id === 'delivery' && (
              <DeliveryStep
                value={values.delivery}
                onChange={(id) => onChange('delivery', id)}
                subtotal={subtotal}
              />
            )}
            {step.id === 'payment' && (
              <PaymentStep values={values} errors={errors} onChange={onChange} />
            )}
            {step.id === 'review' && <ReviewStep values={values} onEditStep={setStepIndex} />}

            <div className="flex items-center gap-4">
              {stepIndex > 0 && (
                <Button variant="outline-dark" onClick={() => setStepIndex(stepIndex - 1)}>
                  Back
                </Button>
              )}
              <Button type="submit" variant="solid-dark">
                {stepIndex === CHECKOUT_STEPS.length - 1 ? 'Place order' : 'Continue'}
              </Button>
            </div>
          </form>

          <OrderSummary
            items={items}
            subtotal={subtotal}
            savings={savings}
            shipping={shipping}
            tax={tax}
            total={total}
          />
        </div>
      </section>
    </>
  )
}
