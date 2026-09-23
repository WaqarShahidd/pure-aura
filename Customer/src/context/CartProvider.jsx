import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { CartContext } from './cartContext'
import { cartConfig } from '../config/cart'
import { api } from '../lib/api'

const initialState = {
  items: [],
  isOpen: false,
  reservedUntil: null,
  note: '',
  discount: null, // {code, kind, amount} | null - one order carries one discount_code
  cartToken: null,
  holdError: null, // ephemeral UI feedback from the last /carts/hold call, never persisted
}

// Reads storage synchronously as the reducer's initial value rather than in an effect, which
// avoids a flash of an empty cart under StrictMode and avoids an initial write that would
// clobber what is stored.
function loadInitialCart() {
  // The cart's inventory_holds all key off this - it needs to exist before the first
  // addItem, not be created lazily on first use, or the earliest holds of a session
  // would have no cart_token to attach to.
  const ensureToken = (state) => ({ ...state, cartToken: state.cartToken ?? crypto.randomUUID() })

  if (typeof window === 'undefined') return ensureToken(initialState)

  try {
    const raw = window.localStorage.getItem(cartConfig.storageKey)
    if (!raw) return ensureToken(initialState)

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.items)) return ensureToken(initialState)

    return ensureToken({
      ...initialState,
      ...parsed,
      // Never restore an open drawer on page load.
      isOpen: false,
    })
  } catch {
    return ensureToken(initialState)
  }
}

function reserveUntil() {
  return Date.now() + cartConfig.reservationMinutes * 60 * 1000
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { item, quantity = 1 } = action
      const existing = state.items.find((line) => line.key === item.key)

      const items = existing
        ? state.items.map((line) =>
            line.key === item.key
              ? {
                  ...line,
                  quantity: Math.min(line.quantity + quantity, cartConfig.maxLineQuantity),
                }
              : line,
          )
        : [...state.items, { ...item, quantity }]

      return {
        ...state,
        items,
        isOpen: true,
        reservedUntil: state.reservedUntil ?? reserveUntil(),
      }
    }

    case 'REMOVE_ITEM': {
      const items = state.items.filter((line) => line.key !== action.key)
      return { ...state, items, reservedUntil: items.length ? state.reservedUntil : null }
    }

    case 'SET_QUANTITY': {
      if (action.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', key: action.key })
      }
      return {
        ...state,
        items: state.items.map((line) =>
          line.key === action.key
            ? { ...line, quantity: Math.min(action.quantity, cartConfig.maxLineQuantity) }
            : line,
        ),
      }
    }

    case 'SET_LINE_OPTION':
      return {
        ...state,
        items: state.items.map((line) =>
          line.key === action.key ? { ...line, [action.field]: action.value } : line,
        ),
      }

    case 'CLEAR_CART':
      // A fresh token too - the old one's holds are superseded by the order that was
      // just placed (orderService releases them), so nothing is lost by not reusing it.
      return { ...initialState, cartToken: crypto.randomUUID() }

    case 'OPEN_DRAWER':
      return { ...state, isOpen: true }
    case 'CLOSE_DRAWER':
      return { ...state, isOpen: false }
    case 'TOGGLE_DRAWER':
      return { ...state, isOpen: !state.isOpen }

    case 'SET_NOTE':
      return { ...state, note: action.note }

    // A cart carries at most one discount - orders.discount_code is a single column, not
    // a list - so applying a new code replaces whatever was there.
    case 'APPLY_DISCOUNT':
      return { ...state, discount: action.discount }
    case 'REMOVE_DISCOUNT':
      return { ...state, discount: null }

    case 'SET_HOLD_ERROR':
      return { ...state, holdError: action.message }

    case 'RESET_RESERVATION':
      return { ...state, reservedUntil: null }

    default:
      return state
  }
}

