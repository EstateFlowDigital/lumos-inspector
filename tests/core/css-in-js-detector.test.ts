import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  parseTailwindClass,
  analyzeClassName,
} from "../../core/css-in-js-detector"

describe("CSS-in-JS Detector", () => {
  describe("parseTailwindClass", () => {
    it("should parse spacing utilities", () => {
      expect(parseTailwindClass("p-4")).toEqual({ padding: "1rem" })
      expect(parseTailwindClass("m-2")).toEqual({ margin: "0.5rem" })
      expect(parseTailwindClass("px-4")).toEqual({
        "padding-left": "1rem",
        "padding-right": "1rem",
      })
      expect(parseTailwindClass("py-2")).toEqual({
        "padding-top": "0.5rem",
        "padding-bottom": "0.5rem",
      })
      expect(parseTailwindClass("pt-4")).toEqual({ "padding-top": "1rem" })
      expect(parseTailwindClass("mb-auto")).toEqual({ "margin-bottom": "auto" })
    })

    it("should parse width/height utilities", () => {
      expect(parseTailwindClass("w-full")).toEqual({ width: "100%" })
      expect(parseTailwindClass("h-screen")).toEqual({ height: "100vh" })
      expect(parseTailwindClass("w-1/2")).toEqual({ width: "50%" })
      expect(parseTailwindClass("min-w-0")).toEqual({ "min-width": "0" })
      expect(parseTailwindClass("max-h-full")).toEqual({ "max-height": "100%" })
    })

    it("should parse flexbox utilities", () => {
      expect(parseTailwindClass("flex")).toEqual({ display: "flex" })
      expect(parseTailwindClass("flex-row")).toEqual({ "flex-direction": "row" })
      expect(parseTailwindClass("flex-col")).toEqual({ "flex-direction": "column" })
      expect(parseTailwindClass("flex-wrap")).toEqual({ "flex-wrap": "wrap" })
      expect(parseTailwindClass("flex-1")).toEqual({ flex: "1 1 0%" })
      expect(parseTailwindClass("flex-none")).toEqual({ flex: "none" })
    })

    it("should parse justify and align utilities", () => {
      expect(parseTailwindClass("justify-center")).toEqual({
        "justify-content": "center",
      })
      expect(parseTailwindClass("justify-between")).toEqual({
        "justify-content": "space-between",
      })
      expect(parseTailwindClass("items-center")).toEqual({
        "align-items": "center",
      })
      expect(parseTailwindClass("items-stretch")).toEqual({
        "align-items": "stretch",
      })
    })

    it("should parse gap utilities", () => {
      expect(parseTailwindClass("gap-4")).toEqual({ gap: "1rem" })
      expect(parseTailwindClass("gap-x-2")).toEqual({ "column-gap": "0.5rem" })
      expect(parseTailwindClass("gap-y-1")).toEqual({ "row-gap": "0.25rem" })
    })

    it("should parse grid utilities", () => {
      expect(parseTailwindClass("grid")).toEqual({ display: "grid" })
      expect(parseTailwindClass("grid-cols-3")).toEqual({
        "grid-template-columns": "repeat(3, minmax(0, 1fr))",
      })
      expect(parseTailwindClass("grid-rows-2")).toEqual({
        "grid-template-rows": "repeat(2, minmax(0, 1fr))",
      })
    })

    it("should parse text utilities", () => {
      expect(parseTailwindClass("text-center")).toEqual({
        "text-align": "center",
      })
      expect(parseTailwindClass("text-sm")).toEqual({
        "font-size": "0.875rem",
        "line-height": "1.25rem",
      })
      expect(parseTailwindClass("text-2xl")).toEqual({
        "font-size": "1.5rem",
        "line-height": "2rem",
      })
    })

    it("should parse font utilities", () => {
      expect(parseTailwindClass("font-bold")).toEqual({ "font-weight": "700" })
      expect(parseTailwindClass("font-medium")).toEqual({ "font-weight": "500" })
      expect(parseTailwindClass("font-sans")).toEqual({
        "font-family": 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      })
      expect(parseTailwindClass("italic")).toEqual({ "font-style": "italic" })
    })

    it("should parse color utilities", () => {
      expect(parseTailwindClass("text-white")).toEqual({ color: "#ffffff" })
      expect(parseTailwindClass("text-black")).toEqual({ color: "#000000" })
      expect(parseTailwindClass("bg-white")).toEqual({
        "background-color": "#ffffff",
      })
      expect(parseTailwindClass("bg-transparent")).toEqual({
        "background-color": "transparent",
      })
    })

    it("should parse border utilities", () => {
      expect(parseTailwindClass("border")).toEqual({
        "border-width": "1px",
      })
      expect(parseTailwindClass("border-2")).toEqual({
        "border-width": "2px",
      })
      expect(parseTailwindClass("rounded")).toEqual({
        "border-radius": "0.25rem",
      })
      expect(parseTailwindClass("rounded-lg")).toEqual({
        "border-radius": "0.5rem",
      })
      expect(parseTailwindClass("rounded-full")).toEqual({
        "border-radius": "9999px",
      })
    })

    it("should parse shadow utilities", () => {
      expect(parseTailwindClass("shadow")).toEqual({
        "box-shadow":
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      })
      expect(parseTailwindClass("shadow-lg")).toEqual({
        "box-shadow":
          "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      })
      expect(parseTailwindClass("shadow-none")).toEqual({
        "box-shadow": "none",
      })
    })

    it("should parse opacity utilities", () => {
      expect(parseTailwindClass("opacity-50")).toEqual({ opacity: "0.5" })
      expect(parseTailwindClass("opacity-100")).toEqual({ opacity: "1" })
      expect(parseTailwindClass("opacity-0")).toEqual({ opacity: "0" })
    })

    it("should parse position utilities", () => {
      expect(parseTailwindClass("relative")).toEqual({ position: "relative" })
      expect(parseTailwindClass("absolute")).toEqual({ position: "absolute" })
      expect(parseTailwindClass("fixed")).toEqual({ position: "fixed" })
      expect(parseTailwindClass("sticky")).toEqual({ position: "sticky" })
    })

    it("should parse display utilities", () => {
      expect(parseTailwindClass("block")).toEqual({ display: "block" })
      expect(parseTailwindClass("inline")).toEqual({ display: "inline" })
      expect(parseTailwindClass("inline-block")).toEqual({
        display: "inline-block",
      })
      expect(parseTailwindClass("hidden")).toEqual({ display: "none" })
    })

    it("should parse overflow utilities", () => {
      expect(parseTailwindClass("overflow-hidden")).toEqual({
        overflow: "hidden",
      })
      expect(parseTailwindClass("overflow-auto")).toEqual({
        overflow: "auto",
      })
      expect(parseTailwindClass("overflow-x-scroll")).toEqual({
        "overflow-x": "scroll",
      })
    })

    it("should parse z-index utilities", () => {
      expect(parseTailwindClass("z-10")).toEqual({ "z-index": "10" })
      expect(parseTailwindClass("z-50")).toEqual({ "z-index": "50" })
      expect(parseTailwindClass("z-auto")).toEqual({ "z-index": "auto" })
    })

    it("should parse cursor utilities", () => {
      expect(parseTailwindClass("cursor-pointer")).toEqual({
        cursor: "pointer",
      })
      expect(parseTailwindClass("cursor-not-allowed")).toEqual({
        cursor: "not-allowed",
      })
    })

    it("should parse transition utilities", () => {
      expect(parseTailwindClass("transition")).toEqual({
        "transition-property":
          "color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter",
        "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
        "transition-duration": "150ms",
      })
      expect(parseTailwindClass("transition-colors")).toEqual({
        "transition-property":
          "color, background-color, border-color, text-decoration-color, fill, stroke",
        "transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
        "transition-duration": "150ms",
      })
      expect(parseTailwindClass("duration-300")).toEqual({
        "transition-duration": "300ms",
      })
    })

    it("should parse transform utilities", () => {
      expect(parseTailwindClass("rotate-45")).toEqual({
        transform: "rotate(45deg)",
      })
      expect(parseTailwindClass("scale-110")).toEqual({
        transform: "scale(1.1)",
      })
    })

    it("should return null for unknown classes", () => {
      expect(parseTailwindClass("unknown-class")).toBeNull()
      expect(parseTailwindClass("custom-component")).toBeNull()
    })
  })

  describe("analyzeClassName", () => {
    it("should detect Emotion classes", () => {
      const result = analyzeClassName("css-1a2b3c4")
      expect(result.library).toBe("emotion")
      expect(result.isGenerated).toBe(true)
    })

    it("should detect styled-components classes", () => {
      const result = analyzeClassName("sc-abc123 czrPqx")
      expect(result.library).toBe("styled-components")
      expect(result.isGenerated).toBe(true)
    })

    it("should detect CSS Modules classes", () => {
      const result = analyzeClassName("Button_primary__3xvJz")
      expect(result.library).toBe("css-modules")
      expect(result.isGenerated).toBe(true)
    })

    it("should detect Tailwind classes", () => {
      const result = analyzeClassName("flex items-center justify-center p-4")
      expect(result.library).toBe("tailwind")
      expect(result.isGenerated).toBe(false)
    })

    it("should return unknown for regular classes", () => {
      const result = analyzeClassName("my-custom-class")
      expect(result.library).toBe("unknown")
    })
  })
})
