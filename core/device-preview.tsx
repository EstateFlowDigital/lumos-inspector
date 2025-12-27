"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Smartphone,
  Tablet,
  Monitor,
  Tv,
  RotateCcw,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

// Device definitions
export interface DeviceDefinition {
  id: string
  name: string
  brand: string
  category: "phone" | "tablet" | "desktop" | "tv"
  width: number
  height: number
  devicePixelRatio: number
  userAgent?: string
}

// Common device presets
export const devicePresets: DeviceDefinition[] = [
  // Phones
  {
    id: "iphone-15-pro",
    name: "iPhone 15 Pro",
    brand: "Apple",
    category: "phone",
    width: 393,
    height: 852,
    devicePixelRatio: 3,
  },
  {
    id: "iphone-14",
    name: "iPhone 14",
    brand: "Apple",
    category: "phone",
    width: 390,
    height: 844,
    devicePixelRatio: 3,
  },
  {
    id: "iphone-se",
    name: "iPhone SE",
    brand: "Apple",
    category: "phone",
    width: 375,
    height: 667,
    devicePixelRatio: 2,
  },
  {
    id: "pixel-8",
    name: "Pixel 8",
    brand: "Google",
    category: "phone",
    width: 412,
    height: 915,
    devicePixelRatio: 2.625,
  },
  {
    id: "pixel-7",
    name: "Pixel 7",
    brand: "Google",
    category: "phone",
    width: 412,
    height: 915,
    devicePixelRatio: 2.625,
  },
  {
    id: "samsung-s24",
    name: "Galaxy S24",
    brand: "Samsung",
    category: "phone",
    width: 360,
    height: 780,
    devicePixelRatio: 3,
  },
  {
    id: "samsung-s23",
    name: "Galaxy S23",
    brand: "Samsung",
    category: "phone",
    width: 360,
    height: 780,
    devicePixelRatio: 3,
  },
  // Tablets
  {
    id: "ipad-pro-12",
    name: 'iPad Pro 12.9"',
    brand: "Apple",
    category: "tablet",
    width: 1024,
    height: 1366,
    devicePixelRatio: 2,
  },
  {
    id: "ipad-pro-11",
    name: 'iPad Pro 11"',
    brand: "Apple",
    category: "tablet",
    width: 834,
    height: 1194,
    devicePixelRatio: 2,
  },
  {
    id: "ipad-air",
    name: "iPad Air",
    brand: "Apple",
    category: "tablet",
    width: 820,
    height: 1180,
    devicePixelRatio: 2,
  },
  {
    id: "ipad-mini",
    name: "iPad Mini",
    brand: "Apple",
    category: "tablet",
    width: 768,
    height: 1024,
    devicePixelRatio: 2,
  },
  {
    id: "galaxy-tab-s9",
    name: "Galaxy Tab S9",
    brand: "Samsung",
    category: "tablet",
    width: 800,
    height: 1280,
    devicePixelRatio: 2,
  },
  {
    id: "surface-pro",
    name: "Surface Pro",
    brand: "Microsoft",
    category: "tablet",
    width: 912,
    height: 1368,
    devicePixelRatio: 2,
  },
  // Desktops
  {
    id: "macbook-air-13",
    name: 'MacBook Air 13"',
    brand: "Apple",
    category: "desktop",
    width: 1280,
    height: 800,
    devicePixelRatio: 2,
  },
  {
    id: "macbook-pro-14",
    name: 'MacBook Pro 14"',
    brand: "Apple",
    category: "desktop",
    width: 1512,
    height: 982,
    devicePixelRatio: 2,
  },
  {
    id: "macbook-pro-16",
    name: 'MacBook Pro 16"',
    brand: "Apple",
    category: "desktop",
    width: 1728,
    height: 1117,
    devicePixelRatio: 2,
  },
  {
    id: "laptop-hd",
    name: "Laptop HD",
    brand: "Generic",
    category: "desktop",
    width: 1366,
    height: 768,
    devicePixelRatio: 1,
  },
  {
    id: "desktop-fhd",
    name: "Desktop FHD",
    brand: "Generic",
    category: "desktop",
    width: 1920,
    height: 1080,
    devicePixelRatio: 1,
  },
  {
    id: "desktop-2k",
    name: "Desktop 2K",
    brand: "Generic",
    category: "desktop",
    width: 2560,
    height: 1440,
    devicePixelRatio: 1,
  },
  // TVs
  {
    id: "tv-hd",
    name: "TV HD",
    brand: "Generic",
    category: "tv",
    width: 1280,
    height: 720,
    devicePixelRatio: 1,
  },
  {
    id: "tv-fhd",
    name: "TV Full HD",
    brand: "Generic",
    category: "tv",
    width: 1920,
    height: 1080,
    devicePixelRatio: 1,
  },
  {
    id: "tv-4k",
    name: "TV 4K",
    brand: "Generic",
    category: "tv",
    width: 3840,
    height: 2160,
    devicePixelRatio: 1,
  },
]

