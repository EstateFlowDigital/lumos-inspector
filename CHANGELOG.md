# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Dark Mode Overlay Visibility**: Fixed icons and text being invisible on light-themed pages
  - All hardcoded dark colors in lumos-connect.js CSS now use CSS variables
  - Overlay inspector now properly adapts to light/dark theme based on page detection
  - Fixed `background`, `color`, `border` properties across 100+ CSS rules
- **Direct Connection Mode**: Fixed Socket.io client not loading due to incorrect path
  - Socket.io client was being loaded from `/socket.io/socket.io.js` instead of `/lumos-socket/socket.io.js`
  - This caused the "Waiting for Target App" state to never resolve

### Added
- **AI Assistant Tool** - Claude-powered style analysis and suggestions
  - Analyze selected elements for CSS improvement opportunities
  - Get suggestions for layout, typography, spacing, color, accessibility, and performance
  - One-click apply suggestions with automatic undo history
  - Chat interface for asking questions about styles
  - Context-aware suggestions based on element type and current styles
  - API route `/api/ai-assistant` for AI analysis (requires ANTHROPIC_API_KEY)
- **Theme Detection** - Auto-detects light/dark mode from system preferences, html/body classes, or background color
- **Quick Actions Bar** - Labeled buttons for Audit, Changes, and Responsive with icons
- **Style Audit** - Detects elements missing Lumos utility classes (`u-*`, `is-*`, `w-*`) and data attributes (`data-state`, `data-trigger`, etc.)
- **Improvement Log Panel** - Shows all detected style issues with click-to-navigate functionality
- **Element Operations** - Duplicate (⌘D), Copy (⌘C), Paste (⌘V), Delete (⌫) with full undo support
- **Inline Text Editing** - Double-click any text element to edit content directly
- **Comprehensive Changes Log** - Tracks all CSS, HTML, and content changes with visual diffs
- **Claude-friendly Export** - Export changes as JSON optimized for pasting into Claude to auto-update code
- **Animation Timeline Editor** - Visual keyframe animation builder with curve presets
- **Gradient Builder** - Visual gradient editor with angle, color stops, and type selection
- **Tailwind CSS Export** - Convert styles to Tailwind utility classes
- **Tooltips** - All toolbar buttons now have descriptive tooltips with keyboard shortcuts
- 8 new command palette entries for all new features

### Changed
- **Responsive Breakpoints** - Now uses CSS-based viewport simulation instead of iframe for real-time editing
- **Panel Width** - Inspector panel widened from 320px to 340px for better readability
- **Scrolling** - All panels now properly scrollable with custom styled scrollbars
- **CSS Architecture** - All hardcoded colors replaced with CSS variables for theming

### Fixed
- Variable naming conflicts causing FAB to disappear (`breakpoints`, `currentBreakpoint`, `currentViewport`)
- Suspense boundary error for `useSearchParams()` in create-pr page
- Responsive breakpoints now work correctly with real-time editing
- Containers properly scroll to show all tools
- Missing icons (`clipboard`, `history`, `plus`, `edit`) causing undefined in UI
- Function name mismatch (`openChangesLog` → `openChangesLogPanel`)
- Variable reference error (`selectedEl` → `selectedElement`) in element operations
- Keyboard shortcuts for element operations now work correctly

## [0.1.0] - 2025-12-26

### Added
- Initial Lumos Inspector implementation
- Core inspection tools and utilities
- UI components for inspector interface
- Test suite with Vitest
- Installation and setup scripts
