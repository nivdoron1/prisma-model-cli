#!/bin/bash
set -e

# Source configuration
source "$(dirname "$0")/config.sh"

install_dependencies() {
  echo "📦 Installing required npm packages..."
  for package in "${PACKAGE_VERSIONS[@]}"; do
    # Extract package name without version (e.g., lodash from lodash@4.17.21)
    pkg_name=$(echo "$package" | cut -d@ -f1)
    
    if npm ls "$pkg_name" --depth=0 >/dev/null 2>&1; then
      echo "✅ $pkg_name is already installed. Skipping..."
    else
      echo "📦 Installing $package..."
      npm install "$package" --save-dev
    fi
  done
}


run_prisma_generate() {
  echo "⚙️  Running Prisma generate..."
  if ! npx prisma generate; then
    echo "❌ Failed to generate Prisma client. Aborting..."
    exit 1
  fi
  echo "✅ Prisma client generated successfully."
}

generate_service() {
  local model=$1
  local lower_model=$2
  local ext=$3
  local model_dir="$OUTPUT_DIR/$model"
  local service_path="$model_dir/service.$ext"

  if [ ! -f "$service_path" ]; then
    if [ "$ext" == "js" ]; then
      cat > "$service_path" << EOF
const { GenericPrismaService } = require('prisma-model-cli');

class ${model}Service extends GenericPrismaService {
  constructor() {
    super('$model');
  }

  async findManyWithFilters(filters) {
    return await this.findWithFilters(filters);
  }

  async createManyRecords(data) {
    return await this.createMany(data);
  }

  async updateManyRecords(where, data) {
    return await this.updateMany(where, data);
  }

  async deleteManyRecords(where) {
    return await this.deleteMany(where);
  }
}

const ${lower_model}Service = new ${model}Service();

module.exports = ${lower_model}Service;
EOF
    else
      cat > "$service_path" << EOF
import { GenericPrismaService } from 'prisma-model-cli';
import { Prisma, $model } from '${TS_BASE_PATH}generated/prisma';

export class ${model}Service extends GenericPrismaService<
  $model,
  Prisma.${model}CreateInput,
  Prisma.${model}UpdateInput,
  Prisma.${model}WhereInput
> {
  constructor() {
    super('$model');
  }

  async findManyWithFilters(filters: {
    search?: string;
    searchFields?: (keyof $model)[];
    dateRange?: {
      field: keyof $model;
      from?: Date;
      to?: Date;
    };
    status?: string | string[];
    customWhere?: Prisma.${model}WhereInput;
    pagination?: { page: number; limit: number };
    sort?: Array<{ field: keyof $model; direction: 'asc' | 'desc' }>;
    include?: Prisma.${model}Include;
  }) {
    return await this.findWithFilters(filters);
  }

  async createManyRecords(data: Prisma.${model}CreateInput[]) {
    return await this.createMany(data);
  }

  async updateManyRecords(where: Prisma.${model}WhereInput, data: Prisma.${model}UpdateInput) {
    return await this.updateMany(where, data);
  }

  async deleteManyRecords(where: Prisma.${model}WhereInput) {
    return await this.deleteMany(where);
  }
}

const ${lower_model}Service = new ${model}Service();

export default ${lower_model}Service;
EOF
    fi
    echo "✅ Created GraphQL service.$ext for $model"
  else
    echo "⚠️  Skipped GraphQL service.$ext (already exists)"
  fi
}
generate_enums() {
  local enum_defs=""
  local current_enum=""
  local in_enum=0

  while IFS= read -r line || [ -n "$line" ]; do
    # Trim leading/trailing whitespace
    trimmed=$(echo "$line" | xargs)

    # Detect start of enum
    if [[ $trimmed =~ ^enum[[:space:]]+([A-Za-z0-9_]+)[[:space:]]*\{ ]]; then
      current_enum="${BASH_REMATCH[1]}"
      enum_defs+="enum $current_enum {\n"
      in_enum=1
      continue
    fi

    # Detect end of enum
    if [[ "$trimmed" == "}" && $in_enum -eq 1 ]]; then
      enum_defs+="}\n\n"
      in_enum=0
      continue
    fi

    # Inside enum block, capture valid enum values
    if [[ $in_enum -eq 1 && "$trimmed" != "" ]]; then
      # Only include valid identifier lines (ignore comments, annotations)
      if [[ "$trimmed" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
        enum_defs+="  $trimmed\n"
      fi
    fi
  done < "$PRISMA_SCHEMA"

  if [ "$OUTPUT_EXT" == "js" ]; then
    ENUMS_FILE="$OUTPUT_DIR/enums.js"
    echo "$JS_IMPORT_GRAPHQL" > "$ENUMS_FILE"
    echo >> "$ENUMS_FILE"
    echo "const enumTypes = \`" >> "$ENUMS_FILE"
    echo -e "$enum_defs" >> "$ENUMS_FILE"
    echo "\`;" >> "$ENUMS_FILE"
    echo "$JS_EXPORT_DEFAULT enumTypes;" >> "$ENUMS_FILE"
  else
    ENUMS_FILE="$OUTPUT_DIR/enums.ts"
    echo "$TS_IMPORT_GRAPHQL" > "$ENUMS_FILE"
    echo >> "$ENUMS_FILE"
    echo "const enumTypes = gql\`" >> "$ENUMS_FILE"
    echo -e "$enum_defs" >> "$ENUMS_FILE"
    echo "\`;" >> "$ENUMS_FILE"
    echo "$TS_EXPORT_DEFAULT enumTypes;" >> "$ENUMS_FILE"
  fi

  echo "✅ Generated enum GraphQL types at $ENUMS_FILE"
}


extract_model_fields() {
  local model="$1"
  awk -v model="$model" '
    BEGIN { in_model = 0 }
    $1 == "model" && $2 == model { in_model = 1; next }
    in_model && /^\}/ { exit }
    in_model && $1 !~ /^@@/ && NF >= 2 { print $1, $2 }
  ' "$PRISMA_SCHEMA"
}
map_prisma_type_to_graphql() {
  local type="$1"
  local nullable="$2"
  local graphql_type

  case "$type" in
    String|Float|Boolean|Int) graphql_type="$type" ;;
    DateTime) graphql_type="DateTime" ;;
    Json) graphql_type="JSON" ;;
    *) graphql_type="$type" ;;  # Assume enum or nested type
  esac

  if [[ "$nullable" == "optional" ]]; then
    echo "$graphql_type"
  else
    echo "$graphql_type!"
  fi
}

