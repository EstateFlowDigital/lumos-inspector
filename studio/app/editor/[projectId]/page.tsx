import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Octokit } from "@octokit/rest"
import { EditorClient } from "./editor-client"

interface PageProps {
  params: Promise<{ projectId: string }>
}

async function getRepository(accessToken: string, fullName: string) {
  const octokit = new Octokit({ auth: accessToken })
  const [owner, repo] = fullName.split("--")

  try {
    const { data } = await octokit.repos.get({ owner, repo })
    return data
  } catch (error) {
    console.error("Failed to fetch repository:", error)
    return null
  }
}

async function getDeploymentUrl(accessToken: string, fullName: string) {
  const octokit = new Octokit({ auth: accessToken })
  const [owner, repo] = fullName.split("--")

  try {
    // Try to get Vercel/Railway deployment URL from environment or deployments
    const { data: deployments } = await octokit.repos.listDeployments({
      owner,
      repo,
      per_page: 1,
    })

    if (deployments.length > 0) {
      const { data: statuses } = await octokit.repos.listDeploymentStatuses({
        owner,
        repo,
        deployment_id: deployments[0].id,
        per_page: 1,
      })

      if (statuses.length > 0 && statuses[0].target_url) {
        return statuses[0].target_url
      }
    }

    // Fallback: Check for homepage in package.json or use common patterns
    // Return null to prompt user for URL input
    return null
  } catch (error) {
    console.error("Failed to get deployment URL:", error)
    return null
  }
}

export default async function EditorPage({ params }: PageProps) {
  const session = await auth()
  const { projectId } = await params

  if (!session || !session.accessToken) {
    redirect("/login")
  }

  const repo = await getRepository(session.accessToken, projectId)

  if (!repo) {
    redirect("/dashboard")
  }

  const deploymentUrl = await getDeploymentUrl(session.accessToken, projectId)

  return (
    <EditorClient
      repo={{
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch,
        htmlUrl: repo.html_url,
      }}
      deploymentUrl={deploymentUrl}
      accessToken={session.accessToken}
    />
  )
}
