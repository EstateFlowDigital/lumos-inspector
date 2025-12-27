"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Copy,
  Layers,
  Clock,
  Zap,
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Slider } from "../ui/slider"
import { ScrollArea } from "../ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

// Animation keyframe definition
export interface Keyframe {
  id: string
  offset: number // 0-100 percentage
  properties: Record<string, string>
  easing?: string
}

// Animation track (property being animated)
export interface AnimationTrack {
  id: string
  property: string
  keyframes: Keyframe[]
  expanded: boolean
}

// Full animation definition
export interface AnimationDefinition {
  id: string
  name: string
  duration: number // in ms
  delay: number
  iterations: number | "infinite"
  direction: "normal" | "reverse" | "alternate" | "alternate-reverse"
  fillMode: "none" | "forwards" | "backwards" | "both"
  timingFunction: string
  tracks: AnimationTrack[]
}

// Easing presets
export const easingPresets = [
  { name: "Linear", value: "linear" },
  { name: "Ease", value: "ease" },
  { name: "Ease In", value: "ease-in" },
  { name: "Ease Out", value: "ease-out" },
  { name: "Ease In Out", value: "ease-in-out" },
  { name: "Ease In Sine", value: "cubic-bezier(0.12, 0, 0.39, 0)" },
  { name: "Ease Out Sine", value: "cubic-bezier(0.61, 1, 0.88, 1)" },
  { name: "Ease In Out Sine", value: "cubic-bezier(0.37, 0, 0.63, 1)" },
  { name: "Ease In Quad", value: "cubic-bezier(0.11, 0, 0.5, 0)" },
  { name: "Ease Out Quad", value: "cubic-bezier(0.5, 1, 0.89, 1)" },
  { name: "Ease In Out Quad", value: "cubic-bezier(0.45, 0, 0.55, 1)" },
  { name: "Ease In Cubic", value: "cubic-bezier(0.32, 0, 0.67, 0)" },
  { name: "Ease Out Cubic", value: "cubic-bezier(0.33, 1, 0.68, 1)" },
  { name: "Ease In Out Cubic", value: "cubic-bezier(0.65, 0, 0.35, 1)" },
  { name: "Ease In Expo", value: "cubic-bezier(0.7, 0, 0.84, 0)" },
  { name: "Ease Out Expo", value: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { name: "Ease In Out Expo", value: "cubic-bezier(0.87, 0, 0.13, 1)" },
  { name: "Ease In Back", value: "cubic-bezier(0.36, 0, 0.66, -0.56)" },
  { name: "Ease Out Back", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { name: "Ease In Out Back", value: "cubic-bezier(0.68, -0.6, 0.32, 1.6)" },
  { name: "Spring", value: "cubic-bezier(0.5, 1.5, 0.5, 1)" },
  { name: "Bounce", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
]

// Common animatable properties
export const animatableProperties = [
  { group: "Transform", properties: ["transform", "rotate", "scale", "translateX", "translateY"] },
  { group: "Opacity", properties: ["opacity"] },
  { group: "Colors", properties: ["color", "background-color", "border-color"] },
  { group: "Size", properties: ["width", "height", "max-width", "max-height"] },
  { group: "Spacing", properties: ["padding", "margin", "gap"] },
  { group: "Border", properties: ["border-width", "border-radius"] },
  { group: "Shadow", properties: ["box-shadow", "text-shadow"] },
  { group: "Filter", properties: ["filter", "backdrop-filter"] },
  { group: "Clip", properties: ["clip-path"] },
]

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Context for animation timeline
interface AnimationTimelineContextType {
  animation: AnimationDefinition | null
  currentTime: number
  isPlaying: boolean
  selectedTrackId: string | null
  selectedKeyframeId: string | null
  setAnimation: (animation: AnimationDefinition | null) => void
  setCurrentTime: (time: number) => void
  play: () => void
  pause: () => void
  reset: () => void
  selectTrack: (trackId: string | null) => void
  selectKeyframe: (keyframeId: string | null) => void
  addTrack: (property: string) => void
  removeTrack: (trackId: string) => void
  addKeyframe: (trackId: string, offset: number) => void
  updateKeyframe: (trackId: string, keyframeId: string, updates: Partial<Keyframe>) => void
  removeKeyframe: (trackId: string, keyframeId: string) => void
  updateAnimation: (updates: Partial<AnimationDefinition>) => void
}

const AnimationTimelineContext = React.createContext<AnimationTimelineContextType | null>(null)

export function useAnimationTimeline() {
  const context = React.useContext(AnimationTimelineContext)
  if (!context) {
    throw new Error("useAnimationTimeline must be used within AnimationTimelineProvider")
  }
  return context
}

// Provider component
interface AnimationTimelineProviderProps {
  children: React.ReactNode
  element?: HTMLElement | null
  onAnimationChange?: (animation: AnimationDefinition) => void
}

export function AnimationTimelineProvider({
  children,
  element,
  onAnimationChange,
}: AnimationTimelineProviderProps) {
  const [animation, setAnimationState] = useState<AnimationDefinition | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null)

  const animationRef = useRef<Animation | null>(null)
  const playbackRef = useRef<number | null>(null)

  // Create default animation
  const createDefaultAnimation = useCallback((): AnimationDefinition => ({
    id: generateId(),
    name: "New Animation",
    duration: 1000,
    delay: 0,
    iterations: 1,
    direction: "normal",
    fillMode: "forwards",
    timingFunction: "ease",
    tracks: [],
  }), [])

  const setAnimation = useCallback((anim: AnimationDefinition | null) => {
    setAnimationState(anim)
    if (anim && onAnimationChange) {
      onAnimationChange(anim)
    }
  }, [onAnimationChange])

  // Playback controls
  const play = useCallback(() => {
    if (!animation) return
    setIsPlaying(true)

    const startTime = performance.now() - currentTime
    const animate = (time: number) => {
      const elapsed = time - startTime
      const progress = elapsed % animation.duration

      setCurrentTime(progress)

      if (animation.iterations !== "infinite") {
        const completedIterations = Math.floor(elapsed / animation.duration)
        if (completedIterations >= animation.iterations) {
          setIsPlaying(false)
          setCurrentTime(animation.duration)
          return
        }
      }

      playbackRef.current = requestAnimationFrame(animate)
    }

    playbackRef.current = requestAnimationFrame(animate)
  }, [animation, currentTime])

  const pause = useCallback(() => {
    setIsPlaying(false)
    if (playbackRef.current) {
      cancelAnimationFrame(playbackRef.current)
    }
  }, [])

  const reset = useCallback(() => {
    pause()
    setCurrentTime(0)
  }, [pause])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current)
      }
    }
  }, [])

  // Track management
  const addTrack = useCallback((property: string) => {
    if (!animation) {
      const newAnimation = createDefaultAnimation()
      newAnimation.tracks = [{
        id: generateId(),
        property,
        keyframes: [
          { id: generateId(), offset: 0, properties: { [property]: "" } },
          { id: generateId(), offset: 100, properties: { [property]: "" } },
        ],
        expanded: true,
      }]
      setAnimation(newAnimation)
    } else {
      setAnimation({
        ...animation,
        tracks: [
          ...animation.tracks,
          {
            id: generateId(),
            property,
            keyframes: [
              { id: generateId(), offset: 0, properties: { [property]: "" } },
              { id: generateId(), offset: 100, properties: { [property]: "" } },
            ],
            expanded: true,
          },
        ],
      })
    }
  }, [animation, setAnimation, createDefaultAnimation])

  const removeTrack = useCallback((trackId: string) => {
    if (!animation) return
    setAnimation({
      ...animation,
      tracks: animation.tracks.filter((t) => t.id !== trackId),
    })
  }, [animation, setAnimation])

  // Keyframe management
  const addKeyframe = useCallback((trackId: string, offset: number) => {
    if (!animation) return

    setAnimation({
      ...animation,
      tracks: animation.tracks.map((track) => {
        if (track.id !== trackId) return track
        return {
          ...track,
          keyframes: [
            ...track.keyframes,
            { id: generateId(), offset, properties: { [track.property]: "" } },
          ].sort((a, b) => a.offset - b.offset),
        }
      }),
    })
  }, [animation, setAnimation])

  const updateKeyframe = useCallback((
    trackId: string,
    keyframeId: string,
    updates: Partial<Keyframe>
  ) => {
    if (!animation) return

    setAnimation({
      ...animation,
      tracks: animation.tracks.map((track) => {
        if (track.id !== trackId) return track
        return {
          ...track,
          keyframes: track.keyframes
            .map((kf) => kf.id === keyframeId ? { ...kf, ...updates } : kf)
            .sort((a, b) => a.offset - b.offset),
        }
      }),
    })
  }, [animation, setAnimation])

  const removeKeyframe = useCallback((trackId: string, keyframeId: string) => {
    if (!animation) return

    setAnimation({
      ...animation,
      tracks: animation.tracks.map((track) => {
        if (track.id !== trackId) return track
        return {
          ...track,
          keyframes: track.keyframes.filter((kf) => kf.id !== keyframeId),
        }
      }),
    })
  }, [animation, setAnimation])

  const updateAnimation = useCallback((updates: Partial<AnimationDefinition>) => {
    if (!animation) return
    setAnimation({ ...animation, ...updates })
  }, [animation, setAnimation])

  return (
    <AnimationTimelineContext.Provider
      value={{
        animation,
        currentTime,
        isPlaying,
        selectedTrackId,
        selectedKeyframeId,
        setAnimation,
        setCurrentTime,
        play,
        pause,
        reset,
        selectTrack: setSelectedTrackId,
        selectKeyframe: setSelectedKeyframeId,
        addTrack,
        removeTrack,
        addKeyframe,
        updateKeyframe,
        removeKeyframe,
        updateAnimation,
      }}
    >
      {children}
    </AnimationTimelineContext.Provider>
  )
}