generate_types() {
  local model=$1
  local lower_model=$2
  local ext=$3
  local model_dir="$OUTPUT_DIR/$model"
  local types_path="$model_dir/types.$ext"

  if [ -f "$types_path" ]; then
    echo "⚠️  Skipped GraphQL types.$ext (already exists)"
    return
  fi

  local fields=""
  while IFS= read -r line; do
    name=$(echo "$line" | awk '{print $1}')
    type=$(echo "$line" | awk '{print $2}')
    if [[ "$type" == *"?"* ]]; then
      gql_type=$(map_prisma_type_to_graphql "${type%\?}" "optional")
    else
      gql_type=$(map_prisma_type_to_graphql "$type" "required")
    fi
    fields+="  $name: $gql_type\\n"
  done < <(extract_model_fields "$model")

  local paginationInfo="  type PaginationInfo {\\n    page: Int!\\n    limit: Int!\\n    total: Int!\\n    totalPages: Int!\\n    hasNext: Boolean!\\n    hasPrev: Boolean!\\n  }\\n"

  if [ "$ext" == "js" ]; then
    cat > "$types_path" << EOF


const ${model}Types = \`
  type $model {
$fields  }

$paginationInfo

  type ${model}PaginatedResult {
    data: [$model!]!
    pagination: PaginationInfo!
  }

  input ${model}CreateInput {
$fields  }

  input ${model}UpdateInput {
$fields  }

  input ${model}WhereInput {
$fields  }

  input ${model}UpsertInput {
    where: ${model}WhereInput!
    create: ${model}CreateInput!
    update: ${model}UpdateInput!
  }

  extend type Query {
    ${lower_model}: $model
    ${lower_model}ById(id: ID!): $model
    ${lower_model}s: [$model!]!
    ${lower_model}sPaginated(filters: FilterInput): ${model}PaginatedResult!
    ${lower_model}Count(where: ${model}WhereInput): Int!
    ${lower_model}Exists(where: ${model}WhereInput!): Boolean!
  }

  extend type Mutation {
    create${model}(data: ${model}CreateInput!): $model!
    createMany${model}s(data: [${model}CreateInput!]!): BulkResult!
    update${model}(id: ID!, data: ${model}UpdateInput!): $model!
    update${model}ByWhere(where: ${model}WhereInput!, data: ${model}UpdateInput!): $model!
    updateMany${model}s(where: ${model}WhereInput!, data: ${model}UpdateInput!): BulkResult!
    delete${model}(id: ID!): $model!
    delete${model}ByWhere(where: ${model}WhereInput!): $model!
    deleteMany${model}s(where: ${model}WhereInput!): BulkResult!
    upsert${model}(input: ${model}UpsertInput!): $model!
  }
\`;

module.exports = ${model}Types;
EOF
  else
    cat > "$types_path" << EOF
import gql from 'graphql-tag';

const ${model}Types = gql\`
  type $model {
$fields  }

$paginationInfo

  type ${model}PaginatedResult {
    data: [$model!]!
    pagination: PaginationInfo!
  }

  input ${model}CreateInput {
$fields  }

  input ${model}UpdateInput {
$fields  }

  input ${model}WhereInput {
$fields  }

  input ${model}UpsertInput {
    where: ${model}WhereInput!
    create: ${model}CreateInput!
    update: ${model}UpdateInput!
  }

  extend type Query {
    ${lower_model}: $model
    ${lower_model}ById(id: ID!): $model
    ${lower_model}s: [$model!]!
    ${lower_model}sPaginated(filters: FilterInput): ${model}PaginatedResult!
    ${lower_model}Count(where: ${model}WhereInput): Int!
    ${lower_model}Exists(where: ${model}WhereInput!): Boolean!
  }

  extend type Mutation {
    create${model}(data: ${model}CreateInput!): $model!
    createMany${model}s(data: [${model}CreateInput!]!): BulkResult!
    update${model}(id: ID!, data: ${model}UpdateInput!): $model!
    update${model}ByWhere(where: ${model}WhereInput!, data: ${model}UpdateInput!): $model!
    updateMany${model}s(where: ${model}WhereInput!, data: ${model}UpdateInput!): BulkResult!
    delete${model}(id: ID!): $model!
    delete${model}ByWhere(where: ${model}WhereInput!): $model!
    deleteMany${model}s(where: ${model}WhereInput!): BulkResult!
    upsert${model}(input: ${model}UpsertInput!): $model!
  }
\`;

export default ${model}Types;
EOF
  fi

  echo "✅ Created GraphQL types.$ext for $model"
}


generate_resolver() {
  local model=$1
  local lower_model=$2
  local ext=$3
  local model_dir="$OUTPUT_DIR/$model"
  local resolver_path="$model_dir/resolver.$ext"

  if [ ! -f "$resolver_path" ]; then
    if [ "$ext" == "js" ]; then
      cat > "$resolver_path" << EOF
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ${model}Resolver = {
  Query: {
    ${lower_model}: async () => {
      return prisma.${lower_model}.findFirst();
    },
    ${lower_model}ById: async (_, { id }) => {
      return prisma.${lower_model}.findUnique({
        where: { id }
      });
    },
    ${lower_model}s: async () => {
      return prisma.${lower_model}.findMany();
    },
    ${lower_model}sPaginated: async (_, { filters }) => {
      const { page = 1, limit = 10, where, orderBy } = filters || {};
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.${lower_model}.findMany({
          skip,
          take: limit,
          where,
          orderBy
        }),
        prisma.${lower_model}.count({ where })
      ]);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    },
    ${lower_model}Count: async (_, { where }) => {
      return prisma.${lower_model}.count({ where });
    },
    ${lower_model}Exists: async (_, { where }) => {
      const count = await prisma.${lower_model}.count({ where });
      return count > 0;
    }
  },
  Mutation: {
    create${model}: async (_, { data }) => {
      return prisma.${lower_model}.create({
        data
      });
    },
    createMany${model}s: async (_, { data }) => {
      const result = await prisma.${lower_model}.createMany({
        data
      });
      return {
        count: result.count
      };
    },
    update${model}: async (_, { id, data }) => {
      return prisma.${lower_model}.update({
        where: { id },
        data
      });
    },
    update${model}ByWhere: async (_, { where, data }) => {
      return prisma.${lower_model}.update({
        where,
        data
      });
    },
    updateMany${model}s: async (_, { where, data }) => {
      const result = await prisma.${lower_model}.updateMany({
        where,
        data
      });
      return {
        count: result.count
      };
    },
    delete${model}: async (_, { id }) => {
      return prisma.${lower_model}.delete({
        where: { id }
      });
    },
    delete${model}ByWhere: async (_, { where }) => {
      return prisma.${lower_model}.delete({
        where
      });
    },
    deleteMany${model}s: async (_, { where }) => {
      const result = await prisma.${lower_model}.deleteMany({
        where
      });
      return {
        count: result.count
      };
    },
    upsert${model}: async (_, { input }) => {
      const { where, create, update } = input;
      return prisma.${lower_model}.upsert({
        where,
        create,
        update
      });
    }
  }
};

module.exports = ${model}Resolver;
EOF
    else
      cat > "$resolver_path" << EOF
import { PrismaClient } from '@prisma/client';
import { ${model}, Prisma } from '../../../generated/prisma';
import { PaginatedResult } from 'prisma-model-cli/services/db/types';

const prisma = new PrismaClient();

type PaginationFilters = {
  page?: number;
  limit?: number;
  where?: Prisma.${model}WhereInput;
  orderBy?: Prisma.${model}OrderByWithRelationInput;
};

type UpsertInput = {
  where: Prisma.${model}WhereUniqueInput;
  create: Prisma.${model}CreateInput;
  update: Prisma.${model}UpdateInput;
};

const ${model}Resolver = {
  Query: {
    ${lower_model}: async (): Promise<${model} | null> => {
      return prisma.${lower_model}.findFirst();
    },
    ${lower_model}ById: async (_: unknown, args: { id: string }): Promise<${model} | null> => {
      return prisma.${lower_model}.findUnique({
        where: { id: args.id }
      });
    },
    ${lower_model}s: async (): Promise<${model}[]> => {
      return prisma.${lower_model}.findMany();
    },
    ${lower_model}sPaginated: async (_: unknown, args: { filters: PaginationFilters }): Promise<PaginatedResult<${model}>> => {
      const { page = 1, limit = 10, where, orderBy } = args.filters || {};
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.${lower_model}.findMany({ skip, take: limit, where, orderBy }),
        prisma.${lower_model}.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    },
    ${lower_model}Count: async (_: unknown, args: { where?: Prisma.${model}WhereInput }): Promise<number> => {
      return prisma.${lower_model}.count({ where: args.where });
    },
    ${lower_model}Exists: async (_: unknown, args: { where: Prisma.${model}WhereInput }): Promise<boolean> => {
      const count = await prisma.${lower_model}.count({ where: args.where });
      return count > 0;
    }
  },
  Mutation: {
    create${model}: async (_: unknown, args: { data: Prisma.${model}CreateInput }): Promise<${model}> => {
      return prisma.${lower_model}.create({ data: args.data });
    },
    createMany${model}s: async (_: unknown, args: { data: Prisma.${model}CreateManyInput[] }): Promise<{ count: number }> => {
      const result = await prisma.${lower_model}.createMany({ data: args.data });
      return { count: result.count };
    },
    update${model}: async (_: unknown, args: { id: string; data: Prisma.${model}UpdateInput }): Promise<${model}> => {
      return prisma.${lower_model}.update({ where: { id: args.id }, data: args.data });
    },
    update${model}ByWhere: async (_: unknown, args: { where: Prisma.${model}WhereUniqueInput; data: Prisma.${model}UpdateInput }): Promise<${model}> => {
      return prisma.${lower_model}.update({ where: args.where, data: args.data });
    },
    updateMany${model}s: async (_: unknown, args: { where: Prisma.${model}WhereInput; data: Prisma.${model}UpdateManyMutationInput }): Promise<{ count: number }> => {
      const result = await prisma.${lower_model}.updateMany({ where: args.where, data: args.data });
      return { count: result.count };
    },
    delete${model}: async (_: unknown, args: { id: string }): Promise<${model}> => {
      return prisma.${lower_model}.delete({ where: { id: args.id } });
    },
    delete${model}ByWhere: async (_: unknown, args: { where: Prisma.${model}WhereUniqueInput }): Promise<${model}> => {
      return prisma.${lower_model}.delete({ where: args.where });
    },
    deleteMany${model}s: async (_: unknown, args: { where: Prisma.${model}WhereInput }): Promise<{ count: number }> => {
      const result = await prisma.${lower_model}.deleteMany({ where: args.where });
      return { count: result.count };
    },
    upsert${model}: async (_: unknown, args: { input: UpsertInput }): Promise<${model}> => {
      const { where, create, update } = args.input;
      return prisma.${lower_model}.upsert({ where, create, update });
    }
  }
};

export default ${model}Resolver;
EOF

    fi
    echo "✅ Created GraphQL resolver.$ext for $model"
  else
    echo "⚠️  Skipped GraphQL resolver.$ext (already exists)"
  fi
}

generate_index_and_schema() {
  local ext=$1
  shift
  local models=("$@")
  local index_path="$OUTPUT_DIR/index.$ext"
  local schema_path="$OUTPUT_DIR/schema.$ext"

  if [ "$ext" == "js" ]; then
    {
      echo "$JS_IMPORT_GRAPHQL"
      echo "const enumTypes = require('./enums');"
      echo
      echo "const typeDefs = [enumTypes,"
      for model in "${models[@]}"; do
        echo "  require('./$model/types'),"
      done
      echo "];"
      echo
      echo "module.exports = typeDefs;"
    } > "$schema_path"

    {
      echo "const resolvers = {"
      for model in "${models[@]}"; do
        echo "  ...require('./$model/resolver').default,"
      done
      echo "};"
      echo "module.exports = resolvers;"
    } > "$index_path"
  else
    {
      echo "import enumTypes from './enums';"
      for model in "${models[@]}"; do
        echo "import ${model}Types from './$model/types';"
      done
      echo
      echo "const typeDefs = [enumTypes,"
      for model in "${models[@]}"; do
        echo "  ${model}Types,"
      done
      echo "];"
      echo "export default typeDefs;"
    } > "$schema_path"

    {
      for model in "${models[@]}"; do
        echo "import ${model}Resolver from './$model/resolver';"
      done
      echo
      echo "const resolvers = {"
      for model in "${models[@]}"; do
        echo "  ...${model}Resolver,"
      done
      echo "};"
      echo "export default resolvers;"
    } > "$index_path"
  fi

  echo "✅ Created index.$ext and schema.$ext files"
}


# Package versions
PACKAGE_VERSIONS=(
  "--save-dev eslint prettier"
  "@apollo/server"
  "graphql"
  "graphql-tag"
  "prisma-model-cli"
  "lodash"
  "express"
  "@prisma/client"
  "typescript"
  "@types/node"
  "@types/express"
  "@types/lodash"
)


# File paths
PRISMA_SCHEMA="./prisma/schema.prisma"
OUTPUT_DIR="./src/graphql"
INDEX_FILE="$OUTPUT_DIR/index.ts"
SCHEMA_FILE="$OUTPUT_DIR/schema.ts"

# Import/Export settings
JS_IMPORT_GRAPHQL="const { gql } = require('@apollo/server');"
JS_EXPORT_DEFAULT="module.exports ="
JS_BASE_PATH="../../../"

TS_IMPORT_GRAPHQL="import gql from 'graphql-tag';"
TS_EXPORT_DEFAULT="export default"
TS_BASE_PATH="../../../"

# Common GraphQL types
COMMON_TYPES='
  scalar DateTime
  scalar JSON

  type PaginationInfo {
    page: Int!
    limit: Int!
    total: Int!
    totalPages: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  input PaginationInput {
    page: Int = 1
    limit: Int = 10
  }

  input SortInput {
    field: String!
    direction: SortDirection = ASC
  }

  enum SortDirection {
    ASC
    DESC
  }

  input DateRangeInput {
    field: String!
    from: DateTime
    to: DateTime
  }

  input FilterInput {
    search: String
    searchFields: [String!]
    dateRange: DateRangeInput
    status: String
    pagination: PaginationInput
    sort: [SortInput!]
  }

  type BulkResult {
    count: Int!
  }
' 
# Parse command line arguments
OUTPUT_EXT="ts"  # Default to TypeScript
if [ "$1" == "--output-js" ]; then
  OUTPUT_EXT="js"
  shift
fi

# Validate Prisma schema exists
if [ ! -f "$PRISMA_SCHEMA" ]; then
  echo "❌ Error: Prisma schema not found at $PRISMA_SCHEMA"
  exit 1
fi

# Install dependencies and run Prisma generation
install_dependencies
run_prisma_generate

# Create base directory for output files
mkdir -p "$OUTPUT_DIR"

# Get all model names from Prisma schema
MODELS=()
while IFS= read -r line; do
  if [[ $line =~ ^model[[:space:]]+([A-Za-z0-9_]+)[[:space:]]*\{ ]]; then
    MODELS+=("${BASH_REMATCH[1]}")
  fi
done < "$PRISMA_SCHEMA"

if [ ${#MODELS[@]} -eq 0 ]; then
  echo "❌ Error: No models found in Prisma schema"
  exit 1
fi

# Process each model
for model in "${MODELS[@]}"; do

  lower_model=$(echo "$model" | awk '{print tolower(substr($0,1,1)) substr($0,2)}')
  
  # Create model directory
  mkdir -p "$OUTPUT_DIR/$model"
  
  # Generate service file
  generate_service "$model" "$lower_model" "$OUTPUT_EXT"
  
  # Generate type definitions
  generate_types "$model" "$lower_model" "$OUTPUT_EXT"
  
  # Generate resolver
  generate_resolver "$model" "$lower_model" "$OUTPUT_EXT"
done

generate_enums
# Generate index and schema files
generate_index_and_schema "$OUTPUT_EXT" "${MODELS[@]}"
run_linter_and_formatter() {
  if [ "$OUTPUT_EXT" == "ts" ]; then
    echo "🧹 Running ESLint fix..."
    npx eslint "$OUTPUT_DIR" --ext .ts --fix || echo "⚠️ ESLint failed or not configured."

    echo "🎨 Running Prettier format..."
    npx prettier --write "$OUTPUT_DIR" || echo "⚠️ Prettier failed or not configured."

    echo "✅ Linting and formatting complete."
  else
    echo "ℹ️ Skipping ESLint and Prettier — JS mode detected."
  fi
}
run_linter_and_formatter

echo "✅ GraphQL files generated successfully!"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""
echo "To use these files in your Apollo Server setup:"
echo "1. Import the generated files in your server setup:"
if [ "$OUTPUT_EXT" == "js" ]; then
  echo "   const typeDefs = require('./generated/schema');"
  echo "   const resolvers = require('./generated/index');"
else
  echo "   import typeDefs from './generated/schema';"
  echo "   import resolvers from './generated/index';"
fi
echo "2. Use them in your Apollo Server configuration:"
echo "   const server = new ApolloServer({ typeDefs, resolvers });"