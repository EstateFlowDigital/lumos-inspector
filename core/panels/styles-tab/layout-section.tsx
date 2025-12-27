"use client"

import * as React from "react"
import { Grid3X3, Rows } from "lucide-react"
import { cn } from "../../../lib/utils"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip"
import { Section, PropertyRow, IconButtonGroup, type ComputedValuesMap } from "../shared"
import { displayModes, flexDirections, justifyOptions, alignOptions, positionOptions, gridTemplateOptions } from "../shared/constants"
import { DraggableInput } from "../../draggable-input"

interface LayoutSectionProps {
  displayMode: string
  setDisplayMode: (value: string) => void
  flexDirection: string
  setFlexDirection: (value: string) => void
  justifyContent: string
  setJustifyContent: (value: string) => void
  alignItems: string
  setAlignItems: (value: string) => void
  position: string
  setPosition: (value: string) => void
  gap: string
  setGap: (value: string) => void
  gridTemplateColumns: string
  setGridTemplateColumns: (value: string) => void
  applyStyle: (property: string, value: string, cssProperty?: string) => void
  computedValues: ComputedValuesMap
}

export function LayoutSection({
  displayMode,
  setDisplayMode,
  flexDirection,
  setFlexDirection,
  justifyContent,
  setJustifyContent,
  alignItems,
  setAlignItems,
  position,
  setPosition,
  gap,
  setGap,
  gridTemplateColumns,
  setGridTemplateColumns,
  applyStyle,
  computedValues,
}: LayoutSectionProps) {
  return (
    <Section title="Layout" icon={Grid3X3} defaultOpen>
      <div className="space-y-3">
        {/* Display Mode */}
        <PropertyRow label="Display">
          <div className="flex gap-0.5 p-0.5 bg-muted rounded-md flex-wrap">
            {displayModes.map((mode) => (
              <Tooltip key={mode.value}>
                <TooltipTrigger asChild>
                  <Button
                    variant={displayMode === mode.value ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0",
                      displayMode === mode.value && "bg-background shadow-sm"
                    )}
                    onClick={() => {
                      setDisplayMode(mode.value)
                      applyStyle("display", mode.value)
                    }}
                  >
                    <mode.icon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {mode.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </PropertyRow>

        {/* Position */}
        <PropertyRow label="Position">
          <Select
            value={position}
            onValueChange={(val) => {
              setPosition(val)
              applyStyle("position", val)
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {positionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>

        {/* Flex options - only show when display is flex */}
        {displayMode === "flex" && (
          <>
            <PropertyRow label="Direction">
              <IconButtonGroup
                options={flexDirections.map(d => ({ ...d, icon: d.icon }))}
                value={flexDirection}
                onChange={(val) => {
                  setFlexDirection(val)
                  applyStyle("flexDirection", val, "flex-direction")
                }}
              />
            </PropertyRow>

            <PropertyRow label="Justify">
              <IconButtonGroup
                options={justifyOptions.map(j => ({ ...j, icon: j.icon }))}
                value={justifyContent}
                onChange={(val) => {
                  setJustifyContent(val)
                  applyStyle("justifyContent", val, "justify-content")
                }}
              />
            </PropertyRow>

            <PropertyRow label="Align">
              <IconButtonGroup
                options={alignOptions.map(a => ({ ...a, icon: a.icon }))}
                value={alignItems}
                onChange={(val) => {
                  setAlignItems(val)
                  applyStyle("alignItems", val, "align-items")
                }}
              />
            </PropertyRow>

            <PropertyRow label="Gap">
              <DraggableInput
                value={gap}
                onChange={setGap}
                onBlur={() => applyStyle("gap", gap)}
                placeholder={computedValues.gap || "0"}
                unit="px"
                min={0}
                max={100}
              />
            </PropertyRow>
          </>
        )}

        {/* Grid options - only show when display is grid */}
        {displayMode === "grid" && (
          <>
            <PropertyRow label="Columns">
              <Select
                value={gridTemplateColumns}
                onValueChange={(val) => {
                  setGridTemplateColumns(val)
                  applyStyle("gridTemplateColumns", val, "grid-template-columns")
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {gridTemplateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropertyRow>

            <PropertyRow label="Gap">
              <DraggableInput
                value={gap}
                onChange={setGap}
                onBlur={() => applyStyle("gap", gap)}
                placeholder={computedValues.gap || "0"}
                unit="px"
                min={0}
                max={100}
              />
            </PropertyRow>
          </>
        )}
      </div>
    </Section>
  )
}