// Timeline ruler component
function TimelineRuler({ duration }: { duration: number }) {
  const markers = useMemo(() => {
    const count = Math.min(10, Math.ceil(duration / 100))
    return Array.from({ length: count + 1 }, (_, i) => ({
      position: (i / count) * 100,
      time: Math.round((i / count) * duration),
    }))
  }, [duration])

  return (
    <div className="relative h-6 border-b bg-muted/30">
      {markers.map((marker) => (
        <div
          key={marker.position}
          className="absolute top-0 h-full flex flex-col items-center"
          style={{ left: `${marker.position}%` }}
        >
          <div className="h-2 w-px bg-border" />
          <span className="text-[10px] text-muted-foreground">{marker.time}ms</span>
        </div>
      ))}
    </div>
  )
}

// Playhead component
function Playhead({ position }: { position: number }) {
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
      style={{ left: `${position}%` }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45" />
    </div>
  )
}

// Keyframe marker component
interface KeyframeMarkerProps {
  keyframe: Keyframe
  isSelected: boolean
  onSelect: () => void
  onMove: (offset: number) => void
}

function KeyframeMarker({ keyframe, isSelected, onSelect, onMove }: KeyframeMarkerProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
    setIsDragging(true)
  }, [onSelect])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const track = document.querySelector("[data-timeline-track]")
      if (!track) return

      const rect = track.getBoundingClientRect()
      const offset = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      onMove(Math.round(offset))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, onMove])

  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-sm cursor-pointer transition-all",
        "border-2 border-primary",
        isSelected ? "bg-primary scale-125" : "bg-background hover:bg-primary/20"
      )}
      style={{ left: `${keyframe.offset}%` }}
      onMouseDown={handleMouseDown}
    />
  )
}

