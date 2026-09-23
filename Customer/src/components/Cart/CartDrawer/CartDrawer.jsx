import Drawer from '@mui/material/Drawer'
import { useNavigate } from 'react-router-dom'
import CartHeader from '../CartHeader/CartHeader'
import ReservationBanner from '../ReservationBanner/ReservationBanner'
import FreeShippingMeter from '../FreeShippingMeter/FreeShippingMeter'
import CartLineItem from '../CartLineItem/CartLineItem'
import CartActions from '../CartActions/CartActions'
import CartTotals from '../CartTotals/CartTotals'
import CartUpsells from '../CartUpsells/CartUpsells'
import Button from '../../Common/Button/Button'
import PaymentIcons from '../../Common/PaymentIcons/PaymentIcons'
import EmptyState from '../../Common/EmptyState/EmptyState'
import { useCart } from '../../../context/useCart'
import { cartLineFrom } from '../../../context/cartLine'
import { EMPTY, useUpsells } from '../../../data/useCatalog'
import { cartConfig, cartEmptyCopy } from '../../../config/cart'
import { ROUTES, collectionPath } from '../../../config/routes'

export default function CartDrawer() {
  const navigate = useNavigate()
  const {
    items,
    isOpen,
    reservedUntil,
    holdError,
    note,
    discount,
    count,
    subtotal,
    compareSubtotal,
    savings,
    remainingForFreeShipping,
    shippingProgress,
    closeCart,
    setQuantity,
    removeItem,
    addItem,
    setNote,
    applyDiscount,
    removeDiscount,
  } = useCart()

  // Upsells exclude what is already in the cart, so the query key changes as lines are
  // added or removed and the suggestions stay relevant without a manual refetch.
  const { data: allUpsells = EMPTY } = useUpsells(items.map((line) => line.handle))
  const upsells = allUpsells.slice(0, cartConfig.upsellLimit)

  const goTo = (path) => {
    closeCart()
    navigate(path)
  }

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={closeCart}
      // The theme sets a global borderRadius of 999, which would render the drawer's Paper as
      // a capsule; `sx` is the accepted escape hatch for MUI-owned surfaces here.
      slotProps={{
        paper: { sx: { borderRadius: 0, width: { xs: '100%', sm: 440 } } },
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)' } },
      }}
    >
      <div className="flex h-full flex-col">
        <CartHeader count={count} onClose={closeCart} />

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-5">
            <EmptyState
              title={cartEmptyCopy.title}
              body={cartEmptyCopy.body}
              actionLabel={cartEmptyCopy.action}
              onAction={() => goTo(collectionPath('all'))}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <ReservationBanner reservedUntil={reservedUntil} />
              {holdError && (
                <p className="bg-accent/10 px-5 py-2 text-xs text-accent">{holdError}</p>
              )}
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
                    onNavigate={closeCart}
                  />
                ))}
              </div>

              <CartActions
                note={note}
                onNoteChange={setNote}
                discount={discount}
                subtotal={subtotal}
                onApplyDiscount={applyDiscount}
                onRemoveDiscount={removeDiscount}
              />

              <CartUpsells
                products={upsells}
                onAdd={(product) => addItem(cartLineFrom(product), 1)}
                onNavigate={closeCart}
              />
            </div>

            <div className="border-t border-charcoal/10 bg-white">
              <CartTotals
                subtotal={subtotal}
                compareSubtotal={compareSubtotal}
                savings={savings}
                discount={discount}
              />

              <div className="flex gap-3 px-5 pb-3">
                <Button
                  variant="outline-dark"
                  onClick={() => goTo(ROUTES.cart)}
                  className="flex-1"
                >
                  View Cart
                </Button>
                <Button
                  variant="solid-dark"
                  onClick={() => goTo(ROUTES.checkout)}
                  className="flex-1"
                >
                  Check out
                </Button>
              </div>

              <PaymentIcons className="justify-center pb-4" />
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
