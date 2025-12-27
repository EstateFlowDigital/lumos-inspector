#!/bin/bash

# Lumos Inspector Setup Script
# This script prepares the inspector for use in a new Lumos project

set -e

echo "🔧 Setting up Lumos Inspector..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Fix imports in core files
echo "📦 Fixing import paths in core files..."

# Core files need to import tools from ../tools/
for file in "$SCRIPT_DIR/core/"*.tsx; do
  if [ -f "$file" ]; then
    # Fix tool imports: from "./tool-name" to "../tools/tool-name"
    sed -i '' 's|from "\./\([a-z-]*\)"|from "../tools/\1"|g' "$file" 2>/dev/null || \
    sed -i 's|from "\./\([a-z-]*\)"|from "../tools/\1"|g' "$file"

    # Fix inspector-context import for inspector-panel
    sed -i '' 's|from "\./inspector-context"|from "./inspector-context"|g' "$file" 2>/dev/null || \
    sed -i 's|from "\./inspector-context"|from "./inspector-context"|g' "$file"
  fi
done

# Fix imports in tool files
echo "📦 Fixing import paths in tool files..."

for file in "$SCRIPT_DIR/tools/"*.tsx; do
  if [ -f "$file" ]; then
    # Fix inspector-context import: from "./inspector-context" to "../core/inspector-context"
    sed -i '' 's|from "\./inspector-context"|from "../core/inspector-context"|g' "$file" 2>/dev/null || \
    sed -i 's|from "\./inspector-context"|from "../core/inspector-context"|g' "$file"

    # Fix draggable-input import
    sed -i '' 's|from "\./draggable-input"|from "../core/draggable-input"|g' "$file" 2>/dev/null || \
    sed -i 's|from "\./draggable-input"|from "../core/draggable-input"|g' "$file"
  fi
done

echo "✅ Lumos Inspector setup complete!"
echo ""
echo "📖 Usage:"
echo "   import { LumosInspector } from '@/components/lumos-inspector'"
echo ""
echo "   // In your layout.tsx:"
echo "   <LumosInspector />"
