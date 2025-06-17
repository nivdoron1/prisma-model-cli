#!/bin/bash

# Source configuration
source "$(dirname "$0")/config.sh"

install_dependencies() {
  echo "📦 Installing required npm packages..."
  for package in "${PACKAGE_VERSIONS[@]}"; do
    echo "📦 Installing $package..."
    npm install "$package" --save-dev
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

generate_types() {
  local model=$1
  local lower_model=$2
  local ext=$3
  local model_dir="$OUTPUT_DIR/$model"
  local types_path="$model_dir/types.$ext"

  if [ ! -f "$types_path" ]; then
    if [ "$ext" == "js" ]; then
      cat > "$types_path" << EOF
const { gql } = require('@apollo/server');

const ${model}Types = \`
  type $model {
    id: ID!
    createdAt: DateTime
    updatedAt: DateTime
    # Add your model-specific fields here based on your Prisma schema
  }

  type ${model}PaginatedResult {
    data: [$model!]!
    pagination: PaginationInfo!
  }

  input ${model}CreateInput {
    # Add your model-specific create fields here
  }

  input ${model}UpdateInput {
    # Add your model-specific update fields here
  }

  input ${model}WhereInput {
    id: ID
    # Add your model-specific where fields here
  }

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
    id: ID!
    createdAt: DateTime
    updatedAt: DateTime
    # Add your model-specific fields here based on your Prisma schema
  }

  type ${model}PaginatedResult {
    data: [$model!]!
    pagination: PaginationInfo!
  }

  input ${model}CreateInput {
    # Add your model-specific create fields here
  }

  input ${model}UpdateInput {
    # Add your model-specific update fields here
  }

  input ${model}WhereInput {
    id: ID
    # Add your model-specific where fields here
  }

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
  else
    echo "⚠️  Skipped GraphQL types.$ext (already exists)"
  fi
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
  local models=$2
  local index_path="$OUTPUT_DIR/index.$ext"
  local schema_path="$OUTPUT_DIR/schema.$ext"

  # Initialize schema file
  if [ "$ext" == "js" ]; then
    cat > "$schema_path" << EOF
const { gql } = require('@apollo/server');

const commonTypes = \`
  scalar DateTime

  type PaginationInfo {
    total: Int!
    page: Int!
    limit: Int!
    pages: Int!
  }

  type BulkResult {
    count: Int!
  }

  input FilterInput {
    page: Int
    limit: Int
    where: JSON
    orderBy: JSON
  }

  scalar JSON
\`;

const typeDefs = [
  commonTypes,
  ${models[@]/#/require('./}
  ${models[@]/%//types).default}
];

module.exports = typeDefs;
EOF
  else
    cat > "$schema_path" << EOF
import gql from 'graphql-tag';
${models[@]/#/import ${models[@]}Types from './}
${models[@]/%//types';}

const commonTypes = gql\`
  scalar DateTime

  type PaginationInfo {
    total: Int!
    page: Int!
    limit: Int!
    pages: Int!
  }

  type BulkResult {
    count: Int!
  }

  input FilterInput {
    page: Int
    limit: Int
    where: JSON
    orderBy: JSON
  }

  scalar JSON
\`;

const typeDefs = [
  commonTypes,
  ${models[@]/#/${models[@]}Types}
];

export default typeDefs;
EOF
  fi

  # Initialize index file
  if [ "$ext" == "js" ]; then
    cat > "$index_path" << EOF
const resolvers = {
  ${models[@]/#/...require('./}
  ${models[@]/%//resolver').default}
};

module.exports = resolvers;
EOF
  else
    cat > "$index_path" << EOF
${models[@]/#/import ${models[@]}Resolver from './}
${models[@]/%//resolver';}

const resolvers = {
  ${models[@]/#/...${models[@]}Resolver}
};

export default resolvers;
EOF
  fi

  echo "✅ Created index.$ext and schema.$ext files"
} 