"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronDown, Scissors, Copy, RotateCcw
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Slider } from "../ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type ShapeType = "inset" | "circle" | "ellipse" | "polygon"

interface InsetValues {
  top: number
  right: number
  bottom: number
  left: number
  radius: number
}

interface CircleValues {
  radius: number
  x: number
  y: number
}

interface EllipseValues {
  radiusX: number
  radiusY: number
  x: number
  y: number
}

// Polygon presets
const polygonPresets = [
  { name: "Triangle", points: "50% 0%, 0% 100%, 100% 100%" },
  { name: "Pentagon", points: "50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%" },
  { name: "Hexagon", points: "25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%" },
  { name: "Star", points: "50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%" },
  { name: "Arrow Right", points: "0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%" },
  { name: "Arrow Left", points: "40% 0%, 40% 20%, 100% 20%, 100% 80%, 40% 80%, 40% 100%, 0% 50%" },
  { name: "Cross", points: "35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%" },
  { name: "Diamond", points: "50% 0%, 100% 50%, 50% 100%, 0% 50%" },
  { name: "Chevron", points: "0% 0%, 50% 50%, 0% 100%, 10% 100%, 60% 50%, 10% 0%" },
  { name: "Message", points: "0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%" },
]

export function ClipPathEditor() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [shapeType, setShapeType] = useState<ShapeType>("inset")

  // Shape values
  const [inset, setInset] = useState<InsetValues>({
    top: 0, right: 0, bottom: 0, left: 0, radius: 0,
  })
  const [circle, setCircle] = useState<CircleValues>({
    radius: 50, x: 50, y: 50,
  })
  const [ellipse, setEllipse] = useState<EllipseValues>({
    radiusX: 50, radiusY: 30, x: 50, y: 50,
  })
  const [polygon, setPolygon] = useState(polygonPresets[0].points)

  // Build clip-path string
  const clipPath = useMemo(() => {
    switch (shapeType) {
      case "inset":
        const roundPart = inset.radius > 0 ? ` round ${inset.radius}%` : ""
        return `inset(${inset.top}% ${inset.right}% ${inset.bottom}% ${inset.left}%${roundPart})`
      case "circle":
        return `circle(${circle.radius}% at ${circle.x}% ${circle.y}%)`
      case "ellipse":
        return `ellipse(${ellipse.radiusX}% ${ellipse.radiusY}% at ${ellipse.x}% ${ellipse.y}%)`
      case "polygon":
        return `polygon(${polygon})`
      default:
        return "none"
    }
  }, [shapeType, inset, circle, ellipse, polygon])

  // Apply to element
  const applyToElement = useCallback(() => {
    if (!selectedElement?.element) {
      toast.error("No element selected")
      return
    }

    selectedElement.element.style.clipPath = clipPath
    notifyStyleChange()
    toast.success("Clip path applied")
  }, [selectedElement, clipPath, notifyStyleChange])

  // Reset
  const reset = useCallback(() => {
    setInset({ top: 0, right: 0, bottom: 0, left: 0, radius: 0 })
    setCircle({ radius: 50, x: 50, y: 50 })
    setEllipse({ radiusX: 50, radiusY: 30, x: 50, y: 50 })
    setPolygon(polygonPresets[0].points)

    if (selectedElement?.element) {
      selectedElement.element.style.clipPath = "none"
      notifyStyleChange()
    }
    toast.success("Clip path reset")
  }, [selectedElement, notifyStyleChange])

  // Copy CSS
  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(`clip-path: ${clipPath};`)
    toast.success("CSS copied to clipboard")
  }, [clipPath])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-chart-4" />
          <span>Clip Path</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Preview */}
        <div className="relative h-24 bg-muted/50 rounded-md overflow-hidden flex items-center justify-center">
          <div
            className="w-20 h-20 bg-gradient-to-br from-primary to-primary/50"
            style={{ clipPath }}
          />
          <div className="absolute top-1 right-1 text-[9px] text-muted-foreground capitalize">
            {shapeType}
          </div>
        </div>

        {/* Shape type tabs */}
        <Tabs value={shapeType} onValueChange={(v) => setShapeType(v as ShapeType)}>
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="inset" className="text-[10px]">Inset</TabsTrigger>
            <TabsTrigger value="circle" className="text-[10px]">Circle</TabsTrigger>
            <TabsTrigger value="ellipse" className="text-[10px]">Ellipse</TabsTrigger>
            <TabsTrigger value="polygon" className="text-[10px]">Polygon</TabsTrigger>
          </TabsList>

          {/* Inset controls */}
          <TabsContent value="inset" className="space-y-3 mt-3">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <div key={side} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] capitalize">{side}</Label>
                  <span className="text-[10px] font-mono">{inset[side]}%</span>
                </div>
                <Slider
                  value={[inset[side]]}
                  onValueChange={([v]) => setInset(prev => ({ ...prev, [side]: v }))}
                  min={0}
                  max={50}
                  step={1}
                />
              </div>
            ))}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Border Radius</Label>
                <span className="text-[10px] font-mono">{inset.radius}%</span>
              </div>
              <Slider
                value={[inset.radius]}
                onValueChange={([v]) => setInset(prev => ({ ...prev, radius: v }))}
                min={0}
                max={50}
                step={1}
              />
            </div>
          </TabsContent>

          {/* Circle controls */}
          <TabsContent value="circle" className="space-y-3 mt-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Radius</Label>
                <span className="text-[10px] font-mono">{circle.radius}%</span>
              </div>
              <Slider
                value={[circle.radius]}
                onValueChange={([v]) => setCircle(prev => ({ ...prev, radius: v }))}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Center X</Label>
                <span className="text-[10px] font-mono">{circle.x}%</span>
              </div>
              <Slider
                value={[circle.x]}
                onValueChange={([v]) => setCircle(prev => ({ ...prev, x: v }))}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Center Y</Label>
                <span className="text-[10px] font-mono">{circle.y}%</span>
              </div>
              <Slider
                value={[circle.y]}
                onValueChange={([v]) => setCircle(prev => ({ ...prev, y: v }))}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </TabsContent>

          {/* Ellipse controls */}
          <TabsContent value="ellipse" className="space-y-3 mt-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Radius X</Label>
                <span className="text-[10px] font-mono">{ellipse.radiusX}%</span>
              </div>
              <Slider
                value={[ellipse.radiusX]}
                onValueChange={([v]) => setEllipse(prev => ({ ...prev, radiusX: v }))}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Radius Y</Label>
                <span className="text-[10px] font-mono">{ellipse.radiusY}%</span>
              </div>
              <Slider
                value={[ellipse.radiusY]}
                onValueChange={([v]) => setEllipse(prev => ({ ...prev, radiusY: v }))}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Center X</Label>
                <span className="text-[10px] font-mono">{ellipse.x}%</span>
              </div>
              <Slider
                value={[ellipse.x]}
                onValueChange={([v]) => setEllipse(prev => ({ ...prev, x: v }))}
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Center Y</Label>
                <span className="text-[10px] font-mono">{ellipse.y}%</span>
              </div>
              <Slider
                value={[ellipse.y]}
                onValueChange={([v]) => setEllipse(prev => ({ ...prev, y: v }))}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </TabsContent>

          {/* Polygon controls */}
          <TabsContent value="polygon" className="space-y-3 mt-3">
            <Label className="text-[10px] text-muted-foreground">Presets</Label>
            <div className="grid grid-cols-5 gap-1">
              {polygonPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant={polygon === preset.points ? "default" : "outline"}
                  size="sm"
                  className="h-12 p-1 flex flex-col items-center justify-center"
                  onClick={() => setPolygon(preset.points)}
                >
                  <div
                    className="w-6 h-6 bg-current"
                    style={{ clipPath: `polygon(${preset.points})` }}
                  />
                  <span className="text-[8px] mt-1">{preset.name}</span>
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Custom Points</Label>
              <Input
                value={polygon}
                onChange={(e) => setPolygon(e.target.value)}
                className="h-7 text-[10px] font-mono"
                placeholder="50% 0%, 0% 100%, 100% 100%"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Current value */}
        <div className="p-2 bg-muted/50 rounded text-[10px] font-mono break-all">
          clip-path: {clipPath};
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={reset}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7"
            onClick={copyCSS}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy CSS
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-7"
            onClick={applyToElement}
            disabled={!selectedElement}
          >
            Apply
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
