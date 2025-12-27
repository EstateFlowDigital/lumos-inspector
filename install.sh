#!/bin/bash

# Lumos Inspector - One-Line Installer
# Usage: ./install.sh /path/to/your/project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║       Lumos Inspector Installer       ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if target directory was provided
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: $0 /path/to/your/project${NC}"
  echo ""
  echo "Example:"
  echo "  $0 ~/projects/my-lumos-app"
  exit 1
fi

TARGET_DIR="$1"

# Verify target is a valid project
if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}Error: Directory does not exist: $TARGET_DIR${NC}"
  exit 1
fi

if [ ! -f "$TARGET_DIR/package.json" ]; then
  echo -e "${RED}Error: No package.json found. Is this a valid project?${NC}"
  exit 1
fi

# Create components directory if needed
COMPONENTS_DIR="$TARGET_DIR/components"
if [ ! -d "$COMPONENTS_DIR" ]; then
  echo -e "${YELLOW}Creating components directory...${NC}"
  mkdir -p "$COMPONENTS_DIR"
fi

# Check if lumos-inspector already exists
INSTALL_DIR="$COMPONENTS_DIR/lumos-inspector"
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}Lumos Inspector already installed. Updating...${NC}"
  rm -rf "$INSTALL_DIR"
fi

# Copy the package
echo -e "${BLUE}Installing Lumos Inspector...${NC}"
cp -r "$SCRIPT_DIR" "$INSTALL_DIR"

# Remove install script and other non-essential files from installed copy
rm -f "$INSTALL_DIR/install.sh"
rm -f "$INSTALL_DIR/setup.sh"
rm -f "$INSTALL_DIR/package.json"

echo -e "${GREEN}✓ Lumos Inspector installed to: $INSTALL_DIR${NC}"
echo ""

# Check for required dependencies
echo -e "${BLUE}Checking dependencies...${NC}"

cd "$TARGET_DIR"

MISSING_DEPS=""

# Check for required packages
for pkg in "lucide-react" "sonner" "clsx" "tailwind-merge"; do
  if ! grep -q "\"$pkg\"" package.json 2>/dev/null; then
    MISSING_DEPS="$MISSING_DEPS $pkg"
  fi
done

if [ -n "$MISSING_DEPS" ]; then
  echo -e "${YELLOW}Missing dependencies:$MISSING_DEPS${NC}"
  echo ""
  read -p "Install missing dependencies? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install $MISSING_DEPS
    echo -e "${GREEN}✓ Dependencies installed${NC}"
  else
    echo -e "${YELLOW}Remember to install:${NC}"
    echo "  npm install$MISSING_DEPS"
  fi
else
  echo -e "${GREEN}✓ All dependencies found${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Installation Complete!          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Add to your layout (app/layout.tsx):"
echo ""
echo -e "   ${YELLOW}import { LumosInspector } from '@/components/lumos-inspector'${NC}"
echo -e "   ${YELLOW}import { Toaster } from 'sonner'${NC}"
echo ""
echo "   export default function RootLayout({ children }) {"
echo "     return ("
echo "       <html>"
echo "         <body>"
echo "           {children}"
echo -e "           ${YELLOW}<LumosInspector />${NC}"
echo -e "           ${YELLOW}<Toaster />${NC}"
echo "         </body>"
echo "       </html>"
echo "     )"
echo "   }"
echo ""
echo "2. Make sure you have shadcn/ui components:"
echo ""
echo -e "   ${YELLOW}npx shadcn@latest add button input label badge tabs scroll-area \\${NC}"
echo -e "   ${YELLOW}  collapsible select tooltip separator slider switch avatar${NC}"
echo ""
echo "3. Start your dev server and click the floating button!"
echo ""
