"use client"

import * as React from "react"
import { useState, useCallback, useEffect, createContext, useContext } from "react"
import { X, ChevronRight, ChevronLeft, Check, Lightbulb } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"

// Tutorial step definition
export interface TutorialStep {
  id: string
  title: string
  content: string | React.ReactNode
  target?: string // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: 'click' | 'hover' | 'input' | 'none'
  nextOnAction?: boolean // Auto-advance when action is performed
  skippable?: boolean
  beforeEnter?: () => void | Promise<void>
  afterLeave?: () => void | Promise<void>
}

// Tutorial definition
export interface Tutorial {
  id: string
  name: string
  description: string
  steps: TutorialStep[]
  onComplete?: () => void
}

// Tutorial state
interface TutorialState {
  activeTutorial: Tutorial | null
  currentStepIndex: number
  isPlaying: boolean
  completedTutorials: Set<string>
}

// Tutorial context
interface TutorialContextType {
  state: TutorialState
  startTutorial: (tutorial: Tutorial) => void
  stopTutorial: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  markCompleted: (tutorialId: string) => void
  isCompleted: (tutorialId: string) => boolean
}

const TutorialContext = createContext<TutorialContextType | null>(null)

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider")
  }
  return context
}

// Tutorial provider
export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TutorialState>({
    activeTutorial: null,
    currentStepIndex: 0,
    isPlaying: false,
    completedTutorials: new Set(),
  })

  // Load completed tutorials from localStorage
  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem('lumos-completed-tutorials')
    if (saved) {
      try {
        const ids = JSON.parse(saved)
        setState(s => ({ ...s, completedTutorials: new Set(ids) }))
      } catch {
        // Ignore
      }
    }
  }, [])

  // Save completed tutorials to localStorage
  const saveCompleted = useCallback((ids: Set<string>) => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem('lumos-completed-tutorials', JSON.stringify(Array.from(ids)))
  }, [])

  const startTutorial = useCallback((tutorial: Tutorial) => {
    setState(s => ({
      ...s,
      activeTutorial: tutorial,
      currentStepIndex: 0,
      isPlaying: true,
    }))

    // Execute beforeEnter for first step
    if (tutorial.steps[0]?.beforeEnter) {
      tutorial.steps[0].beforeEnter()
    }
  }, [])

  const stopTutorial = useCallback(() => {
    const { activeTutorial, currentStepIndex } = state

    // Execute afterLeave for current step
    if (activeTutorial?.steps[currentStepIndex]?.afterLeave) {
      activeTutorial.steps[currentStepIndex].afterLeave()
    }

    setState(s => ({
      ...s,
      activeTutorial: null,
      currentStepIndex: 0,
      isPlaying: false,
    }))
  }, [state])

  const nextStep = useCallback(async () => {
    const { activeTutorial, currentStepIndex } = state
    if (!activeTutorial) return

    const currentStep = activeTutorial.steps[currentStepIndex]
    const nextIndex = currentStepIndex + 1

    // Execute afterLeave for current step
    if (currentStep?.afterLeave) {
      await currentStep.afterLeave()
    }

    if (nextIndex >= activeTutorial.steps.length) {
      // Tutorial complete
      const newCompleted = new Set(state.completedTutorials)
      newCompleted.add(activeTutorial.id)
      saveCompleted(newCompleted)

      setState(s => ({
        ...s,
        completedTutorials: newCompleted,
        activeTutorial: null,
        currentStepIndex: 0,
        isPlaying: false,
      }))

      if (activeTutorial.onComplete) {
        activeTutorial.onComplete()
      }
    } else {
      // Execute beforeEnter for next step
      const nextStep = activeTutorial.steps[nextIndex]
      if (nextStep?.beforeEnter) {
        await nextStep.beforeEnter()
      }

      setState(s => ({
        ...s,
        currentStepIndex: nextIndex,
      }))
    }
  }, [state, saveCompleted])

  const prevStep = useCallback(async () => {
    const { activeTutorial, currentStepIndex } = state
    if (!activeTutorial || currentStepIndex <= 0) return

    const currentStep = activeTutorial.steps[currentStepIndex]
    const prevIndex = currentStepIndex - 1

    // Execute afterLeave for current step
    if (currentStep?.afterLeave) {
      await currentStep.afterLeave()
    }

    // Execute beforeEnter for previous step
    const prevStepDef = activeTutorial.steps[prevIndex]
    if (prevStepDef?.beforeEnter) {
      await prevStepDef.beforeEnter()
    }

    setState(s => ({
      ...s,
      currentStepIndex: prevIndex,
    }))
  }, [state])

  const goToStep = useCallback(async (index: number) => {
    const { activeTutorial, currentStepIndex } = state
    if (!activeTutorial || index < 0 || index >= activeTutorial.steps.length) return

    const currentStep = activeTutorial.steps[currentStepIndex]
    if (currentStep?.afterLeave) {
      await currentStep.afterLeave()
    }

    const targetStep = activeTutorial.steps[index]
    if (targetStep?.beforeEnter) {
      await targetStep.beforeEnter()
    }

    setState(s => ({
      ...s,
      currentStepIndex: index,
    }))
  }, [state])

  const markCompleted = useCallback((tutorialId: string) => {
    const newCompleted = new Set(state.completedTutorials)
    newCompleted.add(tutorialId)
    saveCompleted(newCompleted)
    setState(s => ({ ...s, completedTutorials: newCompleted }))
  }, [state.completedTutorials, saveCompleted])

  const isCompleted = useCallback((tutorialId: string) => {
    return state.completedTutorials.has(tutorialId)
  }, [state.completedTutorials])

  return (
    <TutorialContext.Provider value={{
      state,
      startTutorial,
      stopTutorial,
      nextStep,
      prevStep,
      goToStep,
      markCompleted,
      isCompleted,
    }}>
      {children}
      {state.isPlaying && state.activeTutorial && (
        <TutorialOverlay />
      )}
    </TutorialContext.Provider>
  )
}

