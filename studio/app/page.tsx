import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Paintbrush, Github, Zap, GitPullRequest, Eye, Layers } from "lucide-react"

export default async function HomePage() {
  const session = await auth()

  // If logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
              <Paintbrush className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl">Lumos Studio</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Github className="h-4 w-4" />
            Sign in with GitHub
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Zap className="h-4 w-4" />
            Visual editing for React apps
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Edit your apps visually.<br />
            <span className="text-primary">Push to GitHub.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Connect your GitHub repos, edit styles and components visually,
            and create pull requests with your changes. No code required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-lg font-medium"
            >
              <Github className="h-5 w-5" />
              Get Started
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border hover:bg-accent transition-colors text-lg"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto px-4 py-24">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border bg-card">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Github className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect GitHub</h3>
              <p className="text-muted-foreground">
                Sign in with GitHub and select your React or Next.js repositories.
                We&apos;ll automatically detect your project structure.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-chart-2" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Edit Visually</h3>
              <p className="text-muted-foreground">
                Use our powerful visual inspector to modify styles, layouts,
                and components. See changes in real-time.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-4">
                <GitPullRequest className="h-6 w-6 text-chart-4" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create PR</h3>
              <p className="text-muted-foreground">
                When you&apos;re done, create a pull request with all your changes.
                Review the diff before merging.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-24">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-chart-2/20 p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Connect your GitHub account and start editing your apps visually.
              It&apos;s free for public repositories.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-lg font-medium"
            >
              <Github className="h-5 w-5" />
              Sign in with GitHub
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Paintbrush className="h-4 w-4" />
            <span>Lumos Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="https://github.com/EstateFlowDigital/lumos-inspector" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
            <span>Built with Lumos Inspector</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
