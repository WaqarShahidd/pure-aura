import { useNavigate } from 'react-router-dom'
import PageHero from '../../components/Page/PageHero/PageHero'
import CartLineItem from '../../components/Cart/CartLineItem/CartLineItem'
import CartUpsells from '../../components/Cart/CartUpsells/CartUpsells'
import FreeShippingMeter from '../../components/Cart/FreeShippingMeter/FreeShippingMeter'
import CartTotals from '../../components/Cart/CartTotals/CartTotals'
import Button from '../../components/Common/Button/Button'
import PaymentIcons from '../../components/Common/PaymentIcons/PaymentIcons'
import EmptyState from '../../components/Common/EmptyState/EmptyState'
import { useCart } from '../../context/useCart'
import { cartLineFrom } from '../../context/cartLine'
import { EMPTY, useUpsells } from '../../data/useCatalog'
import { cartConfig, cartEmptyCopy } from '../../config/cart'
import { ROUTES, collectionPath } from '../../config/routes'

// The drawer's "View Cart" destination — same pieces, laid out wide.
export default function Cart() {
  const navigate = useNavigate()
  const {
    items,
    subtotal,
    compareSubtotal,
    savings,
    discount,
    remainingForFreeShipping,
    shippingProgress,
    setQuantity,
    removeItem,
    addItem,
  } = useCart()

  // Upsells exclude what is already in the cart, so the query key changes as lines are
  // added or removed and the suggestions stay relevant without a manual refetch.
  const { data: allUpsells = EMPTY } = useUpsells(items.map((line) => line.handle))
  const upsells = allUpsells.slice(0, cartConfig.upsellLimit)

  return (
    <>
      <PageHero title="Your cart" accent="cart" />

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        {items.length === 0 ? (
          <EmptyState
            title={cartEmptyCopy.title}
            body={cartEmptyCopy.body}
            actionLabel={cartEmptyCopy.action}
            onAction={() => navigate(collectionPath('all'))}
          />
        ) : (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_22rem]">
            <div>
              <div className="overflow-hidden rounded-2xl border border-charcoal/15">
                <FreeShippingMeter
                  remaining={remainingForFreeShipping}
                  progress={shippingProgress}
                />
                <div className="divide-y divide-charcoal/10">
                  {items.map((line) => (
                    <CartLineItem
                      key={line.key}
                      line={line}
                      onQuantityChange={setQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <CartUpsells
                  products={upsells}
                  onAdd={(product) => addItem(cartLineFrom(product), 1)}
                />
              </div>
            </div>

            <aside className="rounded-2xl border border-charcoal/15 md:sticky md:top-6 md:self-start">
              <CartTotals
                subtotal={subtotal}
                compareSubtotal={compareSubtotal}
                savings={savings}
                discount={discount}
              />
              <div className="flex flex-col gap-3 px-5 pb-5">
                <Button variant="solid-dark" to={ROUTES.checkout} fullWidth>
                  Check out
                </Button>
                <Button variant="outline-dark" to={collectionPath('all')} fullWidth>
                  Continue shopping
                </Button>
                <PaymentIcons className="justify-center pt-2" />
              </div>
            </aside>
          </div>
        )}
      </section>
    </>
  )
}
