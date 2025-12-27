# Lumos Inspector

A Webflow-style visual inspector for Lumos-based React/Next.js applications. This is a standalone package that provides visual editing tools for inspecting and modifying element styles in real-time.

## Project Context (For Claude)

This package is part of the **VS Applications** ecosystem located at `/Users/cameronameigh/Desktop/VS Applications/`. It's designed to be shared across multiple Lumos-based apps via symlinks.

### Current Apps Using This Package
- `lumos-webflow-app` - Main Webflow-like application
- `sms-quote-tool` - Quote tool application

### Architecture Overview

```
lumos-inspector/
├── index.tsx                    # Main exports (LumosInspector component)
├── core/                        # 15 core components
│   ├── inspector.tsx            # Main inspector wrapper
│   ├── inspector-context.tsx    # React context for state management
│   ├── inspector-panel.tsx      # Right panel with style tools
│   ├── navigator-panel.tsx      # Left panel with DOM tree
│   ├── inspector-overlay.tsx    # Element selection overlay
│   ├── keyboard-shortcuts.tsx   # Global keyboard shortcuts
│   ├── element-breadcrumb.tsx   # Bottom navigation breadcrumb
│   ├── alignment-guides.tsx     # Alignment guide overlays
│   ├── measurement-tool.tsx     # Pixel measurement tool
│   └── ...
├── tools/                       # 81 individual tool components
│   ├── style-manager.tsx        # Global CSS injection manager
│   ├── box-shadow-builder.tsx   # Visual shadow editor
│   ├── gradient-builder.tsx     # Visual gradient editor
│   ├── spacing-visualizer.tsx   # Box model visualization
│   └── ...
├── ui/                          # 33 bundled shadcn/ui components
│   ├── button.tsx
│   ├── select.tsx
│   └── ...
└── lib/
    └── utils.ts                 # cn() utility for class merging
```

### Key Technical Details

1. **State Management**: Uses React Context (`InspectorProvider`) to share state across components
   - `selectedElement: ElementInfo | null` - Currently selected DOM element
   - `activeClass: string | null` - Class being edited (for class-based styling)
   - `styleChangeCounter: number` - Increments to trigger UI re-renders after style changes

2. **Style Application**:
   - **Inline styles**: Applied directly via `element.style.setProperty()`
   - **Class styles**: Injected globally via `GlobalStyleManager` in style-manager.tsx
   - All injected class styles use `!important` for CSS specificity

3. **Z-Index Layers** (important for UI components):
   - Inspector panels: `z-9998`
   - Overlays: `z-9990` to `z-9997`
   - UI dropdowns/dialogs: `z-[10002]` (must be above panels)
   - Context menus: `z-[10001]`

4. **Element Selection**:
   - Elements are captured via click handlers in `inspector-overlay.tsx`
   - The `ElementInfo` interface stores the direct DOM reference in `element: HTMLElement`
   - Elements with `data-devtools` attribute are excluded from selection

---

## Quick Start

### 1. Link or Copy the folder

**Option A: Symlink (Recommended for VS Applications)**

Create a symlink from your project to the central package:

```bash
cd your-project/components
ln -s "../../lumos-inspector" lumos-inspector
```

This way, updates to the central package apply to all linked apps automatically.

**Option B: Copy (For standalone projects)**

Copy the entire `lumos-inspector` folder to your project's `components/` directory.

### 2. Install dependencies

```bash
npm install lucide-react sonner clsx tailwind-merge
```

> **Note:** This package is fully standalone - all UI components are included. No need to install shadcn/ui separately.

### 3. Add to your layout

```tsx
// app/layout.tsx
import { LumosInspector } from "@/components/lumos-inspector"
import { Toaster } from "sonner"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <LumosInspector />
        <Toaster />
      </body>
    </html>
  )
}
```

**That's it!** A floating button will appear in the corner. Click it to open the inspector.

## Options

```tsx
// Default: Shows in development, hidden in production
<LumosInspector />

// Force show in production (for staging environments)
<LumosInspector forceShow />

// Disable entirely
<LumosInspector disabled />
```

---

## Recent Fixes & Technical Notes

### Z-Index Issues (Fixed)
**Problem**: Dropdowns, dialogs, and popovers appeared behind the inspector panels.
**Solution**: Updated all UI component z-index values from `z-50` to `z-[10002]` to appear above inspector panels (`z-9998`).

**Files modified**:
- `ui/select.tsx` - SelectContent
- `ui/popover.tsx` - PopoverContent
- `ui/dropdown-menu.tsx` - DropdownMenuContent & SubContent
- `ui/tooltip.tsx` - TooltipContent
- `ui/context-menu.tsx` - ContextMenuContent & SubContent
- `ui/dialog.tsx` - DialogOverlay & DialogContent
- `ui/sheet.tsx` - SheetOverlay & SheetContent
- `ui/alert-dialog.tsx` - AlertDialogOverlay & Content

### Style Changes Not Applying (Fixed)
**Problem**: Styles applied through the inspector weren't visually updating.
**Solution**:
1. Added `styleChangeCounter` state that increments after each style change
2. Added `notifyStyleChange()` function to trigger re-renders
3. Updated useEffect dependency arrays to include `styleChangeCounter`
4. Added `isElementValid()` to check if element is still in DOM before applying styles

**Files modified**:
- `core/inspector-context.tsx` - Added new state and functions
- `core/inspector-panel.tsx` - Updated `applyStyle()` function

### CSS Specificity Issues (Fixed)
**Problem**: Injected class styles were being overridden by existing CSS rules.
**Solution**: Added `!important` to all injected CSS declarations in `style-manager.tsx`.

