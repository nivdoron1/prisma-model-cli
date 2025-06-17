import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ext = 'ts';
const START_ROUTE = '../../../';
const SCHEMA_PATH = path.join('prisma/schema.prisma');
const OUTPUT_BASE = path.join(process.cwd(), './src/models');
const OUTPUT_BASE_SRC = path.join(process.cwd(), './src');
function installDependencies(): void {
  const requiredPackages = [
    // Runtime dependencies
    '@nestjs/common',
    '@nestjs/graphql',
    '@nestjs/apollo',
    'apollo-server-express',
    'graphql',
    'graphql-type-json',
    'prisma-model-cli',
    '@prisma/client',

    // Dev dependencies
    'eslint',
    'prettier',
    'ts-node',
    'typescript',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'prettier-plugin-organize-imports'
  ];

  console.log('📦 Checking for required npm packages...\n');

  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      console.log(`✅ ${pkg} is already installed`);
    } catch {
      const isDev = pkg.startsWith('eslint') || pkg.startsWith('prettier') || pkg === 'ts-node' || pkg.startsWith('@typescript-eslint') || pkg === 'typescript' || pkg === 'prettier-plugin-organize-imports';
      const installCmd = `npm install ${isDev ? '--save-dev' : ''} ${pkg}`;
      console.log(`📦 Installing ${pkg}...`);
      try {
        execSync(installCmd, { stdio: 'inherit' });
      } catch (err) {
        console.error(`❌ Failed to install ${pkg}`);
        process.exit(1);
      }
    }
  }

  console.log('✅ All dependencies are ready!\n');
}
installDependencies();
if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ schema.prisma not found at ${SCHEMA_PATH}`);
    process.exit(1);
}

const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
const modelRegex = /model\s+(\w+)\s+{/g;

console.log('📦 Running Prisma generate...');
try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated');
} catch {
    console.error('❌ Failed to run prisma generate');
    process.exit(1);
}

const modelNames: string[] = [];
let match: RegExpExecArray | null;
while ((match = modelRegex.exec(schema)) !== null) {
    modelNames.push(match[1]);
}

if (!fs.existsSync(OUTPUT_BASE)) fs.mkdirSync(OUTPUT_BASE, { recursive: true });

console.log(`🔍 Found models: ${modelNames.join(', ')}`);

modelNames.forEach((modelName) => {
    const folderName = modelName.toLowerCase();
    const folderPath = path.join(OUTPUT_BASE, folderName);
    const dtoFolder = path.join(folderPath, 'dto');

    fs.mkdirSync(dtoFolder, { recursive: true });

    const resolverFile = path.join(folderPath, `${folderName}.resolver.${ext}`);
    const serviceFile = path.join(folderPath, `${folderName}.service.${ext}`);
    const moduleFile = path.join(folderPath, `${folderName}.module.${ext}`);

    const { objectType, createInput, updateInput, paginationTypes } = generateGraphQLTypes(modelName, ext);

    // DTOs/Types are always overwritten
    fs.writeFileSync(path.join(dtoFolder, `${folderName}.type.${ext}`), objectType);
    fs.writeFileSync(path.join(dtoFolder, `create-${folderName}.input.${ext}`), createInput);
    fs.writeFileSync(path.join(dtoFolder, `update-${folderName}.input.${ext}`), updateInput);
    fs.writeFileSync(path.join(dtoFolder, `pagination.type.${ext}`), paginationTypes);

    // ✅ Skip if files already exist
    if (!fs.existsSync(resolverFile)) {
        fs.writeFileSync(resolverFile, generateResolver(modelName, ext));
    }

    if (!fs.existsSync(serviceFile)) {
        fs.writeFileSync(serviceFile, generateService(modelName, ext));
    }

    if (!fs.existsSync(moduleFile)) {
        fs.writeFileSync(moduleFile, generateModule(modelName, ext));
    }

    console.log(`✅ Prepared GraphQL files for: ${modelName}`);
});

function generateErrorTypes(): void {
    const errorTypesPath = path.join('src', 'common', 'types');
    const errorTypesFile = path.join(errorTypesPath, 'error-response.type.ts');

    if (!fs.existsSync(errorTypesFile)) {
        fs.mkdirSync(errorTypesPath, { recursive: true });

        const content = `import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ErrorResponse {
  @Field(() => Int)
  statusCode: number;

  @Field()
  message: string;

  @Field({ nullable: true })
  error?: string;
}
`;
        fs.writeFileSync(errorTypesFile, content);
        console.log('✅ ErrorResponse type created at src/common/types/error-response.type.ts');
    } else {
        console.log('✅ ErrorResponse type already exists');
    }
}

function generateResolver(model: string, ext: string): string {
  const lcModel = model.toLowerCase();
  const pascalModel = model;

  return `import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ${pascalModel} } from '@prisma/client';