// Device frame styles
const deviceFrames: Record<string, React.CSSProperties> = {
  phone: {
    borderRadius: "36px",
    border: "12px solid #1a1a1a",
    boxShadow: "0 0 0 2px #333, 0 20px 40px rgba(0,0,0,0.3)",
  },
  tablet: {
    borderRadius: "24px",
    border: "16px solid #1a1a1a",
    boxShadow: "0 0 0 2px #333, 0 20px 40px rgba(0,0,0,0.3)",
  },
  desktop: {
    borderRadius: "8px",
    border: "2px solid #333",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  tv: {
    borderRadius: "4px",
    border: "20px solid #1a1a1a",
    boxShadow: "0 0 0 4px #333, 0 30px 60px rgba(0,0,0,0.4)",
  },
}

// Context for device preview
interface DevicePreviewContextType {
  isActive: boolean
  device: DeviceDefinition | null
  isRotated: boolean
  scale: number
  setDevice: (device: DeviceDefinition | null) => void
  setRotated: (rotated: boolean) => void
  setScale: (scale: number) => void
  toggle: () => void
}

const DevicePreviewContext = React.createContext<DevicePreviewContextType | null>(null)

export function useDevicePreview() {
  const context = React.useContext(DevicePreviewContext)
  if (!context) {
    throw new Error("useDevicePreview must be used within DevicePreviewProvider")
  }
  return context
}

// Provider component
export function DevicePreviewProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [device, setDevice] = useState<DeviceDefinition | null>(null)
  const [isRotated, setRotated] = useState(false)
  const [scale, setScale] = useState(1)

  const toggle = useCallback(() => {
    setIsActive((prev) => !prev)
  }, [])

  return (
    <DevicePreviewContext.Provider
      value={{
        isActive,
        device,
        isRotated,
        scale,
        setDevice,
        setRotated,
        setScale,
        toggle,
      }}
    >
      {children}
    </DevicePreviewContext.Provider>
  )
}

// Category icon component
function CategoryIcon({ category, className }: { category: string; className?: string }) {
  switch (category) {
    case "phone":
      return <Smartphone className={className} />
    case "tablet":
      return <Tablet className={className} />
    case "desktop":
      return <Monitor className={className} />
    case "tv":
      return <Tv className={className} />
    default:
      return <Monitor className={className} />
  }
}

// Device selector component
interface DeviceSelectorProps {
  value: DeviceDefinition | null
  onChange: (device: DeviceDefinition | null) => void
  className?: string
}

