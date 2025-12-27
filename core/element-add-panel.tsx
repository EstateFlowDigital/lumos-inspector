"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import {
  X, Plus, Box, Type, Image, Link, List, Table, Folder,
  Square, Circle, Code, FileText, FormInput, ToggleLeft,
  CheckSquare, Radio, Sliders, Calendar, Search, Upload
} from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { ScrollArea } from "../ui/scroll-area"
import { Badge } from "../ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { toast } from "sonner"
import { useInspector } from "./inspector-context"

// Element templates
interface ElementTemplate {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  html: string
  category: "layout" | "text" | "media" | "form" | "interactive"
  description: string
}

const elementTemplates: ElementTemplate[] = [
  // Layout - All use base classes with optional combo classes
  {
    id: "div",
    name: "Container",
    icon: Box,
    html: '<div class="lumos-container">Container content</div>',
    category: "layout",
    description: "Centered container with max-width",
  },
  {
    id: "wrapper",
    name: "Wrapper",
    icon: Box,
    html: '<div class="lumos-wrapper">Wrapper content</div>',
    category: "layout",
    description: "Generic wrapper element",
  },
  {
    id: "section",
    name: "Section",
    icon: Folder,
    html: '<section class="lumos-section"><h2 class="lumos-h2">Section Title</h2><p class="lumos-paragraph">Section content</p></section>',
    category: "layout",
    description: "Semantic section container",
  },
  {
    id: "flex-row",
    name: "Flex Row",
    icon: Square,
    html: '<div class="lumos-flex lumos-flex-row"><div class="lumos-text">Item 1</div><div class="lumos-text">Item 2</div><div class="lumos-text">Item 3</div></div>',
    category: "layout",
    description: "Horizontal flex container",
  },
  {
    id: "flex-col",
    name: "Flex Column",
    icon: Square,
    html: '<div class="lumos-flex lumos-flex-col"><div class="lumos-text">Item 1</div><div class="lumos-text">Item 2</div><div class="lumos-text">Item 3</div></div>',
    category: "layout",
    description: "Vertical flex container",
  },
  {
    id: "grid-2col",
    name: "Grid 2 Col",
    icon: Square,
    html: '<div class="lumos-grid lumos-grid-2"><div class="lumos-text">Cell 1</div><div class="lumos-text">Cell 2</div><div class="lumos-text">Cell 3</div><div class="lumos-text">Cell 4</div></div>',
    category: "layout",
    description: "Two column grid layout",
  },
  {
    id: "grid-3col",
    name: "Grid 3 Col",
    icon: Square,
    html: '<div class="lumos-grid lumos-grid-3"><div class="lumos-text">Cell 1</div><div class="lumos-text">Cell 2</div><div class="lumos-text">Cell 3</div></div>',
    category: "layout",
    description: "Three column grid layout",
  },
  {
    id: "card",
    name: "Card",
    icon: Square,
    html: '<div class="lumos-card"><div class="lumos-card-header"><h3 class="lumos-h3">Card Title</h3></div><div class="lumos-card-body"><p class="lumos-paragraph">Card description goes here.</p></div></div>',
    category: "layout",
    description: "Card with header and body",
  },

  // Text - All use base typography classes
  {
    id: "h1",
    name: "Heading 1",
    icon: Type,
    html: '<h1 class="lumos-h1">Heading 1</h1>',
    category: "text",
    description: "Main page heading",
  },
  {
    id: "h2",
    name: "Heading 2",
    icon: Type,
    html: '<h2 class="lumos-h2">Heading 2</h2>',
    category: "text",
    description: "Section heading",
  },
  {
    id: "h3",
    name: "Heading 3",
    icon: Type,
    html: '<h3 class="lumos-h3">Heading 3</h3>',
    category: "text",
    description: "Subsection heading",
  },
  {
    id: "paragraph",
    name: "Paragraph",
    icon: FileText,
    html: '<p class="lumos-paragraph">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
    category: "text",
    description: "Standard paragraph",
  },
  {
    id: "span",
    name: "Text Span",
    icon: Type,
    html: '<span>Inline text</span>',
    category: "text",
    description: "Inline text element",
  },
  {
    id: "link",
    name: "Link",
    icon: Link,
    html: '<a href="#" class="lumos-link">Link text</a>',
    category: "text",
    description: "Anchor link",
  },
  {
    id: "ul",
    name: "Unordered List",
    icon: List,
    html: '<ul class="lumos-list lumos-list-disc"><li class="lumos-list-item">Item 1</li><li class="lumos-list-item">Item 2</li><li class="lumos-list-item">Item 3</li></ul>',
    category: "text",
    description: "Bullet list",
  },
  {
    id: "ol",
    name: "Ordered List",
    icon: List,
    html: '<ol class="lumos-list lumos-list-decimal"><li class="lumos-list-item">First item</li><li class="lumos-list-item">Second item</li><li class="lumos-list-item">Third item</li></ol>',
    category: "text",
    description: "Numbered list",
  },
  {
    id: "code",
    name: "Code Block",
    icon: Code,
    html: '<pre class="lumos-code-block"><code class="lumos-code">const hello = "world";</code></pre>',
    category: "text",
    description: "Code snippet",
  },

  // Media
  {
    id: "image",
    name: "Image",
    icon: Image,
    html: '<img src="https://via.placeholder.com/400x300" alt="Placeholder" class="lumos-image" />',
    category: "media",
    description: "Image placeholder",
  },
  {
    id: "figure",
    name: "Figure",
    icon: Image,
    html: '<figure class="lumos-figure"><img src="https://via.placeholder.com/400x300" alt="Figure" class="lumos-image" /><figcaption class="lumos-figcaption">Figure caption</figcaption></figure>',
    category: "media",
    description: "Image with caption",
  },
  {
    id: "video",
    name: "Video",
    icon: Circle,
    html: '<video controls class="lumos-video"><source src="" type="video/mp4" />Your browser does not support video.</video>',
    category: "media",
    description: "Video player",
  },
  {
    id: "icon-placeholder",
    name: "Icon",
    icon: Circle,
    html: '<div class="lumos-icon lumos-icon-lg"><span class="lumos-icon-text">Icon</span></div>',
    category: "media",
    description: "Icon placeholder",
  },

  // Form - All use base form classes
  {
    id: "input-text",
    name: "Text Input",
    icon: FormInput,
    html: '<input type="text" placeholder="Enter text..." class="lumos-input" />',
    category: "form",
    description: "Text input field",
  },
  {
    id: "input-email",
    name: "Email Input",
    icon: FormInput,
    html: '<input type="email" placeholder="email@example.com" class="lumos-input lumos-input-email" />',
    category: "form",
    description: "Email input field",
  },
  {
    id: "textarea",
    name: "Textarea",
    icon: FormInput,
    html: '<textarea placeholder="Enter message..." rows="4" class="lumos-textarea"></textarea>',
    category: "form",
    description: "Multi-line text input",
  },
  {
    id: "select",
    name: "Select",
    icon: FormInput,
    html: '<select class="lumos-select"><option>Option 1</option><option>Option 2</option><option>Option 3</option></select>',
    category: "form",
    description: "Dropdown select",
  },
  {
    id: "checkbox",
    name: "Checkbox",
    icon: CheckSquare,
    html: '<label class="lumos-checkbox-label"><input type="checkbox" class="lumos-checkbox" /><span class="lumos-label-text">Checkbox label</span></label>',
    category: "form",
    description: "Checkbox input",
  },
  {
    id: "radio",
    name: "Radio Group",
    icon: Radio,
    html: '<div class="lumos-radio-group"><label class="lumos-radio-label"><input type="radio" name="radio-group" class="lumos-radio" /><span class="lumos-label-text">Option A</span></label><label class="lumos-radio-label"><input type="radio" name="radio-group" class="lumos-radio" /><span class="lumos-label-text">Option B</span></label></div>',
    category: "form",
    description: "Radio button group",
  },
  {
    id: "form",
    name: "Form",
    icon: Folder,
    html: '<form class="lumos-form"><div class="lumos-form-group"><label class="lumos-label">Name</label><input type="text" placeholder="Your name" class="lumos-input" /></div><button type="submit" class="lumos-btn lumos-btn-primary">Submit</button></form>',
    category: "form",
    description: "Complete form element",
  },

  // Interactive - All use base interactive classes
  {
    id: "button-primary",
    name: "Primary Button",
    icon: Square,
    html: '<button class="lumos-btn lumos-btn-primary">Primary Button</button>',
    category: "interactive",
    description: "Primary action button",
  },
  {
    id: "button-secondary",
    name: "Secondary Button",
    icon: Square,
    html: '<button class="lumos-btn lumos-btn-secondary">Secondary Button</button>',
    category: "interactive",
    description: "Secondary action button",
  },
  {
    id: "button-outline",
    name: "Outline Button",
    icon: Square,
    html: '<button class="lumos-btn lumos-btn-outline">Outline Button</button>',
    category: "interactive",
    description: "Outlined button",
  },
  {
    id: "button-ghost",
    name: "Ghost Button",
    icon: Square,
    html: '<button class="lumos-btn lumos-btn-ghost">Ghost Button</button>',
    category: "interactive",
    description: "Transparent button",
  },
  {
    id: "badge",
    name: "Badge",
    icon: Circle,
    html: '<span class="lumos-badge">Badge</span>',
    category: "interactive",
    description: "Small label badge",
  },
  {
    id: "badge-primary",
    name: "Badge Primary",
    icon: Circle,
    html: '<span class="lumos-badge lumos-badge-primary">Primary</span>',
    category: "interactive",
    description: "Primary colored badge",
  },
  {
    id: "table",
    name: "Table",
    icon: Table,
    html: '<table class="lumos-table"><thead class="lumos-table-head"><tr class="lumos-table-row"><th class="lumos-table-cell lumos-table-header">Header 1</th><th class="lumos-table-cell lumos-table-header">Header 2</th></tr></thead><tbody class="lumos-table-body"><tr class="lumos-table-row"><td class="lumos-table-cell">Cell 1</td><td class="lumos-table-cell">Cell 2</td></tr><tr class="lumos-table-row"><td class="lumos-table-cell">Cell 3</td><td class="lumos-table-cell">Cell 4</td></tr></tbody></table>',
    category: "interactive",
    description: "Data table",
  },
]

