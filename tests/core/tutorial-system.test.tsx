import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import {
  TutorialProvider,
  useTutorial,
  Tutorial,
  TutorialStep,
  gettingStartedTutorial,
  cssExportTutorial,
} from "../../core/tutorial-system"
import * as React from "react"

// Test component to interact with tutorial context
function TestConsumer() {
  const {
    state,
    startTutorial,
    stopTutorial,
    nextStep,
    prevStep,
    goToStep,
    markCompleted,
    isCompleted,
  } = useTutorial()

  return (
    <div>
      <span data-testid="is-playing">{state.isPlaying ? "playing" : "stopped"}</span>
      <span data-testid="current-step">{state.currentStepIndex}</span>
      <span data-testid="tutorial-name">{state.activeTutorial?.name || "none"}</span>
      <button onClick={() => startTutorial(testTutorial)}>Start Tutorial</button>
      <button onClick={stopTutorial}>Stop</button>
      <button onClick={nextStep}>Next</button>
      <button onClick={prevStep}>Prev</button>
      <button onClick={() => goToStep(2)}>Go to step 2</button>
      <button onClick={() => markCompleted("test-tutorial")}>Mark Complete</button>
      <span data-testid="is-completed">
        {isCompleted("test-tutorial") ? "completed" : "not-completed"}
      </span>
    </div>
  )
}

const testTutorial: Tutorial = {
  id: "test-tutorial",
  name: "Test Tutorial",
  description: "A test tutorial",
  steps: [
    {
      id: "step1",
      title: "Step 1",
      content: "First step content",
      position: "center",
    },
    {
      id: "step2",
      title: "Step 2",
      content: "Second step content",
      position: "center",
    },
    {
      id: "step3",
      title: "Step 3",
      content: "Third step content",
      position: "center",
    },
  ],
  onComplete: vi.fn(),
}

describe("TutorialProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("should render children", () => {
    render(
      <TutorialProvider>
        <div data-testid="child">Child content</div>
      </TutorialProvider>
    )

    expect(screen.getByTestId("child")).toBeInTheDocument()
  })

  it("should provide initial state", () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    expect(screen.getByTestId("is-playing")).toHaveTextContent("stopped")
    expect(screen.getByTestId("current-step")).toHaveTextContent("0")
    expect(screen.getByTestId("tutorial-name")).toHaveTextContent("none")
  })

  it("should start a tutorial", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    fireEvent.click(screen.getByText("Start Tutorial"))

    await waitFor(() => {
      expect(screen.getByTestId("is-playing")).toHaveTextContent("playing")
      expect(screen.getByTestId("tutorial-name")).toHaveTextContent("Test Tutorial")
      expect(screen.getByTestId("current-step")).toHaveTextContent("0")
    })
  })

  it("should stop a tutorial", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    fireEvent.click(screen.getByText("Start Tutorial"))

    await waitFor(() => {
      expect(screen.getByTestId("is-playing")).toHaveTextContent("playing")
    })

    fireEvent.click(screen.getByText("Stop"))

    await waitFor(() => {
      expect(screen.getByTestId("is-playing")).toHaveTextContent("stopped")
      expect(screen.getByTestId("tutorial-name")).toHaveTextContent("none")
    })
  })

  it("should navigate to next step", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    fireEvent.click(screen.getByText("Start Tutorial"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("0")
    })

    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("1")
    })
  })

  it("should navigate to previous step", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    fireEvent.click(screen.getByText("Start Tutorial"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("0")
    })

    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("1")
    })

    fireEvent.click(screen.getByText("Prev"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("0")
    })
  })

  it("should go to specific step", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    fireEvent.click(screen.getByText("Start Tutorial"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("0")
    })

    fireEvent.click(screen.getByText("Go to step 2"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("2")
    })
  })

  it("should not go past first step when pressing prev", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    fireEvent.click(screen.getByText("Start Tutorial"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("0")
    })

    fireEvent.click(screen.getByText("Prev"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("0")
    })
  })

  it("should complete tutorial when reaching last step and pressing next", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    fireEvent.click(screen.getByText("Start Tutorial"))

    // Go to last step
    fireEvent.click(screen.getByText("Go to step 2"))

    await waitFor(() => {
      expect(screen.getByTestId("current-step")).toHaveTextContent("2")
    })

    // Press next on last step
    fireEvent.click(screen.getByText("Next"))

    await waitFor(() => {
      expect(screen.getByTestId("is-playing")).toHaveTextContent("stopped")
      expect(screen.getByTestId("is-completed")).toHaveTextContent("completed")
    })

    expect(testTutorial.onComplete).toHaveBeenCalled()
  })

  it("should mark tutorial as completed", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    expect(screen.getByTestId("is-completed")).toHaveTextContent("not-completed")

    fireEvent.click(screen.getByText("Mark Complete"))

    await waitFor(() => {
      expect(screen.getByTestId("is-completed")).toHaveTextContent("completed")
    })
  })

  it("should persist completed tutorials to localStorage", async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    fireEvent.click(screen.getByText("Mark Complete"))

    await waitFor(() => {
      const saved = localStorage.getItem("lumos-completed-tutorials")
      expect(saved).toBeDefined()
      const parsed = JSON.parse(saved!)
      expect(parsed).toContain("test-tutorial")
    })
  })

  it("should load completed tutorials from localStorage", async () => {
    localStorage.setItem(
      "lumos-completed-tutorials",
      JSON.stringify(["test-tutorial"])
    )

    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("is-completed")).toHaveTextContent("completed")
    })
  })
})

describe("useTutorial", () => {
  it("should throw error when used outside TutorialProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow("useTutorial must be used within TutorialProvider")

    consoleError.mockRestore()
  })
})

describe("Predefined tutorials", () => {
  it("should have a getting started tutorial", () => {
    expect(gettingStartedTutorial).toBeDefined()
    expect(gettingStartedTutorial.id).toBe("getting-started")
    expect(gettingStartedTutorial.steps.length).toBeGreaterThan(0)
  })

  it("should have a CSS export tutorial", () => {
    expect(cssExportTutorial).toBeDefined()
    expect(cssExportTutorial.id).toBe("css-export")
    expect(cssExportTutorial.steps.length).toBeGreaterThan(0)
  })

  it("should have proper step structure in getting started tutorial", () => {
    gettingStartedTutorial.steps.forEach((step) => {
      expect(step.id).toBeDefined()
      expect(step.title).toBeDefined()
      expect(step.content).toBeDefined()
    })
  })
})