import { Prisma } from '../../../generated/prisma';
import { ${pascalModel}Service } from './${lcModel}.service';
import { ${pascalModel}Type } from './dto/${lcModel}.type';
import { Create${pascalModel}Input } from './dto/create-${lcModel}.input';
import {
  ${pascalModel}PaginationArgs,
  Paginated${pascalModel}Response,
} from './dto/pagination.type';
import { Update${pascalModel}Input } from './dto/update-${lcModel}.input';

type ${pascalModel}Field = keyof ${pascalModel};

type FindManyOptions = {
  where?: Prisma.${pascalModel}WhereInput;
  sort?: { field: ${pascalModel}Field; direction: 'asc' | 'desc' }[];
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
};

type FilterOptions = {
  where?: Prisma.${pascalModel}WhereInput;
  search?: string;
  searchFields?: ${pascalModel}Field[];
  dateRange?: {
    field: ${pascalModel}Field;
    from?: Date;
    to?: Date;
  };
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
};

@Resolver(() => ${pascalModel}Type)
export class ${pascalModel}Resolver {
  constructor(private readonly service: ${pascalModel}Service) {}

  @Mutation(() => ${pascalModel}Type)
  async create${pascalModel}(
    @Args('input') input: Create${pascalModel}Input,
  ): Promise<${pascalModel}Type> {
    const result = await this.service.create(
      input as unknown as Prisma.${pascalModel}CreateInput,
    );
    return result as unknown as ${pascalModel}Type;
  }

  @Mutation(() => [${pascalModel}Type])
  async createMany${pascalModel}s(
    @Args('input', { type: () => [Create${pascalModel}Input] })
    input: Create${pascalModel}Input[],
  ): Promise<${pascalModel}Type[]> {
    const result = await this.service.createMany(
      input as unknown as Prisma.${pascalModel}CreateInput[],
    );
    return result as unknown as ${pascalModel}Type[];
  }

  @Query(() => Paginated${pascalModel}Response)
  async ${lcModel}s(
    @Args() args: ${pascalModel}PaginationArgs,
  ): Promise<Paginated${pascalModel}Response> {
    const result = await this.service.findManyWithPagination({
      where: args.where
        ? (JSON.parse(args.where) as Prisma.${pascalModel}WhereInput)
        : undefined,
      sort: args.sort
        ? (JSON.parse(args.sort) as {
            field: ${pascalModel}Field;
            direction: 'asc' | 'desc';
          }[])
        : undefined,
      include: args.include
        ? (JSON.parse(args.include) as Record<string, boolean | object>)
        : undefined,
      select: args.select
        ? (JSON.parse(args.select) as Record<string, boolean>)
        : undefined,
      pagination: {
        page: args.page || 1,
        limit: args.limit || 10,
      },
    });
    return result as unknown as Paginated${pascalModel}Response;
  }

  @Query(() => ${pascalModel}Type, { nullable: true })
  async ${lcModel}(@Args('id') id: string): Promise<${pascalModel}Type | null> {
    const result = await this.service.findById(id);
    return result as unknown as ${pascalModel}Type | null;
  }

  @Query(() => ${pascalModel}Type, { nullable: true })
  async find${pascalModel}(
    @Args('where', { type: () => String }) where: string,
  ): Promise<${pascalModel}Type | null> {
    const result = await this.service.findOne(
      JSON.parse(where) as Prisma.${pascalModel}WhereInput,
    );
    return result as unknown as ${pascalModel}Type | null;
  }

