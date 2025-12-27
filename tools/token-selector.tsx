"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Palette } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"

interface Token {
  name: string
  value: string
  type: "color" | "size" | "other"
}

interface TokenSelectorProps {
  value: string
  onChange: (value: string) => void
  tokens: Token[]
  type?: "color" | "size" | "other"
  placeholder?: string
  className?: string
}

// Default color tokens from the design system
export const colorTokens: Token[] = [
  { name: "--background", value: "var(--background)", type: "color" },
  { name: "--foreground", value: "var(--foreground)", type: "color" },
  { name: "--card", value: "var(--card)", type: "color" },
  { name: "--card-foreground", value: "var(--card-foreground)", type: "color" },
  { name: "--primary", value: "var(--primary)", type: "color" },
  { name: "--primary-foreground", value: "var(--primary-foreground)", type: "color" },
  { name: "--secondary", value: "var(--secondary)", type: "color" },
  { name: "--secondary-foreground", value: "var(--secondary-foreground)", type: "color" },
  { name: "--muted", value: "var(--muted)", type: "color" },
  { name: "--muted-foreground", value: "var(--muted-foreground)", type: "color" },
  { name: "--accent", value: "var(--accent)", type: "color" },
  { name: "--accent-foreground", value: "var(--accent-foreground)", type: "color" },
  { name: "--destructive", value: "var(--destructive)", type: "color" },
  { name: "--border", value: "var(--border)", type: "color" },
  { name: "--input", value: "var(--input)", type: "color" },
  { name: "--ring", value: "var(--ring)", type: "color" },
  { name: "--chart-1", value: "var(--chart-1)", type: "color" },
  { name: "--chart-2", value: "var(--chart-2)", type: "color" },
  { name: "--chart-3", value: "var(--chart-3)", type: "color" },
  { name: "--chart-4", value: "var(--chart-4)", type: "color" },
  { name: "--chart-5", value: "var(--chart-5)", type: "color" },
]

// Default spacing tokens
export const spacingTokens: Token[] = [
  { name: "0", value: "0", type: "size" },
  { name: "1", value: "0.25rem", type: "size" },
  { name: "2", value: "0.5rem", type: "size" },
  { name: "3", value: "0.75rem", type: "size" },
  { name: "4", value: "1rem", type: "size" },
  { name: "5", value: "1.25rem", type: "size" },
  { name: "6", value: "1.5rem", type: "size" },
  { name: "8", value: "2rem", type: "size" },
  { name: "10", value: "2.5rem", type: "size" },
  { name: "12", value: "3rem", type: "size" },
  { name: "16", value: "4rem", type: "size" },
  { name: "auto", value: "auto", type: "size" },
]

// Border radius tokens
export const radiusTokens: Token[] = [
  { name: "none", value: "0", type: "size" },
  { name: "radius-sm", value: "var(--radius-sm)", type: "size" },
  { name: "radius-md", value: "var(--radius-md)", type: "size" },
  { name: "radius-lg", value: "var(--radius-lg)", type: "size" },
  { name: "radius-xl", value: "var(--radius-xl)", type: "size" },
  { name: "full", value: "9999px", type: "size" },
]

export function TokenSelector({
  value,
  onChange,
  tokens,
  type = "other",
  placeholder = "Select or enter value",
  className,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter tokens based on search
  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      token.value.toLowerCase().includes(searchValue.toLowerCase())
  )

  // Find if current value matches a token
  const currentToken = tokens.find((t) => t.value === value || `var(${t.name})` === value)

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle selecting a token
  const handleSelectToken = (token: Token) => {
    onChange(token.value)
    setIsOpen(false)
    setSearchValue("")
  }

  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchValue(newValue)
    onChange(newValue)
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex gap-1">
        {/* Main input */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={searchValue || value}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={cn(
              "h-7 text-xs pr-8",
              type === "color" && currentToken && "pl-8"
            )}
          />
          {/* Color swatch preview */}
          {type === "color" && value && (
            <div
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded border border-border"
              style={{ background: value }}
            />
          )}
        </div>

        {/* Token selector button */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => setIsOpen(!isOpen)}
          title="Select from tokens"
        >
          {type === "color" ? (
            <Palette className="h-3 w-3" />
          ) : (
            <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
          )}
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[10002] bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          <ScrollArea className="max-h-48">
            {filteredTokens.length > 0 ? (
              <div className="p-1">
                {filteredTokens.map((token) => (
                  <button
                    key={token.name}
                    onClick={() => handleSelectToken(token)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors text-left",
                      (value === token.value || `var(${token.name})` === value) && "bg-accent"
                    )}
                  >
                    {type === "color" && (
                      <div
                        className="w-4 h-4 rounded border border-border shrink-0"
                        style={{ background: `var(${token.name})` }}
                      />
                    )}
                    <span className="font-mono text-chart-2 truncate">{token.name}</span>
                    <span className="ml-auto text-muted-foreground truncate max-w-16 text-[10px]">
                      {token.value}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-2 text-xs text-muted-foreground text-center">
                No matching tokens
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
