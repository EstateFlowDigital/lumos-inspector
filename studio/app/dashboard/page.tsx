import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Octokit } from "@octokit/rest"
import Link from "next/link"
import { Paintbrush, GitBranch, Star, Clock, ExternalLink, Plus, Settings, LogOut } from "lucide-react"
import { signOut } from "@/lib/auth"

async function getRepositories(accessToken: string) {
  const octokit = new Octokit({ auth: accessToken })

  try {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 50,
      type: "owner",
    })

    // Filter to likely React/Next.js projects
    return data.filter(repo => {
      const topics = repo.topics || []
      const hasReactIndicators =
        topics.includes("react") ||
        topics.includes("nextjs") ||
        topics.includes("next") ||
        repo.language === "TypeScript" ||
        repo.language === "JavaScript"
      return hasReactIndicators && !repo.archived
    })
  } catch (error) {
    console.error("Failed to fetch repositories:", error)
    return []
  }
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session || !session.accessToken) {
    redirect("/login")
  }

  const repos = await getRepositories(session.accessToken)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
                <Paintbrush className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-xl">Lumos Studio</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium">{session.user?.name}</span>
            </div>
            <form
              action={async () => {
                "use server"
                await signOut()
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Projects</h1>
            <p className="text-muted-foreground mt-1">
              Select a repository to start editing
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Add Project
          </button>
        </div>

        {repos.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No projects found</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              We couldn&apos;t find any React or Next.js projects in your GitHub account.
              Create a new project or check your repository settings.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((repo) => (
              <Link
                key={repo.id}
                href={`/editor/${repo.full_name.replace("/", "--")}`}
                className="group p-6 rounded-xl border bg-card hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {repo.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {repo.full_name}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {repo.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {repo.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-chart-1" />
                      {repo.language}
                    </span>
                  )}
                  {repo.stargazers_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {repo.stargazers_count}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(repo.updated_at || "").toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
