import { NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

interface StyleChange {
  id: string
  selector: string
  property: string
  oldValue: string
  newValue: string
  timestamp: number
}

function generateCSS(changes: StyleChange[]): string {
  // Group changes by selector
  const grouped: Record<string, Record<string, string>> = {}

  changes.forEach((change) => {
    if (!grouped[change.selector]) {
      grouped[change.selector] = {}
    }
    grouped[change.selector][change.property] = change.newValue
  })

  // Generate CSS
  let css = `/**
 * Lumos Studio - Visual Style Changes
 * Generated: ${new Date().toISOString()}
 * Changes: ${changes.length}
 */

`

  Object.entries(grouped).forEach(([selector, properties]) => {
    css += `${selector} {\n`
    Object.entries(properties).forEach(([prop, value]) => {
      css += `  ${prop}: ${value};\n`
    })
    css += `}\n\n`
  })

  return css
}

export async function POST(request: NextRequest) {
  try {
    const { repo, changes, accessToken } = await request.json()

    if (!repo || !changes || !accessToken) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const [owner, repoName] = repo.split("/")
    const octokit = new Octokit({ auth: accessToken })

    // Get the default branch
    const { data: repoData } = await octokit.repos.get({ owner, repo: repoName })
    const defaultBranch = repoData.default_branch

    // Get the latest commit SHA from the default branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${defaultBranch}`,
    })
    const baseSha = refData.object.sha

    // Create a new branch
    const branchName = `lumos-studio/style-changes-${Date.now()}`
    await octokit.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    })

    // Generate the CSS file content
    const cssContent = generateCSS(changes)
    const cssPath = "styles/lumos-studio-changes.css"

    // Check if the file already exists
    let fileSha: string | undefined
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner,
        repo: repoName,
        path: cssPath,
        ref: branchName,
      })
      if (!Array.isArray(existingFile)) {
        fileSha = existingFile.sha
      }
    } catch {
      // File doesn't exist, that's fine
    }

    // Create or update the CSS file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: cssPath,
      message: `style: Visual changes from Lumos Studio

Made ${changes.length} style change(s) using Lumos Studio visual editor.

Changes include:
${changes.slice(0, 5).map((c: StyleChange) => `- ${c.selector}: ${c.property}`).join("\n")}
${changes.length > 5 ? `\n... and ${changes.length - 5} more` : ""}
`,
      content: Buffer.from(cssContent).toString("base64"),
      branch: branchName,
      ...(fileSha && { sha: fileSha }),
    })

    // Create the pull request
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo: repoName,
      title: `[Lumos Studio] Visual style changes`,
      head: branchName,
      base: defaultBranch,
      body: `## Visual Style Changes

This PR was created by [Lumos Studio](https://github.com/EstateFlowDigital/lumos-inspector) - a visual editor for React apps.

### Summary
- **Changes**: ${changes.length} style modification(s)
- **Generated**: ${new Date().toISOString()}

### Style Changes

| Selector | Property | Old Value | New Value |
|----------|----------|-----------|-----------|
${changes.map((c: StyleChange) => `| \`${c.selector}\` | \`${c.property}\` | ${c.oldValue || "_(none)_"} | ${c.newValue} |`).join("\n")}

### How to use

1. Import the generated CSS file in your app:
   \`\`\`tsx
   import './styles/lumos-studio-changes.css'
   \`\`\`

2. Or merge the styles into your existing stylesheets.

---
_Generated with Lumos Studio_
`,
    })

    return NextResponse.json({
      success: true,
      prUrl: pr.html_url,
      prNumber: pr.number,
    })
  } catch (error) {
    console.error("Failed to create PR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create PR",
      },
      { status: 500 }
    )
  }
}
