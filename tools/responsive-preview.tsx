"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import {
  Monitor, Laptop, Tablet, Smartphone, X, Maximize2, Minimize2,
  RotateCcw, ChevronDown, Zap, Settings
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Badge } from "../ui/badge"
import { Slider } from "../ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { ScrollArea } from "../ui/scroll-area"
import { useInspector } from "../core/inspector-context"

// Device presets with common viewport sizes
const devicePresets = [
  { id: "desktop-xl", name: "Desktop XL", width: 1920, height: 1080, icon: Monitor, category: "Desktop" },
  { id: "desktop", name: "Desktop", width: 1440, height: 900, icon: Monitor, category: "Desktop" },
  { id: "laptop", name: "Laptop", width: 1280, height: 800, icon: Laptop, category: "Desktop" },
  { id: "macbook-pro-16", name: "MacBook Pro 16\"", width: 1728, height: 1117, icon: Laptop, category: "Desktop" },
  { id: "macbook-air", name: "MacBook Air", width: 1440, height: 900, icon: Laptop, category: "Desktop" },
  { id: "ipad-pro-12", name: "iPad Pro 12.9\"", width: 1024, height: 1366, icon: Tablet, category: "Tablet" },
  { id: "ipad-pro-11", name: "iPad Pro 11\"", width: 834, height: 1194, icon: Tablet, category: "Tablet" },
  { id: "ipad", name: "iPad", width: 768, height: 1024, icon: Tablet, category: "Tablet" },
  { id: "ipad-mini", name: "iPad Mini", width: 744, height: 1133, icon: Tablet, category: "Tablet" },
  { id: "iphone-15-pro-max", name: "iPhone 15 Pro Max", width: 430, height: 932, icon: Smartphone, category: "Mobile" },
  { id: "iphone-15-pro", name: "iPhone 15 Pro", width: 393, height: 852, icon: Smartphone, category: "Mobile" },
  { id: "iphone-15", name: "iPhone 15", width: 390, height: 844, icon: Smartphone, category: "Mobile" },
  { id: "iphone-se", name: "iPhone SE", width: 375, height: 667, icon: Smartphone, category: "Mobile" },
  { id: "pixel-8", name: "Pixel 8", width: 412, height: 915, icon: Smartphone, category: "Mobile" },
  { id: "samsung-s24", name: "Samsung S24", width: 360, height: 780, icon: Smartphone, category: "Mobile" },
]

// Common breakpoints for quick access
const breakpointQuickAccess = [
  { width: 1920, label: "1920px", description: "Extra large desktop" },
  { width: 1440, label: "1440px", description: "Large desktop" },
  { width: 1280, label: "1280px", description: "Desktop" },
  { width: 1024, label: "1024px", description: "Tablet landscape" },
  { width: 768, label: "768px", description: "Tablet" },
  { width: 640, label: "640px", description: "Large mobile" },
  { width: 375, label: "375px", description: "Mobile" },
]

interface ResponsivePreviewProps {
  isOpen: boolean
  onClose: () => void
}