export function DeviceSelector({ value, onChange, className }: DeviceSelectorProps) {
  const [category, setCategory] = useState<string>("all")

  const filteredDevices = useMemo(() => {
    if (category === "all") return devicePresets
    return devicePresets.filter((d) => d.category === category)
  }, [category])

  const groupedDevices = useMemo(() => {
    const groups: Record<string, DeviceDefinition[]> = {}
    filteredDevices.forEach((device) => {
      if (!groups[device.brand]) {
        groups[device.brand] = []
      }
      groups[device.brand].push(device)
    })
    return groups
  }, [filteredDevices])

  return (
    <div className={cn("space-y-3", className)}>
      {/* Category filter */}
      <div className="flex gap-1" role="group" aria-label="Filter devices by category">
        {["all", "phone", "tablet", "desktop", "tv"].map((cat) => (
          <Button
            key={cat}
            variant={category === cat ? "default" : "outline"}
            size="sm"
            className="h-8 px-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            onClick={() => setCategory(cat)}
            aria-label={cat === "all" ? "Show all devices" : `Show ${cat} devices`}
            aria-pressed={category === cat}
          >
            {cat === "all" ? (
              "All"
            ) : (
              <CategoryIcon category={cat} className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        ))}
      </div>

      {/* Device list */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-4 pr-4" role="listbox" aria-label="Available devices">
          {Object.entries(groupedDevices).map(([brand, devices]) => (
            <div key={brand} role="group" aria-labelledby={`brand-${brand}`}>
              <h4 id={`brand-${brand}`} className="text-xs font-medium text-muted-foreground mb-2">
                {brand}
              </h4>
              <div className="space-y-1">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    role="option"
                    aria-selected={value?.id === device.id}
                    onClick={() => onChange(device)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg text-left",
                      "hover:bg-muted transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
                      value?.id === device.id && "bg-primary/10 border border-primary"
                    )}
                  >
                    <CategoryIcon
                      category={device.category}
                      className="h-4 w-4 text-muted-foreground"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {device.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {device.width} × {device.height}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// Device preview frame component
interface DevicePreviewFrameProps {
  device: DeviceDefinition
  isRotated: boolean
  scale: number
  children: React.ReactNode
  showFrame?: boolean
  className?: string
}

export function DevicePreviewFrame({
  device,
  isRotated,
  scale,
  children,
  showFrame = true,
  className,
}: DevicePreviewFrameProps) {
  const width = isRotated ? device.height : device.width
  const height = isRotated ? device.width : device.height

  const frameStyle = showFrame ? deviceFrames[device.category] : {}

  return (
    <div
      className={cn("relative transition-all duration-300", className)}
      style={{
        width: width * scale,
        height: height * scale,
        ...frameStyle,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {/* Notch for phones */}
      {showFrame && device.category === "phone" && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-black rounded-b-xl z-10"
          style={{
            width: "30%",
            height: "24px",
          }}
        />
      )}

      {/* Content */}
      <div
        className="w-full h-full overflow-auto bg-white"
        style={{
          borderRadius: showFrame ? "24px" : undefined,
        }}
      >
        {children}
      </div>

      {/* Home indicator for phones/tablets */}
      {showFrame && (device.category === "phone" || device.category === "tablet") && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-400 rounded-full"
          style={{
            width: "35%",
            height: "4px",
          }}
        />
      )}
    </div>
  )
}

// Main device preview overlay
interface DevicePreviewOverlayProps {
  className?: string
}

export function DevicePreviewOverlay({ className }: DevicePreviewOverlayProps) {
  const {
    isActive,
    device,
    isRotated,
    scale,
    setDevice,
    setRotated,
    setScale,
    toggle,
  } = useDevicePreview()

  const [showSelector, setShowSelector] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Auto-calculate scale to fit viewport
  const calculateScale = useCallback(() => {
    if (!device) return 1

    const viewportWidth = window.innerWidth - 100
    const viewportHeight = window.innerHeight - 200

    const deviceWidth = isRotated ? device.height : device.width
    const deviceHeight = isRotated ? device.width : device.height

    const scaleX = viewportWidth / deviceWidth
    const scaleY = viewportHeight / deviceHeight

    return Math.min(scaleX, scaleY, 1)
  }, [device, isRotated])

  useEffect(() => {
    if (isActive && device) {
      setScale(calculateScale())
    }
  }, [isActive, device, isRotated, calculateScale, setScale])

  // Handle resize with debouncing
  useEffect(() => {
    if (!isActive) return

    let timeoutId: NodeJS.Timeout | null = null

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setScale(calculateScale())
      }, 150) // Debounce resize calculations
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isActive, calculateScale, setScale])

  if (!isActive) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm",
        isFullscreen && "bg-background",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold">Device Preview</h2>

          {/* Device selector dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSelector(!showSelector)}
              className="gap-2"
            >
              {device ? (
                <>
                  <CategoryIcon category={device.category} className="h-4 w-4" />
                  {device.name}
                  <span className="text-muted-foreground">
                    ({isRotated ? device.height : device.width}×
                    {isRotated ? device.width : device.height})
                  </span>
                </>
              ) : (
                "Select Device"
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>

            {showSelector && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-card border rounded-lg shadow-lg p-3 z-50">
                <DeviceSelector
                  value={device}
                  onChange={(d) => {
                    setDevice(d)
                    setShowSelector(false)
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Rotate button */}
          {device && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotated(!isRotated)}
              title="Rotate device"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          {/* Scale selector */}
          {device && (
            <Select
              value={String(Math.round(scale * 100))}
              onValueChange={(v) => setScale(parseInt(v) / 100)}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
                <SelectItem value="125">125%</SelectItem>
                <SelectItem value="150">150%</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Fullscreen toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Close button */}
          <Button variant="outline" size="sm" onClick={toggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        {device ? (
          <DevicePreviewFrame
            device={device}
            isRotated={isRotated}
            scale={scale}
            showFrame={!isFullscreen}
          >
            {/* This would contain an iframe or the actual page content */}
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <CategoryIcon category={device.category} className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">{device.name}</p>
                <p className="text-sm">
                  {isRotated ? device.height : device.width} ×{" "}
                  {isRotated ? device.width : device.height}
                </p>
                <p className="text-xs mt-2">
                  Device Pixel Ratio: {device.devicePixelRatio}x
                </p>
              </div>
            </div>
          </DevicePreviewFrame>
        ) : (
          <div className="text-center text-muted-foreground">
            <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select a device to preview</p>
            <p className="text-sm">Choose from phones, tablets, desktops, or TVs</p>
          </div>
        )}
      </div>

      {/* Device info bar */}
      {device && (
        <div className="flex items-center justify-center gap-6 p-3 border-t text-sm text-muted-foreground">
          <span>
            <strong>Viewport:</strong> {isRotated ? device.height : device.width}×
            {isRotated ? device.width : device.height}
          </span>
          <span>
            <strong>Scale:</strong> {Math.round(scale * 100)}%
          </span>
          <span>
            <strong>DPR:</strong> {device.devicePixelRatio}x
          </span>
          <span>
            <strong>Orientation:</strong> {isRotated ? "Landscape" : "Portrait"}
          </span>
        </div>
      )}
    </div>
  )
}

// Quick device buttons for toolbar
export function DeviceQuickSelect({ className }: { className?: string }) {
  const { device, setDevice, toggle, isActive } = useDevicePreview()

  const quickDevices = [
    devicePresets.find((d) => d.id === "iphone-15-pro"),
    devicePresets.find((d) => d.id === "ipad-pro-11"),
    devicePresets.find((d) => d.id === "macbook-pro-14"),
  ].filter(Boolean) as DeviceDefinition[]

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {quickDevices.map((d) => (
        <Button
          key={d.id}
          variant={device?.id === d.id && isActive ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            setDevice(d)
            if (!isActive) toggle()
          }}
          title={d.name}
        >
          <CategoryIcon category={d.category} className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}