  @Query(() => [${pascalModel}Type])
  async findMany${pascalModel}s(
    @Args('options', { type: () => String }) options: string,
  ): Promise<${pascalModel}Type[]> {
    const parsedOptions = JSON.parse(options) as FindManyOptions;
    const result = await this.service.findMany(parsedOptions);
    return result as unknown as ${pascalModel}Type[];
  }

  @Mutation(() => ${pascalModel}Type)
  async upsert${pascalModel}(
    @Args('where', { type: () => String }) where: string,
    @Args('create') create: Create${pascalModel}Input,
    @Args('update') update: Update${pascalModel}Input,
  ): Promise<${pascalModel}Type> {
    const result = await this.service.upsert(
      JSON.parse(where) as Prisma.${pascalModel}WhereInput,
      create as unknown as Prisma.${pascalModel}CreateInput,
      update as unknown as Prisma.${pascalModel}UpdateInput,
    );
    return result as unknown as ${pascalModel}Type;
  }

  @Mutation(() => ${pascalModel}Type)
  async update${pascalModel}(
    @Args('id') id: string,
    @Args('input') input: Update${pascalModel}Input,
  ): Promise<${pascalModel}Type> {
    const result = await this.service.updateById(
      id,
      input as unknown as Prisma.${pascalModel}UpdateInput,
    );
    return result as unknown as ${pascalModel}Type;
  }

  @Mutation(() => ${pascalModel}Type)
  async updateOne${pascalModel}(
    @Args('where', { type: () => String }) where: string,
    @Args('data') data: Update${pascalModel}Input,
  ): Promise<${pascalModel}Type> {
    const result = await this.service.updateOne(
      JSON.parse(where) as Prisma.${pascalModel}WhereInput,
      data as unknown as Prisma.${pascalModel}UpdateInput,
    );
    return result as unknown as ${pascalModel}Type;
  }

  @Mutation(() => [${pascalModel}Type])
  async updateMany${pascalModel}s(
    @Args('where', { type: () => String }) where: string,
    @Args('data') data: Update${pascalModel}Input,
  ): Promise<${pascalModel}Type[]> {
    const result = await this.service.updateMany(
      JSON.parse(where) as Prisma.${pascalModel}WhereInput,
      data as unknown as Prisma.${pascalModel}UpdateInput,
    );
    return result as unknown as ${pascalModel}Type[];
  }

  @Mutation(() => ${pascalModel}Type)
  async delete${pascalModel}(@Args('id') id: string): Promise<${pascalModel}Type> {
    const result = await this.service.deleteById(id);
    return result as unknown as ${pascalModel}Type;
  }

  @Mutation(() => ${pascalModel}Type)
  async deleteOne${pascalModel}(
    @Args('where', { type: () => String }) where: string,
  ): Promise<${pascalModel}Type> {
    const result = await this.service.deleteOne(
      JSON.parse(where) as Prisma.${pascalModel}WhereInput,
    );
    return result as unknown as ${pascalModel}Type;
  }

  @Mutation(() => [${pascalModel}Type])
  async deleteMany${pascalModel}s(
    @Args('where', { type: () => String }) where: string,
  ): Promise<${pascalModel}Type[]> {
    const result = await this.service.deleteMany(
      JSON.parse(where) as Prisma.${pascalModel}WhereInput,
    );
    return result as unknown as ${pascalModel}Type[];
  }

  @Query(() => Int)
  async count${pascalModel}s(
    @Args('where', { type: () => String }) where: string,
  ): Promise<number> {
    return this.service.count(JSON.parse(where) as Prisma.${pascalModel}WhereInput);
  }

  @Query(() => Boolean)
  async ${lcModel}Exists(
    @Args('where', { type: () => String }) where: string,
  ): Promise<boolean> {
    return this.service.exists(
      JSON.parse(where) as Prisma.${pascalModel}WhereInput,
    );
  }

  @Query(() => [${pascalModel}Type])
  async find${pascalModel}sWithFilters(
    @Args('filters', { type: () => String }) filters: string,
  ): Promise<${pascalModel}Type[]> {
    const result = await this.service.findWithFilters(
      JSON.parse(filters) as FilterOptions,
    );
    return result as unknown as ${pascalModel}Type[];
  }

