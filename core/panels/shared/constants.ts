import {
  Monitor, Laptop, Tablet, Smartphone,
  Square, Rows, Grid3X3, ArrowRight, Box, EyeOff,
  ArrowDown, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  StretchHorizontal, StretchVertical, Type,
  Eye, MousePointer, Focus, Hand, Ban, Check, Link2
} from "lucide-react"

// Breakpoint definitions for responsive preview
export const breakpoints = [
  { id: "base", label: "Base", width: null, icon: Monitor, description: "All devices" },
  { id: "1920", label: "1920", width: 1920, icon: Monitor, description: "Large Desktop" },
  { id: "1440", label: "1440", width: 1440, icon: Monitor, description: "Desktop" },
  { id: "1280", label: "1280", width: 1280, icon: Laptop, description: "Laptop" },
  { id: "991", label: "991", width: 991, icon: Tablet, description: "Tablet" },
  { id: "767", label: "767", width: 767, icon: Tablet, description: "Tablet Portrait" },
  { id: "478", label: "478", width: 478, icon: Smartphone, description: "Mobile" },
] as const

// Display mode options
export const displayModes = [
  { value: "block", label: "Block", icon: Square },
  { value: "flex", label: "Flex", icon: Rows },
  { value: "grid", label: "Grid", icon: Grid3X3 },
  { value: "inline", label: "Inline", icon: ArrowRight },
  { value: "inline-block", label: "Inline Block", icon: Box },
  { value: "none", label: "None", icon: EyeOff },
] as const

// Flex direction options
export const flexDirections = [
  { value: "row", icon: ArrowRight, label: "Row" },
  { value: "column", icon: ArrowDown, label: "Column" },
  { value: "row-reverse", icon: ArrowRight, label: "Row Reverse", flip: true },
  { value: "column-reverse", icon: ArrowDown, label: "Column Reverse", flip: true },
] as const

// Justify content options
export const justifyOptions = [
  { value: "flex-start", icon: AlignLeft, label: "Start" },
  { value: "center", icon: AlignCenter, label: "Center" },
  { value: "flex-end", icon: AlignRight, label: "End" },
  { value: "space-between", icon: AlignJustify, label: "Space Between" },
  { value: "space-around", icon: StretchHorizontal, label: "Space Around" },
  { value: "space-evenly", icon: StretchVertical, label: "Space Evenly" },
] as const

// Align items options
export const alignOptions = [
  { value: "stretch", icon: StretchVertical, label: "Stretch" },
  { value: "flex-start", icon: AlignLeft, label: "Start" },
  { value: "center", icon: AlignCenter, label: "Center" },
  { value: "flex-end", icon: AlignRight, label: "End" },
  { value: "baseline", icon: Type, label: "Baseline" },
] as const

// Position options
export const positionOptions = [
  { value: "static", label: "Static" },
  { value: "relative", label: "Relative" },
  { value: "absolute", label: "Absolute" },
  { value: "fixed", label: "Fixed" },
  { value: "sticky", label: "Sticky" },
] as const

// Interactive state options (pseudo-classes)
export const interactiveStates = [
  { id: "none", label: "None", icon: Eye, description: "Normal state" },
  { id: "hover", label: "Hover", icon: MousePointer, description: "Mouse over element" },
  { id: "focus", label: "Focus", icon: Focus, description: "Element has focus" },
  { id: "active", label: "Active", icon: Hand, description: "Element is being pressed" },
  { id: "focus-visible", label: "Focus Visible", icon: Focus, description: "Keyboard focus" },
  { id: "disabled", label: "Disabled", icon: Ban, description: "Element is disabled" },
  { id: "checked", label: "Checked", icon: Check, description: "Checkbox/radio is checked" },
  { id: "visited", label: "Visited", icon: Link2, description: "Link has been visited" },
] as const

// Easing function options
export const easingOptions = [
  { value: "linear", label: "Linear" },
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
  { value: "cubic-bezier(0.4, 0, 0.2, 1)", label: "Smooth" },
  { value: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", label: "Bounce" },
] as const

// Blend mode options
export const blendModeOptions = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
  { value: "hard-light", label: "Hard Light" },
  { value: "soft-light", label: "Soft Light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "hue", label: "Hue" },
  { value: "saturation", label: "Saturation" },
  { value: "color", label: "Color" },
  { value: "luminosity", label: "Luminosity" },
] as const

// Grid template options
export const gridTemplateOptions = [
  { value: "none", label: "None" },
  { value: "1fr", label: "1 Column" },
  { value: "1fr 1fr", label: "2 Columns" },
  { value: "1fr 1fr 1fr", label: "3 Columns" },
  { value: "1fr 1fr 1fr 1fr", label: "4 Columns" },
  { value: "repeat(auto-fit, minmax(200px, 1fr))", label: "Auto Fit" },
  { value: "repeat(auto-fill, minmax(200px, 1fr))", label: "Auto Fill" },
] as const

// Filter preset options
export const filterPresets = [
  { value: "", label: "None" },
  { value: "blur(4px)", label: "Blur" },
  { value: "brightness(1.2)", label: "Bright" },
  { value: "contrast(1.2)", label: "High Contrast" },
  { value: "grayscale(1)", label: "Grayscale" },
  { value: "sepia(1)", label: "Sepia" },
  { value: "saturate(2)", label: "Saturated" },
  { value: "hue-rotate(90deg)", label: "Hue Shift" },
  { value: "invert(1)", label: "Invert" },
] as const

// Text alignment options
export const textAlignOptions = [
  { value: "left", icon: AlignLeft, label: "Left" },
  { value: "center", icon: AlignCenter, label: "Center" },
  { value: "right", icon: AlignRight, label: "Right" },
  { value: "justify", icon: AlignJustify, label: "Justify" },
] as const

// Font weight options
export const fontWeightOptions = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
] as const

// Border style options
export const borderStyleOptions = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
  { value: "groove", label: "Groove" },
  { value: "ridge", label: "Ridge" },
  { value: "inset", label: "Inset" },
  { value: "outset", label: "Outset" },
  { value: "none", label: "None" },
] as const
