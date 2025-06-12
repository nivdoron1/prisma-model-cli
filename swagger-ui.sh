#!/bin/bash

# Step 1: Prompt for Swagger JSON URL
read -p "🌐 Enter the Swagger JSON URL [default: http://localhost:3000/api-json]: " SWAGGER_URL
SWAGGER_URL=${SWAGGER_URL:-http://localhost:3000/api-json}

# Step 2: Prompt for Output Directory
read -p "📁 Enter the output directory [default: ../client/src/app/api]: " OUTPUT_DIR
OUTPUT_DIR=${OUTPUT_DIR:-../client/src/app/api}

# Step 3: Check OpenAPI Generator installation
if ! command -v openapi-generator-cli &> /dev/null; then
    echo "🔧 OpenAPI Generator CLI is not installed. Installing..."
    npm install -g @openapitools/openapi-generator-cli
fi

# Step 4: Check if Swagger URL is reachable
echo "🔍 Checking if $SWAGGER_URL is reachable..."
if curl --output /dev/null --silent --head --fail "$SWAGGER_URL"; then
    echo "✅ Swagger endpoint is reachable. Starting client generation..."
else
    echo "❌ Failed to reach $SWAGGER_URL. Please make sure your NestJS server is running."
    exit 1
fi

# Step 5: Generate TypeScript API client
openapi-generator-cli generate -g typescript-axios -i "$SWAGGER_URL" -o "$OUTPUT_DIR"

if [ $? -eq 0 ]; then
    echo "🎉 API client successfully generated in $OUTPUT_DIR"
else
    echo "❌ Failed to generate API client"
    exit 1
fi
