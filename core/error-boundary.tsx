"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "../ui/button"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  name?: string
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[Lumos Inspector${this.props.name ? ` - ${this.props.name}` : ''}] Error:`, error)
    console.error('Component stack:', errorInfo.componentStack)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-3 text-xs" data-devtools>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">
              {this.props.name ? `${this.props.name} Error` : 'Tool Error'}
            </span>
          </div>
          <p className="text-muted-foreground mb-2">
            This tool encountered an error and couldn't render.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={this.handleReset}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC to wrap tools with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary name={name}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Minimal fallback for collapsed tools
export function ToolErrorFallback({ name }: { name?: string }) {
  return (
    <div className="p-2 text-[10px] text-muted-foreground flex items-center gap-1">
      <AlertTriangle className="h-3 w-3 text-destructive" />
      <span>{name || 'Tool'} unavailable</span>
    </div>
  )
}
