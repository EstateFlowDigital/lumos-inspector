"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type ThemeMode = "light" | "dark" | "system"

export function DarkModePreview() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [currentMode, setCurrentMode] = useState<ThemeMode>("system")
  const [originalMode, setOriginalMode] = useState<ThemeMode>("system")
  const [isPreviewActive, setIsPreviewActive] = useState(false)

  // Detect current theme on mount
  useEffect(() => {
    const html = document.documentElement
    const isDark = html.classList.contains("dark")
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (isDark) {
      setOriginalMode("dark")
      setCurrentMode("dark")
    } else if (!isDark && !systemPrefersDark) {
      setOriginalMode("light")
      setCurrentMode("light")
    } else {
      setOriginalMode("system")
      setCurrentMode("system")
    }
  }, [])

  // Apply theme
  const applyTheme = useCallback((mode: ThemeMode) => {
    const html = document.documentElement

    if (mode === "dark") {
      html.classList.add("dark")
    } else if (mode === "light") {
      html.classList.remove("dark")
    } else {
      // System mode
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (prefersDark) {
        html.classList.add("dark")
      } else {
        html.classList.remove("dark")
      }
    }

    setCurrentMode(mode)
  }, [])

  // Preview a theme temporarily
  const previewTheme = useCallback((mode: ThemeMode) => {
    if (!isPreviewActive) {
      setIsPreviewActive(true)
    }
    applyTheme(mode)
  }, [isPreviewActive, applyTheme])

  // Reset to original theme
  const resetTheme = useCallback(() => {
    applyTheme(originalMode)
    setIsPreviewActive(false)
  }, [originalMode, applyTheme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      if (currentMode === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [currentMode, applyTheme])

  if (!isOpen) return null

  const themes: { mode: ThemeMode; icon: React.ElementType; label: string }[] = [
    { mode: "light", icon: Sun, label: "Light" },
    { mode: "dark", icon: Moon, label: "Dark" },
    { mode: "system", icon: Monitor, label: "System" },
  ]

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          {currentMode === "dark" ? (
            <Moon className="h-4 w-4 text-chart-4" />
          ) : (
            <Sun className="h-4 w-4 text-chart-4" />
          )}
          <span>Theme Preview</span>
          {isPreviewActive && (
            <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
              Preview
            </span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Theme buttons */}
        <div className="grid grid-cols-3 gap-2">
          {themes.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant={currentMode === mode ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-16 flex-col gap-1",
                currentMode === mode && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => previewTheme(mode)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </Button>
          ))}
        </div>

        {/* Preview indicator */}
        {isPreviewActive && (
          <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-md border border-yellow-500/20">
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              Previewing theme changes
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={resetTheme}
            >
              Reset
            </Button>
          </div>
        )}

        {/* Quick toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Label className="text-xs text-muted-foreground">Quick toggle</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => previewTheme(currentMode === "dark" ? "light" : "dark")}
          >
            {currentMode === "dark" ? (
              <>
                <Sun className="h-3 w-3 mr-1" />
                Switch to Light
              </>
            ) : (
              <>
                <Moon className="h-3 w-3 mr-1" />
                Switch to Dark
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <p className="text-[10px] text-muted-foreground">
          Preview how your design looks in different color schemes. Changes are temporary until you save.
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}