// Track row component
interface TrackRowProps {
  track: AnimationTrack
}

function TrackRow({ track }: TrackRowProps) {
  const {
    animation,
    selectedTrackId,
    selectedKeyframeId,
    selectTrack,
    selectKeyframe,
    updateKeyframe,
    removeKeyframe,
    addKeyframe,
    removeTrack,
    updateAnimation,
  } = useAnimationTimeline()

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const offset = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    addKeyframe(track.id, offset)
  }, [track.id, addKeyframe])

  const toggleExpanded = useCallback(() => {
    if (!animation) return
    updateAnimation({
      tracks: animation.tracks.map((t) =>
        t.id === track.id ? { ...t, expanded: !t.expanded } : t
      ),
    })
  }, [animation, track.id, updateAnimation])

  return (
    <div className={cn("border-b", selectedTrackId === track.id && "bg-primary/5")}>
      {/* Track header */}
      <div className="flex items-center gap-2 px-2 py-1 bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={toggleExpanded}
        >
          {track.expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <span className="text-sm font-medium flex-1">{track.property}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => removeTrack(track.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Track timeline */}
      <div
        className="relative h-8 bg-muted/10 cursor-crosshair"
        data-timeline-track
        onClick={handleTrackClick}
      >
        {/* Track background with gradient */}
        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-primary/20 via-transparent to-primary/20" />

        {/* Keyframes */}
        {track.keyframes.map((keyframe) => (
          <KeyframeMarker
            key={keyframe.id}
            keyframe={keyframe}
            isSelected={selectedKeyframeId === keyframe.id}
            onSelect={() => {
              selectTrack(track.id)
              selectKeyframe(keyframe.id)
            }}
            onMove={(offset) => updateKeyframe(track.id, keyframe.id, { offset })}
          />
        ))}
      </div>

      {/* Expanded keyframe details */}
      {track.expanded && selectedTrackId === track.id && selectedKeyframeId && (
        <KeyframeEditor
          track={track}
          keyframeId={selectedKeyframeId}
        />
      )}
    </div>
  )
}

