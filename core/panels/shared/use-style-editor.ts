"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { useInspector } from "../../inspector-context"

export interface SpacingValues {
  top: string
  right: string
  bottom: string
  left: string
}

export interface ComputedValuesMap {
  width: string
  height: string
  minWidth: string
  maxWidth: string
  fontSize: string
  lineHeight: string
  color: string
  backgroundColor: string
  borderWidth: string
  borderColor: string
  borderRadius: string
  gap: string
  opacity: string
  boxShadow: string
  transform: string
  transformOrigin: string
  backgroundImage: string
  marginTop: string
  marginRight: string
  marginBottom: string
  marginLeft: string
  paddingTop: string
  paddingRight: string
  paddingBottom: string
  paddingLeft: string
}

export function useStyleEditor() {
  const {
    selectedElement,
    activeClass,
    updateClassStyle,
    addToHistory,
    isElementValid,
    notifyStyleChange,
    styleChangeCounter,
  } = useInspector()

  // Layout state
  const [displayMode, setDisplayMode] = useState("block")
  const [flexDirection, setFlexDirection] = useState("row")
  const [justifyContent, setJustifyContent] = useState("flex-start")
  const [alignItems, setAlignItems] = useState("stretch")
  const [position, setPosition] = useState("static")
  const [gap, setGap] = useState("")

  // Size state
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [minWidth, setMinWidth] = useState("")
  const [maxWidth, setMaxWidth] = useState("")
  const [minHeight, setMinHeight] = useState("")
  const [maxHeight, setMaxHeight] = useState("")

  // Spacing state
  const [margin, setMargin] = useState<SpacingValues>({ top: "", right: "", bottom: "", left: "" })
  const [padding, setPadding] = useState<SpacingValues>({ top: "", right: "", bottom: "", left: "" })

  // Typography state
  const [fontSize, setFontSize] = useState("")
  const [fontWeight, setFontWeight] = useState("")
  const [lineHeight, setLineHeight] = useState("")
  const [letterSpacing, setLetterSpacing] = useState("")
  const [textAlign, setTextAlign] = useState("left")
  const [textColor, setTextColor] = useState("")

  // Background state
  const [backgroundColor, setBackgroundColor] = useState("")

  // Border state
  const [borderWidth, setBorderWidth] = useState("")
  const [borderStyle, setBorderStyle] = useState("solid")
  const [borderColor, setBorderColor] = useState("")
  const [borderRadius, setBorderRadius] = useState("")

  // Effects state
  const [opacity, setOpacity] = useState("1")
  const [boxShadow, setBoxShadow] = useState("")

  // Grid state
  const [gridTemplateColumns, setGridTemplateColumns] = useState("")
  const [gridTemplateRows, setGridTemplateRows] = useState("")
  const [gridGap, setGridGap] = useState("")
  const [gridAutoFlow, setGridAutoFlow] = useState("row")

  // Transform state
  const [translateX, setTranslateX] = useState("")
  const [translateY, setTranslateY] = useState("")
  const [rotate, setRotate] = useState("")
  const [scaleX, setScaleX] = useState("")
  const [scaleY, setScaleY] = useState("")
  const [skewX, setSkewX] = useState("")
  const [skewY, setSkewY] = useState("")

  // Transition state
  const [transitionProperty, setTransitionProperty] = useState("all")
  const [transitionDuration, setTransitionDuration] = useState("")
  const [transitionEasing, setTransitionEasing] = useState("ease")
  const [transitionDelay, setTransitionDelay] = useState("")

  // Filter state
  const [filterBlur, setFilterBlur] = useState("")
  const [filterBrightness, setFilterBrightness] = useState("")
  const [filterContrast, setFilterContrast] = useState("")
  const [filterGrayscale, setFilterGrayscale] = useState("")
  const [filterSaturate, setFilterSaturate] = useState("")
  const [filterHueRotate, setFilterHueRotate] = useState("")
  const [filterInvert, setFilterInvert] = useState("")
  const [filterSepia, setFilterSepia] = useState("")

  // Backdrop state
  const [backdropBlur, setBackdropBlur] = useState("")
  const [mixBlendMode, setMixBlendMode] = useState("normal")

  // Computed values for placeholders
  const [computedValues, setComputedValues] = useState<ComputedValuesMap>({
    width: "",
    height: "",
    minWidth: "",
    maxWidth: "",
    fontSize: "",
    lineHeight: "",
    color: "",
    backgroundColor: "",
    borderWidth: "",
    borderColor: "",
    borderRadius: "",
    gap: "",
    opacity: "",
    boxShadow: "",
    transform: "",
    transformOrigin: "",
    backgroundImage: "",
    marginTop: "",
    marginRight: "",
    marginBottom: "",
    marginLeft: "",
    paddingTop: "",
    paddingRight: "",
    paddingBottom: "",
    paddingLeft: "",
  })

  // Get computed style value
  const getComputedStyleValue = useCallback((property: string): string => {
    if (!selectedElement?.element) return ""
    const computed = window.getComputedStyle(selectedElement.element)
    return computed.getPropertyValue(property) || ""
  }, [selectedElement])

  // Apply style to element
  const applyStyle = useCallback((property: string, value: string, cssProperty?: string) => {
    if (!selectedElement?.element) return

    if (!isElementValid()) {
      toast.error("Element is no longer in the document")
      return
    }

    const cssPropertyName = cssProperty || property.replace(/([A-Z])/g, '-$1').toLowerCase()
    const oldValue = selectedElement.element.style.getPropertyValue(cssPropertyName)

    if (activeClass) {
      addToHistory({
        type: 'class',
        target: activeClass,
        property: cssPropertyName,
        oldValue,
        newValue: value,
      })
      updateClassStyle(activeClass, cssPropertyName, value)
    } else {
      selectedElement.element.style.setProperty(cssPropertyName, value)
      addToHistory({
        type: 'inline',
        target: selectedElement.path || 'element',
        property: cssPropertyName,
        oldValue,
        newValue: value,
      })
    }

    notifyStyleChange()
  }, [selectedElement, activeClass, addToHistory, updateClassStyle, isElementValid, notifyStyleChange])

  // Update state when element changes
  useEffect(() => {
    if (selectedElement?.element) {
      const computed = window.getComputedStyle(selectedElement.element)
      const el = selectedElement.element

      // Store computed values
      setComputedValues({
        width: computed.width,
        height: computed.height,
        minWidth: computed.minWidth,
        maxWidth: computed.maxWidth,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderWidth: computed.borderWidth,
        borderColor: computed.borderColor,
        borderRadius: computed.borderRadius,
        gap: computed.gap,
        opacity: computed.opacity,
        boxShadow: computed.boxShadow,
        transform: computed.transform,
        transformOrigin: computed.transformOrigin,
        backgroundImage: computed.backgroundImage,
        marginTop: computed.marginTop,
        marginRight: computed.marginRight,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
      })

      // Layout
      setDisplayMode(computed.display || "block")
      setPosition(computed.position || "static")
      setFlexDirection(computed.flexDirection || "row")
      setJustifyContent(computed.justifyContent || "flex-start")
      setAlignItems(computed.alignItems || "stretch")
      setGap(el.style.gap || "")

      // Size
      setWidth(el.style.width || "")
      setHeight(el.style.height || "")
      setMinWidth(el.style.minWidth || "")
      setMaxWidth(el.style.maxWidth || "")
      setMinHeight(el.style.minHeight || "")
      setMaxHeight(el.style.maxHeight || "")

      // Spacing
      setMargin({
        top: el.style.marginTop || "",
        right: el.style.marginRight || "",
        bottom: el.style.marginBottom || "",
        left: el.style.marginLeft || "",
      })
      setPadding({
        top: el.style.paddingTop || "",
        right: el.style.paddingRight || "",
        bottom: el.style.paddingBottom || "",
        left: el.style.paddingLeft || "",
      })

      // Typography
      setFontSize(el.style.fontSize || "")
      setFontWeight(computed.fontWeight || "400")
      setLineHeight(el.style.lineHeight || "")
      setTextAlign(computed.textAlign || "left")
      setTextColor(el.style.color || "")

      // Background
      setBackgroundColor(el.style.backgroundColor || "")

      // Border
      setBorderWidth(el.style.borderWidth || "")
      setBorderStyle(computed.borderStyle?.split(" ")[0] || "solid")
      setBorderColor(el.style.borderColor || "")
      setBorderRadius(el.style.borderRadius || "")

      // Effects
      setOpacity(el.style.opacity || "1")
      setBoxShadow(el.style.boxShadow || "")
    }
  }, [selectedElement, styleChangeCounter])

  // Build transform value
  const buildTransformValue = useCallback((rotateOverride?: string): string => {
    const transforms: string[] = []

    if (translateX || translateY) {
      const tx = translateX || "0"
      const ty = translateY || "0"
      transforms.push(`translate(${tx}, ${ty})`)
    }

    const rotateVal = rotateOverride !== undefined ? rotateOverride : rotate
    if (rotateVal) {
      const deg = rotateVal.includes("deg") ? rotateVal : `${rotateVal}deg`
      transforms.push(`rotate(${deg})`)
    }

    if (scaleX || scaleY) {
      const sx = scaleX || "1"
      const sy = scaleY || "1"
      transforms.push(`scale(${sx}, ${sy})`)
    }

    if (skewX || skewY) {
      const skx = skewX || "0"
      const sky = skewY || "0"
      const skxDeg = skx.includes("deg") ? skx : `${skx}deg`
      const skyDeg = sky.includes("deg") ? sky : `${sky}deg`
      transforms.push(`skew(${skxDeg}, ${skyDeg})`)
    }

    return transforms.length > 0 ? transforms.join(" ") : "none"
  }, [translateX, translateY, rotate, scaleX, scaleY, skewX, skewY])

  // Update filter
  const updateFilter = useCallback(() => {
    if (!selectedElement?.element) return

    const filters: string[] = []

    if (filterBlur) {
      const val = filterBlur.includes("px") ? filterBlur : `${filterBlur}px`
      filters.push(`blur(${val})`)
    }
    if (filterBrightness) filters.push(`brightness(${filterBrightness})`)
    if (filterContrast) filters.push(`contrast(${filterContrast})`)
    if (filterSaturate) filters.push(`saturate(${filterSaturate})`)
    if (filterGrayscale) filters.push(`grayscale(${filterGrayscale})`)
    if (filterHueRotate) {
      const val = filterHueRotate.includes("deg") ? filterHueRotate : `${filterHueRotate}deg`
      filters.push(`hue-rotate(${val})`)
    }
    if (filterInvert) filters.push(`invert(${filterInvert})`)
    if (filterSepia) filters.push(`sepia(${filterSepia})`)

    const filterValue = filters.length > 0 ? filters.join(" ") : "none"
    applyStyle("filter", filterValue)
  }, [selectedElement, applyStyle, filterBlur, filterBrightness, filterContrast, filterSaturate, filterGrayscale, filterHueRotate, filterInvert, filterSepia])

  return {
    // State
    displayMode, setDisplayMode,
    flexDirection, setFlexDirection,
    justifyContent, setJustifyContent,
    alignItems, setAlignItems,
    position, setPosition,
    gap, setGap,
    width, setWidth,
    height, setHeight,
    minWidth, setMinWidth,
    maxWidth, setMaxWidth,
    minHeight, setMinHeight,
    maxHeight, setMaxHeight,
    margin, setMargin,
    padding, setPadding,
    fontSize, setFontSize,
    fontWeight, setFontWeight,
    lineHeight, setLineHeight,
    letterSpacing, setLetterSpacing,
    textAlign, setTextAlign,
    textColor, setTextColor,
    backgroundColor, setBackgroundColor,
    borderWidth, setBorderWidth,
    borderStyle, setBorderStyle,
    borderColor, setBorderColor,
    borderRadius, setBorderRadius,
    opacity, setOpacity,
    boxShadow, setBoxShadow,
    gridTemplateColumns, setGridTemplateColumns,
    gridTemplateRows, setGridTemplateRows,
    gridGap, setGridGap,
    gridAutoFlow, setGridAutoFlow,
    translateX, setTranslateX,
    translateY, setTranslateY,
    rotate, setRotate,
    scaleX, setScaleX,
    scaleY, setScaleY,
    skewX, setSkewX,
    skewY, setSkewY,
    transitionProperty, setTransitionProperty,
    transitionDuration, setTransitionDuration,
    transitionEasing, setTransitionEasing,
    transitionDelay, setTransitionDelay,
    filterBlur, setFilterBlur,
    filterBrightness, setFilterBrightness,
    filterContrast, setFilterContrast,
    filterGrayscale, setFilterGrayscale,
    filterSaturate, setFilterSaturate,
    filterHueRotate, setFilterHueRotate,
    filterInvert, setFilterInvert,
    filterSepia, setFilterSepia,
    backdropBlur, setBackdropBlur,
    mixBlendMode, setMixBlendMode,
    computedValues,

    // Methods
    applyStyle,
    getComputedStyleValue,
    buildTransformValue,
    updateFilter,
  }
}
