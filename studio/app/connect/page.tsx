import { Paintbrush, Copy, ExternalLink, Link2, Code, Zap } from "lucide-react"
import Link from "next/link"

interface PageProps {
  searchParams: Promise<{ session?: string }>
}

export default async function ConnectPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sessionId = params.session

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
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center mx-auto mb-6">
              <Link2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Connect Your App</h1>
            <p className="text-xl text-muted-foreground">
              Add the Lumos SDK to your app to enable visual style editing
            </p>
          </div>

          {sessionId ? (
            /* Session-specific instructions */
            <div className="bg-card rounded-xl border shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">Quick Connect</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Add this script tag to your app to connect to the current editing session:
              </p>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
                  <code>{`<script src="${process.env.NEXTAUTH_URL || 'https://lumos-inspector-production.up.railway.app'}/lumos-connect.js" data-session="${sessionId}"></script>`}</code>
                </pre>
                <button
                  className="absolute top-2 right-2 p-2 rounded-lg bg-background border hover:bg-accent transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Session ID: <code className="px-1.5 py-0.5 bg-muted rounded font-mono">{sessionId}</code>
              </p>
            </div>
          ) : null}

          {/* General instructions */}
          <div className="bg-card rounded-xl border shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <Code className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Integration Guide</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Step 1: Add the SDK Script</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Add this script to your HTML, just before the closing <code className="px-1 bg-muted rounded">&lt;/body&gt;</code> tag:
                </p>
                <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
                  <code>{`<script src="${process.env.NEXTAUTH_URL || 'https://lumos-inspector-production.up.railway.app'}/lumos-connect.js" data-session="YOUR_SESSION_ID"></script>`}</code>
                </pre>
              </div>

              <div>
                <h3 className="font-medium mb-2">Step 2: Get Your Session ID</h3>
                <p className="text-sm text-muted-foreground">
                  Open a project in Lumos Studio and switch to &quot;Direct&quot; mode. Your session ID will be displayed along with the ready-to-copy script tag.
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Step 3: Start Editing</h3>
                <p className="text-sm text-muted-foreground">
                  Once the SDK is loaded, open your app in a browser. You&apos;ll see a &quot;Lumos Studio&quot; badge appear. Click on any element to select it and edit its styles in the Lumos Studio editor.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <h3 className="font-medium mb-3">Framework-Specific Setup</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Next.js (App Router)</h4>
                  <p className="text-xs text-muted-foreground">
                    Add to <code>app/layout.tsx</code> inside the <code>&lt;body&gt;</code> tag
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">React (Vite/CRA)</h4>
                  <p className="text-xs text-muted-foreground">
                    Add to <code>index.html</code> before <code>&lt;/body&gt;</code>
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Vue</h4>
                  <p className="text-xs text-muted-foreground">
                    Add to <code>index.html</code> before <code>&lt;/body&gt;</code>
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Any HTML Site</h4>
                  <p className="text-xs text-muted-foreground">
                    Add the script tag to any HTML page
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-card rounded-xl border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-time Sync</h3>
              <p className="text-sm text-muted-foreground">
                Changes sync instantly between your app and Lumos Studio via WebSocket.
              </p>
            </div>
            <div className="p-6 bg-card rounded-xl border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Works Everywhere</h3>
              <p className="text-sm text-muted-foreground">
                Works on any platform: Railway, Vercel, Netlify, localhost, or any web server.
              </p>
            </div>
            <div className="p-6 bg-card rounded-xl border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">No Build Required</h3>
              <p className="text-sm text-muted-foreground">
                Just add a script tag. No npm packages, no build configuration needed.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
