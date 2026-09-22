import { useEffect } from 'react'

// Closes a hand-rolled popover on outside click or Escape. Used by the locale selectors and
// the collection filter pills, which are plain divs rather than MUI Popovers (the theme's
// global borderRadius of 999 would render those as capsules).
export function useDismissable(ref, open, onDismiss) {
  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) onDismiss()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onDismiss()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, open, onDismiss])
}
