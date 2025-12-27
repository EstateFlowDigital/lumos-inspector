"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import {
  Gauge,
  Clock,
  Zap,
  Image,
  FileCode,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Layers,
  PaintBucket,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import { ScrollArea } from "../ui/scroll-area"
import { Separator } from "../ui/separator"

// Core Web Vitals metrics
export interface WebVitals {
  // Largest Contentful Paint
  lcp: number | null
  lcpRating: "good" | "needs-improvement" | "poor" | null
  // First Input Delay (or Interaction to Next Paint)
  fid: number | null
  fidRating: "good" | "needs-improvement" | "poor" | null
  // Cumulative Layout Shift
  cls: number | null
  clsRating: "good" | "needs-improvement" | "poor" | null
  // First Contentful Paint
  fcp: number | null
  fcpRating: "good" | "needs-improvement" | "poor" | null
  // Time to First Byte
  ttfb: number | null
  ttfbRating: "good" | "needs-improvement" | "poor" | null
}

// Resource timing info
export interface ResourceInfo {
  name: string
  type: string
  size: number
  duration: number
  transferSize: number
  startTime: number
}

// DOM statistics
export interface DOMStats {
  totalElements: number
  maxDepth: number
  totalNodes: number
  documentSize: number
  scripts: number
  stylesheets: number
  images: number
  fonts: number
}

// Performance hints
export interface PerformanceHint {
  id: string
  category: "images" | "scripts" | "styles" | "dom" | "network" | "rendering"
  severity: "critical" | "warning" | "info"
  title: string
  description: string
  impact: string
  recommendation: string
}

// Full performance report
export interface PerformanceReport {
  timestamp: number
  vitals: WebVitals
  domStats: DOMStats
  resources: ResourceInfo[]
  hints: PerformanceHint[]
  score: number
}

// Thresholds for Core Web Vitals
const vitalsThresholds = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
}

// Rate a metric value
function rateMetric(
  value: number,
  thresholds: { good: number; poor: number }
): "good" | "needs-improvement" | "poor" {
  if (value <= thresholds.good) return "good"
  if (value <= thresholds.poor) return "needs-improvement"
  return "poor"
}

// Get DOM depth
function getMaxDOMDepth(element: Element, depth: number = 0): number {
  let maxDepth = depth
  for (const child of element.children) {
    const childDepth = getMaxDOMDepth(child, depth + 1)
    if (childDepth > maxDepth) maxDepth = childDepth
  }
  return maxDepth
}

// Collect Web Vitals
function collectWebVitals(): Promise<WebVitals> {
  return new Promise((resolve) => {
    const vitals: WebVitals = {
      lcp: null,
      lcpRating: null,
      fid: null,
      fidRating: null,
      cls: null,
      clsRating: null,
      fcp: null,
      fcpRating: null,
      ttfb: null,
      ttfbRating: null,
    }

    // Get navigation timing
    const navTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming
    if (navTiming) {
      vitals.ttfb = navTiming.responseStart - navTiming.requestStart
      vitals.ttfbRating = rateMetric(vitals.ttfb, vitalsThresholds.ttfb)
    }

    // Get paint timing
    const paintEntries = performance.getEntriesByType("paint")
    const fcpEntry = paintEntries.find((e) => e.name === "first-contentful-paint")
    if (fcpEntry) {
      vitals.fcp = fcpEntry.startTime
      vitals.fcpRating = rateMetric(vitals.fcp, vitalsThresholds.fcp)
    }

    // Try to get LCP from PerformanceObserver
    try {
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint")
      if (lcpEntries.length > 0) {
        const lastLcp = lcpEntries[lcpEntries.length - 1] as PerformanceEntry & { startTime: number }
        vitals.lcp = lastLcp.startTime
        vitals.lcpRating = rateMetric(vitals.lcp, vitalsThresholds.lcp)
      }
    } catch {
      // LCP not available
    }

    // CLS from layout-shift entries
    try {
      const layoutShiftEntries = performance.getEntriesByType("layout-shift") as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]
      let clsValue = 0
      layoutShiftEntries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      vitals.cls = clsValue
      vitals.clsRating = rateMetric(clsValue, vitalsThresholds.cls)
    } catch {
      // CLS not available
    }

    // Resolve after a short delay to catch any pending metrics
    setTimeout(() => resolve(vitals), 100)
  })
}

