"use client"

import * as React from "react"
import { Suspense, lazy } from "react"
import { Layers } from "lucide-react"
import { useInspector } from "../../inspector-context"
import { useStyleEditor } from "../shared/use-style-editor"

// Section components (loaded immediately for core editing)
import { SelectorSection } from "./selector-section"
import { LayoutSection } from "./layout-section"
import { SizeSection } from "./size-section"
import { SpacingSection } from "./spacing-section"
import { TypographySection } from "./typography-section"
import { BackgroundSection } from "./background-section"
import { BorderSection } from "./border-section"
import { EffectsSection } from "./effects-section"

// Lazy-loaded tool components for better performance
const AnimationBuilder = lazy(() => import("../../../tools/animation-builder").then(m => ({ default: m.AnimationBuilder })))
const StylePresets = lazy(() => import("../../../tools/style-presets").then(m => ({ default: m.StylePresets })))
const CSSVariablesExplorer = lazy(() => import("../../../tools/css-variables-explorer").then(m => ({ default: m.CSSVariablesExplorer })))
const ResponsivePreviewToggle = lazy(() => import("../../../tools/responsive-preview").then(m => ({ default: m.ResponsivePreviewToggle })))
const AccessibilityChecker = lazy(() => import("../../../tools/accessibility-checker").then(m => ({ default: m.AccessibilityChecker })))
const StyleDiff = lazy(() => import("../../../tools/style-diff").then(m => ({ default: m.StyleDiff })))
const CodeExport = lazy(() => import("../../../tools/code-export").then(m => ({ default: m.CodeExport })))
const DarkModePreview = lazy(() => import("../../../tools/dark-mode-preview").then(m => ({ default: m.DarkModePreview })))
const LayoutDebugger = lazy(() => import("../../../tools/layout-debugger").then(m => ({ default: m.LayoutDebugger })))
const ElementStates = lazy(() => import("../../../tools/element-states").then(m => ({ default: m.ElementStates })))
const ScreenshotTool = lazy(() => import("../../../tools/screenshot-tool").then(m => ({ default: m.ScreenshotTool })))
const ColorPalette = lazy(() => import("../../../tools/color-palette").then(m => ({ default: m.ColorPalette })))
const UnitsConverter = lazy(() => import("../../../tools/units-converter").then(m => ({ default: m.UnitsConverter })))
const QuickActions = lazy(() => import("../../../tools/quick-actions").then(m => ({ default: m.QuickActions })))
const PerformanceHints = lazy(() => import("../../../tools/performance-hints").then(m => ({ default: m.PerformanceHints })))
const SpecificityAnalyzer = lazy(() => import("../../../tools/specificity-analyzer").then(m => ({ default: m.SpecificityAnalyzer })))
const ConsolePanel = lazy(() => import("../../../tools/console-panel").then(m => ({ default: m.ConsolePanel })))
const LayoutEditor = lazy(() => import("../../../tools/layout-editor").then(m => ({ default: m.LayoutEditor })))
const ZIndexMap = lazy(() => import("../../../tools/z-index-map").then(m => ({ default: m.ZIndexMap })))
const SpacingVisualizer = lazy(() => import("../../../tools/spacing-visualizer").then(m => ({ default: m.SpacingVisualizer })))
const FontInspector = lazy(() => import("../../../tools/font-inspector").then(m => ({ default: m.FontInspector })))
const BreakpointIndicator = lazy(() => import("../../../tools/breakpoint-indicator").then(m => ({ default: m.BreakpointIndicator })))
const ElementComparison = lazy(() => import("../../../tools/element-comparison").then(m => ({ default: m.ElementComparison })))
const TextShadowBuilder = lazy(() => import("../../../tools/text-shadow-builder").then(m => ({ default: m.TextShadowBuilder })))
const FilterEditor = lazy(() => import("../../../tools/filter-editor").then(m => ({ default: m.FilterEditor })))
const ClipPathEditor = lazy(() => import("../../../tools/clip-path-editor").then(m => ({ default: m.ClipPathEditor })))
const BorderEditor = lazy(() => import("../../../tools/border-editor").then(m => ({ default: m.BorderEditor })))
const BackdropFilterEditor = lazy(() => import("../../../tools/backdrop-filter-editor").then(m => ({ default: m.BackdropFilterEditor })))
const Transform3DTool = lazy(() => import("../../../tools/transform-3d-tool").then(m => ({ default: m.Transform3DTool })))
const MaskEditor = lazy(() => import("../../../tools/mask-editor").then(m => ({ default: m.MaskEditor })))
const OutlineEditor = lazy(() => import("../../../tools/outline-editor").then(m => ({ default: m.OutlineEditor })))
const CursorEditor = lazy(() => import("../../../tools/cursor-editor").then(m => ({ default: m.CursorEditor })))
const ScrollSnapEditor = lazy(() => import("../../../tools/scroll-snap-editor").then(m => ({ default: m.ScrollSnapEditor })))
const TailwindGenerator = lazy(() => import("../../../tools/tailwind-generator").then(m => ({ default: m.TailwindGenerator })))
const EventListenerInspector = lazy(() => import("../../../tools/event-listener-inspector").then(m => ({ default: m.EventListenerInspector })))
const StorageInspector = lazy(() => import("../../../tools/storage-inspector").then(m => ({ default: m.StorageInspector })))
const DOMTreeVisualizer = lazy(() => import("../../../tools/dom-tree-visualizer").then(m => ({ default: m.DOMTreeVisualizer })))
const MutationObserverPanel = lazy(() => import("../../../tools/mutation-observer-panel").then(m => ({ default: m.MutationObserverPanel })))
const SpacingSystemChecker = lazy(() => import("../../../tools/spacing-system-checker").then(m => ({ default: m.SpacingSystemChecker })))
const TypographyScaleAnalyzer = lazy(() => import("../../../tools/typography-scale-analyzer").then(m => ({ default: m.TypographyScaleAnalyzer })))
const AlignmentGuideOverlay = lazy(() => import("../../../tools/alignment-guide-overlay").then(m => ({ default: m.AlignmentGuideOverlay })))
const GridSystemOverlay = lazy(() => import("../../../tools/grid-system-overlay").then(m => ({ default: m.GridSystemOverlay })))
const DesignTokenValidator = lazy(() => import("../../../tools/design-token-validator").then(m => ({ default: m.DesignTokenValidator })))
const StyleBookmarks = lazy(() => import("../../../tools/style-bookmarks").then(m => ({ default: m.StyleBookmarks })))
const StyleSearch = lazy(() => import("../../../tools/style-search").then(m => ({ default: m.StyleSearch })))
const ElementPinning = lazy(() => import("../../../tools/element-pinning").then(m => ({ default: m.ElementPinning })))
const BlendModeEditor = lazy(() => import("../../../tools/blend-mode-editor").then(m => ({ default: m.BlendModeEditor })))
const AspectRatioEditor = lazy(() => import("../../../tools/aspect-ratio-editor").then(m => ({ default: m.AspectRatioEditor })))
const ObjectFitEditor = lazy(() => import("../../../tools/object-fit-editor").then(m => ({ default: m.ObjectFitEditor })))
const ColumnsEditor = lazy(() => import("../../../tools/columns-editor").then(m => ({ default: m.ColumnsEditor })))
const AnimationTimeline = lazy(() => import("../../../tools/animation-timeline").then(m => ({ default: m.AnimationTimeline })))
const PseudoElementInspector = lazy(() => import("../../../tools/pseudo-element-inspector").then(m => ({ default: m.PseudoElementInspector })))
const FocusOrderChecker = lazy(() => import("../../../tools/focus-order-checker").then(m => ({ default: m.FocusOrderChecker })))
const CSSSpecificityViewer = lazy(() => import("../../../tools/css-specificity-viewer").then(m => ({ default: m.CSSSpecificityViewer })))
const MediaQueryDebugger = lazy(() => import("../../../tools/media-query-debugger").then(m => ({ default: m.MediaQueryDebugger })))
const FormStateInspector = lazy(() => import("../../../tools/form-state-inspector").then(m => ({ default: m.FormStateInspector })))
const OverflowDebugger = lazy(() => import("../../../tools/overflow-debugger").then(m => ({ default: m.OverflowDebugger })))
const CSSGridInspector = lazy(() => import("../../../tools/css-grid-inspector").then(m => ({ default: m.CSSGridInspector })))
const TransitionBuilder = lazy(() => import("../../../tools/transition-builder").then(m => ({ default: m.TransitionBuilder })))
const PositionHelper = lazy(() => import("../../../tools/position-helper").then(m => ({ default: m.PositionHelper })))
const StackingContextDebugger = lazy(() => import("../../../tools/stacking-context-debugger").then(m => ({ default: m.StackingContextDebugger })))
const FontFeatureSettings = lazy(() => import("../../../tools/font-feature-settings").then(m => ({ default: m.FontFeatureSettings })))
const WritingModeEditor = lazy(() => import("../../../tools/writing-mode-editor").then(m => ({ default: m.WritingModeEditor })))
const PointerEventsEditor = lazy(() => import("../../../tools/pointer-events-editor").then(m => ({ default: m.PointerEventsEditor })))
const ContentVisibilityTool = lazy(() => import("../../../tools/content-visibility-tool").then(m => ({ default: m.ContentVisibilityTool })))
const ListStyleEditor = lazy(() => import("../../../tools/list-style-editor").then(m => ({ default: m.ListStyleEditor })))
const ScrollAnimationsTool = lazy(() => import("../../../tools/scroll-animations-tool").then(m => ({ default: m.ScrollAnimationsTool })))
const ContainerQueriesDebugger = lazy(() => import("../../../tools/container-queries-debugger").then(m => ({ default: m.ContainerQueriesDebugger })))
const CSSVariablesEditor = lazy(() => import("../../../tools/css-variables-editor").then(m => ({ default: m.CSSVariablesEditor })))
const ColorContrastChecker = lazy(() => import("../../../tools/color-contrast-checker").then(m => ({ default: m.ColorContrastChecker })))
const PrintStylesPreview = lazy(() => import("../../../tools/print-styles-preview").then(m => ({ default: m.PrintStylesPreview })))
const SubgridInspector = lazy(() => import("../../../tools/subgrid-inspector").then(m => ({ default: m.SubgridInspector })))
const LogicalPropertiesEditor = lazy(() => import("../../../tools/logical-properties-editor").then(m => ({ default: m.LogicalPropertiesEditor })))
const CSSShapesEditor = lazy(() => import("../../../tools/css-shapes-editor").then(m => ({ default: m.CSSShapesEditor })))
const KeyframeEditor = lazy(() => import("../../../tools/keyframe-editor").then(m => ({ default: m.KeyframeEditor })))
const GradientBuilder = lazy(() => import("../../../tools/gradient-builder").then(m => ({ default: m.GradientBuilder })))
const TransformBuilder = lazy(() => import("../../../tools/transform-builder").then(m => ({ default: m.TransformBuilder })))

