"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import {
  ChevronDown, Shapes, Copy, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

// Shape types
const shapeTypes = [
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "inset", label: "Inset (Rectangle)" },
  { value: "polygon", label: "Polygon" },
]

// Polygon presets
const polygonPresets = [
  { name: "Triangle", value: "polygon(50% 0%, 0% 100%, 100% 100%)" },
  { name: "Pentagon", value: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" },
  { name: "Hexagon", value: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" },
  { name: "Star", value: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
  { name: "Arrow Right", value: "polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)" },
  { name: "Cross", value: "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)" },
]

// Shape box options
const shapeBoxOptions = [
  { value: "margin-box", label: "Margin Box" },
  { value: "border-box", label: "Border Box" },
  { value: "padding-box", label: "Padding Box" },
  { value: "content-box", label: "Content Box" },
]

export function CSSShapesEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [shapeType, setShapeType] = useState("circle")
  const [shapeBox, setShapeBox] = useState("margin-box")

  // Circle/Ellipse params
  const [circleRadius, setCircleRadius] = useState(50)
  const [circleCenterX, setCircleCenterX] = useState(50)
  const [circleCenterY, setCircleCenterY] = useState(50)

  // Ellipse params
  const [ellipseRadiusX, setEllipseRadiusX] = useState(50)
  const [ellipseRadiusY, setEllipseRadiusY] = useState(30)

  // Inset params
  const [insetTop, setInsetTop] = useState(10)
  const [insetRight, setInsetRight] = useState(10)
  const [insetBottom, setInsetBottom] = useState(10)
  const [insetLeft, setInsetLeft] = useState(10)
  const [insetRadius, setInsetRadius] = useState(0)

  // Polygon
  const [polygonValue, setPolygonValue] = useState(polygonPresets[0].value)

  // Build shape value
  const shapeValue = useMemo(() => {
    switch (shapeType) {
      case "circle":
        return `circle(${circleRadius}% at ${circleCenterX}% ${circleCenterY}%)`
      case "ellipse":
        return `ellipse(${ellipseRadiusX}% ${ellipseRadiusY}% at ${circleCenterX}% ${circleCenterY}%)`
      case "inset":
        return `inset(${insetTop}% ${insetRight}% ${insetBottom}% ${insetLeft}% round ${insetRadius}px)`
      case "polygon":
        return polygonValue
      default:
        return ""
    }
  }, [shapeType, circleRadius, circleCenterX, circleCenterY, ellipseRadiusX, ellipseRadiusY, insetTop, insetRight, insetBottom, insetLeft, insetRadius, polygonValue])

  // Apply to element
  const apply = useCallback((property: "shape-outside" | "clip-path") => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    const el = selectedElement.element

    if (property === "shape-outside") {
      el.style.shapeOutside = `${shapeValue} ${shapeBox}`
      el.style.float = el.style.float || "left"
    } else {
      el.style.clipPath = shapeValue
    }

    notifyStyleChange()
    toast.success(`${property} applied!`)
  }, [selectedElement, shapeValue, shapeBox, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    if (!selectedElement?.element) return

    selectedElement.element.style.shapeOutside = ""
    selectedElement.element.style.clipPath = ""

    notifyStyleChange()
    toast.success("Shape reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    const css = `/* For text wrapping around shape */
shape-outside: ${shapeValue};
float: left;

/* Or for clipping element */
clip-path: ${shapeValue};`

    navigator.clipboard.writeText(css)
    toast.success("CSS copied to clipboard")
  }, [shapeValue])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Shapes className="h-4 w-4 text-[--accent-indigo]" />
          <span>CSS Shapes</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Shape type */}
        <div className="space-y-1">
          <Label className="text-[10px]">Shape Type</Label>
          <Select value={shapeType} onValueChange={setShapeType}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shapeTypes.map(st => (
                <SelectItem key={st.value} value={st.value} className="text-xs">
                  {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Circle controls */}
        {shapeType === "circle" && (
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-[10px]">Radius</Label>
                <span className="text-[10px] font-mono">{circleRadius}%</span>
              </div>
              <Slider
                value={[circleRadius]}
                onValueChange={([v]) => setCircleRadius(v)}
                min={0}
                max={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Center X</Label>
                <Slider
                  value={[circleCenterX]}
                  onValueChange={([v]) => setCircleCenterX(v)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Center Y</Label>
                <Slider
                  value={[circleCenterY]}
                  onValueChange={([v]) => setCircleCenterY(v)}
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>
        )}

        {/* Ellipse controls */}
        {shapeType === "ellipse" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Radius X</Label>
                <Slider
                  value={[ellipseRadiusX]}
                  onValueChange={([v]) => setEllipseRadiusX(v)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Radius Y</Label>
                <Slider
                  value={[ellipseRadiusY]}
                  onValueChange={([v]) => setEllipseRadiusY(v)}
                  min={0}
                  max={100}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Center X</Label>
                <Slider
                  value={[circleCenterX]}
                  onValueChange={([v]) => setCircleCenterX(v)}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Center Y</Label>
                <Slider
                  value={[circleCenterY]}
                  onValueChange={([v]) => setCircleCenterY(v)}
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>
        )}

        {/* Inset controls */}
        {shapeType === "inset" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Top</Label>
                <Slider
                  value={[insetTop]}
                  onValueChange={([v]) => setInsetTop(v)}
                  min={0}
                  max={50}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Right</Label>
                <Slider
                  value={[insetRight]}
                  onValueChange={([v]) => setInsetRight(v)}
                  min={0}
                  max={50}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Bottom</Label>
                <Slider
                  value={[insetBottom]}
                  onValueChange={([v]) => setInsetBottom(v)}
                  min={0}
                  max={50}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Left</Label>
                <Slider
                  value={[insetLeft]}
                  onValueChange={([v]) => setInsetLeft(v)}
                  min={0}
                  max={50}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Border Radius</Label>
              <Slider
                value={[insetRadius]}
                onValueChange={([v]) => setInsetRadius(v)}
                min={0}
                max={50}
              />
            </div>
          </div>
        )}

        {/* Polygon controls */}
        {shapeType === "polygon" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {polygonPresets.map((preset, i) => (
                <Badge
                  key={i}
                  variant={polygonValue === preset.value ? "default" : "outline"}
                  className="text-[9px] h-5 px-2 cursor-pointer"
                  onClick={() => setPolygonValue(preset.value)}
                >
                  {preset.name}
                </Badge>
              ))}
            </div>
            <Input
              value={polygonValue}
              onChange={(e) => setPolygonValue(e.target.value)}
              className="h-7 text-[10px] font-mono"
              placeholder="polygon(50% 0%, ...)"
            />
          </div>
        )}

        {/* Shape box */}
        <div className="space-y-1">
          <Label className="text-[10px]">Reference Box</Label>
          <Select value={shapeBox} onValueChange={setShapeBox}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shapeBoxOptions.map(sb => (
                <SelectItem key={sb.value} value={sb.value} className="text-xs">
                  {sb.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className="relative h-24 bg-muted/30 rounded flex items-center justify-center">
          <div
            className="w-16 h-16 bg-primary/30"
            style={{ clipPath: shapeValue }}
          />
        </div>

        {/* CSS preview */}
        <div className="p-2 bg-muted/50 rounded">
          <code className="text-[9px] break-all">{shapeValue}</code>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-7"
            onClick={() => apply("clip-path")}
            disabled={!selectedElement}
          >
            Clip Path
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => apply("shape-outside")}
            disabled={!selectedElement}
          >
            Shape Outside
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={copyCSS}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
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
      </CollapsibleContent>
    </Collapsible>
  )
}
