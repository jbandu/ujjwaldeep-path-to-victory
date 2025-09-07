import React from 'react'

// Global Error Boundary to prevent white screens
// Displays a user-friendly message when uncaught errors occur

export type ErrorBoundaryProps = { children: React.ReactNode }
export type ErrorBoundaryState = { hasError: boolean; error?: any }

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(err: any) {
    return { hasError: true, error: err }
  }

  componentDidCatch(error: any, info: any) {
    // keep console noise visible in prod
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh. If this persists, contact support.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
