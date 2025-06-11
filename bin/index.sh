#!/bin/bash
set -e

VERSION="1.1.2"

# Determine the absolute path to this script directory (even when symlinked)
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

function show_help {
  echo ""
  echo "📦 prismagen v$VERSION - Prisma Model Generator CLI"
  echo ""
  echo "Usage:"
  echo "  prismagen                 Launch interactive dialog to choose API structure"
  echo "  prismagen --nestjs        Generate NestJS structure"
  echo "  prismagen --express       Generate Express structure"
  echo "  prismagen --help          Show help"
  echo "  prismagen --version       Show version"
  echo ""
}

function run_express {
  local script="$ROOT_DIR/prisma-model-cli.sh"
  if [ ! -f "$script" ]; then
    echo "❌ Could not find $script"
    exit 1
  fi
  chmod +x "$script"
  "$script"
}

function run_nestjs {
  local entry="$ROOT_DIR/dist/run.js"
  if [ ! -f "$entry" ]; then
    echo "❌ Compiled run.js not found at: $entry"
    echo "💡 Run 'npm run build' in the CLI project first."
    exit 1
  fi
  node "$entry"
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
      run_express
      ;;
    2)
      echo "🏗️  Generating NestJS structure..."
      run_nestjs
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
    run_nestjs
    ;;
  --express)
    echo "📦 Running Prisma Model CLI for Node Express..."
    run_express
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