export function ResponsivePreview({ isOpen, onClose }: ResponsivePreviewProps) {
  const { setIsPreviewMode } = useInspector()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [customWidth, setCustomWidth] = useState(1440)
  const [customHeight, setCustomHeight] = useState(900)
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [isRotated, setIsRotated] = useState(false)
  const [scale, setScale] = useState(100)
  const [showDeviceFrame, setShowDeviceFrame] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get display dimensions (accounting for rotation)
  const displayWidth = isRotated ? customHeight : customWidth
  const displayHeight = isRotated ? customWidth : customHeight

  // Apply device preset
  const applyPreset = useCallback((presetId: string) => {
    const preset = devicePresets.find(p => p.id === presetId)
    if (preset) {
      setCustomWidth(preset.width)
      setCustomHeight(preset.height)
      setSelectedDevice(presetId)
      setIsRotated(false)
    }
  }, [])

  // Apply breakpoint
  const applyBreakpoint = useCallback((width: number) => {
    setCustomWidth(width)
    setSelectedDevice(null)
  }, [])

  // Toggle rotation
  const toggleRotation = useCallback(() => {
    setIsRotated(prev => !prev)
  }, [])

  // Auto-scale to fit container
  const autoScale = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const containerWidth = container.clientWidth - 80
    const containerHeight = container.clientHeight - 120

    const scaleX = containerWidth / displayWidth
    const scaleY = containerHeight / displayHeight
    const newScale = Math.min(scaleX, scaleY, 1) * 100

    setScale(Math.max(25, Math.min(100, Math.round(newScale))))
  }, [displayWidth, displayHeight])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [isFullscreen])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Set preview mode when open
  useEffect(() => {
    setIsPreviewMode(isOpen)
    return () => setIsPreviewMode(false)
  }, [isOpen, setIsPreviewMode])

  // Auto-scale on open or dimension change
  useEffect(() => {
    if (isOpen) {
      setTimeout(autoScale, 100)
    }
  }, [isOpen, displayWidth, displayHeight, autoScale])

  if (!isOpen) return null

  // Get the device info for display
  const deviceInfo = selectedDevice ? devicePresets.find(p => p.id === selectedDevice) : null
  const DeviceIcon = deviceInfo?.icon || Monitor

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-9999 flex flex-col"
      data-devtools
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Responsive Preview</span>
          </div>

          {/* Dimension inputs */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={displayWidth}
              onChange={(e) => {
                setCustomWidth(parseInt(e.target.value) || 320)
                setSelectedDevice(null)
              }}
              className="w-20 h-8 text-xs text-center"
            />
            <X className="h-3 w-3 text-muted-foreground" />
            <Input
              type="number"
              value={displayHeight}
              onChange={(e) => {
                setCustomHeight(parseInt(e.target.value) || 480)
                setSelectedDevice(null)
              }}
              className="w-20 h-8 text-xs text-center"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={toggleRotation}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Scale control */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Scale:</Label>
            <Slider
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
              min={25}
              max={100}
              step={5}
              className="w-24"
            />
            <span className="text-xs w-10">{scale}%</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={autoScale}
            >
              <Zap className="h-3 w-3 mr-1" />
              Fit
            </Button>
          </div>

          {/* Device info badge */}
          {deviceInfo && (
            <Badge variant="secondary" className="text-xs">
              {deviceInfo.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Quick breakpoints */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Quick Breakpoints</Label>
                <div className="grid grid-cols-2 gap-1">
                  {breakpointQuickAccess.map((bp) => (
                    <Button
                      key={bp.width}
                      variant={displayWidth === bp.width && !selectedDevice ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => applyBreakpoint(bp.width)}
                    >
                      {bp.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Device presets by category */}
              {["Desktop", "Tablet", "Mobile"].map((category) => (
                <Collapsible key={category} defaultOpen={category === "Desktop"}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-medium hover:bg-muted/50 px-1 rounded">
                    <span>{category}</span>
                    <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1 space-y-0.5">
                    {devicePresets
                      .filter((p) => p.category === category)
                      .map((preset) => {
                        const PresetIcon = preset.icon
                        return (
                          <Button
                            key={preset.id}
                            variant={selectedDevice === preset.id ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start h-8 text-xs"
                            onClick={() => applyPreset(preset.id)}
                          >
                            <PresetIcon className="h-3 w-3 mr-2" />
                            <span className="flex-1 text-left">{preset.name}</span>
                            <span className="text-muted-foreground">
                              {preset.width}x{preset.height}
                            </span>
                          </Button>
                        )
                      })}
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {/* Options */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between py-1">
                  <Label className="text-xs">Show device frame</Label>
                  <Button
                    variant={showDeviceFrame ? "default" : "outline"}
                    size="sm"
                    className="h-6 w-10 text-[10px]"
                    onClick={() => setShowDeviceFrame(!showDeviceFrame)}
                  >
                    {showDeviceFrame ? "On" : "Off"}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Preview area */}
        <div className="flex-1 bg-muted/30 overflow-auto flex items-center justify-center p-8">
          <div
            className={cn(
              "relative transition-all duration-300",
              showDeviceFrame && deviceInfo?.category !== "Desktop" && "p-4"
            )}
            style={{
              transform: `scale(${scale / 100})`,
              transformOrigin: "center center",
            }}
          >
            {/* Device frame for mobile/tablet */}
            {showDeviceFrame && deviceInfo?.category === "Mobile" && (
              <div className="absolute inset-0 -m-4 rounded-[3rem] bg-gray-900 dark:bg-gray-800 shadow-xl" />
            )}
            {showDeviceFrame && deviceInfo?.category === "Tablet" && (
              <div className="absolute inset-0 -m-4 rounded-[2rem] bg-gray-800 dark:bg-gray-700 shadow-xl" />
            )}

            {/* Preview iframe */}
            <div
              className={cn(
                "bg-white relative overflow-hidden",
                showDeviceFrame && deviceInfo?.category === "Mobile" && "rounded-[2.5rem]",
                showDeviceFrame && deviceInfo?.category === "Tablet" && "rounded-[1.5rem]",
                showDeviceFrame && deviceInfo?.category === "Desktop" && "rounded-lg shadow-xl",
                !showDeviceFrame && "rounded-lg shadow-lg"
              )}
              style={{
                width: displayWidth,
                height: displayHeight,
              }}
            >
              <iframe
                ref={iframeRef}
                src={window.location.href}
                className="w-full h-full border-0"
                title="Responsive Preview"
              />

              {/* Notch for iPhone */}
              {showDeviceFrame && deviceInfo?.id.includes("iphone-15") && !isRotated && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-gray-900 dark:bg-gray-800 rounded-b-3xl" />
              )}
            </div>

            {/* Dimension label */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-mono">
              {displayWidth} x {displayHeight}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Button to open responsive preview from inspector
export function ResponsivePreviewToggle() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-chart-3" />
            <span>Responsive Preview</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">
            Preview your design at different viewport sizes with device-accurate frames.
          </p>
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => setIsOpen(true)}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Open Responsive Preview
          </Button>
        </CollapsibleContent>
      </Collapsible>
      <ResponsivePreview isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
