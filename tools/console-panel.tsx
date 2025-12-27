"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  ChevronDown, Terminal, AlertCircle, AlertTriangle, Info,
  Trash2, Filter, Copy, ChevronRight
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type LogLevel = "log" | "info" | "warn" | "error"

interface LogEntry {
  id: number
  level: LogLevel
  message: string
  timestamp: Date
  stack?: string
  count: number
}

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
}

export function ConsolePanel() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogLevel | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedLog, setExpandedLog] = useState<number | null>(null)
  const logIdRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Intercept console methods
  useEffect(() => {
    const addLog = (level: LogLevel, args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2)
            } catch {
              return String(arg)
            }
          }
          return String(arg)
        })
        .join(" ")

      const stack = level === "error" ? new Error().stack : undefined

      setLogs((prev) => {
        // Check if this is a duplicate of the last log
        const lastLog = prev[prev.length - 1]
        if (lastLog && lastLog.message === message && lastLog.level === level) {
          return prev.map((log, i) =>
            i === prev.length - 1 ? { ...log, count: log.count + 1 } : log
          )
        }

        // Add new log
        const newLog: LogEntry = {
          id: logIdRef.current++,
          level,
          message,
          timestamp: new Date(),
          stack,
          count: 1,
        }

        // Keep last 100 logs
        const newLogs = [...prev, newLog].slice(-100)
        return newLogs
      })
    }

    // Override console methods
    console.log = (...args) => {
      originalConsole.log(...args)
      addLog("log", args)
    }
    console.info = (...args) => {
      originalConsole.info(...args)
      addLog("info", args)
    }
    console.warn = (...args) => {
      originalConsole.warn(...args)
      addLog("warn", args)
    }
    console.error = (...args) => {
      originalConsole.error(...args)
      addLog("error", args)
    }

    // Listen for unhandled errors
    const handleError = (event: ErrorEvent) => {
      addLog("error", [event.message])
    }
    window.addEventListener("error", handleError)

    // Listen for unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog("error", ["Unhandled Promise Rejection:", event.reason])
    }
    window.addEventListener("unhandledrejection", handleRejection)

    return () => {
      // Restore original console methods
      console.log = originalConsole.log
      console.info = originalConsole.info
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([])
    toast.success("Console cleared")
  }, [])

  // Copy log
  const copyLog = useCallback((log: LogEntry) => {
    navigator.clipboard.writeText(log.message)
    toast.success("Copied to clipboard")
  }, [])

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.level !== filter) return false
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  // Get icon for log level
  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case "warn":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case "info":
        return <Info className="h-3 w-3 text-blue-500" />
      default:
        return <ChevronRight className="h-3 w-3 text-muted-foreground" />
    }
  }

  // Get background color for log level
  const getLevelBg = (level: LogLevel) => {
    switch (level) {
      case "error":
        return "bg-red-500/5 border-l-red-500"
      case "warn":
        return "bg-yellow-500/5 border-l-yellow-500"
      case "info":
        return "bg-blue-500/5 border-l-blue-500"
      default:
        return "bg-transparent border-l-transparent"
    }
  }

  // Count by level
  const counts = {
    error: logs.filter((l) => l.level === "error").length,
    warn: logs.filter((l) => l.level === "warn").length,
    info: logs.filter((l) => l.level === "info").length,
    log: logs.filter((l) => l.level === "log").length,
  }

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-chart-1" />
          <span>Console</span>
          {counts.error > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-red-500/10 text-red-500">
              {counts.error}
            </Badge>
          )}
          {counts.warn > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-yellow-500/10 text-yellow-500">
              {counts.warn}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 pt-2">
        {/* Filter bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Filter logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={clearLogs}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Level filters */}
        <div className="flex gap-1">
          {(["all", "error", "warn", "info", "log"] as const).map((level) => (
            <Button
              key={level}
              variant={filter === level ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-6 text-[10px] px-2",
                filter === level && level === "error" && "bg-red-500 hover:bg-red-600",
                filter === level && level === "warn" && "bg-yellow-500 hover:bg-yellow-600",
                filter === level && level === "info" && "bg-blue-500 hover:bg-blue-600"
              )}
              onClick={() => setFilter(level)}
            >
              {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
              {level !== "all" && ` (${counts[level]})`}
            </Button>
          ))}
        </div>

        {/* Logs */}
        <ScrollArea className="h-[180px]" viewportRef={scrollRef}>
          <div className="space-y-0.5 font-mono text-[10px]">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No console output
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "px-2 py-1 border-l-2 hover:bg-muted/30 cursor-pointer",
                    getLevelBg(log.level)
                  )}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-2">
                    {getLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate",
                            expandedLog === log.id && "whitespace-pre-wrap break-all"
                          )}
                        >
                          {log.message}
                        </span>
                        {log.count > 1 && (
                          <Badge variant="secondary" className="text-[8px] h-3 px-1">
                            {log.count}
                          </Badge>
                        )}
                      </div>
                      {expandedLog === log.id && log.stack && (
                        <pre className="mt-1 text-[9px] text-muted-foreground overflow-x-auto">
                          {log.stack}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[9px] text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyLog(log)
                        }}
                      >
                        <Copy className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  )
}
