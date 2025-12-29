"use client"

import * as React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import {
  ChevronDown, Sparkles, Send, Loader2, Wand2,
  Eye, Palette, Layout, Type, Zap, Check, X,
  MessageSquare, RefreshCw, Copy, ArrowRight
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Textarea } from "../ui/textarea"
import { useInspector, type ElementInfo } from "../core/inspector-context"

// Suggestion types
type SuggestionCategory = "layout" | "typography" | "color" | "spacing" | "accessibility" | "performance"

interface StyleSuggestion {
  id: string
  category: SuggestionCategory
  property: string
  currentValue: string
  suggestedValue: string
  explanation: string
  impact: "high" | "medium" | "low"
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  suggestions?: StyleSuggestion[]
  timestamp: Date
}

// Category icons
const categoryIcons: Record<SuggestionCategory, React.ReactNode> = {
  layout: <Layout className="h-3 w-3" />,
  typography: <Type className="h-3 w-3" />,
  color: <Palette className="h-3 w-3" />,
  spacing: <Layout className="h-3 w-3" />,
  accessibility: <Eye className="h-3 w-3" />,
  performance: <Zap className="h-3 w-3" />,
}

// Build context from selected element
function buildElementContext(element: ElementInfo): string {
  const styles = element.computedStyles
  const relevantStyles = [
    'display', 'position', 'width', 'height', 'padding', 'margin',
    'font-size', 'font-weight', 'line-height', 'color', 'background-color',
    'border', 'border-radius', 'box-shadow', 'flex-direction', 'gap',
    'justify-content', 'align-items', 'grid-template-columns'
  ]

  const styleInfo = relevantStyles
    .map(prop => `${prop}: ${styles[prop] || 'not set'}`)
    .join('\n')

  return `Element: <${element.tagName.toLowerCase()}${element.id ? ` id="${element.id}"` : ''}${element.classList.length > 0 ? ` class="${element.classList.join(' ')}"` : ''}>
Position: ${Math.round(element.rect.x)}x${Math.round(element.rect.y)}, Size: ${Math.round(element.rect.width)}x${Math.round(element.rect.height)}

Current Styles:
${styleInfo}

Text content: ${element.element.textContent?.slice(0, 100) || 'none'}`
}

