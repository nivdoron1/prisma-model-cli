#!/bin/bash
set -e

# Allow optional --output-js flag
EXT="ts"
for arg in "$@"; do
  if [ "$arg" == "--output-js" ]; then
    EXT="js"
  fi
done

# Set dynamic import/export syntax and base import path
if [ "$EXT" == "js" ]; then
  IMPORT_ROUTER="const { Router } = require('express');"
  EXPORT_DEFAULT="module.exports ="
  BASE_PATH="../../dist"
else
  IMPORT_ROUTER="import { Router } from 'express';"
  EXPORT_DEFAULT="export default"
  BASE_PATH="../../"
fi

# Check if prisma-model-cli is installed
if ! npm list -g prisma-model-cli >/dev/null 2>&1 && ! npm list prisma-model-cli >/dev/null 2>&1; then
  echo "📦 'prisma-model-cli' not found. Installing..."
  npm install prisma-model-cli --save-dev
else
  echo "✅ 'prisma-model-cli' already installed"
fi

# Run Prisma generate
echo "⚙️  Running Prisma generate..."
if ! npx prisma generate; then
  echo "❌ Failed to generate Prisma client. Aborting..."
  exit 1
fi

echo "✅ Prisma client generated successfully."

PRISMA_SCHEMA="./prisma/schema.prisma"
OUTPUT_DIR="./models"
INDEX_FILE="$OUTPUT_DIR/index.$EXT"

mkdir -p "$OUTPUT_DIR"

models=$(grep -E '^model\s' "$PRISMA_SCHEMA" | awk '{print $2}')

echo "// AUTO-GENERATED EXPORTS" > "$INDEX_FILE"
echo "$IMPORT_ROUTER" >> "$INDEX_FILE"
echo "" >> "$INDEX_FILE"
echo "const router = Router();" >> "$INDEX_FILE"
echo "" >> "$INDEX_FILE"

for model in $models; do
  model_folder="$OUTPUT_DIR/$model"
  lower_model=$(echo "$model" | awk '{print tolower(substr($0,1,1)) substr($0,2)}')

  echo "🔍 Processing $model..."
  mkdir -p "$model_folder"

  # service
  service_path="$model_folder/service.$EXT"
  if [ ! -f "$service_path" ]; then
    if [ "$EXT" == "js" ]; then
      echo "const { GenericPrismaService } = require('prisma-model-cli');
const { Prisma } = require('${BASE_PATH}/generated/prisma');

class ${model}Service extends GenericPrismaService {
  constructor() {
    super('$model');
  }
}

const ${lower_model}Service = new ${model}Service();

module.exports = ${lower_model}Service;" > "$service_path"
    else
      echo "import { GenericPrismaService } from 'prisma-model-cli';
import { Prisma, $model } from '../../generated/prisma';

export class ${model}Service extends GenericPrismaService<
  $model,
  Prisma.${model}CreateInput,
  Prisma.${model}UpdateInput,
  Prisma.${model}WhereInput
> {
  constructor() {
    super('$model');
  }
}

const ${lower_model}Service = new ${model}Service();

export default ${lower_model}Service;" > "$service_path"
    fi
    echo "✅ Created service.$EXT for $model"
  else
    echo "⚠️  Skipped service.$EXT (already exists)"
  fi

  # controller
  controller_path="$model_folder/controller.$EXT"
  if [ ! -f "$controller_path" ]; then
    if [ "$EXT" == "js" ]; then
      echo "const ${lower_model}Service = require('./service');
const { BaseController } = require('prisma-model-cli');

class ${model}Controller extends BaseController {
  constructor() {
    super(${lower_model}Service);
  }
}

module.exports = new ${model}Controller();" > "$controller_path"
    else
      echo "import { ${lower_model}Service } from './service';
import { Prisma, $model } from '../../generated/prisma';
import { BaseController } from 'prisma-model-cli';

class ${model}Controller extends BaseController<
  $model,
  Prisma.${model}CreateInput,
  Prisma.${model}UpdateInput,
  Prisma.${model}WhereInput
> {
  constructor() {
    super(${lower_model}Service);
  }
}

export default new ${model}Controller();" > "$controller_path"
    fi
    echo "✅ Created controller.$EXT for $model"
  else
    echo "⚠️  Skipped controller.$EXT (already exists)"
  fi

  # routes
  routes_path="$model_folder/routes.$EXT"
  if [ ! -f "$routes_path" ]; then
    if [ "$EXT" == "js" ]; then
      echo "const { Router } = require('express');
const { createBaseRoutes } = require('prisma-model-cli');
const ${model}Controller = require('./controller');

const router = Router();
const baseRoutes = createBaseRoutes(${model}Controller);

router.use('/${lower_model}', baseRoutes);

module.exports = router;" > "$routes_path"
    else
      echo "import { Router } from 'express';
import { createBaseRoutes } from 'prisma-model-cli';
import ${model}Controller from './controller';

const router = Router();
const baseRoutes = createBaseRoutes(${model}Controller);

router.use('/${lower_model}', baseRoutes);

export default router;" > "$routes_path"
    fi
    echo "✅ Created routes.$EXT for $model"
  else
    echo "⚠️  Skipped routes.$EXT (already exists)"
  fi

  # model entry
  model_entry="$model_folder/$model.$EXT"
  if [ ! -f "$model_entry" ]; then
    if [ "$EXT" == "js" ]; then
      echo "const ${model}Service = require('./service');
const ${model}Controller = require('./controller');
const ${model}Routes = require('./routes');

class ${model}s {
  constructor() {
    this.service = ${model}Service;
    this.controller = ${model}Controller;
    this.router = ${model}Routes;
  }
}

module.exports = ${model}s;" > "$model_entry"
    else
      echo "import { ${model}Service } from './service';
import { ${model}Controller } from './controller';
import { ${model}Routes } from './routes';

export default class ${model}s {
  public service = ${model}Service;
  public controller = ${model}Controller;
  public router = ${model}Routes;

  constructor() {}
}" > "$model_entry"
    fi
    echo "✅ Created $model.$EXT"
  else
    echo "⚠️  Skipped $model.$EXT (already exists)"
  fi

  # Add to index
  if [ "$EXT" == "js" ]; then
    echo "const ${lower_model}Routes = require('./$model/routes');" >> "$INDEX_FILE"
    echo "router.use('/', ${lower_model}Routes);" >> "$INDEX_FILE"
  else
    echo "export { default as ${model}s } from './$model/$model';" >> "$INDEX_FILE"
    echo "import ${lower_model}Routes from './$model/routes';" >> "$INDEX_FILE"
    echo "router.use('/', ${lower_model}Routes);" >> "$INDEX_FILE"
  fi

done

echo "" >> "$INDEX_FILE"
echo "$EXPORT_DEFAULT router;" >> "$INDEX_FILE"
echo ""
echo "✅ Generation completed successfully (${EXT} mode)"
