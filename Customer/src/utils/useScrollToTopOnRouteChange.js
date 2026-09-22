import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Resets scroll on navigation. React Router v7 ships <ScrollRestoration/>, but it only works
// with a data router — this app uses the declarative <BrowserRouter> + <Routes> API, where it
// is a no-op.
//
// Named apart from the ScrollToTop *button* component, which is a separate thing.
export function useScrollToTopOnRouteChange() {
  const { pathname } = useLocation()

  useEffect(() => {
    // 'auto', never 'smooth' — smooth scrolling on navigation makes a new page look like it
    // loaded mid-scroll. Keyed on pathname only, so changing a filter's query string does not
    // yank the user back to the top of the collection page.
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
}
