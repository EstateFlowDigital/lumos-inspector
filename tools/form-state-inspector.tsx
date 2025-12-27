"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
  ChevronDown, FormInput, RefreshCw, Check, X, AlertTriangle, Eye, EyeOff
} from "lucide-react"
import { cn } from "../lib/utils"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { useInspector } from "../core/inspector-context"

interface FormFieldInfo {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  name: string
  type: string
  value: string
  validity: ValidityState | null
  required: boolean
  disabled: boolean
  readOnly: boolean
  label: string
  formIndex: number
  issues: string[]
}

interface FormInfo {
  form: HTMLFormElement
  name: string
  action: string
  method: string
  fields: FormFieldInfo[]
  isValid: boolean
}

// Get field label
function getFieldLabel(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  // Check for associated label
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label) return label.textContent?.trim().substring(0, 30) || ""
  }

  // Check for aria-label
  const ariaLabel = el.getAttribute("aria-label")
  if (ariaLabel) return ariaLabel.substring(0, 30)

  // Use name or placeholder
  return el.name || (el as HTMLInputElement).placeholder || el.id || "unnamed"
}

// Get validation issues
function getValidationIssues(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string[] {
  const issues: string[] = []
  const validity = el.validity

  if (!validity) return issues

  if (validity.valueMissing) issues.push("Required")
  if (validity.typeMismatch) issues.push("Invalid format")
  if (validity.patternMismatch) issues.push("Pattern mismatch")
  if (validity.tooShort) issues.push("Too short")
  if (validity.tooLong) issues.push("Too long")
  if (validity.rangeUnderflow) issues.push("Below minimum")
  if (validity.rangeOverflow) issues.push("Above maximum")
  if (validity.stepMismatch) issues.push("Step mismatch")

  return issues
}

export function FormStateInspector() {
  const { isOpen, setSelectedElement } = useInspector()
  const [isExpanded, setIsExpanded] = useState(true)
  const [forms, setForms] = useState<FormInfo[]>([])
  const [selectedFormIndex, setSelectedFormIndex] = useState<number>(0)
  const [showValues, setShowValues] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Scan for forms
  const scan = useCallback(() => {
    const foundForms: FormInfo[] = []

    document.querySelectorAll("form").forEach((form, formIndex) => {
      if (form.hasAttribute("data-devtools")) return

      const fields: FormFieldInfo[] = []

      form.querySelectorAll("input, select, textarea").forEach((el) => {
        const field = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        if (field.type === "hidden" || field.type === "submit" || field.type === "button") return

        fields.push({
          element: field,
          name: field.name || field.id || "unnamed",
          type: field.type || "text",
          value: field.type === "checkbox" || field.type === "radio"
            ? (field as HTMLInputElement).checked ? "checked" : "unchecked"
            : field.value,
          validity: field.validity || null,
          required: field.required,
          disabled: field.disabled,
          readOnly: "readOnly" in field ? (field as HTMLInputElement | HTMLTextAreaElement).readOnly : false,
          label: getFieldLabel(field),
          formIndex,
          issues: getValidationIssues(field),
        })
      })

      foundForms.push({
        form,
        name: form.name || form.id || `Form ${formIndex + 1}`,
        action: form.action || "none",
        method: form.method.toUpperCase() || "GET",
        fields,
        isValid: form.checkValidity(),
      })
    })

    // Also find orphan fields (not in a form)
    const orphanFields: FormFieldInfo[] = []
    document.querySelectorAll("input:not(form input), select:not(form select), textarea:not(form textarea)").forEach((el) => {
      const field = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (field.hasAttribute("data-devtools")) return
      if (field.type === "hidden" || field.type === "submit" || field.type === "button") return

      orphanFields.push({
        element: field,
        name: field.name || field.id || "unnamed",
        type: field.type || "text",
        value: field.type === "checkbox" || field.type === "radio"
          ? (field as HTMLInputElement).checked ? "checked" : "unchecked"
          : field.value,
        validity: field.validity || null,
        required: field.required,
        disabled: field.disabled,
        readOnly: "readOnly" in field ? (field as HTMLInputElement | HTMLTextAreaElement).readOnly : false,
        label: getFieldLabel(field),
        formIndex: -1,
        issues: getValidationIssues(field),
      })
    })

    if (orphanFields.length > 0) {
      foundForms.push({
        form: null as unknown as HTMLFormElement,
        name: "Orphan Fields",
        action: "",
        method: "",
        fields: orphanFields,
        isValid: orphanFields.every(f => f.issues.length === 0),
      })
    }

    setForms(foundForms)
    if (foundForms.length > 0 && selectedFormIndex >= foundForms.length) {
      setSelectedFormIndex(0)
    }

    toast.success(`Found ${foundForms.length} form(s) with ${foundForms.reduce((acc, f) => acc + f.fields.length, 0)} fields`)
  }, [selectedFormIndex])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(scan, 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, scan])

  // Select field
  const selectField = useCallback((field: FormFieldInfo) => {
    const computed = getComputedStyle(field.element)
    const computedStyles: Record<string, string> = {}
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i]
      computedStyles[prop] = computed.getPropertyValue(prop)
    }

    setSelectedElement({
      element: field.element,
      tagName: field.element.tagName.toLowerCase(),
      id: field.element.id,
      classList: Array.from(field.element.classList),
      rect: field.element.getBoundingClientRect(),
      computedStyles,
    })

    field.element.focus()
    field.element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [setSelectedElement])

  // Current form
  const currentForm = forms[selectedFormIndex]

  // Stats
  const stats = useMemo(() => {
    if (!currentForm) return null

    return {
      total: currentForm.fields.length,
      invalid: currentForm.fields.filter(f => f.issues.length > 0).length,
      required: currentForm.fields.filter(f => f.required).length,
      disabled: currentForm.fields.filter(f => f.disabled).length,
    }
  }, [currentForm])

  if (!isOpen) return null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
        <div className="flex items-center gap-2">
          <FormInput className="h-4 w-4 text-teal-500" />
          <span>Form Inspector</span>
          {forms.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1 h-4">
              {forms.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Scan button */}
        <Button variant="default" size="sm" className="w-full h-7" onClick={scan}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Scan Forms
        </Button>

        {/* Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Show values</Label>
            <Switch checked={showValues} onCheckedChange={setShowValues} />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Auto</Label>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
        </div>

        {/* Form selector */}
        {forms.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {forms.map((form, i) => (
              <Badge
                key={i}
                variant={selectedFormIndex === i ? "default" : "outline"}
                className={cn(
                  "cursor-pointer text-[10px] h-5",
                  !form.isValid && "border-destructive"
                )}
                onClick={() => setSelectedFormIndex(i)}
              >
                {form.name}
                {!form.isValid && <AlertTriangle className="h-3 w-3 ml-1" />}
              </Badge>
            ))}
          </div>
        )}

        {/* Form info */}
        {currentForm && (
          <div className="p-2 bg-muted/30 rounded text-[10px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              {currentForm.isValid ? (
                <span className="text-green-500 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Valid
                </span>
              ) : (
                <span className="text-destructive flex items-center gap-1">
                  <X className="h-3 w-3" /> Invalid
                </span>
              )}
            </div>
            {currentForm.method && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span>{currentForm.method}</span>
              </div>
            )}
            {stats && (
              <div className="flex gap-2 pt-1">
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {stats.total} fields
                </Badge>
                {stats.invalid > 0 && (
                  <Badge variant="destructive" className="text-[9px] h-4 px-1">
                    {stats.invalid} invalid
                  </Badge>
                )}
                {stats.required > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">
                    {stats.required} required
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fields list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-1">
            {!currentForm || currentForm.fields.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {forms.length === 0 ? "Click Scan to find forms" : "No form fields found"}
              </div>
            ) : (
              currentForm.fields.map((field, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-2 rounded border cursor-pointer",
                    field.issues.length > 0
                      ? "bg-destructive/10 border-destructive/30"
                      : field.disabled
                        ? "bg-muted/50 border-transparent opacity-60"
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                  )}
                  onClick={() => selectField(field)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{field.label}</span>
                    <div className="flex items-center gap-1">
                      {field.required && (
                        <Badge variant="secondary" className="text-[8px] h-4 px-1">REQ</Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {field.type}
                      </Badge>
                    </div>
                  </div>

                  {showValues && (
                    <div className="text-[10px] text-muted-foreground truncate font-mono">
                      {field.value || "(empty)"}
                    </div>
                  )}

                  {field.issues.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      {field.issues.join(", ")}
                    </div>
                  )}

                  {field.disabled && (
                    <div className="text-[9px] text-muted-foreground mt-1">Disabled</div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Tips */}
        <div className="p-2 bg-muted/30 rounded text-[10px] text-muted-foreground">
          Inspect form fields, validation state, and values in real-time.
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
