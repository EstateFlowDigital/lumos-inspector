"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import {
  ChevronDown, Printer, Eye, EyeOff, Copy
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Switch } from "../ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// Paper sizes
const paperSizes = [
  { value: "letter", label: "Letter (8.5×11)", width: "8.5in", height: "11in" },
  { value: "a4", label: "A4 (210×297mm)", width: "210mm", height: "297mm" },
  { value: "legal", label: "Legal (8.5×14)", width: "8.5in", height: "14in" },
  { value: "a3", label: "A3 (297×420mm)", width: "297mm", height: "420mm" },
]

// Common print CSS
const printCSSTips = [
  "Hide navigation, ads, sidebars",
  "Use dark text on white background",
  "Expand collapsed content",
  "Show link URLs in parentheses",
  "Add page breaks before sections",
  "Set appropriate font sizes",
]

export function PrintStylesPreview() {
  const { isOpen } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isPrintMode, setIsPrintMode] = useState(false)
  const [paperSize, setPaperSize] = useState("letter")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [showPageBreaks, setShowPageBreaks] = useState(false)

  // Toggle print emulation
  const togglePrintMode = useCallback(() => {
    if (!isPrintMode) {
      // Enable print mode
      document.body.classList.add("devtools-print-preview")

      // Inject print styles
      const style = document.createElement("style")
      style.id = "devtools-print-emulation"
      style.textContent = `
        .devtools-print-preview {
          background: #f0f0f0 !important;
          padding: 20px !important;
        }
        .devtools-print-preview > * {
          background: white !important;
          box-shadow: 0 0 10px rgba(0,0,0,0.1) !important;
          margin: 20px auto !important;
          max-width: ${paperSizes.find(p => p.value === paperSize)?.width} !important;
          min-height: ${paperSizes.find(p => p.value === paperSize)?.height} !important;
          padding: 1in !important;
        }
        @media screen {
          .devtools-print-preview * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `
      document.head.appendChild(style)

      // Apply @media print styles
      document.querySelectorAll("style, link[rel='stylesheet']").forEach(el => {
        if (el instanceof HTMLStyleElement) {
          el.media = "all"
        }
      })

      toast.success("Print preview enabled")
    } else {
      // Disable print mode
      document.body.classList.remove("devtools-print-preview")
      document.getElementById("devtools-print-emulation")?.remove()

      toast.success("Print preview disabled")
    }

    setIsPrintMode(!isPrintMode)
  }, [isPrintMode, paperSize])

  // Open print dialog
  const openPrintDialog = useCallback(() => {
    window.print()
  }, [])

  // Copy print CSS template
  const copyPrintCSS = useCallback(() => {
    const css = `@media print {
  /* Hide non-essential elements */
  nav, footer, .sidebar, .ads, .no-print {
    display: none !important;
  }

  /* Ensure readable colors */
  body {
    color: #000 !important;
    background: #fff !important;
  }

  /* Show link URLs */
  a[href]:after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
  }

  /* Page breaks */
  h1, h2, h3 {
    page-break-after: avoid;
  }

  img, table, figure {
    page-break-inside: avoid;
  }

  /* Page setup */
  @page {
    size: ${paperSize} ${orientation};
    margin: 1in;
  }
}`

    navigator.clipboard.writeText(css)
    toast.success("Print CSS copied to clipboard")
  }, [paperSize, orientation])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-muted-foreground" />
          <span>Print Styles</span>
          {isPrintMode && (
            <Badge variant="default" className="text-[10px] px-1 h-4">Active</Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Toggle print preview */}
        <Button
          variant={isPrintMode ? "default" : "outline"}
          size="sm"
          className="w-full h-7"
          onClick={togglePrintMode}
        >
          {isPrintMode ? (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              Exit Print Preview
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Preview Print Styles
            </>
          )}
        </Button>

        {/* Paper size */}
        <div className="space-y-1">
          <Label className="text-[10px]">Paper Size</Label>
          <Select value={paperSize} onValueChange={setPaperSize}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paperSizes.map(ps => (
                <SelectItem key={ps.value} value={ps.value} className="text-xs">
                  {ps.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orientation */}
        <div className="space-y-1">
          <Label className="text-[10px]">Orientation</Label>
          <Select value={orientation} onValueChange={(v) => setOrientation(v as typeof orientation)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait" className="text-xs">Portrait</SelectItem>
              <SelectItem value="landscape" className="text-xs">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show page breaks */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Show page break guides</Label>
          <Switch checked={showPageBreaks} onCheckedChange={setShowPageBreaks} />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={openPrintDialog}
          >
            <Printer className="h-3 w-3 mr-1" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={copyPrintCSS}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy CSS
          </Button>
        </div>

        {/* Tips */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          <div className="font-medium mb-1">Print CSS Tips:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {printCSSTips.slice(0, 4).map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