---

## Debugging Common Issues

### Styles not applying to elements
1. Check browser console for errors
2. Verify element is still in DOM (`isElementValid()` should return true)
3. Check if existing CSS has `!important` rules (rare edge case)
4. Inspect the `devtools-global-styles` style element in `<head>`

### Dropdowns/dialogs appearing behind panels
1. Ensure z-index is `z-[10002]` in the component's className
2. Check that the component uses a Portal (Radix components do this by default)

### Element selection not working
1. Make sure the element doesn't have `data-devtools` attribute
2. Check if a parent element has `pointer-events: none`
3. Verify the inspector overlay is rendering (`InspectorOverlay` component)

---

## Features

### 80+ Visual Editing Tools

**Layout Tools**
- Layout Editor (Flex/Grid)
- Spacing Visualizer
- Position Helper
- CSS Grid Inspector
- Subgrid Inspector
- Overflow Debugger
- Logical Properties (RTL/LTR)

**Visual Tools**
- Box Shadow Builder
- Text Shadow Builder
- Gradient Builder
- Filter Editor
- Backdrop Filter
- Clip Path Editor
- CSS Shapes
- Mask Editor
- Border Editor
- Blend Mode Editor

**Typography Tools**
- Font Inspector
- Font Feature Settings
- Typography Scale Analyzer
- Writing Mode Editor
- List Style Editor

**Animation Tools**
- Animation Builder
- Animation Timeline
- Transition Builder
- Keyframe Editor
- Scroll Animations

**Debug Tools**
- Stacking Context Debugger
- Z-Index Map
- Overflow Debugger
- CSS Specificity Viewer
- Form State Inspector
- Event Listener Inspector

**Accessibility Tools**
- Accessibility Checker
- Color Contrast Checker
- Focus Order Checker

**Developer Tools**
- CSS Variables Explorer
- Storage Inspector
- DOM Tree Visualizer
- Mutation Observer Panel
- Console Panel
- Code Export
- Tailwind Generator

**Design Tools**
- Color Palette Extraction
- Design Token Validator
- Style Presets
- Style Bookmarks

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle Inspector |
| `Esc` | Deselect element / Cancel |
| `Delete` | Delete element |
| `Cmd+C` | Copy styles |
| `Cmd+V` | Paste styles |
| `Cmd+Shift+C` | Copy as HTML |
| `Cmd+D` | Duplicate element |
| `Cmd+G` | Wrap in div |
| `Cmd+1` | Toggle Navigator |
| `Cmd+2` | Toggle Inspector |
| `Arrow keys` | Nudge 1px |
| `Shift+Arrow` | Nudge 10px |

---

## Instructions for Claude (Copy-Paste for New Projects)

Use these instructions when asking Claude to add Lumos Inspector to a new Lumos-based project:

```
I need to add the Lumos Inspector visual development tool to this project.

1. Create symlink to the central package:
   cd ./components
   ln -s "/Users/cameronameigh/Desktop/VS Applications/lumos-inspector" lumos-inspector

   (Adjust the relative path based on your project location in VS Applications folder)

2. Install dependencies:
   npm install lucide-react sonner clsx tailwind-merge

3. Add to app/layout.tsx:
   import { LumosInspector } from "@/components/lumos-inspector"
   import { Toaster } from "sonner"

   // Add inside body:
   <LumosInspector />
   <Toaster />

4. Run build to verify:
   npm run build

The package is fully standalone. Updates to the central lumos-inspector folder apply to all linked apps.
Shows in development mode only. Use <LumosInspector forceShow /> for staging.
```

---

## Instructions for Claude (Continuing Development)

When continuing work on the Lumos Inspector:

### Key Files to Know
- **`core/inspector-context.tsx`** - Central state management. Add new shared state here.
- **`core/inspector-panel.tsx`** - Main right panel. Add new tools by importing and rendering them.
- **`tools/style-manager.tsx`** - CSS injection. Manages global style rules.
- **`core/inspector-overlay.tsx`** - Element selection and highlighting.

### Adding a New Tool
1. Create a new file in `tools/` (e.g., `tools/my-new-tool.tsx`)
2. Use `useInspector()` hook to access `selectedElement` and other state
3. Import and add the component to `inspector-panel.tsx`
4. Tool should check `if (!isOpen) return null` to hide when inspector is closed

### Common Patterns
```tsx
// Tool component pattern
export function MyTool() {
  const { isOpen, selectedElement, notifyStyleChange } = useInspector()

  if (!isOpen) return null

  const applyChange = () => {
    if (!selectedElement?.element) return
    selectedElement.element.style.someProp = 'value'
    notifyStyleChange() // Trigger UI refresh
  }

  return (
    <Collapsible>
      {/* Tool UI */}
    </Collapsible>
  )
}
```

### Testing Changes
1. Run the lumos-webflow-app: `cd ../lumos-webflow-app && npm run dev`
2. Open browser to localhost:3000
3. Press `Ctrl+Shift+D` to toggle inspector
4. Click "Select element" button and click on page elements

---

## Requirements

- React 18+ or 19+
- Next.js 14+ (App Router)
- Tailwind CSS v4

> **Fully Standalone:** All UI components are bundled. No shadcn/ui installation needed.

---

## License

MIT

---

## Changelog

**IMPORTANT: This project maintains a changelog. All changes must be documented.**

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

When making changes to this project, you **must** update the changelog:
1. Add your changes under the `[Unreleased]` section
2. Use the appropriate category: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
3. Write clear, concise descriptions of what changed
