import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

// Initialize Anthropic client
const anthropic = new Anthropic()

interface StyleSuggestion {
  id: string
  category: "layout" | "typography" | "color" | "spacing" | "accessibility" | "performance"
  property: string
  currentValue: string
  suggestedValue: string
  explanation: string
  impact: "high" | "medium" | "low"
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

// System prompt for style analysis
const STYLE_SYSTEM_PROMPT = `You are an expert CSS and UI/UX assistant integrated into a visual CSS inspector tool called Lumos. Your role is to analyze HTML elements and their styles, then provide actionable CSS improvement suggestions.

When analyzing elements, focus on:
1. **Layout** - Flexbox/Grid usage, positioning, responsive considerations
2. **Typography** - Font sizing, line height, readability, font stacks
3. **Color** - Contrast ratios, color harmony, accessibility (WCAG)
4. **Spacing** - Consistent margins/padding, visual hierarchy
5. **Accessibility** - Focus states, touch targets, ARIA considerations
6. **Performance** - Efficient selectors, avoid expensive properties

Guidelines:
- Provide specific, actionable CSS property changes
- Use modern CSS (custom properties, logical properties, modern selectors)
- Consider responsive design implications
- Prioritize accessibility improvements
- Explain WHY each change improves the design

Response format for suggestions:
When providing suggestions, format them as a JSON array with objects containing:
- category: one of "layout", "typography", "color", "spacing", "accessibility", "performance"
- property: the CSS property to change
- currentValue: the current value (from context)
- suggestedValue: your recommended value
- explanation: 1-2 sentences explaining the improvement
- impact: "high", "medium", or "low" based on visual/UX impact`

// Parse suggestions from AI response
function parseSuggestions(text: string): StyleSuggestion[] {
  try {
    // Look for JSON array in the response
    const jsonMatch = text.match(/\[[\s\S]*?\]/g)
    if (jsonMatch) {
      for (const match of jsonMatch) {
        try {
          const parsed = JSON.parse(match)
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].property) {
            return parsed.map((s, i) => ({
              id: crypto.randomUUID(),
              category: s.category || "layout",
              property: s.property,
              currentValue: s.currentValue || "not set",
              suggestedValue: s.suggestedValue,
              explanation: s.explanation,
              impact: s.impact || "medium"
            }))
          }
        } catch {
          continue
        }
      }
    }
    return []
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, elementContext, prompt, history } = await request.json()

    if (!prompt && type !== "suggestions") {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      )
    }

    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = []

    // Add history if provided
    if (history && Array.isArray(history)) {
      history.forEach((msg: ChatMessage) => {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      })
    }

    // Build the user message
    let userContent = ""

    if (elementContext) {
      userContent += `## Selected Element Context\n${elementContext}\n\n`
    }

    if (type === "suggestions") {
      userContent += `## Request\n${prompt}\n\nProvide your suggestions as a JSON array. After the JSON, briefly summarize the key improvements.`
    } else {
      userContent += `## User Question\n${prompt}`
    }

    messages.push({
      role: "user",
      content: userContent
    })

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: STYLE_SYSTEM_PROMPT,
      messages
    })

    // Extract text response
    const textContent = response.content.find(c => c.type === "text")
    const responseText = textContent?.text || ""

    // Parse suggestions if present
    const suggestions = parseSuggestions(responseText)

    // Clean the response text (remove JSON if we extracted it)
    let cleanResponse = responseText
    if (suggestions.length > 0) {
      // Remove the JSON array from the response
      cleanResponse = responseText.replace(/\[[\s\S]*?\]/g, "").trim()
      // Remove any "Here are the suggestions:" type prefixes
      cleanResponse = cleanResponse.replace(/^(Here are|I've analyzed|Based on).+?:/i, "").trim()
    }

    return NextResponse.json({
      response: cleanResponse || "I've analyzed the element and generated suggestions.",
      suggestions: suggestions.length > 0 ? suggestions : undefined
    })

  } catch (error) {
    console.error("AI Assistant error:", error)

    // Check for API key issues
    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json(
        { error: "AI service not configured. Please set ANTHROPIC_API_KEY." },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
