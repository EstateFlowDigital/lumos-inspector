"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  ChevronDown, Play, Pause, RotateCcw, FastForward, Rewind
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Slider } from "../ui/slider"
import { ScrollArea } from "../ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface AnimationInfo {
  name: string
  duration: string
  delay: string
  iterationCount: string
  direction: string
  fillMode: string
  playState: string
  timingFunction: string
}

interface TransitionInfo {
  property: string
  duration: string
  delay: string
  timingFunction: string
}

export function AnimationTimeline() {
  const { isOpen, selectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [animations, setAnimations] = useState<AnimationInfo[]>([])
  const [transitions, setTransitions] = useState<TransitionInfo[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const animationRef = useRef<Animation[]>([])

  // Parse animations from element
  useEffect(() => {
    if (!selectedElement?.element) {
      setAnimations([])
      setTransitions([])
      return
    }

    const computed = getComputedStyle(selectedElement.element)

    // Parse animations
    const animationNames = computed.animationName?.split(",").map(s => s.trim()) || []
    const animationDurations = computed.animationDuration?.split(",").map(s => s.trim()) || []
    const animationDelays = computed.animationDelay?.split(",").map(s => s.trim()) || []
    const animationIterations = computed.animationIterationCount?.split(",").map(s => s.trim()) || []
    const animationDirections = computed.animationDirection?.split(",").map(s => s.trim()) || []
    const animationFillModes = computed.animationFillMode?.split(",").map(s => s.trim()) || []
    const animationPlayStates = computed.animationPlayState?.split(",").map(s => s.trim()) || []
    const animationTimings = computed.animationTimingFunction?.split(",").map(s => s.trim()) || []

    const parsedAnimations: AnimationInfo[] = animationNames
      .filter(name => name !== "none")
      .map((name, i) => ({
        name,
        duration: animationDurations[i] || animationDurations[0] || "0s",
        delay: animationDelays[i] || animationDelays[0] || "0s",
        iterationCount: animationIterations[i] || animationIterations[0] || "1",
        direction: animationDirections[i] || animationDirections[0] || "normal",
        fillMode: animationFillModes[i] || animationFillModes[0] || "none",
        playState: animationPlayStates[i] || animationPlayStates[0] || "running",
        timingFunction: animationTimings[i] || animationTimings[0] || "ease",
      }))

    setAnimations(parsedAnimations)

    // Parse transitions
    const transitionProps = computed.transitionProperty?.split(",").map(s => s.trim()) || []
    const transitionDurations = computed.transitionDuration?.split(",").map(s => s.trim()) || []
    const transitionDelays = computed.transitionDelay?.split(",").map(s => s.trim()) || []
    const transitionTimings = computed.transitionTimingFunction?.split(",").map(s => s.trim()) || []

    const parsedTransitions: TransitionInfo[] = transitionProps
      .filter(prop => prop !== "none" && prop !== "all" || transitionDurations.some(d => d !== "0s"))
      .map((property, i) => ({
        property,
        duration: transitionDurations[i] || transitionDurations[0] || "0s",
        delay: transitionDelays[i] || transitionDelays[0] || "0s",
        timingFunction: transitionTimings[i] || transitionTimings[0] || "ease",
      }))

    setTransitions(parsedTransitions)

    // Get Web Animations API animations
    const webAnimations = selectedElement.element.getAnimations?.() || []
    animationRef.current = webAnimations

    // Sync pause state
    if (webAnimations.length > 0) {
      setIsPaused(webAnimations[0].playState === "paused")
    }
  }, [selectedElement])

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!selectedElement?.element) return

    const animations = selectedElement.element.getAnimations?.() || []

    animations.forEach(anim => {
      if (anim.playState === "paused") {
        anim.play()
      } else {
        anim.pause()
      }
    })

    setIsPaused(!isPaused)
    toast.success(isPaused ? "Animation resumed" : "Animation paused")
  }, [selectedElement, isPaused])

  // Restart animations
  const restartAnimations = useCallback(() => {
    if (!selectedElement?.element) return

    const animations = selectedElement.element.getAnimations?.() || []

    animations.forEach(anim => {
      anim.currentTime = 0
      anim.play()
    })

    setIsPaused(false)
    setCurrentTime(0)
    toast.success("Animation restarted")
  }, [selectedElement])

  // Set playback rate
  const updatePlaybackRate = useCallback((rate: number) => {
    if (!selectedElement?.element) return

    const animations = selectedElement.element.getAnimations?.() || []

    animations.forEach(anim => {
      anim.playbackRate = rate
    })

    setPlaybackRate(rate)
  }, [selectedElement])

  // Format duration
  const formatDuration = (duration: string): string => {
    const ms = parseFloat(duration)
    if (duration.includes("ms")) return `${ms}ms`
    return `${ms * 1000}ms`
  }

  // Get total duration
  const totalDuration = animations.reduce((max, anim) => {
    const dur = parseFloat(anim.duration) * (anim.duration.includes("ms") ? 1 : 1000)
    const delay = parseFloat(anim.delay) * (anim.delay.includes("ms") ? 1 : 1000)
    return Math.max(max, dur + delay)
  }, 0)

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-[--accent-green]" />
          <span>Animation Timeline</span>
          {animations.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {animations.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={restartAnimations}
            disabled={animations.length === 0}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant={isPaused ? "default" : "outline"}
            size="sm"
            className="flex-1 h-7"
            onClick={togglePlayPause}
            disabled={animations.length === 0}
          >
            {isPaused ? (
              <>
                <Play className="h-3 w-3 mr-1" />
                Play
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </>
            )}
          </Button>
        </div>

        {/* Playback rate */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => updatePlaybackRate(Math.max(0.25, playbackRate - 0.25))}
          >
            <Rewind className="h-3 w-3" />
          </Button>
          <div className="flex-1 text-center text-xs font-mono">
            {playbackRate}x
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => updatePlaybackRate(Math.min(4, playbackRate + 0.25))}
          >
            <FastForward className="h-3 w-3" />
          </Button>
        </div>

        {/* Quick rate buttons */}
        <div className="flex gap-1 justify-center">
          {[0.25, 0.5, 1, 2, 4].map(rate => (
            <Button
              key={rate}
              variant={playbackRate === rate ? "default" : "outline"}
              size="sm"
              className="h-6 text-[9px] px-2"
              onClick={() => updatePlaybackRate(rate)}
            >
              {rate}x
            </Button>
          ))}
        </div>

        {/* Animations list */}
        <ScrollArea className="h-[180px]">
          <div className="space-y-2">
            {animations.length === 0 && transitions.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {selectedElement
                  ? "No animations or transitions on this element"
                  : "Select an element to view animations"}
              </div>
            ) : (
              <>
                {/* Animations */}
                {animations.map((anim, i) => (
                  <div key={i} className="p-2 bg-card border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="text-[9px] h-4 px-1 bg-[--accent-green]">
                        @keyframes
                      </Badge>
                      <span className="text-xs font-mono">{anim.name}</span>
                    </div>

                    {/* Timeline bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-[--accent-green] rounded-full animate-pulse"
                        style={{
                          width: isPaused ? "50%" : "100%",
                          animationDuration: anim.duration,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9px] text-muted-foreground">
                      <span>Duration: {anim.duration}</span>
                      <span>Delay: {anim.delay}</span>
                      <span>Iterations: {anim.iterationCount}</span>
                      <span>Direction: {anim.direction}</span>
                    </div>
                  </div>
                ))}

                {/* Transitions */}
                {transitions.map((trans, i) => (
                  <div key={`t-${i}`} className="p-2 bg-card border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="text-[9px] h-4 px-1 bg-[--accent-blue]">
                        transition
                      </Badge>
                      <span className="text-xs font-mono">{trans.property}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9px] text-muted-foreground">
                      <span>Duration: {trans.duration}</span>
                      <span>Delay: {trans.delay}</span>
                      <span className="col-span-2">Timing: {trans.timingFunction}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Total duration */}
        {totalDuration > 0 && (
          <div className="text-center text-[10px] text-muted-foreground">
            Total duration: {totalDuration}ms
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
