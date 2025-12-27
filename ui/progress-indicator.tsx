'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

interface ProgressIndicatorProps {
  value?: number // 0-100, undefined = indeterminate
  message?: string
  submessage?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressIndicator({
  value,
  message,
  submessage,
  className,
  size = 'md',
}: ProgressIndicatorProps) {
  const isIndeterminate = value === undefined

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <div className={cn('space-y-2', className)}>
      {message && (
        <div className="flex items-center gap-2">
          {isIndeterminate && (
            <Loader2 className={cn('animate-spin text-primary', iconSizes[size])} />
          )}
          <div>
            <p className="text-sm font-medium">{message}</p>
            {submessage && <p className="text-xs text-muted-foreground">{submessage}</p>}
          </div>
        </div>
      )}

      <div className={cn('w-full bg-secondary rounded-full overflow-hidden', sizeClasses[size])}>
        {isIndeterminate ? (
          <div className="h-full w-1/3 bg-primary rounded-full animate-pulse-slow" />
        ) : (
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
      </div>

      {!isIndeterminate && value !== undefined && (
        <p className="text-xs text-muted-foreground text-right">{Math.round(value)}%</p>
      )}
    </div>
  )
}

// Pulse animation variant
export function PulsingDot({ className }: { className?: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span
        className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75',
          className
        )}
      ></span>
      <span
        className={cn('relative inline-flex rounded-full h-3 w-3 bg-primary', className)}
      ></span>
    </span>
  )
}
