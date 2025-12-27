"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Copy, ClipboardCopy, ClipboardPaste, Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { useInspector } from "../../inspector-context"

export function CodeTab() {
  const { selectedElement, activeClass, exportCSS, clearGlobalStyles, updateClassStyle } = useInspector()
  const [copiedStyles, setCopiedStyles] = useState<Record<string, string> | null>(null)

  // Copy styles from current element
  const copyStyles = useCallback(() => {
    if (!selectedElement?.element) return

    const computed = window.getComputedStyle(selectedElement.element)
    const stylesToCopy: Record<string, string> = {}

    const propertiesToCopy = [
      'display', 'flex-direction', 'justify-content', 'align-items', 'gap',
      'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
      'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'font-size', 'font-weight', 'line-height', 'text-align', 'color',
      'background-color', 'background-image',
      'border-width', 'border-style', 'border-color', 'border-radius',
      'box-shadow', 'opacity', 'position', 'transform'
    ]

    propertiesToCopy.forEach(prop => {
      const value = computed.getPropertyValue(prop)
      if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== '0px') {
        stylesToCopy[prop] = value
      }
    })

    setCopiedStyles(stylesToCopy)
    toast.success('Styles copied to clipboard')
  }, [selectedElement])

  // Paste styles to current element
  const pasteStyles = useCallback(() => {
    if (!copiedStyles || !selectedElement?.element) return

    Object.entries(copiedStyles).forEach(([property, value]) => {
      if (activeClass) {
        updateClassStyle(activeClass, property, value)
      } else {
        selectedElement.element.style.setProperty(property, value)
      }
    })

    toast.success(`${Object.keys(copiedStyles).length} styles pasted`)
  }, [copiedStyles, selectedElement, activeClass, updateClassStyle])

  // Export CSS to clipboard
  const handleExportCSS = useCallback(() => {
    const css = exportCSS()
    if (css) {
      navigator.clipboard.writeText(css)
      toast.success('CSS exported to clipboard')
    } else {
      toast.info('No custom styles to export')
    }
  }, [exportCSS])

  return (
    <div className="space-y-4 p-3">
      {/* Copy/Paste Styles */}
      <div className="border rounded-lg p-3 bg-muted/30">
        <h4 className="font-medium text-sm mb-3">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={copyStyles}
            disabled={!selectedElement}
          >
            <ClipboardCopy className="h-3.5 w-3.5 mr-1.5" />
            Copy Styles
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={pasteStyles}
            disabled={!copiedStyles || !selectedElement}
          >
            <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />
            Paste Styles
            {copiedStyles && (
              <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">
                {Object.keys(copiedStyles).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Export Global CSS */}
      <div className="border rounded-lg p-3 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Global CSS Changes</h4>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleExportCSS}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                clearGlobalStyles()
                toast.success('All custom styles cleared')
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-40 whitespace-pre-wrap">
          {exportCSS() || '/* No custom styles yet */'}
        </pre>
      </div>

      {selectedElement && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">HTML</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  const html = `<${selectedElement.tagName}${selectedElement.id ? ` id="${selectedElement.id}"` : ""}${selectedElement.classList.length > 0 ? ` class="${selectedElement.classList.join(" ")}"` : ""}>`
                  navigator.clipboard.writeText(html)
                  toast.success('HTML copied')
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
              {`<${selectedElement.tagName}${selectedElement.id ? ` id="${selectedElement.id}"` : ""}${selectedElement.classList.length > 0 ? ` class="${selectedElement.classList.join(" ")}"` : ""}>`}
            </pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Computed Styles</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  const styles = Object.entries(selectedElement.computedStyles)
                    .filter(([, v]) => v && v !== "none" && v !== "normal" && v !== "auto")
                    .map(([k, v]) => `${k}: ${v};`)
                    .join("\n")
                  navigator.clipboard.writeText(styles)
                  toast.success('Styles copied')
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-64">
              {Object.entries(selectedElement.computedStyles)
                .filter(([, v]) => v && v !== "none" && v !== "normal" && v !== "auto")
                .map(([k, v]) => `${k}: ${v};`)
                .join("\n")}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
