"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const process_1 = require("process");
const SCHEMA_PATH = path_1.default.join(process.cwd(), 'prisma/schema.prisma');
const OUTPUT_BASE = path_1.default.join(process.cwd(), 'models');
const schema = fs_1.default.readFileSync(SCHEMA_PATH, 'utf-8');
const modelRegex = /model\s+(\w+)\s+{/g;
console.log('📦 Installing prisma generate');
try {
    (0, child_process_1.execSync)('npx prisma generate');
}
catch (error) {
    console.log("didnt succeed to fetch!");
    process_1.exit;
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
    if (!fs_1.default.existsSync(folderPath))
        fs_1.default.mkdirSync(folderPath);
    const controllerFile = path_1.default.join(folderPath, `${folderName}.controller.ts`);
    const serviceFile = path_1.default.join(folderPath, `${folderName}.service.ts`);
    const moduleFile = path_1.default.join(folderPath, `${folderName}.module.ts`);
    fs_1.default.writeFileSync(controllerFile, generateController(modelName));
    fs_1.default.writeFileSync(serviceFile, generateService(modelName));
    fs_1.default.writeFileSync(moduleFile, generateModule(modelName));
    console.log(`✅ Generated files for: ${modelName}`);
});
function generateController(model) {
    const lcModel = model.toLowerCase();
    return `import { Controller, Get, Post, Body, Param, Query, Put, Delete } from '@nestjs/common';
import ${lcModel}Service from './${lcModel}.service';
import { Prisma } from '../../generated/prisma';

@Controller('${lcModel}s')
export class ${model}Controller {
  constructor(private readonly service = ${lcModel}Service) {}

  @Post()
  create(@Body() data: Prisma.${model}CreateInput) {
    return this.service.create(data);
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
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
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Prisma.${model}UpdateInput) {
    return this.service.updateById(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deleteById(id);
  }
}
`;
}
function generateService(model) {
    const lcModel = model.toLowerCase();
    return `import { Injectable } from '@nestjs/common';
import { GenericPrismaService } from 'prisma-model-cli/services/db/dbService';
import { Prisma, ${model} } from '../../generated/prisma';

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
}

const ${lcModel}Service = new ${model}Service();

export default ${lcModel}Service;
`;
}
function generateModule(model) {
    const lcModel = model.toLowerCase();
    return `import { Module } from '@nestjs/common';
import { ${model}Controller } from './${lcModel}.controller';
import { ${model}Service } from './${lcModel}.service';

@Module({
  imports: [],
  controllers: [${model}Controller],
  providers: [${model}Service],
})
export class ${model}Module {}
`;
}