export default function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadInitialCart)

  // Deliberately not keyed on isOpen — opening the drawer should not hit storage. Nor on
  // holdError, which is ephemeral UI feedback from the last hold attempt, not cart data.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        cartConfig.storageKey,
        JSON.stringify({
          items: state.items,
          note: state.note,
          discount: state.discount,
          cartToken: state.cartToken,
          reservedUntil: state.reservedUntil,
        }),
      )
    } catch {
      // Storage unavailable (private mode, blocked cookies) — the cart still works in memory.
    }
  }, [state.items, state.note, state.discount, state.cartToken, state.reservedUntil])

  // Fire-and-forget: the cart itself stays optimistic and client-authoritative, this just
  // tries to back it with a real reservation. A failure (most often INSUFFICIENT_STOCK,
  // the "two browsers, one unit" race) surfaces as holdError rather than blocking the add
  // or rolling it back - the line stays in the cart, and checkout's own stock check is
  // still the real, final word.
  const addItem = useCallback(
    (item, quantity = 1) => {
      dispatch({ type: 'ADD_ITEM', item, quantity })

      if (!item.variantId) return
      api('/carts/hold', {
        method: 'POST',
        body: { cartToken: state.cartToken, variantId: item.variantId, quantity },
      })
        .then(() => dispatch({ type: 'SET_HOLD_ERROR', message: null }))
        .catch((error) => {
          dispatch({
            type: 'SET_HOLD_ERROR',
            message: error?.details?.[0]?.message ?? error?.message ?? 'Could not reserve that item',
          })
        })
    },
    [state.cartToken],
  )
  const removeItem = useCallback((key) => dispatch({ type: 'REMOVE_ITEM', key }), [])
  const setQuantity = useCallback(
    (key, quantity) => dispatch({ type: 'SET_QUANTITY', key, quantity }),
    [],
  )
  const setLineOption = useCallback(
    (key, field, value) => dispatch({ type: 'SET_LINE_OPTION', key, field, value }),
    [],
  )
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), [])
  const openCart = useCallback(() => dispatch({ type: 'OPEN_DRAWER' }), [])
  const closeCart = useCallback(() => dispatch({ type: 'CLOSE_DRAWER' }), [])
  const setNote = useCallback((note) => dispatch({ type: 'SET_NOTE', note }), [])
  const applyDiscount = useCallback((discount) => dispatch({ type: 'APPLY_DISCOUNT', discount }), [])
  const removeDiscount = useCallback(() => dispatch({ type: 'REMOVE_DISCOUNT' }), [])
  const expireReservation = useCallback(() => dispatch({ type: 'RESET_RESERVATION' }), [])

  // Derived, never stored — storing these would let them drift from `items`.
  const totals = useMemo(() => {
    const count = state.items.reduce((sum, line) => sum + line.quantity, 0)
    const subtotal = state.items.reduce((sum, line) => sum + line.price * line.quantity, 0)
    const compareSubtotal = state.items.reduce(
      (sum, line) => sum + (line.compareAtPrice ?? line.price) * line.quantity,
      0,
    )
    const { freeShippingThreshold } = cartConfig

    return {
      count,
      subtotal,
      compareSubtotal,
      savings: Math.max(0, compareSubtotal - subtotal),
      freeShippingThreshold,
      remainingForFreeShipping: Math.max(0, freeShippingThreshold - subtotal),
      shippingProgress: freeShippingThreshold > 0
        ? Math.min(1, subtotal / freeShippingThreshold)
        : 1,
    }
  }, [state.items])

  const value = useMemo(
    () => ({
      ...state,
      ...totals,
      addItem,
      removeItem,
      setQuantity,
      setLineOption,
      clearCart,
      openCart,
      closeCart,
      setNote,
      applyDiscount,
      removeDiscount,
      expireReservation,
    }),
    [
      state,
      totals,
      addItem,
      removeItem,
      setQuantity,
      setLineOption,
      clearCart,
      openCart,
      closeCart,
      setNote,
      applyDiscount,
      removeDiscount,
      expireReservation,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
