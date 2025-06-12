import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';


const ext = 'ts';

const SCHEMA_PATH = path.join('prisma/schema.prisma');
const OUTPUT_BASE = path.join(process.cwd(), 'models');

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

  const controllerFile = path.join(folderPath, `${folderName}.controller.${ext}`);
  const serviceFile = path.join(folderPath, `${folderName}.service.${ext}`);
  const moduleFile = path.join(folderPath, `${folderName}.module.${ext}`);

  const { baseDto, createDto, updateDto } = generateDtos(modelName, ext);
  fs.writeFileSync(path.join(dtoFolder, `base-${folderName}.dto.${ext}`), baseDto);
  fs.writeFileSync(path.join(dtoFolder, `create-${folderName}.dto.${ext}`), createDto);
  fs.writeFileSync(path.join(dtoFolder, `update-${folderName}.dto.${ext}`), updateDto);

  fs.writeFileSync(controllerFile, generateController(modelName, ext));
  fs.writeFileSync(serviceFile, generateService(modelName, ext));
  fs.writeFileSync(moduleFile, generateModule(modelName, ext));

  console.log(`✅ Generated ${ext.toUpperCase()} files for: ${modelName}`);
});

function generateController(model: string, ext: string): string {
  const lcModel = model.toLowerCase();
  const importType = 'import';
  const exportSyntax = 'export class';

  return `${importType} { Controller, Get, Post, Body, Param, Query, Put, Delete } from '@nestjs/common';
${importType} { ApiTags, ApiOperation } from '@nestjs/swagger';
${importType} ${lcModel}Service from './${lcModel}.service';
${importType} { Create${model}Dto } from './dto/create-${lcModel}.dto';
${importType} { Update${model}Dto } from './dto/update-${lcModel}.dto';

@ApiTags('${model}')
@Controller('${lcModel}s')
${exportSyntax} ${model}Controller {
  constructor(private readonly service = ${lcModel}Service) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ${model}' })
  create(@Body() data: Create${model}Dto) {
    return this.service.create(data);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple ${model}s' })
  createMany(@Body() data: Create${model}Dto[]) {
    return this.service.createMany(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of ${model}s' })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('where') where?: string,
    @Query('sort') sort?: string,
    @Query('include') include?: string,
    @Query('select') select?: string
  ) {
    return this.service.findManyWithPagination({
      where: where ? JSON.parse(where) : undefined,
      sort: sort ? JSON.parse(sort) : undefined,
      include: include ? JSON.parse(include) : undefined,
      select: select ? JSON.parse(select) : undefined,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single ${model} by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('find-one')
  @ApiOperation({ summary: 'Find one ${model} by custom where clause' })
  findOneCustom(@Body() where: Record<string, unknown>) {
    return this.service.findOne(where);
  }

  @Post('find')
  @ApiOperation({ summary: 'Find many ${model}s by custom query' })
  findMany(@Body() options: Record<string, unknown>) {
    return this.service.findMany(options);
  }

  @Post('upsert')
  @ApiOperation({ summary: 'Upsert a ${model}' })
  upsert(@Body() body: {
    where: Record<string, unknown>;
    create: Create${model}Dto;
    update: Update${model}Dto;
  }) {
    return this.service.upsert(body.where, body.create, body.update);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a ${model} by ID' })
  update(@Param('id') id: string, @Body() data: Update${model}Dto) {
    return this.service.updateById(id, data);
  }

  @Post('update-one')
  @ApiOperation({ summary: 'Update one ${model} by custom where clause' })
  updateOne(@Body() body: {
    where: Record<string, unknown>;
    data: Update${model}Dto;
  }) {
    return this.service.updateOne(body.where, body.data);
  }

  @Post('update-many')
  @ApiOperation({ summary: 'Update many ${model}s' })
  updateMany(@Body() body: {
    where: Record<string, unknown>;
    data: Update${model}Dto;
  }) {
    return this.service.updateMany(body.where, body.data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a ${model} by ID' })
  remove(@Param('id') id: string) {
    return this.service.deleteById(id);
  }

  @Post('delete-one')
  @ApiOperation({ summary: 'Delete one ${model} by custom where clause' })
  deleteOne(@Body() where: Record<string, unknown>) {
    return this.service.deleteOne(where);
  }

  @Post('delete-many')
  @ApiOperation({ summary: 'Delete many ${model}s by filter' })
  deleteMany(@Body() where: Record<string, unknown>) {
    return this.service.deleteMany(where);
  }

  @Post('count')
  @ApiOperation({ summary: 'Count ${model}s matching a filter' })
  count(@Body() where: Record<string, unknown>) {
    return this.service.count(where);
  }

  @Post('exists')
  @ApiOperation({ summary: 'Check if ${model} exists by filter' })
  exists(@Body() where: Record<string, unknown>) {
    return this.service.exists(where);
  }

  @Post('filters')
  @ApiOperation({ summary: 'Advanced filter for ${model}s' })
  findWithFilters(@Body() filters: Record<string, unknown>) {
    return this.service.findWithFilters(filters);
  }

  @Post('sql/execute')
  @ApiOperation({ summary: 'Execute raw SQL (dangerous)' })
  executeRaw(@Body() body: { query: string }) {
    return this.service.executeRaw(body.query);
  }

  @Post('sql/query')
  @ApiOperation({ summary: 'Run raw SQL and return results' })
  queryRaw(@Body() body: { query: string }) {
    return this.service.queryRaw(body.query);
  }
}
`;
}



function generateService(model: string, ext: string): string {
  const lcModel = model.toLowerCase();
  const exportSyntax = ext === 'ts' ? 'export class' : 'class';

  return `import { Injectable } from '@nestjs/common';
import { GenericPrismaService } from 'prisma-model-cli';
import { Prisma, ${model} } from '../../generated/prisma';

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
}

const ${lcModel}Service = new ${model}Service();
export default ${lcModel}Service;`;
}

function generateModule(model: string, ext: string): string {
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
function mapPrismaTypeToTs(fieldName: string, modelName: string): string {
  return `Prisma.${modelName}CreateInput['${fieldName}']`;
}


function generateDtos(model: string, ext: string) {
  const lcModel = model.toLowerCase();
  const baseClass = `${model}BaseDto`;
  const createClass = `Create${model}Dto`;
  const updateClass = `Update${model}Dto`;

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const modelRegex = new RegExp(`model\\s+${model}\\s+{([\\s\\S]*?)}`, 'm');
  const match = modelRegex.exec(schema);

  if (!match) throw new Error(`Model ${model} not found in schema.prisma`);

  const body = match[1].trim();
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('@') && !line.startsWith('@@'));

  const relationMap: Record<string, string> = {};
  const requiredFields: Set<string> = new Set();

  lines.forEach((line) => {
    const [name, , ...rest] = line.split(/\s+/);
    if (line.includes('@relation')) relationMap[name] = line;
    if (!line.includes('?')) requiredFields.add(name);
  });

  const fieldLines = lines
    .map((line) => {
      const [name, typeRaw] = line.split(/\s+/);

      // Skip scalar foreign keys (e.g., storeId)
      if (name.endsWith('Id') && relationMap[name.replace(/Id$/, '')]) {
        return null;
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
import { Prisma } from '../../../generated/prisma';

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