  @Mutation(() => String)
  async executeRaw${pascalModel}(@Args('query') query: string): Promise<string> {
    const result = await this.service.executeRaw(query);
    return JSON.stringify(result);
  }

  @Query(() => String)
  async queryRaw${pascalModel}(@Args('query') query: string): Promise<string> {
    const result = await this.service.queryRaw(query);
    return JSON.stringify(result);
  }
}`;
}


function generateService(model: string, ext: string): string {
    const lcModel = model.toLowerCase();

    return `import { Injectable } from '@nestjs/common';
import { GenericPrismaService } from 'prisma-model-cli';
import { Prisma, ${model} } from '${START_ROUTE}generated/prisma';

@Injectable()
export class ${model}Service extends GenericPrismaService<
  ${model},
  Prisma.${model}CreateInput,
  Prisma.${model}UpdateInput,
  Prisma.${model}WhereInput
> {
  constructor() {
    super('${lcModel}');
  }
}`;
}

function generateModule(model: string, ext: string): string {
    const lcModel = model.toLowerCase();

    return `import { Module } from '@nestjs/common';
import { ${model}Resolver } from './${lcModel}.resolver';
import { ${model}Service } from './${lcModel}.service';

@Module({
  providers: [${model}Resolver, ${model}Service],
  exports: [${model}Service],
})
export class ${model}Module {}`;
}

function generateGraphQLTypes(model: string, ext: string) {
    const lcModel = model.toLowerCase();
    const objectTypeClass = `${model}Type`;
    const createInputClass = `Create${model}Input`;
    const updateInputClass = `Update${model}Input`;

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    const modelRegex = new RegExp(`model\\s+${model}\\s+{([\\s\\S]*?)}`, 'm');
    const match = modelRegex.exec(schema);

    if (!match) throw new Error(`Model ${model} not found in schema.prisma`);

    const body = match[1].trim();
    const lines = body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'));

    const requiredFields: Set<string> = new Set();
    const relationMap: Record<string, string> = {};
    const foreignKeyFields: Set<string> = new Set();

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;
        const [name] = parts;

        if (line.includes('@relation')) {
            relationMap[name] = line;
            const fieldsMatch = line.match(/fields:\s*\[(.*?)\]/);
            if (fieldsMatch) {
                const fkFields = fieldsMatch[1].split(',').map((f) => f.trim());
                fkFields.forEach((fk) => foreignKeyFields.add(fk));
            }
        }

        if (!line.includes('?')) requiredFields.add(name);
    }

    const graphqlObjectImports = new Set(['Field', 'ObjectType']);
    const graphqlInputImports = new Set(['Field', 'InputType']);
    const objectCustomImports = new Set<string>();
    const inputCustomImports = new Set<string>();

    const typeFields: string[] = [];
    const inputFields: string[] = [];

    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;
        const [name, typeRawRaw] = parts;
        if (!typeRawRaw) continue;

        if (foreignKeyFields.has(name)) continue;

        const typeRaw = typeRawRaw.replace('?', '');
        const isRelation = Boolean(relationMap[name]);
        const isRequired = requiredFields.has(name);
        const isOptional = !isRequired;

        const graphQLType = mapPrismaTypeToGraphQL(typeRaw, isRelation);
        const tsType = getPrismaType(typeRaw);
        const nullable = isOptional ? ', { nullable: true }' : '';

        if (graphQLType === 'Float') {
            graphqlObjectImports.add('Float');
            graphqlInputImports.add('Float');
        } else if (graphQLType === 'Int') {
            graphqlObjectImports.add('Int');
            graphqlInputImports.add('Int');
        } else if (graphQLType === 'GraphQLJSON') {
            objectCustomImports.add('import GraphQLJSON from \'graphql-type-json\';');
            inputCustomImports.add('import GraphQLJSON from \'graphql-type-json\';');
        }

        if (isRelation) {
            const relatedModel = capitalize(typeRaw.replace(/\[\]/g, ''));
            const relatedType = `${relatedModel}Type`;
            const importPath = `../../${relatedModel.toLowerCase()}/dto/${relatedModel.toLowerCase()}.type`;

            if (relatedModel !== model) {
                objectCustomImports.add(`import { ${relatedType} } from '${importPath}';`);
            }

            typeFields.push(`  @Field(() => ${relatedType}${nullable})\n  ${name}${isOptional ? '?' : ''}: ${relatedType};`);
            inputFields.push(`  @Field(() => String${nullable})\n  ${name}Id${isOptional ? '?' : ''}: string;`);
        } else {
            typeFields.push(`  @Field(() => ${graphQLType}${nullable})\n  ${name}${isOptional ? '?' : ''}: ${graphQLType === 'GraphQLJSON' ? 'any' : tsType};`);
            inputFields.push(`  @Field(() => ${graphQLType}${nullable})\n  ${name}${isOptional ? '?' : ''}: ${graphQLType === 'GraphQLJSON' ? 'any' : tsType};`);
        }
    }

    const objectType = [
        `import { ${Array.from(graphqlObjectImports).sort().join(', ')} } from '@nestjs/graphql';`,
        ...Array.from(objectCustomImports),
        '',
        '@ObjectType()',
        `export class ${objectTypeClass} {`,
        ...typeFields,
        '}',
    ].join('\n');

    const createInput = [
        `import { ${Array.from(graphqlInputImports).sort().join(', ')} } from '@nestjs/graphql';`,
        ...Array.from(inputCustomImports),
        '',
        '@InputType()',
        `export class ${createInputClass} {`,
        ...inputFields,
        '}',
    ].join('\n');

    const updateInput = [
        'import { InputType, PartialType } from \'@nestjs/graphql\';',
        `import { ${createInputClass} } from './create-${lcModel}.input';`,
        '',
        '@InputType()',
        `export class ${updateInputClass} extends PartialType(${createInputClass}) {}`,
    ].join('\n');

    const paginationTypes = `import { ObjectType, Field, Int, ArgsType, InputType } from '@nestjs/graphql';
import { ${objectTypeClass} } from './${lcModel}.type';

@ObjectType()
export class ${model}PaginationMeta {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  totalPages: number;

  @Field()
  hasNext: boolean;

  @Field()
  hasPrev: boolean;
}

@ObjectType()
export class Paginated${model}Response {
  @Field(() => [${objectTypeClass}])
  data: ${objectTypeClass}[];

  @Field(() => ${model}PaginationMeta)
  pagination: ${model}PaginationMeta;
}

@ArgsType()
export class ${model}PaginationArgs {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;

  @Field(() => String, { nullable: true })
  where?: string;

  @Field(() => String, { nullable: true })
  sort?: string;

  @Field(() => String, { nullable: true })
  include?: string;

  @Field(() => String, { nullable: true })
  select?: string;
}`;

    return { objectType, createInput, updateInput, paginationTypes };
}

function mapPrismaTypeToGraphQL(prismaType: string, isRelation: boolean): string {
    if (isRelation) return 'Object';

    const base = prismaType.replace('?', '').replace('[]', '');
    const isArray = prismaType.endsWith('[]');

    let graphQLType: string;

    switch (base.toLowerCase()) {
        case 'int':
            graphQLType = 'Int';
            break;
        case 'float':
        case 'decimal':
            graphQLType = 'Float';
            break;
        case 'boolean':
            graphQLType = 'Boolean';
            break;
        case 'date':
        case 'datetime':
            graphQLType = 'Date';
            break;
        case 'json':
            graphQLType = 'GraphQLJSON';
            break;
        case 'string':
        case 'uuid':
        default:
            graphQLType = 'String';
    }

    return isArray ? `[${graphQLType}]` : graphQLType;
}

function getPrismaType(prismaType: string): string {
    const base = prismaType.replace('?', '').replace('[]', '');
    const isArray = prismaType.endsWith('[]');

    let tsType: string;

    switch (base.toLowerCase()) {
        case 'int':
        case 'float':
        case 'decimal':
            tsType = 'number';
            break;
        case 'boolean':
            tsType = 'boolean';
            break;
        case 'date':
        case 'datetime':
            tsType = 'Date';
            break;
        case 'json':
            tsType = 'any';
            break;
        case 'string':
        case 'uuid':
        default:
            tsType = 'string';
    }

    return isArray ? `${tsType}[]` : tsType;
}

function generateAppModule(): void {
    const modelsDir = path.join(OUTPUT_BASE);
    const moduleNames: string[] = [];
    const importLines: string[] = [];

    fs.readdirSync(modelsDir).forEach((folder) => {
        const modulePath = path.join(modelsDir, folder, `${folder}.module.${ext}`);
        if (fs.existsSync(modulePath)) {
            const moduleName = `${modelNames.find((m) => m.toLowerCase() === folder)}Module`;
            moduleNames.push(moduleName);
            importLines.push(`import { ${moduleName} } from './models/${folder}/${folder}.module';`);
        }
    });

    const appModuleContent = `import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppService } from './app.service';
${importLines.join('\n')}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
      sortSchema: true,
      playground: true,
      introspection: true,
    }),
    ${moduleNames.join(',\n    ')}
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}`;

    fs.writeFileSync(path.join('src', 'app.module.ts'), appModuleContent);
    console.log('✅ AppModule updated with GraphQL and all model modules');
}

function capitalize(str: string): string {
    return str
        .replace(/([-_])/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

generateErrorTypes();
generateAppModule();

function generateSwaggerConfigFile() {
    const content = `// src/swagger.ts
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

