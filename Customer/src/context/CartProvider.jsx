import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { CartContext } from './cartContext'
import { cartConfig } from '../config/cart'

const initialState = {
  items: [],
  isOpen: false,
  reservedUntil: null,
  note: '',
  discountCodes: [],
}

// Reads storage synchronously as the reducer's initial value rather than in an effect, which
// avoids a flash of an empty cart under StrictMode and avoids an initial write that would
// clobber what is stored.
function loadInitialCart() {
  if (typeof window === 'undefined') return initialState

  try {
    const raw = window.localStorage.getItem(cartConfig.storageKey)
    if (!raw) return initialState

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.items)) return initialState

    return {
      ...initialState,
      ...parsed,
      // Never restore an open drawer on page load.
      isOpen: false,
    }
  } catch {
    return initialState
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
      return { ...initialState }

    case 'OPEN_DRAWER':
      return { ...state, isOpen: true }
    case 'CLOSE_DRAWER':
      return { ...state, isOpen: false }
    case 'TOGGLE_DRAWER':
      return { ...state, isOpen: !state.isOpen }

    case 'SET_NOTE':
      return { ...state, note: action.note }

    case 'APPLY_DISCOUNT':
      return state.discountCodes.includes(action.code)
        ? state
        : { ...state, discountCodes: [...state.discountCodes, action.code] }
    case 'REMOVE_DISCOUNT':
      return {
        ...state,
        discountCodes: state.discountCodes.filter((code) => code !== action.code),
      }

    case 'RESET_RESERVATION':
      return { ...state, reservedUntil: null }

    default:
      return state
  }
}

export default function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadInitialCart)

  // Deliberately not keyed on isOpen — opening the drawer should not hit storage.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        cartConfig.storageKey,
        JSON.stringify({
          items: state.items,
          note: state.note,
          discountCodes: state.discountCodes,
          reservedUntil: state.reservedUntil,
        }),
      )
    } catch {
      // Storage unavailable (private mode, blocked cookies) — the cart still works in memory.
    }
  }, [state.items, state.note, state.discountCodes, state.reservedUntil])

  const addItem = useCallback((item, quantity = 1) => {
    dispatch({ type: 'ADD_ITEM', item, quantity })
  }, [])
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
  const applyDiscount = useCallback((code) => dispatch({ type: 'APPLY_DISCOUNT', code }), [])
  const removeDiscount = useCallback((code) => dispatch({ type: 'REMOVE_DISCOUNT', code }), [])
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
