"use client"

/**
 * Lumos Inspector - Webflow-style Visual Inspector
 *
 * A comprehensive visual development tool with 80+ CSS editing tools.
 *
 * QUICK START:
 *
 * 1. Copy this folder to: components/lumos-inspector/
 *
 * 2. Add to your layout:
 *
 *    import { LumosInspector } from "@/components/lumos-inspector"
 *    import { Toaster } from "sonner"
 *
 *    export default function RootLayout({ children }) {
 *      return (
 *        <html>
 *          <body>
 *            {children}
 *            <LumosInspector />
 *            <Toaster />
 *          </body>
 *        </html>
 *      )
 *    }
 *
 * 3. (Optional) If you don't have shadcn/ui theme variables, import the fallback CSS:
 *
 *    import "@/components/lumos-inspector/lumos-inspector.css"
 *
 * OPTIONS:
 *
 * - <LumosInspector />
 *   Shows in development, hidden in production
 *
 * - <LumosInspector forceShow />
 *   Always show (even in production)
 *
 * - <LumosInspector disabled />
 *   Never show
 */

import * as React from "react"
import { InspectorProvider } from "./core/inspector-context"
import { Inspector } from "./core/inspector"

interface LumosInspectorProps {
  /** Force show even in production */
  forceShow?: boolean
  /** Disable the inspector entirely */
  disabled?: boolean
}

/**
 * Lumos Inspector - drop-in visual development tool
 *
 * By default, only shows in development mode.
 */
export function LumosInspector({ forceShow = false, disabled = false }: LumosInspectorProps) {
  // Don't render if disabled
  if (disabled) return null

  // Check if we should show
  const isDevelopment = process.env.NODE_ENV === "development"
  const shouldShow = forceShow || isDevelopment

  if (!shouldShow) return null

  return (
    <InspectorProvider>
      <Inspector />
    </InspectorProvider>
  )
}

// Also export components for advanced usage
export { DevToolsPanel } from "./core/dev-tools-panel"
export { InspectorProvider, useInspector } from "./core/inspector-context"
export { Inspector } from "./core/inspector"
export { ErrorBoundary, withErrorBoundary, ToolErrorFallback } from "./core/error-boundary"

// Re-export utilities
export { cn, throttle, debounce, isElementInDOM, safeGetComputedStyle, safeGetBoundingRect } from "./lib/utils"

// Re-export individual tools for customization
export * from "./tools"

// New improvements - History Manager
export { HistoryManager, getHistoryManager, createStyleEntry, createClassEntry, createDOMEntry } from "./core/history-manager"
export type { HistoryEntry, HistoryEntryType } from "./core/history-manager"

// New improvements - Style Persistence
export { StylePersistenceManager, getStylePersistenceManager } from "./core/style-persistence"
export type { ExportFormat, DesignToken, StyleSession } from "./core/style-persistence"

// New improvements - Plugin System
export { getPluginRegistry, createToolConfig, createPlugin, usePluginRegistry, useTools, useToolSearch } from "./core/plugin-system"
export type { ToolCategory, ToolConfig, ToolProps, InspectorPlugin, ToolRegistration } from "./core/plugin-system"

// New improvements - Multi-Selection
export { MultiSelectionManager, getMultiSelectionManager, useMultiSelection } from "./core/multi-selection"
export type { SelectionMode } from "./core/multi-selection"

// New improvements - Accessibility
export { announce, getAnnouncer, trapFocus, focusFirst, createKeyboardNavigation, generateId, createSkipLink, getContrastRatio, meetsWCAG, prefersReducedMotion, prefersHighContrast } from "./core/accessibility"

// New improvements - Split Contexts
export { InspectorContextProvider, usePanelState, useSelection, useBreakpoint, useStyleChange, useHistory } from "./core/contexts"

// New improvements - Panel Components
export { StylesTab, ComputedTab, ActionsTab, CodeTab } from "./core/panels"
export { Section, PropertyRow, IconButtonGroup, SpacingBox, useStyleEditor } from "./core/panels/shared"

// New improvements - CSS-in-JS Detection
export { detectLibraries, analyzeClassName, getCSSInJSStyles, parseTailwindClass, cssToTailwind, getClassRules } from "./core/css-in-js-detector"
export type { CSSInJSLibrary, CSSInJSInfo, DetectedLibraries } from "./core/css-in-js-detector"

// New improvements - Keyboard Shortcuts
export { getKeyboardShortcutsManager, useKeyboardShortcuts, useKeyRecorder, formatKeyCombo, defaultShortcuts } from "./core/keyboard-shortcuts-manager"
export type { ShortcutDefinition, ShortcutCategory, ShortcutConfig } from "./core/keyboard-shortcuts-manager"
export { KeyboardShortcutsPanel, KeyboardShortcutsCompact } from "./core/keyboard-shortcuts-panel"

// New improvements - Tutorial System
export { TutorialProvider, useTutorial, gettingStartedTutorial, cssExportTutorial } from "./core/tutorial-system"
export type { Tutorial, TutorialStep } from "./core/tutorial-system"

// New improvements - Device Preview
export { DevicePreviewProvider, useDevicePreview, DevicePreviewOverlay, DeviceSelector, DevicePreviewFrame, DeviceQuickSelect, devicePresets } from "./core/device-preview"
export type { DeviceDefinition } from "./core/device-preview"

// New improvements - Animation Timeline
export { AnimationTimelineProvider, useAnimationTimeline, AnimationTimelinePlayer, easingPresets, animatableProperties } from "./core/animation-timeline-player"
export type { Keyframe, AnimationTrack, AnimationDefinition } from "./core/animation-timeline-player"

// New improvements - Style Snapshots
export { SnapshotProvider, useSnapshots, SnapshotsPanel, createSnapshot, compareSnapshots } from "./core/style-snapshots"
export type { StyleSnapshot, ElementSnapshot, SnapshotDiff } from "./core/style-snapshots"

// New improvements - Batch Operations
export { BatchOperationsProvider, useBatchOperations, BatchOperationsPanel, MultiSelectOverlay, quickStylePresets } from "./core/batch-operations"
export type { StylePreset } from "./core/batch-operations"

// New improvements - Accessibility Audit
export { AccessibilityAuditPanel, runAccessibilityAudit, generateHTMLReport } from "./core/accessibility-audit"
export type { AccessibilityIssue, AuditResult, WCAGLevel, IssueSeverity, IssueCategory } from "./core/accessibility-audit"

// New improvements - Performance Dashboard
export { PerformanceDashboard, runPerformanceAudit } from "./core/performance-dashboard"
export type { WebVitals, ResourceInfo, DOMStats, PerformanceHint, PerformanceReport } from "./core/performance-dashboard"

// New improvements - Design Token Extractor
export { DesignTokenExtractor, extractTokens, exportTokens } from "./core/design-token-extractor"
export type { DesignToken as ExtractedDesignToken, TokenSet, TokenCategory } from "./core/design-token-extractor"

// New improvements - React Component Prop Inspector
export { ComponentPropInspector, ComponentQuickInfo, getComponentInfo, getComponentAncestors } from "./core/component-prop-inspector"
export type { ComponentInfo, HookInfo } from "./core/component-prop-inspector"

// Version info
export const LUMOS_INSPECTOR_VERSION = "2.1.0"