interface SwaggerOptions {
  title?: string;
  description?: string;
  version?: string;
  serverUrl?: string;
  serverName?: string;
}

export function setupSwagger(
  app: INestApplication,
  options: SwaggerOptions = {}
): void {
  const {
    title = 'My GraphQL API',
    description = 'GraphQL API documentation for My App. Visit /graphql for GraphQL Playground',
    version = '1.0',
    serverUrl = 'http://localhost:3000/',
    serverName = 'Local development server',
  } = options;

  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addServer(serverUrl, serverName)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  console.log('📖 Swagger documentation available at: http://localhost:3000/api');
  console.log('🚀 GraphQL Playground available at: http://localhost:3000/graphql');
}
`;
    const filePath = path.join('src', 'swagger.ts');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    console.log('✅ Swagger configuration file generated at src/swagger.ts');
}

function generatePackageJsonDependencies() {
    const dependencies = {
        "@nestjs/apollo": "^12.0.0",
        "@nestjs/graphql": "^12.0.0",
        "apollo-server-express": "^3.12.0",
        "graphql": "^16.8.1",
        "graphql-type-json": "^0.3.2"
    };

    console.log('📦 Required GraphQL dependencies:');
    console.log('Add these to your package.json dependencies:');
    console.log(JSON.stringify(dependencies, null, 2));
    console.log('\nRun: npm install ' + Object.keys(dependencies).join(' '));
}

// Skip generation if --no-swagger flag is passed
if (!process.argv.includes('--no-swagger')) {
    generateSwaggerConfigFile();
} else {
    console.log('🚫 Skipping Swagger generation (--no-swagger flag detected)');
}

generatePackageJsonDependencies();

// Run ESLint fix in the output directory
console.log('🧹 Running ESLint fix...');
function cleanAndOrganizeImports(): void {
    console.log('🧹 Cleaning up unused and organizing imports...');
    try {
        // Ensure prettier-plugin-organize-imports is available
        const prettierPluginPath = require.resolve('prettier-plugin-organize-imports');

        // Run prettier with import organization plugin
        execSync(
            `npx prettier "${OUTPUT_BASE_SRC}/**/*.{ts,tsx}" --write --plugin ${prettierPluginPath}`,
            { stdio: 'inherit' }
        );
        console.log('✅ Imports organized and formatted');
    } catch (error) {
        console.error('❌ Failed to organize imports. Make sure prettier-plugin-organize-imports is installed.');
    }
}
cleanAndOrganizeImports();

try {
    execSync('npx eslint . --fix', {
        stdio: 'inherit',
        cwd: OUTPUT_BASE_SRC,
    });
    console.log('✅ ESLint fix completed');
} catch (error) {
    console.error('❌ ESLint fix failed:', error);
}
