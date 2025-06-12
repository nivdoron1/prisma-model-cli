"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ext = 'ts';
const START_ROUTE = '../../../';
const SCHEMA_PATH = path_1.default.join('prisma/schema.prisma');
const OUTPUT_BASE = path_1.default.join(process.cwd(), './src/models');
const OUTPUT_BASE_SRC = path_1.default.join(process.cwd(), './src');
if (!fs_1.default.existsSync(SCHEMA_PATH)) {
    console.error(`❌ schema.prisma not found at ${SCHEMA_PATH}`);
    process.exit(1);
}
const schema = fs_1.default.readFileSync(SCHEMA_PATH, 'utf-8');
const modelRegex = /model\s+(\w+)\s+{/g;
console.log('📦 Running Prisma generate...');
try {
    (0, child_process_1.execSync)('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated');
}
catch {
    console.error('❌ Failed to run prisma generate');
    process.exit(1);
}
const modelNames = [];
let match;
while ((match = modelRegex.exec(schema)) !== null) {
    modelNames.push(match[1]);
}
if (!fs_1.default.existsSync(OUTPUT_BASE))
    fs_1.default.mkdirSync(OUTPUT_BASE, { recursive: true });
console.log(`🔍 Found models: ${modelNames.join(', ')}`);
modelNames.forEach((modelName) => {
    const folderName = modelName.toLowerCase();
    const folderPath = path_1.default.join(OUTPUT_BASE, folderName);
    const dtoFolder = path_1.default.join(folderPath, 'dto');
    fs_1.default.mkdirSync(dtoFolder, { recursive: true });
    const controllerFile = path_1.default.join(folderPath, `${folderName}.controller.${ext}`);
    const serviceFile = path_1.default.join(folderPath, `${folderName}.service.${ext}`);
    const moduleFile = path_1.default.join(folderPath, `${folderName}.module.${ext}`);
    const { baseDto, createDto, updateDto } = generateDtos(modelName, ext);
    // DTOs are always overwritten
    fs_1.default.writeFileSync(path_1.default.join(dtoFolder, `base-${folderName}.dto.${ext}`), baseDto);
    fs_1.default.writeFileSync(path_1.default.join(dtoFolder, `create-${folderName}.dto.${ext}`), createDto);
    fs_1.default.writeFileSync(path_1.default.join(dtoFolder, `update-${folderName}.dto.${ext}`), updateDto);
    // ✅ Skip if files already exist
    if (!fs_1.default.existsSync(controllerFile)) {
        fs_1.default.writeFileSync(controllerFile, generateController(modelName, ext));
    }
    if (!fs_1.default.existsSync(serviceFile)) {
        fs_1.default.writeFileSync(serviceFile, generateService(modelName, ext));
    }
    if (!fs_1.default.existsSync(moduleFile)) {
        fs_1.default.writeFileSync(moduleFile, generateModule(modelName, ext));
    }
    console.log(`✅ Prepared files for: ${modelName}`);
});
function generateController(model, ext) {
    const lcModel = model.toLowerCase();
    const importType = 'import';
    const exportSyntax = 'export class';
    return `${importType} {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
${importType} { ApiTags, ApiOperation } from '@nestjs/swagger';
${importType} { ${model}Service } from './${lcModel}.service';
${importType} { Create${model}Dto } from './dto/create-${lcModel}.dto';
${importType} { Update${model}Dto } from './dto/update-${lcModel}.dto';
${importType} { ${model}, Prisma } from '${START_ROUTE}generated/prisma';
${importType} { SortOptions } from 'prisma-model-cli/services/db/types';

@ApiTags('${model}')
@Controller('${lcModel}s')
${exportSyntax} ${model}Controller {
  constructor(private readonly service: ${model}Service) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ${model}' , operationId: '${lcModel}_create' } )
  create(@Body() data: Create${model}Dto) {
    return this.service.create(data);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple ${model}s' , operationId: '${lcModel}_createMany' } )
  createMany(@Body() data: Create${model}Dto[]) {
    return this.service.createMany(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of ${model}s' , operationId: '${lcModel}_findAll' } )
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('where') where?: Prisma.${model}WhereInput,
    @Query('sort') sort?: SortOptions<${model}>[],
    @Query('include') include?: Prisma.${model}Include,
    @Query('select') select?: Prisma.${model}Select,
  ) {
    return this.service.findManyWithPagination({
      where: where ? where : undefined,
      sort: sort ? sort : undefined,
      include: include ? include : undefined,
      select: select ? select : undefined,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single ${model} by ID', operationId: '${lcModel}_findOne' } )
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('find-one')
  @ApiOperation({ summary: 'Find one ${model} by custom where clause' , operationId: '${lcModel}_findOneCustom' } )
  findOneCustom(@Body() where: Record<string, unknown>) {
    return this.service.findOne(where);
  }

  @Post('find')
  @ApiOperation({ summary: 'Find many ${model}s by custom query', operationId: '${lcModel}_findMany' } )
  findMany(@Body() options: Record<string, unknown>) {
    return this.service.findMany(options);
  }

  @Post('upsert')
  @ApiOperation({ summary: 'Upsert a ${model}' , operationId: '${lcModel}_upsert' } )
  upsert(@Body() body: {
    where: Record<string, unknown>;
    create: Create${model}Dto;
    update: Update${model}Dto;
  }) {
    return this.service.upsert(body.where, body.create, body.update);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a ${model} by ID' , operationId: '${lcModel}_update' } )
  update(@Param('id') id: string, @Body() data: Update${model}Dto) {
    return this.service.updateById(id, data);
  }

  @Post('update-one')
  @ApiOperation({ summary: 'Update one ${model} by custom where clause' , operationId: '${lcModel}_updateOne' } )
  updateOne(@Body() body: {
    where: Record<string, unknown>;
    data: Update${model}Dto;
  }) {
    return this.service.updateOne(body.where, body.data);
  }

  @Post('update-many')
  @ApiOperation({ summary: 'Update many ${model}s' , operationId: '${lcModel}_updateMany' } )
  updateMany(@Body() body: {
    where: Record<string, unknown>;
    data: Update${model}Dto;
  }) {
    return this.service.updateMany(body.where, body.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ${model} by ID' , operationId: '${lcModel}_remove' } )
  remove(@Param('id') id: string) {
    return this.service.deleteById(id);
  }

  @Post('delete-one')
  @ApiOperation({ summary: 'Delete one ${model} by custom where clause', operationId: '${lcModel}_deleteOne' } )
  deleteOne(@Body() where: Record<string, unknown>) {
    return this.service.deleteOne(where);
  }

  @Post('delete-many')
  @ApiOperation({ summary: 'Delete many ${model}s by filter' , operationId: '${lcModel}_deleteMany' } )
  deleteMany(@Body() where: Record<string, unknown>) {
    return this.service.deleteMany(where);
  }

  @Post('count')
  @ApiOperation({ summary: 'Count ${model}s matching a filter' , operationId: '${lcModel}_count' } )
  count(@Body() where: Record<string, unknown>) {
    return this.service.count(where);
  }

  @Post('exists')
  @ApiOperation({ summary: 'Check if ${model} exists by filter' , operationId: '${lcModel}_exists' } )
  exists(@Body() where: Record<string, unknown>) {
    return this.service.exists(where);
  }

  @Post('filters')
  @ApiOperation({ summary: 'Advanced filter for ${model}s' , operationId: '${lcModel}_findWithFilters' } )
  findWithFilters(@Body() filters: Record<string, unknown>) {
    return this.service.findWithFilters(filters);
  }

  @Post('sql/execute')
  @ApiOperation({ summary: 'Execute raw SQL (dangerous)' , operationId: '${lcModel}_executeRaw' } )
  executeRaw(@Body() body: { query: string }) {
    return this.service.executeRaw(body.query);
  }

  @Post('sql/query')
  @ApiOperation({ summary: 'Run raw SQL and return results' , operationId: '${lcModel}_queryRaw' } )
  queryRaw(@Body() body: { query: string }) {
    return this.service.queryRaw(body.query);
  }
}
`;
}
function generateService(model, ext) {
    const lcModel = model.toLowerCase();
    const exportSyntax = ext === 'ts' ? 'export class' : 'class';
    return `import { Injectable } from '@nestjs/common';
import { GenericPrismaService } from 'prisma-model-cli';
import { Prisma, ${model} } from '${START_ROUTE}generated/prisma';

@Injectable()
${exportSyntax} ${model}Service extends GenericPrismaService<
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
function generateModule(model, ext) {
    const lcModel = model.toLowerCase();
    const exportSyntax = 'export class';
    return `import { Module } from '@nestjs/common';
import { ${model}Controller } from './${lcModel}.controller';
import { ${model}Service } from './${lcModel}.service';

@Module({
  imports: [],
  controllers: [${model}Controller],
  providers: [${model}Service],
})
${exportSyntax} ${model}Module {}`;
}
/*
function mapPrismaTypeToTs(prismaType: string): string {
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
      tsType = 'Prisma.InputJsonValue'; // ✅ Prisma-native JSON type
      break;
    case 'string':
    case 'uuid':
    default:
      tsType = 'string';
  }

  if (isArray) return `${tsType}[]`;
  return tsType;
}*/
function mapPrismaTypeToTs(fieldName, modelName) {
    return `Prisma.${modelName}CreateInput['${fieldName}']`;
}
function generateDtos(model, ext) {
    const lcModel = model.toLowerCase();
    const baseClass = `${model}BaseDto`;
    const createClass = `Create${model}Dto`;
    const updateClass = `Update${model}Dto`;
    const schema = fs_1.default.readFileSync(SCHEMA_PATH, 'utf-8');
    const modelRegex = new RegExp(`model\\s+${model}\\s+{([\\s\\S]*?)}`, 'm');
    const match = modelRegex.exec(schema);
    if (!match)
        throw new Error(`Model ${model} not found in schema.prisma`);
    const body = match[1].trim();
    const lines = body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'));
    const requiredFields = new Set();
    const relationMap = {};
    const foreignKeyFields = new Set();
    // First pass: detect relations and required fields
    for (const line of lines) {
        const [name, , ...rest] = line.split(/\s+/);
        if (line.includes('@relation')) {
            relationMap[name] = line;
            // Extract fields = [...] from @relation
            const fieldsMatch = line.match(/fields:\s*\[(.*?)\]/);
            if (fieldsMatch) {
                const fkFields = fieldsMatch[1].split(',').map((f) => f.trim());
                fkFields.forEach((fk) => foreignKeyFields.add(fk));
            }
        }
        if (!line.includes('?'))
            requiredFields.add(name);
    }
    const fieldLines = lines
        .map((line) => {
        const [name, typeRaw] = line.split(/\s+/);
        if (foreignKeyFields.has(name)) {
            return null; // Skip foreign key scalars tied to a relation
        }
        const tsType = mapPrismaTypeToTs(name, model);
        const isRequired = requiredFields.has(name);
        const postfix = isRequired ? '!' : '?';
        if (relationMap[name]) {
            return `  @ApiProperty({ type: () => Object })\n  ${name}${postfix}: ${tsType};`;
        }
        return `  @ApiProperty()\n  ${name}${postfix}: ${tsType};`;
    })
        .filter(Boolean)
        .join('\n\n');
    const baseDto = `import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '${START_ROUTE}../generated/prisma';

export class ${baseClass} {
${fieldLines}
}
`;
    const createDto = `import { ${baseClass} } from './base-${lcModel}.dto';

export class ${createClass} extends ${baseClass} {}
`;
    const updateDto = `import { PartialType } from '@nestjs/swagger';
import { ${createClass} } from './create-${lcModel}.dto';

export class ${updateClass} extends PartialType(${createClass}) {}
`;
    return { baseDto, createDto, updateDto };
}
function generateAppModule() {
    const modelsDir = path_1.default.join(OUTPUT_BASE);
    const moduleNames = [];
    const importLines = [];
    fs_1.default.readdirSync(modelsDir).forEach((folder) => {
        const modulePath = path_1.default.join(modelsDir, folder, `${folder}.module.${ext}`);
        if (fs_1.default.existsSync(modulePath)) {
            const moduleName = `${modelNames.find((m) => m.toLowerCase() === folder)}Module`;
            moduleNames.push(moduleName);
            importLines.push(`import { ${moduleName} } from './models/${folder}/${folder}.module';`);
        }
    });
    const appModuleContent = `import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
${importLines.join('\n')}

@Module({
  imports: [
    ${moduleNames.join(',\n    ')}
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`;
    fs_1.default.writeFileSync(path_1.default.join('src', 'app.module.ts'), appModuleContent);
    console.log('✅ AppModule updated with all model modules');
}
function capitalize(str) {
    return str
        .replace(/([-_])/g, ' ') // convert kebab/snake case to space-separated
        .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase boundaries
        .split(/\s+/) // split by whitespace
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}
generateAppModule();
// Run ESLint fix in the output directory
console.log('🧹 Running ESLint fix...');
try {
    (0, child_process_1.execSync)('npx eslint . --fix', {
        stdio: 'inherit',
        cwd: OUTPUT_BASE_SRC,
    });
    console.log('✅ ESLint fix completed');
}
catch (error) {
    console.error('❌ ESLint fix failed:', error);
}
