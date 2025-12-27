"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Paintbrush,
  ArrowLeft,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Save,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  Settings,
  Eye,
  Code,
  Layers,
  Play,
  Pause,
} from "lucide-react"

interface RepoInfo {
  id: number
  name: string
  fullName: string
  defaultBranch: string
  htmlUrl: string
}

interface StyleChange {
  id: string
  selector: string
  property: string
  oldValue: string
  newValue: string
  timestamp: number
}

interface EditorClientProps {
  repo: RepoInfo
  deploymentUrl: string | null
  accessToken: string
}

type ViewportSize = "desktop" | "tablet" | "mobile"

const viewportSizes: Record<ViewportSize, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
}

export function EditorClient({ repo, deploymentUrl, accessToken }: EditorClientProps) {
  const [targetUrl, setTargetUrl] = useState(deploymentUrl || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [viewport, setViewport] = useState<ViewportSize>("desktop")
  const [changes, setChanges] = useState<StyleChange[]>([])
  const [undoStack, setUndoStack] = useState<StyleChange[]>([])
  const [showUrlInput, setShowUrlInput] = useState(!deploymentUrl)
  const [isCreatingPR, setIsCreatingPR] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Handle messages from the iframe (inspector changes)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "LUMOS_STYLE_CHANGE") {
        const change: StyleChange = {
          id: crypto.randomUUID(),
          selector: event.data.selector,
          property: event.data.property,
          oldValue: event.data.oldValue,
          newValue: event.data.newValue,
          timestamp: Date.now(),
        }
        setChanges((prev) => [...prev, change])
        toast.success("Style updated", {
          description: `${event.data.property}: ${event.data.newValue}`,
        })
      } else if (event.data.type === "LUMOS_CONNECTED") {
        setIsConnected(true)
        toast.success("Inspector connected")
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const handleLoadUrl = useCallback(() => {
    if (!targetUrl) {
      toast.error("Please enter a URL")
      return
    }

    try {
      new URL(targetUrl)
      setIsLoading(true)
      setShowUrlInput(false)
      // The iframe will load the proxied URL
      setTimeout(() => setIsLoading(false), 2000)
    } catch {
      toast.error("Invalid URL")
    }
  }, [targetUrl])

  const handleUndo = useCallback(() => {
    if (changes.length === 0) return
    const lastChange = changes[changes.length - 1]
    setChanges((prev) => prev.slice(0, -1))
    setUndoStack((prev) => [...prev, lastChange])

    // Send undo message to iframe
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "LUMOS_UNDO",
        change: lastChange,
      },
      "*"
    )
  }, [changes])

  const handleRedo = useCallback(() => {
    if (undoStack.length === 0) return
    const redoChange = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    setChanges((prev) => [...prev, redoChange])

    // Send redo message to iframe
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "LUMOS_REDO",
        change: redoChange,
      },
      "*"
    )
  }, [undoStack])

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
      setIsLoading(true)
      setTimeout(() => setIsLoading(false), 2000)
    }
  }, [])

  const handleCreatePR = useCallback(async () => {
    if (changes.length === 0) {
      toast.error("No changes to commit")
      return
    }

    setIsCreatingPR(true)

    try {
      const response = await fetch("/api/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: repo.fullName,
          changes,
          accessToken,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Pull request created!", {
          description: "View it on GitHub",
          action: {
            label: "Open PR",
            onClick: () => window.open(data.prUrl, "_blank"),
          },
        })
        setChanges([])
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error("Failed to create PR", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsCreatingPR(false)
    }
  }, [changes, repo.fullName, accessToken])

  const proxyUrl = targetUrl
    ? `/api/proxy?url=${encodeURIComponent(targetUrl)}`
    : ""

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b bg-card flex items-center px-4 gap-4 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
            <Paintbrush className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold">{repo.name}</span>
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="flex items-center gap-1 ml-4 text-sm text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          <span>{repo.defaultBranch}</span>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-1 ml-auto border rounded-lg p-1">
          <button
            onClick={() => setViewport("desktop")}
            className={`p-1.5 rounded ${viewport === "desktop" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Desktop view"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`p-1.5 rounded ${viewport === "tablet" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Tablet view"
          >
            <Tablet className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`p-1.5 rounded ${viewport === "mobile" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            title="Mobile view"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={changes.length === 0}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={undoStack.length === 0}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-border mx-2" />

          {changes.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {changes.length} change{changes.length !== 1 ? "s" : ""}
            </span>
          )}

          <button
            onClick={handleCreatePR}
            disabled={changes.length === 0 || isCreatingPR}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <GitPullRequest className="h-4 w-4" />
            {isCreatingPR ? "Creating..." : "Create PR"}
          </button>
        </div>
      </header>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Iframe container */}
        <div className="flex-1 bg-muted/50 flex items-center justify-center p-4 overflow-auto">
          {showUrlInput ? (
            <div className="w-full max-w-lg p-8 bg-card rounded-xl border shadow-lg">
              <h2 className="text-xl font-semibold mb-2">Enter your app URL</h2>
              <p className="text-muted-foreground text-sm mb-6">
                We couldn&apos;t detect a deployment URL. Enter the URL where your app is running.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://your-app.railway.app"
                  className="flex-1 px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
                />
                <button
                  onClick={handleLoadUrl}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Load
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Tip: Use your Railway, Vercel, or local dev server URL
              </p>
            </div>
          ) : (
            <div
              className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
              style={{
                width: viewportSizes[viewport].width,
                height: viewportSizes[viewport].height,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={proxyUrl}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          )}
        </div>

        {/* Changes sidebar */}
        {changes.length > 0 && (
          <div className="w-80 border-l bg-card flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Pending Changes</h3>
              <p className="text-sm text-muted-foreground">
                {changes.length} style change{changes.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className="p-3 rounded-lg bg-muted/50 mb-2 text-sm"
                >
                  <div className="font-mono text-xs text-muted-foreground truncate mb-1">
                    {change.selector}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{change.property}:</span>
                    <span className="text-destructive line-through">
                      {change.oldValue || "(none)"}
                    </span>
                    <span>→</span>
                    <span className="text-chart-2">{change.newValue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
