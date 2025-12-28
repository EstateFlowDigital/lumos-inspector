"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Paintbrush,
  GitPullRequest,
  Copy,
  Check,
  ExternalLink,
  Code,
  FileCode,
  ArrowLeft,
  Github,
  AlertCircle,
} from "lucide-react"

interface StyleChange {
  id: string
  selector: string
  property: string
  oldValue: string
  newValue: string
  timestamp: number
}

interface ChangePayload {
  css: string
  changes: StyleChange[]
  sourceUrl: string
  sessionId: string
  timestamp: number
}

function CreatePRContent() {
  const searchParams = useSearchParams()
  const [payload, setPayload] = useState<ChangePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [fileName, setFileName] = useState("lumos-changes.css")

  useEffect(() => {
    const data = searchParams.get("data")
    if (data) {
      try {
        const decoded = decodeURIComponent(atob(data))
        const parsed = JSON.parse(decoded) as ChangePayload
        setPayload(parsed)
      } catch (e) {
        setError("Invalid data format. Please try again from the Lumos Inspector panel.")
      }
    } else {
      setError("No changes data provided. Use the 'Create PR' button in Lumos Inspector.")
    }
  }, [searchParams])

  const copyCSS = () => {
    if (payload?.css) {
      navigator.clipboard.writeText(payload.css)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadCSS = () => {
    if (payload?.css) {
      const blob = new Blob([payload.css], { type: "text/css" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Group changes by selector for display
  const groupedChanges = payload?.changes?.reduce((acc, change) => {
    if (!acc[change.selector]) {
      acc[change.selector] = []
    }
    acc[change.selector].push(change)
    return acc
  }, {} as Record<string, StyleChange[]>) || {}

  return (
    <>
      {error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Error Loading Changes</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : payload ? (
        <div className="space-y-8">
          {/* Source Info */}
          {payload.sourceUrl && (
            <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Changes from</p>
                  <a
                    href={payload.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-mono text-sm"
                  >
                    {payload.sourceUrl}
                  </a>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(payload.timestamp).toLocaleString()}
              </span>
            </div>
          )}

          {/* CSS Preview */}
          <div className="bg-card rounded-xl border shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Code className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Generated CSS</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {payload.changes?.length || 0} changes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCSS}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-accent rounded-lg transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={downloadCSS}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
                >
                  <FileCode className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
            <pre className="p-4 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto bg-zinc-950 text-zinc-100">
              <code>{payload.css}</code>
            </pre>
          </div>

          {/* Changes Breakdown */}
          <div className="bg-card rounded-xl border shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center gap-3">
              <FileCode className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Changes by Element</h2>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {Object.entries(groupedChanges).map(([selector, changes]) => (
                <div key={selector} className="p-4">
                  <div className="font-mono text-sm text-primary mb-2">{selector}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {changes.map((change) => (
                      <div key={change.id} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{change.property}:</span>
                        <span className="font-mono text-green-600">{change.newValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Steps */}
          <div className="bg-card rounded-xl border shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Github className="h-6 w-6" />
              <h2 className="font-semibold text-lg">Commit Your Changes</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-medium">Copy or download the CSS above</p>
                  <p className="text-sm text-muted-foreground">The generated CSS contains all your style changes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-medium">Add the CSS to your project</p>
                  <p className="text-sm text-muted-foreground">
                    Paste the CSS into your stylesheet or create a new file like{" "}
                    <code className="px-1 bg-muted rounded text-xs">styles/lumos-changes.css</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-medium">Commit and push</p>
                  <div className="mt-2 p-3 bg-muted rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground"># Stage and commit your changes</div>
                    <div>git add .</div>
                    <div>git commit -m &quot;Style updates from Lumos Inspector&quot;</div>
                    <div>git push</div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                <div>
                  <p className="font-medium">Create a pull request (optional)</p>
                  <p className="text-sm text-muted-foreground">
                    Open a PR on GitHub to review the changes with your team before merging.
                  </p>
                </div>
              </div>
            </div>

            {/* File name input */}
            <div className="mt-6 pt-6 border-t">
              <label className="block text-sm font-medium mb-2">
                Download file name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <button
                  onClick={downloadCSS}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  <FileCode className="h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </>
  )
}

export default function CreatePRPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
              <Paintbrush className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl">Lumos Studio</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
              <GitPullRequest className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Create Pull Request</h1>
              <p className="text-muted-foreground">
                Review your style changes and commit them to your repository
              </p>
            </div>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <CreatePRContent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
