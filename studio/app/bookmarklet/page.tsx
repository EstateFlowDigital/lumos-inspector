"use client"

import { useState } from "react"
import Link from "next/link"
import { Paintbrush, Bookmark, Copy, Check, ArrowLeft, Zap, Shield, Globe } from "lucide-react"

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false)

  const bookmarkletCode = `javascript:(function(){if(window.__lumosConnected){alert('Lumos Inspector is already active!');return;}var s=document.createElement('script');s.src='https://lumos-inspector-production.up.railway.app/lumos-connect.js';s.dataset.session='bookmarklet-'+Date.now().toString(36);document.body.appendChild(s);})();`

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
              <Bookmark className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Bookmarklet</h1>
              <p className="text-muted-foreground">
                Inspect and edit styles on any website
              </p>
            </div>
          </div>

          {/* Bookmarklet Card */}
          <div className="bg-card rounded-xl border shadow-lg p-6 mb-8">
            <h2 className="font-semibold text-lg mb-4">Install the Bookmarklet</h2>

            <p className="text-muted-foreground mb-6">
              Drag the button below to your bookmarks bar, or right-click and select "Add to Bookmarks".
              Then click it on any webpage to activate Lumos Inspector.
            </p>

            {/* Bookmarklet Button */}
            <div className="flex items-center gap-4 mb-6">
              <a
                href={bookmarkletCode}
                onClick={(e) => e.preventDefault()}
                draggable
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-chart-2 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-shadow cursor-grab active:cursor-grabbing"
              >
                <Paintbrush className="h-5 w-5" />
                Lumos Inspector
              </a>
              <span className="text-sm text-muted-foreground">← Drag this to your bookmarks bar</span>
            </div>

            {/* Copy Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={copyBookmarklet}
                className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent rounded-lg transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Bookmarklet Code"}
              </button>
              <span className="text-xs text-muted-foreground">Or manually create a bookmark with the code</span>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-card rounded-xl border shadow-lg p-6 mb-8">
            <h2 className="font-semibold text-lg mb-4">How to Use</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-medium">Install the Bookmarklet</p>
                  <p className="text-sm text-muted-foreground">Drag the button above to your bookmarks bar</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-medium">Visit Any Website</p>
                  <p className="text-sm text-muted-foreground">Navigate to the site you want to inspect</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-medium">Click the Bookmarklet</p>
                  <p className="text-sm text-muted-foreground">The Lumos Inspector panel will appear</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                <div>
                  <p className="font-medium">Edit Styles</p>
                  <p className="text-sm text-muted-foreground">Select elements, modify styles, and export your changes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border p-4">
              <Zap className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">No Setup Required</h3>
              <p className="text-sm text-muted-foreground">Works instantly on any website without installing anything</p>
            </div>

            <div className="bg-card rounded-xl border p-4">
              <Globe className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Works Everywhere</h3>
              <p className="text-sm text-muted-foreground">Edit styles on production sites, competitors, or inspiration</p>
            </div>

            <div className="bg-card rounded-xl border p-4">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Safe & Secure</h3>
              <p className="text-sm text-muted-foreground">Changes are local only - never affects the actual website</p>
            </div>
          </div>

          {/* Note */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Some websites with strict Content Security Policies may block the bookmarklet.
              For your own projects, we recommend adding the Lumos script directly to your HTML for the best experience.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
