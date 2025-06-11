
#!/bin/bash
set -e

# Check if prisma-model-cli is installed (assumes local project usage)
if ! npm list -g prisma-model-cli >/dev/null 2>&1 && ! npm list prisma-model-cli >/dev/null 2>&1; then
  echo "📦 'prisma-model-cli' not found. Installing..."
  npm install prisma-model-cli --save-dev
else
  echo "✅ 'prisma-model-cli' already installed"
fi

# Run Prisma generate and exit on failure
echo "⚙️  Running Prisma generate..."
if ! npx prisma generate; then
  echo "❌ Failed to generate Prisma client. Aborting..."
  exit 1
fi

echo "✅ Prisma client generated successfully."

PRISMA_SCHEMA="./prisma/schema.prisma"
OUTPUT_DIR="./models"
INDEX_FILE="$OUTPUT_DIR/index.ts"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Extract model names from schema.prisma
models=$(grep -E '^model\s' "$PRISMA_SCHEMA" | awk '{print $2}')

# --- Rebuild index.ts ---
echo "// AUTO-GENERATED EXPORTS" > "$INDEX_FILE"
echo "import { Router } from 'express';" >> "$INDEX_FILE"
echo "" >> "$INDEX_FILE"
echo "const router = Router();" >> "$INDEX_FILE"
echo "" >> "$INDEX_FILE"

for model in $models; do
  model_folder="$OUTPUT_DIR/$model"
  lower_model=$(echo "$model" | awk '{print tolower(substr($0,1,1)) substr($0,2)}')

  echo "🔍 Checking $model"
  mkdir -p "$model_folder"

  # --- service.ts ---
  if [ ! -f "$model_folder/service.ts" ]; then
    cat > "$model_folder/service.ts" <<EOF
import { GenericPrismaService } from "prisma-model-cli/services/db/dbService";
import { Prisma, $model } from "../../generated/prisma";

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

export default ${lower_model}Service;
EOF
    echo "✅ Created service.ts for $model"
  else
    echo "⚠️  Skipped service.ts (already exists)"
  fi

  # --- controller.ts ---
  if [ ! -f "$model_folder/controller.ts" ]; then
    cat > "$model_folder/controller.ts" <<EOF
import ${lower_model}Service from './service';
import { Prisma, $model } from '../../generated/prisma';
import { BaseController } from "prisma-model-cli/controllers/baseController";

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

export default new ${model}Controller();
EOF
    echo "✅ Created controller.ts for $model"
  else
    echo "⚠️  Skipped controller.ts (already exists)"
  fi

  # --- routes.ts ---
  if [ ! -f "$model_folder/routes.ts" ]; then
    cat > "$model_folder/routes.ts" <<EOF
import { Router } from 'express';
import { createBaseRoutes } from "prisma-model-cli/routes/createBaseRoutes";
import ${model}Controller from './controller';

const router = Router();
const baseRoutes = createBaseRoutes(${model}Controller);

router.use('/${lower_model}', baseRoutes);

export default router;
EOF
    echo "✅ Created routes.ts for $model"
  else
    echo "⚠️  Skipped routes.ts (already exists)"
  fi

  # --- <Model>.ts ---
  if [ ! -f "$model_folder/$model.ts" ]; then
    cat > "$model_folder/$model.ts" <<EOF
import ${model}Service from './service';
import ${model}Controller from './controller';
import ${model}Routes from './routes';

export default class ${model}s {
  public service = ${model}Service;
  public controller = ${model}Controller;
  public router = ${model}Routes;

  constructor() {}
}
EOF
    echo "✅ Created $model.ts"
  else
    echo "⚠️  Skipped $model.ts (already exists)"
  fi

  # --- Add to index.ts ---
  echo "export { default as ${model}s } from './$model/$model';" >> "$INDEX_FILE"
  echo "import ${lower_model}Routes from './$model/routes';" >> "$INDEX_FILE"
  echo "router.use('/', ${lower_model}Routes);" >> "$INDEX_FILE"

done

echo "" >> "$INDEX_FILE"
echo "export default router;" >> "$INDEX_FILE"

echo ""
echo "✅ Generation completed with safety checks."
