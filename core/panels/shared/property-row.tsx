"use client"

import * as React from "react"
import { Label } from "../../../ui/label"

export interface PropertyRowProps {
  label: string
  children: React.ReactNode
  labelWidth?: string
}

export function PropertyRow({ label, children, labelWidth = "w-20" }: PropertyRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className={`${labelWidth} text-xs text-muted-foreground shrink-0`}>{label}</Label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
