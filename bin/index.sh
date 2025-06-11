#!/bin/bash

# Display a simple list box with default selection using dialog
CHOICE=$(dialog --clear \
  --title "Choose API Structure" \
  --stdout \
  --ok-label "Select" \
  --cancel-label "Cancel" \
  --menu "🚀 Choose your API structure:" 10 50 2 \
  1 "Node Express (default)" \
  2 "NestJS")

clear  # Clear dialog UI leftovers

if [ $? -ne 0 ]; then
  echo "⚠️ No selection made. Defaulting to Node Express..."
  CHOICE="1"
fi

case $CHOICE in
  1)
    echo "📦 Running Prisma Model CLI for Node Express..."
    chmod +x ./prisma-model-cli.sh
    ./prisma-model-cli.sh
    ;;
  2)
    echo "🏗️  Generating NestJS structure..."
    npx ts-node run.ts
    ;;
  *)
    echo "❌ Invalid selection."
    exit 1
    ;;
esac