// Keyframe editor component
interface KeyframeEditorProps {
  track: AnimationTrack
  keyframeId: string
}

function KeyframeEditor({ track, keyframeId }: KeyframeEditorProps) {
  const { updateKeyframe, removeKeyframe } = useAnimationTimeline()

  const keyframe = track.keyframes.find((kf) => kf.id === keyframeId)
  if (!keyframe) return null

  const value = keyframe.properties[track.property] || ""

  return (
    <div className="flex items-center gap-2 px-2 py-2 bg-muted/20 border-t">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground w-12">
          {keyframe.offset}%
        </span>
      </div>
      <Input
        value={value}
        onChange={(e) =>
          updateKeyframe(track.id, keyframeId, {
            properties: { [track.property]: e.target.value },
          })
        }
        placeholder={`${track.property} value`}
        className="h-7 text-xs flex-1"
      />
      <Select
        value={keyframe.easing || "ease"}
        onValueChange={(easing) => updateKeyframe(track.id, keyframeId, { easing })}
      >
        <SelectTrigger className="w-28 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {easingPresets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value} className="text-xs">
              {preset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-destructive"
        onClick={() => removeKeyframe(track.id, keyframeId)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

// Main timeline player component
interface AnimationTimelinePlayerProps {
  element?: HTMLElement | null
  onExport?: (css: string) => void
  className?: string
}

export function AnimationTimelinePlayer({
  element,
  onExport,
  className,
}: AnimationTimelinePlayerProps) {
  const {
    animation,
    currentTime,
    isPlaying,
    play,
    pause,
    reset,
    addTrack,
    updateAnimation,
    setAnimation,
  } = useAnimationTimeline()

  const [showPropertyPicker, setShowPropertyPicker] = useState(false)

  const playheadPosition = animation
    ? (currentTime / animation.duration) * 100
    : 0

  // Generate CSS keyframes
  const generateCSS = useCallback(() => {
    if (!animation || animation.tracks.length === 0) return ""

    const keyframesByOffset: Record<number, Record<string, string>> = {}

    animation.tracks.forEach((track) => {
      track.keyframes.forEach((kf) => {
        if (!keyframesByOffset[kf.offset]) {
          keyframesByOffset[kf.offset] = {}
        }
        const value = kf.properties[track.property]
        if (value) {
          keyframesByOffset[kf.offset][track.property] = value
        }
      })
    })

    const sortedOffsets = Object.keys(keyframesByOffset)
      .map(Number)
      .sort((a, b) => a - b)

    const keyframeRules = sortedOffsets
      .map((offset) => {
        const props = Object.entries(keyframesByOffset[offset])
          .map(([prop, val]) => `  ${prop}: ${val};`)
          .join("\n")
        return `  ${offset}% {\n${props}\n  }`
      })
      .join("\n")

    const animationCSS = `@keyframes ${animation.name.replace(/\s+/g, "-").toLowerCase()} {
${keyframeRules}
}

.animated-element {
  animation: ${animation.name.replace(/\s+/g, "-").toLowerCase()} ${animation.duration}ms ${animation.timingFunction} ${animation.delay}ms ${animation.iterations === "infinite" ? "infinite" : animation.iterations} ${animation.direction} ${animation.fillMode};
}`

    return animationCSS
  }, [animation])

  const handleExport = useCallback(() => {
    const css = generateCSS()
    if (onExport) {
      onExport(css)
    } else {
      navigator.clipboard.writeText(css)
    }
  }, [generateCSS, onExport])

  // Create new animation if none exists
  const handleCreateAnimation = useCallback(() => {
    setAnimation({
      id: generateId(),
      name: "New Animation",
      duration: 1000,
      delay: 0,
      iterations: 1,
      direction: "normal",
      fillMode: "forwards",
      timingFunction: "ease",
      tracks: [],
    })
  }, [setAnimation])

  if (!animation) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20", className)}>
        <Layers className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">No Animation</h3>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Create an animation to start editing keyframes
        </p>
        <Button onClick={handleCreateAnimation}>
          <Plus className="h-4 w-4 mr-2" />
          Create Animation
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col border rounded-lg bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Input
            value={animation.name}
            onChange={(e) => updateAnimation({ name: e.target.value })}
            className="h-8 w-40 font-medium"
          />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <Input
              type="number"
              value={animation.duration}
              onChange={(e) => updateAnimation({ duration: parseInt(e.target.value) || 1000 })}
              className="h-7 w-20 text-xs"
              min={100}
              step={100}
            />
            <span>ms</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Copy className="h-4 w-4 mr-1" />
            Export CSS
          </Button>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={reset}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant={isPlaying ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={isPlaying ? pause : play}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Slider
          value={[currentTime]}
          max={animation.duration}
          step={10}
          className="flex-1"
          onValueChange={([value]) => {
            if (!isPlaying) {
              // Direct import would be needed here
            }
          }}
        />
        <span className="text-xs text-muted-foreground w-16 text-right">
          {Math.round(currentTime)}ms
        </span>
      </div>

      {/* Animation settings */}
      <div className="flex items-center gap-3 p-2 border-b text-xs">
        <Select
          value={animation.timingFunction}
          onValueChange={(value) => updateAnimation({ timingFunction: value })}
        >
          <SelectTrigger className="h-7 w-32">
            <Zap className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {easingPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(animation.iterations)}
          onValueChange={(value) =>
            updateAnimation({ iterations: value === "infinite" ? "infinite" : parseInt(value) })
          }
        >
          <SelectTrigger className="h-7 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1×</SelectItem>
            <SelectItem value="2">2×</SelectItem>
            <SelectItem value="3">3×</SelectItem>
            <SelectItem value="infinite">∞</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={animation.direction}
          onValueChange={(value: AnimationDefinition["direction"]) =>
            updateAnimation({ direction: value })
          }
        >
          <SelectTrigger className="h-7 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="reverse">Reverse</SelectItem>
            <SelectItem value="alternate">Alternate</SelectItem>
            <SelectItem value="alternate-reverse">Alt Reverse</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={animation.fillMode}
          onValueChange={(value: AnimationDefinition["fillMode"]) =>
            updateAnimation({ fillMode: value })
          }
        >
          <SelectTrigger className="h-7 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="forwards">Forwards</SelectItem>
            <SelectItem value="backwards">Backwards</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[300px]">
          {/* Ruler */}
          <div className="sticky top-0 z-10 bg-card">
            <div className="relative">
              <TimelineRuler duration={animation.duration} />
              <Playhead position={playheadPosition} />
            </div>
          </div>

          {/* Tracks */}
          <div className="relative">
            <Playhead position={playheadPosition} />

            {animation.tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Layers className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No animation tracks</p>
                <p className="text-xs">Add a property to animate</p>
              </div>
            ) : (
              animation.tracks.map((track) => (
                <TrackRow key={track.id} track={track} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Add track button */}
      <div className="p-2 border-t">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowPropertyPicker(!showPropertyPicker)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>

          {showPropertyPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-card border rounded-lg shadow-lg max-h-60 overflow-auto">
              {animatableProperties.map((group) => (
                <div key={group.group} className="mb-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {group.group}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.properties.map((prop) => (
                      <Button
                        key={prop}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          addTrack(prop)
                          setShowPropertyPicker(false)
                        }}
                      >
                        {prop}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
