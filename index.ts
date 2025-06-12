// index.ts
import { BaseController } from './controllers/baseController'; // Express version (JS/TS)
import { BaseController as BaseControllerNest } from './controllers/base.controller'; // NestJS version
import { createBaseRoutes } from './routes/createBaseRoutes';
import { GenericPrismaService } from './services/db/dbService';

export {
    BaseController,
    BaseControllerNest,
    createBaseRoutes,
    GenericPrismaService
};

export default {
    BaseController,
    BaseControllerNest,
    createBaseRoutes,
    GenericPrismaService
};
