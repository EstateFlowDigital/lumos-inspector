"use client"

import * as React from "react"
import { useInspector } from "./inspector-context"

interface ViewportPreviewProps {
  children: React.ReactNode
}

/**
 * ViewportPreview Component
 *
 * Wraps content to enable breakpoint preview in the inspector.
 * Uses CSS Container Queries to make responsive styles work
 * within the constrained preview width.
 *
 * When a breakpoint is selected:
 * 1. Container is constrained to the breakpoint width
 * 2. Container query (@container) styles respond to this width
 * 3. Elements can still be selected for inspection (unlike iframes)
 *
 * NOTE: For container queries to work, responsive styles must use
 * @container rules (added in globals.css) rather than @media queries.
 */
export function ViewportPreview({ children }: ViewportPreviewProps) {
  const { isOpen, previewWidth, showNavigator, showInspector } = useInspector()

  // Calculate the margins needed for the panels
  const leftMargin = isOpen && showNavigator ? 400 : 0
  const rightMargin = isOpen && showInspector ? 400 : 0

  // If no preview width is set (base breakpoint), render normally
  if (!previewWidth) {
    return (
      <div
        style={{
          marginLeft: leftMargin,
          marginRight: rightMargin,
          transition: "margin 0.2s ease-in-out",
        }}
      >
        {children}
      </div>
    )
  }

  // Calculate the available width between the panels
  const availableWidth = `calc(100vw - ${leftMargin}px - ${rightMargin}px)`

  return (
    <div
      style={{
        marginLeft: leftMargin,
        marginRight: rightMargin,
        transition: "margin 0.2s ease-in-out",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "var(--muted)",
      }}
    >
      {/* Breakpoint indicator bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--_spacing---space--2) 0",
          backgroundColor: "rgba(var(--muted), 0.8)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--_spacing---space--2)",
            fontSize: "var(--_typography---font-size--xs)",
            color: "var(--muted-foreground)",
          }}
        >
          <span style={{ fontWeight: "var(--_typography---font-weight--medium)" }}>
            Preview:
          </span>
          <span style={{ fontFamily: "monospace" }}>{previewWidth}px</span>
          <span style={{ color: "var(--amber-600)" }}>
            (Container Query)
          </span>
        </div>
      </div>

      {/* Viewport container with container-type for CSS container queries */}
      <div
        className="viewport-preview"
        style={{
          position: "relative",
          backgroundColor: "var(--background)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          borderLeft: "1px solid var(--border)",
          borderRight: "1px solid var(--border)",
          width: `min(${previewWidth}px, ${availableWidth})`,
          minHeight: "100vh",
          transition: "width 0.3s ease-in-out",
          // Enable CSS Container Queries
          containerType: "inline-size",
          containerName: "viewport",
        }}
      >
        {children}
      </div>
    </div>
  )
}