// Collect DOM statistics
function collectDOMStats(): DOMStats {
  const allElements = document.querySelectorAll("*")
  const scripts = document.querySelectorAll("script")
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style')
  const images = document.querySelectorAll("img")
  const fonts = document.querySelectorAll('link[rel="preload"][as="font"]')

  return {
    totalElements: allElements.length,
    maxDepth: getMaxDOMDepth(document.documentElement),
    totalNodes: document.querySelectorAll("*").length + document.querySelectorAll("*").length,
    documentSize: new Blob([document.documentElement.outerHTML]).size,
    scripts: scripts.length,
    stylesheets: stylesheets.length,
    images: images.length,
    fonts: fonts.length,
  }
}

// Collect resource information
function collectResources(): ResourceInfo[] {
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[]

  return resources.map((resource) => {
    const url = new URL(resource.name, window.location.origin)
    const extension = url.pathname.split(".").pop()?.toLowerCase() || ""

    let type = "other"
    if (["js"].includes(extension)) type = "script"
    else if (["css"].includes(extension)) type = "stylesheet"
    else if (["jpg", "jpeg", "png", "gif", "webp", "svg", "ico"].includes(extension)) type = "image"
    else if (["woff", "woff2", "ttf", "otf", "eot"].includes(extension)) type = "font"
    else if (["json", "xml"].includes(extension)) type = "data"

    return {
      name: url.pathname,
      type,
      size: resource.decodedBodySize || 0,
      duration: resource.duration,
      transferSize: resource.transferSize || 0,
      startTime: resource.startTime,
    }
  })
}

// Generate performance hints
function generateHints(domStats: DOMStats, resources: ResourceInfo[]): PerformanceHint[] {
  const hints: PerformanceHint[] = []

  // DOM size hints
  if (domStats.totalElements > 1500) {
    hints.push({
      id: "dom-size",
      category: "dom",
      severity: domStats.totalElements > 3000 ? "critical" : "warning",
      title: "Large DOM size",
      description: `Page has ${domStats.totalElements} DOM elements.`,
      impact: "Increases memory usage and slows down style calculations",
      recommendation: "Consider lazy loading content or using virtualization for long lists.",
    })
  }

  if (domStats.maxDepth > 32) {
    hints.push({
      id: "dom-depth",
      category: "dom",
      severity: "warning",
      title: "Deep DOM nesting",
      description: `DOM tree is ${domStats.maxDepth} levels deep.`,
      impact: "Deep nesting increases style recalculation time",
      recommendation: "Flatten the DOM structure where possible.",
    })
  }

  // Image hints
  const images = resources.filter((r) => r.type === "image")
  const largeImages = images.filter((i) => i.size > 100000)
  if (largeImages.length > 0) {
    hints.push({
      id: "large-images",
      category: "images",
      severity: largeImages.some((i) => i.size > 500000) ? "critical" : "warning",
      title: "Large images detected",
      description: `${largeImages.length} images are over 100KB.`,
      impact: "Large images slow down page load and consume bandwidth",
      recommendation: "Compress images and use modern formats like WebP or AVIF.",
    })
  }

  // Script hints
  const scripts = resources.filter((r) => r.type === "script")
  const totalScriptSize = scripts.reduce((sum, s) => sum + s.size, 0)
  if (totalScriptSize > 500000) {
    hints.push({
      id: "large-scripts",
      category: "scripts",
      severity: totalScriptSize > 1000000 ? "critical" : "warning",
      title: "Large JavaScript bundle",
      description: `Total JavaScript size: ${(totalScriptSize / 1024).toFixed(0)}KB`,
      impact: "Large scripts block parsing and delay interactivity",
      recommendation: "Use code splitting and lazy loading for non-critical JavaScript.",
    })
  }

  // CSS hints
  const styles = resources.filter((r) => r.type === "stylesheet")
  if (styles.length > 5) {
    hints.push({
      id: "many-stylesheets",
      category: "styles",
      severity: "warning",
      title: "Many CSS files",
      description: `Page loads ${styles.length} stylesheets.`,
      impact: "Multiple CSS files increase HTTP requests and render blocking",
      recommendation: "Combine stylesheets or use critical CSS inlining.",
    })
  }

  // Network hints
  const slowResources = resources.filter((r) => r.duration > 500)
  if (slowResources.length > 0) {
    hints.push({
      id: "slow-resources",
      category: "network",
      severity: slowResources.some((r) => r.duration > 2000) ? "critical" : "warning",
      title: "Slow loading resources",
      description: `${slowResources.length} resources took over 500ms to load.`,
      impact: "Slow resources delay page rendering and interactivity",
      recommendation: "Consider using a CDN, optimizing server response, or preloading critical resources.",
    })
  }

  return hints
}

