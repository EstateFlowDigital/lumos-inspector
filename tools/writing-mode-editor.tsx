"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  ChevronDown, AlignLeft, Copy, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// Writing mode options
const writingModes = [
  { value: "horizontal-tb", label: "Horizontal (LTR/RTL)", description: "Default horizontal text" },
  { value: "vertical-rl", label: "Vertical (Right to Left)", description: "Vertical, lines from right" },
  { value: "vertical-lr", label: "Vertical (Left to Right)", description: "Vertical, lines from left" },
  { value: "sideways-rl", label: "Sideways (Right to Left)", description: "Rotated text, right to left" },
  { value: "sideways-lr", label: "Sideways (Left to Right)", description: "Rotated text, left to right" },
]

// Text orientation options
const textOrientations = [
  { value: "mixed", label: "Mixed", description: "Scripts upright, others sideways" },
  { value: "upright", label: "Upright", description: "All characters upright" },
  { value: "sideways", label: "Sideways", description: "All characters sideways" },
]

// Direction options
const directions = [
  { value: "ltr", label: "Left to Right", description: "Default for most languages" },
  { value: "rtl", label: "Right to Left", description: "Arabic, Hebrew, etc." },
]

// Unicode bidi options
const unicodeBidi = [
  { value: "normal", label: "Normal", description: "Default behavior" },
  { value: "embed", label: "Embed", description: "Additional embedding level" },
  { value: "bidi-override", label: "Override", description: "Override bidirectional algorithm" },
  { value: "isolate", label: "Isolate", description: "Isolate from surroundings" },
  { value: "isolate-override", label: "Isolate Override", description: "Isolate and override" },
  { value: "plaintext", label: "Plaintext", description: "Determine from content" },
]

export function WritingModeEditor() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [writingMode, setWritingMode] = useState("horizontal-tb")
  const [textOrientation, setTextOrientation] = useState("mixed")
  const [direction, setDirection] = useState("ltr")
  const [bidi, setBidi] = useState("normal")

  // Load current values
  useEffect(() => {
    if (!selectedElement?.element) return

    const computed = getComputedStyle(selectedElement.element)
    setWritingMode(computed.writingMode || "horizontal-tb")
    setTextOrientation(computed.textOrientation || "mixed")
    setDirection(computed.direction || "ltr")
    setBidi(computed.unicodeBidi || "normal")
  }, [selectedElement])

  // Apply to element
  const apply = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element
    el.style.writingMode = writingMode
    el.style.textOrientation = textOrientation
    el.style.direction = direction
    el.style.unicodeBidi = bidi

    toast.success("Writing mode applied!")
  }, [selectedElement, writingMode, textOrientation, direction, bidi])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    const el = selectedElement.element
    el.style.writingMode = ""
    el.style.textOrientation = ""
    el.style.direction = ""
    el.style.unicodeBidi = ""

    setWritingMode("horizontal-tb")
    setTextOrientation("mixed")
    setDirection("ltr")
    setBidi("normal")

    toast.success("Writing mode reset")
  }, [selectedElement])

  // Copy CSS
  const copyCSS = useCallback(() => {
    let css = ""
    if (writingMode !== "horizontal-tb") css += `writing-mode: ${writingMode};\n`
    if (textOrientation !== "mixed") css += `text-orientation: ${textOrientation};\n`
    if (direction !== "ltr") css += `direction: ${direction};\n`
    if (bidi !== "normal") css += `unicode-bidi: ${bidi};\n`

    if (!css) css = "/* Default values */"

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [writingMode, textOrientation, direction, bidi])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <AlignLeft className="h-4 w-4 text-blue-500" />
          <span>Writing Mode</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Writing Mode */}
        <div className="space-y-1">
          <Label className="text-[10px]">Writing Mode</Label>
          <Select value={writingMode} onValueChange={setWritingMode}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {writingModes.map(wm => (
                <SelectItem key={wm.value} value={wm.value} className="text-xs">
                  {wm.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground">
            {writingModes.find(wm => wm.value === writingMode)?.description}
          </p>
        </div>

        {/* Text Orientation (only for vertical modes) */}
        {writingMode.startsWith("vertical") && (
          <div className="space-y-1">
            <Label className="text-[10px]">Text Orientation</Label>
            <Select value={textOrientation} onValueChange={setTextOrientation}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {textOrientations.map(to => (
                  <SelectItem key={to.value} value={to.value} className="text-xs">
                    {to.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Direction */}
        <div className="space-y-1">
          <Label className="text-[10px]">Direction</Label>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {directions.map(d => (
                <SelectItem key={d.value} value={d.value} className="text-xs">
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unicode Bidi */}
        <div className="space-y-1">
          <Label className="text-[10px]">Unicode Bidi</Label>
          <Select value={bidi} onValueChange={setBidi}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unicodeBidi.map(ub => (
                <SelectItem key={ub.value} value={ub.value} className="text-xs">
                  {ub.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview box */}
        <div
          className="p-3 bg-muted/30 rounded border text-xs"
          style={{
            writingMode: writingMode as React.CSSProperties["writingMode"],
            textOrientation: textOrientation as React.CSSProperties["textOrientation"],
            direction: direction as React.CSSProperties["direction"],
          }}
        >
          Sample text 示例文本
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-7"
            onClick={apply}
            disabled={!selectedElement}
          >
            Apply
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={reset}
            disabled={!selectedElement}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7"
          onClick={copyCSS}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy CSS
        </Button>
      </CollapsibleContent>
    </Collapsible>
  )
}