// Loading fallback for lazy components
function ToolLoadingFallback() {
  return (
    <div className="p-3 text-xs text-muted-foreground animate-pulse">
      Loading tool...
    </div>
  )
}

export function StylesTab() {
  const { selectedElement } = useInspector()
  const styleEditor = useStyleEditor()

  // No element selected state
  if (!selectedElement) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Layers className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-2">No Element Selected</h3>
        <p className="text-sm text-muted-foreground">
          Click on an element in the Navigator or use the inspect tool to select one.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {/* Core editing sections */}
      <SelectorSection selectedElement={selectedElement} />

      <LayoutSection
        displayMode={styleEditor.displayMode}
        setDisplayMode={styleEditor.setDisplayMode}
        flexDirection={styleEditor.flexDirection}
        setFlexDirection={styleEditor.setFlexDirection}
        justifyContent={styleEditor.justifyContent}
        setJustifyContent={styleEditor.setJustifyContent}
        alignItems={styleEditor.alignItems}
        setAlignItems={styleEditor.setAlignItems}
        position={styleEditor.position}
        setPosition={styleEditor.setPosition}
        gap={styleEditor.gap}
        setGap={styleEditor.setGap}
        gridTemplateColumns={styleEditor.gridTemplateColumns}
        setGridTemplateColumns={styleEditor.setGridTemplateColumns}
        applyStyle={styleEditor.applyStyle}
        computedValues={styleEditor.computedValues}
      />

      <SizeSection
        width={styleEditor.width}
        setWidth={styleEditor.setWidth}
        height={styleEditor.height}
        setHeight={styleEditor.setHeight}
        minWidth={styleEditor.minWidth}
        setMinWidth={styleEditor.setMinWidth}
        maxWidth={styleEditor.maxWidth}
        setMaxWidth={styleEditor.setMaxWidth}
        minHeight={styleEditor.minHeight}
        setMinHeight={styleEditor.setMinHeight}
        maxHeight={styleEditor.maxHeight}
        setMaxHeight={styleEditor.setMaxHeight}
        applyStyle={styleEditor.applyStyle}
        computedValues={styleEditor.computedValues}
      />

      <SpacingSection
        margin={styleEditor.margin}
        setMargin={styleEditor.setMargin}
        padding={styleEditor.padding}
        setPadding={styleEditor.setPadding}
        applyStyle={styleEditor.applyStyle}
      />

      <TypographySection
        fontSize={styleEditor.fontSize}
        setFontSize={styleEditor.setFontSize}
        fontWeight={styleEditor.fontWeight}
        setFontWeight={styleEditor.setFontWeight}
        lineHeight={styleEditor.lineHeight}
        setLineHeight={styleEditor.setLineHeight}
        letterSpacing={styleEditor.letterSpacing}
        setLetterSpacing={styleEditor.setLetterSpacing}
        textAlign={styleEditor.textAlign}
        setTextAlign={styleEditor.setTextAlign}
        textColor={styleEditor.textColor}
        setTextColor={styleEditor.setTextColor}
        applyStyle={styleEditor.applyStyle}
        computedValues={styleEditor.computedValues}
      />

      <BackgroundSection
        backgroundColor={styleEditor.backgroundColor}
        setBackgroundColor={styleEditor.setBackgroundColor}
        applyStyle={styleEditor.applyStyle}
        computedValues={styleEditor.computedValues}
      />

      <BorderSection
        borderWidth={styleEditor.borderWidth}
        setBorderWidth={styleEditor.setBorderWidth}
        borderStyle={styleEditor.borderStyle}
        setBorderStyle={styleEditor.setBorderStyle}
        borderColor={styleEditor.borderColor}
        setBorderColor={styleEditor.setBorderColor}
        borderRadius={styleEditor.borderRadius}
        setBorderRadius={styleEditor.setBorderRadius}
        applyStyle={styleEditor.applyStyle}
        computedValues={styleEditor.computedValues}
      />

      <EffectsSection
        opacity={styleEditor.opacity}
        setOpacity={styleEditor.setOpacity}
        boxShadow={styleEditor.boxShadow}
        setBoxShadow={styleEditor.setBoxShadow}
        applyStyle={styleEditor.applyStyle}
      />

      {/* Lazy-loaded advanced tools */}
      <Suspense fallback={<ToolLoadingFallback />}>
        <GradientBuilder
          value=""
          onChange={(value) => styleEditor.applyStyle("backgroundImage", value, "background-image")}
        />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <TransformBuilder
          value=""
          onChange={(value) => styleEditor.applyStyle("transform", value)}
        />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <AnimationBuilder
          value=""
          onChange={(value) => styleEditor.applyStyle("animation", value)}
          element={selectedElement?.element}
        />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <StylePresets
          onApply={(styles) => {
            Object.entries(styles).forEach(([prop, value]) => {
              styleEditor.applyStyle(prop, value, prop.replace(/([A-Z])/g, "-$1").toLowerCase())
            })
          }}
        />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <CSSVariablesExplorer
          onApplyVariable={(varName) => {
            navigator.clipboard.writeText(`var(${varName})`)
          }}
        />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ResponsivePreviewToggle />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <AccessibilityChecker />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <StyleDiff />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <CodeExport />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <DarkModePreview />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <LayoutDebugger />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ElementStates />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ScreenshotTool />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ColorPalette />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <UnitsConverter />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <QuickActions />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <PerformanceHints />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <SpecificityAnalyzer />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ConsolePanel />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <LayoutEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ZIndexMap />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <SpacingVisualizer />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <FontInspector />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <BreakpointIndicator />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ElementComparison />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <TextShadowBuilder />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <FilterEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ClipPathEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <BorderEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <BackdropFilterEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <Transform3DTool />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <MaskEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <OutlineEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <CursorEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ScrollSnapEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <TailwindGenerator />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <EventListenerInspector />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <StorageInspector />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <DOMTreeVisualizer />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <MutationObserverPanel />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <SpacingSystemChecker />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <TypographyScaleAnalyzer />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <AlignmentGuideOverlay />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <GridSystemOverlay />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <DesignTokenValidator />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <StyleBookmarks />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <StyleSearch />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ElementPinning />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <BlendModeEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <AspectRatioEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ObjectFitEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ColumnsEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <AnimationTimeline />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <PseudoElementInspector />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <FocusOrderChecker />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <CSSSpecificityViewer />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <MediaQueryDebugger />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <FormStateInspector />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <OverflowDebugger />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <CSSGridInspector />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <TransitionBuilder />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <PositionHelper />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <StackingContextDebugger />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <FontFeatureSettings />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <WritingModeEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <PointerEventsEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ContentVisibilityTool />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ListStyleEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ScrollAnimationsTool />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ContainerQueriesDebugger />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <CSSVariablesEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <ColorContrastChecker />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <PrintStylesPreview />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <SubgridInspector />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <LogicalPropertiesEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <CSSShapesEditor />
      </Suspense>

      <Suspense fallback={<ToolLoadingFallback />}>
        <KeyframeEditor />
      </Suspense>
    </div>
  )
}

// Re-export section components
export { SelectorSection } from "./selector-section"
export { LayoutSection } from "./layout-section"
export { SizeSection } from "./size-section"
export { SpacingSection } from "./spacing-section"
export { TypographySection } from "./typography-section"
export { BackgroundSection } from "./background-section"
export { BorderSection } from "./border-section"
export { EffectsSection } from "./effects-section"
