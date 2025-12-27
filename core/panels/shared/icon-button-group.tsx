"use client"

import * as React from "react"
import { cn } from "../../../lib/utils"
import { Button } from "../../../ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip"

export interface IconButtonOption {
  value: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  flip?: boolean
}

export interface IconButtonGroupProps {
  options: IconButtonOption[]
  value: string
  onChange: (value: string) => void
  size?: "sm" | "md"
}

export function IconButtonGroup({ options, value, onChange, size = "sm" }: IconButtonGroupProps) {
  const buttonSize = size === "sm" ? "h-7 w-7" : "h-8 w-8"
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"

  return (
    <div className="flex gap-0.5 p-0.5 bg-muted rounded-md">
      {options.map((option) => (
        <Tooltip key={option.value}>
          <TooltipTrigger asChild>
            <Button
              variant={value === option.value ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                buttonSize,
                "p-0",
                value === option.value && "bg-background shadow-sm"
              )}
              onClick={() => onChange(option.value)}
            >
              <option.icon
                className={cn(
                  iconSize,
                  option.flip && "rotate-180"
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {option.label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
