#!/bin/bash

# Package versions
PACKAGE_VERSIONS=(
  "@apollo/server@4.10.0"
  "graphql@16.8.1"
  "graphql-tag@2.12.6"
  "prisma-model-cli"
  "lodash@4.17.21"
  "express@5.0.0-beta.1"
  "@prisma/client"
  "typescript@5.3.3"
  "@types/node@20.11.19"
  "@types/express@4.17.21"
  "@types/lodash@4.14.202"
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