const categoryLabels: Record<string, string> = {
  layout: "Layout",
  text: "Text",
  media: "Media",
  form: "Form",
  interactive: "Interactive",
}

export function ElementAddPanel() {
  const { selectedElement, showElementPanel, setShowElementPanel, refreshDOMTree } = useInspector()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")

  // Filter elements based on search and category
  const filteredElements = elementTemplates.filter((el) => {
    const matchesSearch = searchQuery
      ? el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        el.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    const matchesCategory = activeCategory === "all" || el.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Insert element
  const insertElement = useCallback((template: ElementTemplate, position: "before" | "after" | "inside") => {
    if (!selectedElement?.element) {
      toast.error("No element selected", { description: "Select an element to insert relative to" })
      return
    }

    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = template.html
    const newElement = tempDiv.firstElementChild as HTMLElement

    if (!newElement) {
      toast.error("Failed to create element")
      return
    }

    const target = selectedElement.element

    switch (position) {
      case "before":
        target.parentElement?.insertBefore(newElement, target)
        break
      case "after":
        target.parentElement?.insertBefore(newElement, target.nextSibling)
        break
      case "inside":
        target.appendChild(newElement)
        break
    }

    // Refresh the DOM tree
    refreshDOMTree()
    toast.success(`Inserted ${template.name}`, { description: `Position: ${position}` })
  }, [selectedElement, refreshDOMTree])

  if (!showElementPanel) return null

  return (
    <div
      className="fixed left-[400px] top-0 h-screen bg-card border-l shadow-xl z-9997 flex flex-col overflow-hidden"
      style={{ width: 320 }}
      data-devtools
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-chart-2" />
          <span className="font-semibold text-sm">Add Element</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setShowElementPanel(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search elements..."
            className="h-8 text-xs pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-2 border-b overflow-x-auto">
        <Button
          variant={activeCategory === "all" ? "secondary" : "ghost"}
          size="sm"
          className="h-6 text-[10px] px-2 shrink-0"
          onClick={() => setActiveCategory("all")}
        >
          All
        </Button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <Button
            key={key}
            variant={activeCategory === key ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2 shrink-0"
            onClick={() => setActiveCategory(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Element Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-2 p-2">
          {filteredElements.map((template) => (
            <div
              key={template.id}
              className="group relative p-3 rounded-lg border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
            >
              <div className="flex flex-col items-center gap-2">
                <template.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-center">{template.name}</span>
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-background/95 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => insertElement(template, "before")}
                  title="Insert before selected element"
                >
                  Before
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => insertElement(template, "inside")}
                  title="Insert inside selected element"
                >
                  Inside
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => insertElement(template, "after")}
                  title="Insert after selected element"
                >
                  After
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredElements.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No elements found</p>
          </div>
        )}
      </ScrollArea>

      {/* Footer hint */}
      <div className="p-2 border-t bg-muted/30 text-[10px] text-muted-foreground text-center">
        Hover over an element and choose where to insert
      </div>
    </div>
  )
}
