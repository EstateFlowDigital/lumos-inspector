"use client"

import * as React from "react"
import { useState, useCallback, useRef } from "react"
import {
  ChevronDown, Camera, Download, Copy, Monitor, Square,
  Maximize2, Image, Loader2
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

type CaptureMode = "element" | "viewport" | "fullpage"
type ImageFormat = "png" | "jpeg" | "webp"

export function ScreenshotTool() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [captureMode, setCaptureMode] = useState<CaptureMode>("element")
  const [format, setFormat] = useState<ImageFormat>("png")
  const [quality, setQuality] = useState(92)
  const [scale, setScale] = useState(2)
  const [isCapturing, setIsCapturing] = useState(false)
  const [lastCapture, setLastCapture] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Capture element using html2canvas-like approach
  const captureElement = useCallback(async (element: HTMLElement): Promise<string> => {
    const rect = element.getBoundingClientRect()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) throw new Error("Could not get canvas context")

    // Set canvas size with scale
    canvas.width = rect.width * scale
    canvas.height = rect.height * scale
    ctx.scale(scale, scale)

    // Get computed styles
    const computed = getComputedStyle(element)

    // Draw background
    ctx.fillStyle = computed.backgroundColor || "white"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Use foreignObject to render HTML
    const data = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${element.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `

    const img = new window.Image()
    const svg = new Blob([data], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svg)

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)

        const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png"
        const dataUrl = canvas.toDataURL(mimeType, quality / 100)
        resolve(dataUrl)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load image"))
      }
      img.src = url
    })
  }, [format, quality, scale])

  // Capture viewport
  const captureViewport = useCallback(async (): Promise<string> => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) throw new Error("Could not get canvas context")

    const width = window.innerWidth
    const height = window.innerHeight

    canvas.width = width * scale
    canvas.height = height * scale
    ctx.scale(scale, scale)

    // Get body background
    const bodyStyle = getComputedStyle(document.body)
    ctx.fillStyle = bodyStyle.backgroundColor || "white"
    ctx.fillRect(0, 0, width, height)

    // Use foreignObject approach
    const html = document.documentElement.outerHTML
    const data = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          ${html}
        </foreignObject>
      </svg>
    `

    const img = new window.Image()
    const svg = new Blob([data], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svg)

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)

        const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png"
        const dataUrl = canvas.toDataURL(mimeType, quality / 100)
        resolve(dataUrl)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        // Fallback: return a simple placeholder
        ctx.fillStyle = "#f0f0f0"
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = "#666"
        ctx.font = "16px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("Screenshot capture requires html2canvas library", width / 2, height / 2)

        const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png"
        resolve(canvas.toDataURL(mimeType, quality / 100))
      }
      img.src = url
    })
  }, [format, quality, scale])

  // Main capture function
  const capture = useCallback(async () => {
    setIsCapturing(true)

    try {
      let dataUrl: string

      if (captureMode === "element") {
        if (!selectedElement?.element) {
          toast.error("No element selected")
          return
        }
        dataUrl = await captureElement(selectedElement.element)
      } else {
        dataUrl = await captureViewport()
      }

      setLastCapture(dataUrl)
      toast.success("Screenshot captured!")
    } catch (error) {
      console.error("Capture error:", error)
      toast.error("Failed to capture screenshot")
    } finally {
      setIsCapturing(false)
    }
  }, [captureMode, selectedElement, captureElement, captureViewport])

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!lastCapture) return

    try {
      const response = await fetch(lastCapture)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ])
      toast.success("Copied to clipboard!")
    } catch (error) {
      // Fallback: copy data URL
      navigator.clipboard.writeText(lastCapture)
      toast.success("Copied data URL to clipboard")
    }
  }, [lastCapture])

  // Download image
  const downloadImage = useCallback(() => {
    if (!lastCapture) return

    const link = document.createElement("a")
    link.href = lastCapture
    link.download = `screenshot-${Date.now()}.${format}`
    link.click()
    toast.success("Downloaded!")
  }, [lastCapture, format])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-chart-5" />
          <span>Screenshot</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Capture mode */}
        <div className="grid grid-cols-3 gap-1">
          <Button
            variant={captureMode === "element" ? "default" : "outline"}
            size="sm"
            className="h-9 flex-col gap-0.5"
            onClick={() => setCaptureMode("element")}
            disabled={!selectedElement}
          >
            <Square className="h-3.5 w-3.5" />
            <span className="text-[10px]">Element</span>
          </Button>
          <Button
            variant={captureMode === "viewport" ? "default" : "outline"}
            size="sm"
            className="h-9 flex-col gap-0.5"
            onClick={() => setCaptureMode("viewport")}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="text-[10px]">Viewport</span>
          </Button>
          <Button
            variant={captureMode === "fullpage" ? "default" : "outline"}
            size="sm"
            className="h-9 flex-col gap-0.5"
            onClick={() => setCaptureMode("fullpage")}
            disabled
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="text-[10px]">Full Page</span>
          </Button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Scale</Label>
            <Select value={scale.toString()} onValueChange={(v) => setScale(parseInt(v))}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="3">3x</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Quality</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value) || 92)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Capture button */}
        <Button
          className="w-full"
          onClick={capture}
          disabled={isCapturing || (captureMode === "element" && !selectedElement)}
        >
          {isCapturing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Capturing...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Capture {captureMode === "element" ? "Element" : "Viewport"}
            </>
          )}
        </Button>

        {/* Preview */}
        {lastCapture && (
          <div className="space-y-2">
            <div className="relative rounded-md border overflow-hidden bg-muted/50">
              <img
                src={lastCapture}
                alt="Screenshot preview"
                className="w-full h-auto max-h-32 object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7"
                onClick={copyToClipboard}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7"
                onClick={downloadImage}
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        <p className="text-[10px] text-muted-foreground">
          {captureMode === "element"
            ? "Select an element and capture it as an image."
            : "Capture the current viewport as an image."}
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}
