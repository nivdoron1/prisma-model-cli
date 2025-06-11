#!/bin/bash
set -e

VERSION="1.0.8"

# Determine the absolute path to this script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

function show_help {
  echo ""
  echo "📦 prismagen v$VERSION - Prisma Model Generator CLI"
  echo ""
  echo "Usage:"
  echo "  prismagen                 Launch interactive dialog to choose API structure"
  echo "  prismagen --nestjs        Generate NestJS structure (runs run.ts)"
  echo "  prismagen --express       Generate Express structure (runs prisma-model-cli.sh)"
  echo "  prismagen --help          Show help"
  echo "  prismagen --version       Show version"
  echo ""
}

function show_dialog {
  CHOICE=$(dialog --clear \
    --title "Choose API Structure" \
    --stdout \
    --ok-label "Select" \
    --cancel-label "Cancel" \
    --menu "🚀 Choose your API structure:" 10 50 2 \
    1 "Node Express (default)" \
    2 "NestJS")

  clear

  if [ $? -ne 0 ]; then
    echo "⚠️ No selection made. Defaulting to Node Express..."
    CHOICE="1"
  fi

  case $CHOICE in
    1)
      echo "📦 Running Prisma Model CLI for Node Express..."
      chmod +x "$ROOT_DIR/prisma-model-cli.sh"
      "$ROOT_DIR/prisma-model-cli.sh"
      ;;
    2)
      echo "🏗️  Generating NestJS structure..."
      npx ts-node "$ROOT_DIR/run.ts"
      ;;
    *)
      echo "❌ Invalid selection."
      exit 1
      ;;
  esac
}

# Handle CLI arguments
case "$1" in
  --nestjs)
    echo "🏗️  Generating NestJS structure..."
    npx ts-node "$ROOT_DIR/run.ts"
    ;;
  --express)
    echo "📦 Running Prisma Model CLI for Node Express..."
    chmod +x "$ROOT_DIR/prisma-model-cli.sh"
    "$ROOT_DIR/prisma-model-cli.sh"
    ;;
  --help|-h)
    show_help
    ;;
  --version|-v)
    echo "prismagen version $VERSION"
    ;;
  "")
    show_dialog
    ;;
  *)
    echo "❌ Unknown option: $1"
    show_help
    exit 1
    ;;
esac