// Calculate overall score
function calculateScore(vitals: WebVitals, hints: PerformanceHint[]): number {
  let score = 100

  // Deduct for poor vitals
  if (vitals.lcpRating === "poor") score -= 20
  else if (vitals.lcpRating === "needs-improvement") score -= 10

  if (vitals.fidRating === "poor") score -= 20
  else if (vitals.fidRating === "needs-improvement") score -= 10

  if (vitals.clsRating === "poor") score -= 20
  else if (vitals.clsRating === "needs-improvement") score -= 10

  if (vitals.fcpRating === "poor") score -= 10
  else if (vitals.fcpRating === "needs-improvement") score -= 5

  if (vitals.ttfbRating === "poor") score -= 10
  else if (vitals.ttfbRating === "needs-improvement") score -= 5

  // Deduct for hints
  hints.forEach((hint) => {
    if (hint.severity === "critical") score -= 10
    else if (hint.severity === "warning") score -= 5
  })

  return Math.max(0, Math.min(100, score))
}

// Run full performance audit
export async function runPerformanceAudit(): Promise<PerformanceReport> {
  const vitals = await collectWebVitals()
  const domStats = collectDOMStats()
  const resources = collectResources()
  const hints = generateHints(domStats, resources)
  const score = calculateScore(vitals, hints)

  return {
    timestamp: Date.now(),
    vitals,
    domStats,
    resources,
    hints,
    score,
  }
}

// Metric display component
interface MetricCardProps {
  name: string
  value: number | null
  unit: string
  rating: "good" | "needs-improvement" | "poor" | null
  description: string
}