export function AIAssistantTool() {
  const { isOpen, selectedElement, notifyStyleChange, addToHistory } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState<StyleSuggestion[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Generate quick suggestions for selected element
  const generateQuickSuggestions = useCallback(async () => {
    if (!selectedElement) {
      toast.error("Select an element first")
      return
    }

    setIsLoading(true)
    const context = buildElementContext(selectedElement)

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "suggestions",
          elementContext: context,
          prompt: "Analyze this element and provide 3-5 specific CSS improvement suggestions. Focus on common issues like spacing, typography, accessibility, and modern CSS practices."
        })
      })

      if (!response.ok) throw new Error("Failed to get suggestions")

      const data = await response.json()

      if (data.suggestions) {
        setPendingSuggestions(data.suggestions)

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I found ${data.suggestions.length} suggestions for this ${selectedElement.tagName.toLowerCase()} element:`,
          suggestions: data.suggestions,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      toast.error("Failed to generate suggestions")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedElement])

  // Send chat message
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const context = selectedElement ? buildElementContext(selectedElement) : "No element selected"

      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chat",
          elementContext: context,
          prompt: input,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        suggestions: data.suggestions,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      if (data.suggestions?.length > 0) {
        setPendingSuggestions(data.suggestions)
      }
    } catch (error) {
      toast.error("Failed to get response")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [input, selectedElement, messages])

  // Apply a suggestion
  const applySuggestion = useCallback((suggestion: StyleSuggestion) => {
    if (!selectedElement?.element) {
      toast.error("Element no longer exists")
      return
    }

    try {
      // Get the current value
      const currentValue = selectedElement.element.style.getPropertyValue(suggestion.property) ||
        getComputedStyle(selectedElement.element).getPropertyValue(suggestion.property)

      // Apply the new style
      selectedElement.element.style.setProperty(suggestion.property, suggestion.suggestedValue, 'important')

      // Add to history for undo
      addToHistory({
        type: 'inline',
        target: selectedElement.path || selectedElement.tagName,
        property: suggestion.property,
        oldValue: currentValue,
        newValue: suggestion.suggestedValue
      })

      // Notify style change
      notifyStyleChange()

      // Remove from pending
      setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id))

      toast.success(`Applied: ${suggestion.property}`)
    } catch (error) {
      toast.error("Failed to apply suggestion")
      console.error(error)
    }
  }, [selectedElement, addToHistory, notifyStyleChange])

  // Apply all suggestions
  const applyAllSuggestions = useCallback(() => {
    pendingSuggestions.forEach(suggestion => {
      applySuggestion(suggestion)
    })
  }, [pendingSuggestions, applySuggestion])

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((suggestionId: string) => {
    setPendingSuggestions(prev => prev.filter(s => s.id !== suggestionId))
  }, [])

  // Copy CSS for suggestion
  const copySuggestionCSS = useCallback((suggestion: StyleSuggestion) => {
    const css = `${suggestion.property}: ${suggestion.suggestedValue};`
    navigator.clipboard.writeText(css)
    toast.success("Copied to clipboard")
  }, [])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between p-3 hover:bg-accent rounded-none border-b"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-chart-1" />
            <span className="font-medium text-sm">AI Assistant</span>
            {pendingSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {pendingSuggestions.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-b">
        <div className="p-3 space-y-3">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={generateQuickSuggestions}
              disabled={isLoading || !selectedElement}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3 mr-1" />
              )}
              Analyze Element
            </Button>
            {pendingSuggestions.length > 0 && (
              <Button
                variant="default"
                size="sm"
                className="text-xs bg-chart-1 hover:bg-chart-1/90"
                onClick={applyAllSuggestions}
              >
                <Check className="h-3 w-3 mr-1" />
                Apply All ({pendingSuggestions.length})
              </Button>
            )}
          </div>

          {/* Pending Suggestions */}
          {pendingSuggestions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Suggestions</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-muted/50 rounded-lg p-2 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          {categoryIcons[suggestion.category]}
                          <span className="ml-1">{suggestion.category}</span>
                        </Badge>
                        <span className="font-mono text-chart-1">{suggestion.property}</span>
                      </div>
                      <Badge
                        variant={suggestion.impact === "high" ? "destructive" : suggestion.impact === "medium" ? "default" : "secondary"}
                        className="h-4 px-1 text-[9px]"
                      >
                        {suggestion.impact}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-muted-foreground line-through">{suggestion.currentValue}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-chart-1">{suggestion.suggestedValue}</span>
                    </div>

                    <p className="text-muted-foreground leading-relaxed">{suggestion.explanation}</p>

                    <div className="flex gap-1 pt-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-6 px-2 text-[10px] bg-chart-1 hover:bg-chart-1/90"
                        onClick={() => applySuggestion(suggestion)}
                      >
                        <Check className="h-2.5 w-2.5 mr-1" />
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => copySuggestionCSS(suggestion)}
                      >
                        <Copy className="h-2.5 w-2.5 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground"
                        onClick={() => dismissSuggestion(suggestion.id)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">Chat</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px]"
                  onClick={() => setMessages([])}
                >
                  <RefreshCw className="h-2.5 w-2.5 mr-1" />
                  Clear
                </Button>
              </div>
              <ScrollArea className="h-32 rounded border bg-background" ref={scrollRef}>
                <div className="p-2 space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "text-xs rounded-lg px-2 py-1.5",
                        message.role === "user"
                          ? "bg-chart-1 text-chart-1-foreground ml-4"
                          : "bg-muted mr-4"
                      )}
                    >
                      {message.content}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Chat Input */}
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              placeholder="Ask about styles, request changes..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              className="min-h-[60px] text-xs resize-none"
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="shrink-0 bg-chart-1 hover:bg-chart-1/90"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Helper text */}
          {!selectedElement && (
            <p className="text-[10px] text-muted-foreground text-center">
              Select an element to get AI-powered style suggestions
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