// Tutorial overlay component
function TutorialOverlay() {
  const { state, nextStep, prevStep, stopTutorial } = useTutorial()
  const { activeTutorial, currentStepIndex } = state

  if (!activeTutorial) return null

  const currentStep = activeTutorial.steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === activeTutorial.steps.length - 1

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[10000]" onClick={stopTutorial} />

      {/* Spotlight on target element */}
      {currentStep.target && <Spotlight selector={currentStep.target} />}

      {/* Tutorial card */}
      <TutorialCard
        step={currentStep}
        stepNumber={currentStepIndex + 1}
        totalSteps={activeTutorial.steps.length}
        tutorialName={activeTutorial.name}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        onNext={nextStep}
        onPrev={prevStep}
        onClose={stopTutorial}
      />

      {/* Step indicators */}
      <StepIndicators
        total={activeTutorial.steps.length}
        current={currentStepIndex}
      />
    </>
  )
}

// Spotlight component to highlight target element
function Spotlight({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const element = document.querySelector(selector)
    if (element) {
      const updateRect = () => {
        setRect(element.getBoundingClientRect())
      }
      updateRect()

      // Update on resize
      window.addEventListener('resize', updateRect)
      return () => window.removeEventListener('resize', updateRect)
    }
  }, [selector])

  if (!rect) return null

  const padding = 8

  return (
    <div
      className="fixed z-[10001] pointer-events-none"
      style={{
        left: rect.left - padding,
        top: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
      }}
    />
  )
}

// Tutorial card component
interface TutorialCardProps {
  step: TutorialStep
  stepNumber: number
  totalSteps: number
  tutorialName: string
  isFirstStep: boolean
  isLastStep: boolean
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

function TutorialCard({
  step,
  stepNumber,
  totalSteps,
  tutorialName,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onClose,
}: TutorialCardProps) {
  const position = step.position || 'center'

  const positionClasses = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    top: 'top-4 left-1/2 -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2',
    left: 'left-4 top-1/2 -translate-y-1/2',
    right: 'right-4 top-1/2 -translate-y-1/2',
  }

