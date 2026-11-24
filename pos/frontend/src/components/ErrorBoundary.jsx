import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Station ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onRetry) {
      this.props.onRetry()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-warm-200 bg-white p-8 text-center shadow-card my-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-700 border border-amber-200 shadow-xs mb-4">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold text-warm-900">Station Temporarily Unavailable</h3>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-warm-600 leading-relaxed">
            {this.state.error?.message || 'A data sync or rendering error occurred in this station. Please refresh to resume.'}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={this.handleRetry}
              className="rounded-xl bg-warm-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-warm-800 transition active:scale-95"
            >
              Reload Station
            </button>
            <button
              onClick={() => window.location.href = '/staff'}
              className="rounded-xl border border-warm-300 bg-warm-50 px-4 py-2.5 text-xs sm:text-sm font-medium text-warm-800 hover:bg-warm-100 transition"
            >
              Return to Staff Hub
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
