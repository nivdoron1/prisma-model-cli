#!/bin/bash
set -e

VERSION="1.2.49"

# Determine absolute script path (even when symlinked)
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"

function show_help {
  echo ""
  echo "📦 prismagen v$VERSION - Prisma Model Generator CLI"
  echo ""
  echo "Usage:"
  echo "  prismagen                           Launch interactive dialog to choose API structure"
  echo "  prismagen --nestjs                  Generate NestJS structure (TypeScript)"
  echo "  prismagen --nestjs --no-swagger     Skip Swagger setup in NestJS"
  echo "  prismagen --express                 Generate Express structure (TypeScript)"
  echo "  prismagen --express --output-js     Generate Express structure (JavaScript)"
  echo "  prismagen generate swagger          Generate NestJS + Swagger UI TypeScript client"
  echo "  prismagen --help                    Show help"
  echo "  prismagen --version                 Show version"
  echo ""
}

function ensure_prisma_model_cli {
  if ! npx --no prisma-model-cli --version >/dev/null 2>&1; then
    echo "📦 Installing prisma-model-cli..."
    npm install prisma-model-cli --save-dev
  else
    echo "✅ prisma-model-cli is already installed"
  fi
}

function run_express {
  if [[ " $@ " =~ " --no-swagger " ]]; then
    echo "❌ The --no-swagger flag is only supported with --nestjs"
    exit 1
  fi

  ensure_prisma_model_cli
  local script="$ROOT_DIR/prisma-model-cli.sh"
  if [ ! -f "$script" ]; then
    echo "❌ Could not find $script"
    exit 1
  fi
  chmod +x "$script"
  "$script" "$@"
}

function run_nestjs {
  ensure_prisma_model_cli
  local entry="$ROOT_DIR/dist/run.js"
  if [ ! -f "$entry" ]; then
    echo "❌ Compiled run.js not found at: $entry"
    echo "💡 Run 'npm run build' in the CLI project first."
    exit 1
  fi
  node "$entry" "$@"
}

function run_swagger_ui {
  local swaggerScript="$ROOT_DIR/swagger-ui.sh"
  if [ ! -f "$swaggerScript" ]; then
    echo "❌ Could not find $swaggerScript"
    exit 1
  fi
  chmod +x "$swaggerScript"
  "$swaggerScript"
}

function show_dialog {
  CHOICE=$(dialog --clear \
    --title "Choose API Structure" \
    --stdout \
    --ok-label "Select" \
    --cancel-label "Cancel" \
    --menu "🚀 Choose your API structure:" 12 60 3 \
    1 "Node Express (TypeScript)" \
    2 "Node Express (JavaScript)" \
    3 "NestJS")

  clear

  if [ $? -ne 0 ]; then
    echo "⚠️ No selection made. Defaulting to Node Express (TypeScript)..."
    CHOICE="1"
  fi

  case $CHOICE in
    1)
      echo "📦 Running Prisma Model CLI for Node Express (TypeScript)..."
      run_express
      ;;
    2)
      echo "📦 Running Prisma Model CLI for Node Express (JavaScript)..."
      run_express --output-js
      ;;
    3)
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
    shift
    run_nestjs "$@"
    ;;
  --express)
    echo "📦 Running Prisma Model CLI for Node Express..."
    shift
    run_express "$@"
    ;;
  generate)
    if [[ "$2" == "swagger" ]]; then
      echo "🛠️  Generating NestJS structure and Swagger UI client..."
      run_nestjs
      run_swagger_ui
    else
      echo "❌ Unknown generate command: $2"
      exit 1
    fi
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
