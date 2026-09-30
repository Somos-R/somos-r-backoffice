import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../../lib/reportError'
import { ErrorScreen } from './ErrorScreen'

export interface FallbackProps {
  error: Error
  reset: () => void
}

interface Props {
  children: ReactNode
  /** Replaces the default error screen. */
  fallback?: (props: FallbackProps) => ReactNode
  /** When any of these values change, a shown error is cleared (e.g. the current route). */
  resetKeys?: readonly unknown[]
}

interface State {
  error: Error | null
}

const changed = (a: readonly unknown[] = [], b: readonly unknown[] = []) =>
  a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]))

/**
 * Catches errors thrown while rendering its children, so one broken screen shows an error message
 * instead of a blank page. Errors in event handlers and async code are not caught by React
 * boundaries: those go through React Query's global handling.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack })
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && changed(previous.resetKeys, this.props.resetKeys)) this.reset()
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (error === null) return this.props.children
    if (this.props.fallback) return this.props.fallback({ error, reset: this.reset })
    return <ErrorScreen error={error} onRetry={this.reset} />
  }
}
