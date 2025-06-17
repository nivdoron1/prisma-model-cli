#!/bin/bash
set -e

VERSION="1.2.5"

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
  echo "  prismagen --nestjs                  Generate NestJS REST structure (TypeScript)"
  echo "  prismagen --nestjs --no-swagger     Skip Swagger setup in NestJS REST"
  echo "  prismagen --nestjs --graphql        Generate NestJS GraphQL structure (TypeScript)"
  echo "  prismagen --nestjs --graphql --no-swagger  Skip Swagger setup in NestJS GraphQL"
  echo "  prismagen --express                 Generate Express structure (TypeScript)"
  echo "  prismagen --express --output-js     Generate Express structure (JavaScript)"
  echo "  prismagen --graphql                 Generate GraphQL structure (TypeScript)"
  echo "  prismagen --graphql --output-js     Generate GraphQL structure (JavaScript)"
  echo "  prismagen generate swagger          Generate NestJS REST + Swagger UI TypeScript client"
  echo "  prismagen generate swagger --graphql Generate NestJS GraphQL + Swagger UI TypeScript client"
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

function run_graphql {
  if [[ " $@ " =~ " --no-swagger " ]]; then
    echo "❌ The --no-swagger flag is not supported with --graphql"
    exit 1
  fi

  ensure_prisma_model_cli
  local script="$ROOT_DIR/graphql-prisma-model-cli.sh"
  if [ ! -f "$script" ]; then
    echo "❌ Could not find $script"
    exit 1
  fi
  chmod +x "$script"
  "$script" "$@"
}

function run_nestjs {
  ensure_prisma_model_cli
  
  # Check if --graphql flag is present
  if [[ " $@ " =~ " --graphql " ]]; then
    local entry="$ROOT_DIR/dist/graphql-run.js"
    if [ ! -f "$entry" ]; then
      echo "❌ Compiled graphql-run.js not found at: $entry"
      echo "💡 Run 'npm run build' in the CLI project first."
      exit 1
    fi
    echo "🚀 Using NestJS GraphQL generator..."
    node "$entry" "$@"
  else
    local entry="$ROOT_DIR/dist/run.js"
    if [ ! -f "$entry" ]; then
      echo "❌ Compiled run.js not found at: $entry"
      echo "💡 Run 'npm run build' in the CLI project first."
      exit 1
    fi
    echo "📦 Using NestJS REST generator..."
    node "$entry" "$@"
  fi
}

function run_swagger_ui {
  # Check if --graphql flag is present
  if [[ " $@ " =~ " --graphql " ]]; then
    local swaggerScript="$ROOT_DIR/swagger-graphql-ui.sh"
    if [ ! -f "$swaggerScript" ]; then
      echo "❌ Could not find $swaggerScript"
      exit 1
    fi
    chmod +x "$swaggerScript"
    "$swaggerScript"
  else
    local swaggerScript="$ROOT_DIR/swagger-ui.sh"
    if [ ! -f "$swaggerScript" ]; then
      echo "❌ Could not find $swaggerScript"
      exit 1
    fi
    chmod +x "$swaggerScript"
    "$swaggerScript"
  fi
}

function show_dialog {
  CHOICE=$(dialog --clear \
    --title "Choose API Structure" \
    --stdout \
    --ok-label "Select" \
    --cancel-label "Cancel" \
    --menu "🚀 Choose your API structure:" 16 60 6 \
    1 "Node Express (TypeScript)" \
    2 "Node Express (JavaScript)" \
    3 "GraphQL (TypeScript)" \
    4 "GraphQL (JavaScript)" \
    5 "NestJS REST (TypeScript)" \
    6 "NestJS GraphQL (TypeScript)")

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
      echo "🚀 Running Prisma GraphQL CLI (TypeScript)..."
      run_graphql
      ;;
    4)
      echo "🚀 Running Prisma GraphQL CLI (JavaScript)..."
      run_graphql --output-js
      ;;
    5)
      echo "🏗️  Generating NestJS REST structure..."
      run_nestjs
      ;;
    6)
      echo "🚀 Generating NestJS GraphQL structure..."
      run_nestjs --graphql
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
  --graphql)
    echo "🚀 Running Prisma GraphQL CLI..."
    shift
    run_graphql "$@"
    ;;
  generate)
    if [[ "$2" == "swagger" ]]; then
      if [[ "$3" == "--graphql" ]]; then
        echo "🛠️  Generating NestJS GraphQL structure and Swagger UI client..."
        run_nestjs --graphql
        run_swagger_ui --graphql
      else
        echo "🛠️  Generating NestJS REST structure and Swagger UI client..."
        run_nestjs
        run_swagger_ui
      fi
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