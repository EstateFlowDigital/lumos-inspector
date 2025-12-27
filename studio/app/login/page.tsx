"use client"

import { signIn } from "next-auth/react"
import { Github, Paintbrush } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 items-center justify-center mb-4">
            <Paintbrush className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Lumos Studio</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to start editing your apps visually
          </p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-lg">
          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-[#24292e] text-white hover:bg-[#24292e]/90 transition-colors font-medium"
          >
            <Github className="h-5 w-5" />
            Continue with GitHub
          </button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            By signing in, you agree to grant Lumos Studio read/write access
            to your repositories for editing purposes.
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          We only access repositories you explicitly select.
        </p>
      </div>
    </div>
  )
}
