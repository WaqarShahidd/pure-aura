import { useCallback, useState } from 'react'
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
import { useAuth } from '../../context/useAuth'
import { useCheckoutOptions, usePlaceOrder } from '../../data/useCheckout'
import { CHECKOUT_STEPS, COUNTRIES } from '../../config/checkout'
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
  // Card fields are kept even though no gateway is live. Deleting them would mean
  // rebuilding the form when Stripe is enabled; unused is cheaper than missing.
  paymentMethod: null,
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
function validateStep(stepId, values, context = {}) {
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
    const method = context.methods?.find((row) => row.code === values.paymentMethod)

    if (!method) {
      errors.paymentMethod = 'Choose how you would like to pay'
    } else if (method.kind === 'gateway') {
      // Only a card needs card validation. Cash on delivery and bank transfer have no
      // fields to get wrong, and demanding a card number for them was the old bug.
      if (!values.cardName.trim()) errors.cardName = 'Required'
      const digits = values.cardNumber.replace(/\D/g, '')
      if (digits.length < 13 || digits.length > 19) errors.cardNumber = 'Enter a card number'
      if (!EXPIRY_RE.test(values.cardExpiry)) errors.cardExpiry = 'Use MM/YY'
      if (!/^\d{3,4}$/.test(values.cardCvc)) errors.cardCvc = '3 or 4 digits'
    }
  }

  return errors
}

export default function Checkout() {
  const navigate = useNavigate()
  const { customer } = useAuth()
  const { methods, deliveryMethods } = useCheckoutOptions()
  const placeOrder = usePlaceOrder()
  const { items, subtotal, savings, discount, cartToken, clearCart } = useCart()

  const [stepIndex, setStepIndex] = useState(0)
  // A signed-in customer shouldn't retype what the account already knows. This only sees
  // `customer` at mount - the profile usually resolves at app boot, before the cart page
  // is even reached, so it's already there by the time someone gets to checkout. If it
  // isn't yet, the fields simply start blank, same as before.
  const [values, setValues] = useState(() => ({
    ...INITIAL,
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
  }))
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

  const chosenDelivery = deliveryMethods.find((method) => method.id === values.delivery)
  // free_shipping zeroes the shipping line itself rather than reducing the subtotal -
  // mirrors applyDiscount() on the backend, which returns 0 for that kind for the same
  // reason: the discount amount and "shipping is free" are two different facts.
  const shipping =
    discount?.kind === 'free_shipping'
      ? 0
      : chosenDelivery
        ? chosenDelivery.freeOver != null && subtotal >= chosenDelivery.freeOver
          ? 0
          : chosenDelivery.price
        : 0
  const discountAmount = discount && discount.kind !== 'free_shipping' ? discount.amount : 0

  // Prices INCLUDE tax, so the total is subtotal - discount + shipping, and the tax line
  // is the portion contained within it. The old code added 8% on top, which charged it
  // twice against a catalogue that was already tax-inclusive.
  const total = subtotal - discountAmount + shipping
  const taxRateBp = 1800
  const tax = Math.round(total - (total * 10000) / (10000 + taxRateBp))

  const goNext = async () => {
    const found = validateStep(step.id, values, { methods })
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (stepIndex < CHECKOUT_STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
      return
    }

    // Final step: place the order for real. It used to invent a random number, save
    // nothing, and lose the whole thing on refresh.
    try {
      const order = await placeOrder.mutateAsync({
        email: values.email,
        phone: values.phone || null,
        marketingOptIn: values.marketingOptIn,
        firstName: values.firstName,
        lastName: values.lastName,
        line1: values.line1,
        line2: values.line2 || null,
        city: values.city,
        region: values.region || null,
        postcode: values.postcode || null,
        country: values.country,
        delivery: values.delivery,
        paymentMethod: values.paymentMethod,
        billingSame: values.billingSame,
        cartToken,
        discountCode: discount?.code ?? null,
        lines: items.map((line) => ({
          handle: line.handle,
          variantId: line.variantId,
          quantity: line.quantity,
          giftWrap: line.giftWrap,
          giftCard: line.giftCard,
          giftMessage: line.giftMessage || null,
        })),
      })

      clearCart()
      // The access token goes in the URL, so a refresh re-fetches the order instead of
      // bouncing the customer home.
      navigate(`${ROUTES.orderConfirmed}?token=${encodeURIComponent(order.accessToken)}`, {
        replace: true,
      })
    } catch (error) {
      const details = error.details ?? []
      // Per-field errors highlight a field when one is actually on screen (paymentMethod
      // is); `form` always gets a message too, because some failures - a stale discount
      // code, a line that sold out while checkout was open - have no field to attach to
      // and would otherwise fail with no visible feedback at all.
      setErrors({
        ...Object.fromEntries(details.map((detail) => [detail.field, detail.message])),
        form: details[0]?.message ?? error.message ?? 'We could not place that order',
      })
    }
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
                methods={deliveryMethods}
              />
            )}
            {step.id === 'payment' && (
              <PaymentStep values={values} errors={errors} onChange={onChange} methods={methods} />
            )}
            {step.id === 'review' && (
              <ReviewStep
                values={values}
                onEditStep={setStepIndex}
                deliveryMethods={deliveryMethods}
                paymentMethods={methods}
              />
            )}

            {errors.form && <p className="text-sm text-accent">{errors.form}</p>}

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
            discount={discount}
            discountAmount={discountAmount}
            shipping={shipping}
            tax={tax}
            total={total}
          />
        </div>
      </section>
    </>
  )
}