function MetricCard({ name, value, unit, rating, description }: MetricCardProps) {
  return (
    <div className="p-3 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{name}</span>
        {rating && (
          <Badge
            variant="outline"
            className={cn(
              rating === "good" && "border-green-500 text-green-500",
              rating === "needs-improvement" && "border-orange-500 text-orange-500",
              rating === "poor" && "border-destructive text-destructive"
            )}
          >
            {rating === "good" && <Check className="h-3 w-3 mr-1" />}
            {rating === "needs-improvement" && <Minus className="h-3 w-3 mr-1" />}
            {rating === "poor" && <X className="h-3 w-3 mr-1" />}
            {rating.replace("-", " ")}
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold">
        {value !== null ? (
          <>
            {value < 1 ? value.toFixed(3) : value.toFixed(0)}
            <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

// Resource list component
interface ResourceListProps {
  resources: ResourceInfo[]
}

function ResourceList({ resources }: ResourceListProps) {
  const grouped = resources.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {} as Record<string, ResourceInfo[]>)

  const typeIcons: Record<string, React.ReactNode> = {
    script: <FileCode className="h-4 w-4" />,
    stylesheet: <PaintBucket className="h-4 w-4" />,
    image: <Image className="h-4 w-4" />,
    font: <Type className="h-4 w-4" />,
    other: <Layers className="h-4 w-4" />,
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items]) => {
        const totalSize = items.reduce((sum, i) => sum + i.size, 0)
        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium capitalize">
                {typeIcons[type] || typeIcons.other}
                {type}s ({items.length})
              </div>
              <Badge variant="secondary">{formatSize(totalSize)}</Badge>
            </div>
            <div className="space-y-1">
              {items.slice(0, 5).map((resource, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
                >
                  <span className="truncate flex-1 mr-2">{resource.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatSize(resource.size)} • {resource.duration.toFixed(0)}ms
                  </span>
                </div>
              ))}
              {items.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{items.length - 5} more
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Hint card component
interface HintCardProps {
  hint: PerformanceHint
}

function HintCard({ hint }: HintCardProps) {
  const severityColors = {
    critical: "border-l-destructive bg-destructive/5",
    warning: "border-l-orange-500 bg-orange-500/5",
    info: "border-l-blue-500 bg-blue-500/5",
  }

  return (
    <div className={cn("p-3 border-l-4 rounded-r-lg", severityColors[hint.severity])}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn(
          "h-4 w-4 mt-0.5",
          hint.severity === "critical" && "text-destructive",
          hint.severity === "warning" && "text-orange-500",
          hint.severity === "info" && "text-blue-500"
        )} />
        <div className="flex-1">
          <div className="font-medium text-sm">{hint.title}</div>
          <p className="text-xs text-muted-foreground mt-1">{hint.description}</p>
          <p className="text-xs text-orange-600 mt-1">{hint.impact}</p>
          <p className="text-xs text-green-600 mt-1 flex items-start gap-1">
            <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
            {hint.recommendation}
          </p>
        </div>
      </div>
    </div>
  )
}

// Main performance dashboard
interface PerformanceDashboardProps {
  className?: string
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [report, setReport] = useState<PerformanceReport | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const runAudit = useCallback(async () => {
    setIsRunning(true)
    const result = await runPerformanceAudit()
    setReport(result)
    setIsRunning(false)
  }, [])

  // Run audit on mount
  useEffect(() => {
    runAudit()
  }, [runAudit])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          <h2 className="font-semibold">Performance</h2>
        </div>
        <Button size="sm" onClick={runAudit} disabled={isRunning}>
          <RefreshCw className={cn("h-4 w-4 mr-1", isRunning && "animate-spin")} />
          {isRunning ? "Analyzing..." : "Refresh"}
        </Button>
      </div>

      {report ? (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Score */}
            <div className="text-center p-4 border rounded-lg">
              <div
                className={cn(
                  "text-5xl font-bold",
                  report.score >= 80 && "text-green-500",
                  report.score >= 50 && report.score < 80 && "text-orange-500",
                  report.score < 50 && "text-destructive"
                )}
              >
                {report.score}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Performance Score</p>
              <Progress
                value={report.score}
                className={cn(
                  "h-2 mt-3",
                  report.score >= 80 && "[&>div]:bg-green-500",
                  report.score >= 50 && report.score < 80 && "[&>div]:bg-orange-500",
                  report.score < 50 && "[&>div]:bg-destructive"
                )}
              />
            </div>

            {/* Core Web Vitals */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Core Web Vitals
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  name="LCP"
                  value={report.vitals.lcp}
                  unit="ms"
                  rating={report.vitals.lcpRating}
                  description="Largest Contentful Paint"
                />
                <MetricCard
                  name="FID"
                  value={report.vitals.fid}
                  unit="ms"
                  rating={report.vitals.fidRating}
                  description="First Input Delay"
                />
                <MetricCard
                  name="CLS"
                  value={report.vitals.cls}
                  unit=""
                  rating={report.vitals.clsRating}
                  description="Cumulative Layout Shift"
                />
                <MetricCard
                  name="FCP"
                  value={report.vitals.fcp}
                  unit="ms"
                  rating={report.vitals.fcpRating}
                  description="First Contentful Paint"
                />
              </div>
            </div>

            <Separator />

            {/* DOM Stats */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                DOM Statistics
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Elements</span>
                  <span className="font-medium">{report.domStats.totalElements}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Max Depth</span>
                  <span className="font-medium">{report.domStats.maxDepth}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Scripts</span>
                  <span className="font-medium">{report.domStats.scripts}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Stylesheets</span>
                  <span className="font-medium">{report.domStats.stylesheets}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Images</span>
                  <span className="font-medium">{report.domStats.images}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Doc Size</span>
                  <span className="font-medium">
                    {(report.domStats.documentSize / 1024).toFixed(0)}KB
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Hints */}
            {report.hints.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Opportunities ({report.hints.length})
                </h3>
                <div className="space-y-2">
                  {report.hints.map((hint) => (
                    <HintCard key={hint.id} hint={hint} />
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Resources */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Resources ({report.resources.length})
              </h3>
              <ResourceList resources={report.resources} />
            </div>
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

// Import Type icon that was missing
function Type(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" x2="15" y1="20" y2="20" />
      <line x1="12" x2="12" y1="4" y2="20" />
    </svg>
  )
}