  return (
    <div
      className={cn(
        "fixed z-[10002] w-96 bg-card border rounded-xl shadow-2xl",
        positionClasses[position]
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <span className="font-medium">{tutorialName}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
        <div className="text-sm text-muted-foreground">
          {step.content}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
        <span className="text-xs text-muted-foreground">
          Step {stepNumber} of {totalSteps}
        </span>
        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" size="sm" onClick={onPrev}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Complete
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Step indicators
function StepIndicators({ total, current }: { total: number; current: number }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10002] flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-all",
            i === current
              ? "bg-primary w-6"
              : i < current
              ? "bg-primary/50"
              : "bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  )
}

// Predefined tutorials
export const gettingStartedTutorial: Tutorial = {
  id: 'getting-started',
  name: 'Getting Started',
  description: 'Learn the basics of using Lumos Inspector',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Lumos Inspector!',
      content: (
        <div className="space-y-2">
          <p>Lumos Inspector is a powerful visual development tool that helps you inspect and edit your UI in real-time.</p>
          <p>Let's take a quick tour of the main features.</p>
        </div>
      ),
      position: 'center',
    },
    {
      id: 'inspector-panel',
      title: 'The Inspector Panel',
      content: 'This is the main inspector panel where you can edit styles, view computed values, and access various tools.',
      target: '[data-devtools]',
      position: 'left',
    },
    {
      id: 'element-selection',
      title: 'Selecting Elements',
      content: 'Click on any element in your page to select it. The inspector will show its properties and let you edit them.',
      position: 'center',
    },
    {
      id: 'class-editing',
      title: 'Editing Classes',
      content: 'Click on a class name to edit styles for all elements with that class. Changes are applied globally in real-time.',
      position: 'center',
    },
    {
      id: 'breakpoints',
      title: 'Responsive Preview',
      content: 'Use the breakpoint selector to preview your design at different screen sizes.',
      position: 'center',
    },
    {
      id: 'tools',
      title: 'Explore Tools',
      content: (
        <div className="space-y-2">
          <p>Lumos Inspector includes 80+ tools for:</p>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li>Layout editing (Flexbox, Grid)</li>
            <li>Visual effects (Shadows, Gradients, Filters)</li>
            <li>Typography controls</li>
            <li>Accessibility checking</li>
            <li>And much more!</li>
          </ul>
          <p>Use the Find tab or press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> to search.</p>
        </div>
      ),
      position: 'center',
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      content: (
        <div className="space-y-2">
          <p>Speed up your workflow with keyboard shortcuts:</p>
          <ul className="text-xs space-y-1">
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Shift+D</kbd> Toggle inspector</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> Deselect element</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+C/V</kbd> Copy/paste styles</li>
            <li><kbd className="px-1 py-0.5 bg-muted rounded">Arrow keys</kbd> Nudge element</li>
          </ul>
        </div>
      ),
      position: 'center',
    },
    {
      id: 'complete',
      title: 'You\'re Ready!',
      content: (
        <div className="space-y-2">
          <p>You now know the basics of Lumos Inspector.</p>
          <p>Start experimenting by selecting elements and editing their styles. Your changes are temporary and won't affect your source code.</p>
          <p className="text-xs text-muted-foreground">Use the Code tab to export your changes when you're ready.</p>
        </div>
      ),
      position: 'center',
    },
  ],
  onComplete: () => {
    console.log('[Tutorial] Getting Started tutorial completed!')
  },
}

// Export CSS tutorial
export const cssExportTutorial: Tutorial = {
  id: 'css-export',
  name: 'Exporting Styles',
  description: 'Learn how to export your style changes',
  steps: [
    {
      id: 'intro',
      title: 'Exporting Your Changes',
      content: 'After making style changes, you can export them in various formats to use in your project.',
      position: 'center',
    },
    {
      id: 'code-tab',
      title: 'The Code Tab',
      content: 'Switch to the Code tab to see your global CSS changes and export options.',
      position: 'center',
    },
    {
      id: 'formats',
      title: 'Export Formats',
      content: (
        <div className="space-y-2">
          <p>You can export styles as:</p>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li><strong>CSS</strong> - Standard CSS rules</li>
            <li><strong>JSON</strong> - Structured style data</li>
            <li><strong>Tailwind</strong> - Tailwind config extend</li>
            <li><strong>Design Tokens</strong> - Token-based format</li>
          </ul>
        </div>
      ),
      position: 'center',
    },
  ],
}
