"use client"

import * as React from "react"
import { Box, Grid3X3, Type, Droplet } from "lucide-react"
import { useInspector } from "../../inspector-context"
import { Section } from "../shared"

export function ComputedTab() {
  const { selectedElement } = useInspector()

  if (!selectedElement) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">Select an element to view computed styles</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3">
      {/* Box Model */}
      <Section title="Box Model" icon={Box} defaultOpen>
        <div className="space-y-2 text-xs">
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
            <div className="text-[10px] text-orange-600 dark:text-orange-400 mb-1">margin</div>
            <div className="flex justify-between px-2 text-orange-600 dark:text-orange-400">
              <span>{selectedElement.computedStyles.margin?.split(' ')[3] || '0'}</span>
              <span>{selectedElement.computedStyles.margin?.split(' ')[1] || '0'}</span>
            </div>
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded my-1">
              <div className="text-[10px] text-green-600 dark:text-green-400 mb-1">padding</div>
              <div className="flex justify-between px-2 text-green-600 dark:text-green-400">
                <span>{selectedElement.computedStyles.padding?.split(' ')[3] || '0'}</span>
                <span>{selectedElement.computedStyles.padding?.split(' ')[1] || '0'}</span>
              </div>
              <div className="p-3 bg-primary/10 border border-primary/30 rounded my-1 text-center">
                <span className="text-primary font-mono">
                  {selectedElement.computedStyles.width} × {selectedElement.computedStyles.height}
                </span>
              </div>
              <div className="flex justify-between px-2 text-green-600 dark:text-green-400">
                <span>{selectedElement.computedStyles.padding?.split(' ')[2] || '0'}</span>
              </div>
            </div>
            <div className="flex justify-between px-2 text-orange-600 dark:text-orange-400">
              <span>{selectedElement.computedStyles.margin?.split(' ')[2] || '0'}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Layout */}
      <Section title="Layout" icon={Grid3X3} defaultOpen={false}>
        <div className="space-y-1 text-xs">
          {[
            ['display', selectedElement.computedStyles.display],
            ['position', selectedElement.computedStyles.position],
            ['flex-direction', selectedElement.computedStyles.flexDirection],
            ['justify-content', selectedElement.computedStyles.justifyContent],
            ['align-items', selectedElement.computedStyles.alignItems],
            ['gap', selectedElement.computedStyles.gap],
            ['overflow', selectedElement.computedStyles.overflow],
          ].filter(([, v]) => v && v !== 'none' && v !== 'normal').map(([key, value]) => (
            <div key={key} className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-mono">{key}</span>
              <span className="font-mono text-primary">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" icon={Type} defaultOpen={false}>
        <div className="space-y-1 text-xs">
          {[
            ['font-size', selectedElement.computedStyles.fontSize],
            ['font-weight', selectedElement.computedStyles.fontWeight],
            ['color', selectedElement.computedStyles.color],
          ].filter(([, v]) => v).map(([key, value]) => (
            <div key={key} className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-mono">{key}</span>
              <span className="font-mono text-primary">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Background & Effects */}
      <Section title="Background & Effects" icon={Droplet} defaultOpen={false}>
        <div className="space-y-1 text-xs">
          {[
            ['background-color', selectedElement.computedStyles.backgroundColor],
            ['border', selectedElement.computedStyles.border],
            ['border-radius', selectedElement.computedStyles.borderRadius],
            ['box-shadow', selectedElement.computedStyles.boxShadow],
            ['opacity', selectedElement.computedStyles.opacity],
          ].filter(([, v]) => v && v !== 'none' && v !== 'rgba(0, 0, 0, 0)').map(([key, value]) => (
            <div key={key} className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-mono">{key}</span>
              <span className="font-mono text-primary truncate max-w-[150px]" title={value}>{value}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
