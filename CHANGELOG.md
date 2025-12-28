# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Style Audit** - Detects elements missing Lumos utility classes (`u-*`, `is-*`, `w-*`) and data attributes (`data-state`, `data-trigger`, etc.)
- **Improvement Log Panel** - Shows all detected style issues with click-to-navigate functionality
- **Element Operations** - Duplicate (⌘D), Copy (⌘C), Paste (⌘V), Delete (⌫) with full undo support
- **Inline Text Editing** - Double-click any text element to edit content directly
- **Comprehensive Changes Log** - Tracks all CSS, HTML, and content changes with visual diffs
- **Claude-friendly Export** - Export changes as JSON optimized for pasting into Claude to auto-update code
- **Animation Timeline Editor** - Visual keyframe animation builder with curve presets
- **Gradient Builder** - Visual gradient editor with angle, color stops, and type selection
- **Tailwind CSS Export** - Convert styles to Tailwind utility classes
- **Responsive Breakpoints** - Improved viewport preview with iframe-based rendering
- 8 new command palette entries for all new features

### Fixed
- Variable naming conflicts causing FAB to disappear (`breakpoints`, `currentBreakpoint`, `currentViewport`)
- Suspense boundary error for `useSearchParams()` in create-pr page
- Responsive breakpoint preview now uses iframe for accurate rendering

## [0.1.0] - 2025-12-26

### Added
- Initial Lumos Inspector implementation
- Core inspection tools and utilities
- UI components for inspector interface
- Test suite with Vitest
- Installation and setup scripts
