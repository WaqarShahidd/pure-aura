import { Component } from 'react'
import LoadError from '../LoadError/LoadError'

// The only class component in the codebase, because React has no hook equivalent:
// componentDidCatch and getDerivedStateFromError are class-only, and an error thrown
// during render cannot be caught any other way.
//
// Two of these are mounted. One wraps the routed page, so a crash in Collection leaves the
// header, footer and cart drawer intact and the customer can navigate away. One wraps the
// whole app as a last resort. Without them a render error anywhere unmounts the entire
// tree and leaves a white screen with the reason only in the console.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // No error reporting service is wired up yet; until one is, the console is the only
    // place this goes, and swallowing it silently would be worse.
    console.error('Render error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    const { children, title, body } = this.props

    if (!error) return children

    return (
      <LoadError
        title={title ?? 'This page ran into a problem'}
        body={body ?? 'Reloading usually sorts it out.'}
        actionLabel="Reload"
        onAction={() => window.location.reload()}
      />
    )
  }
}
