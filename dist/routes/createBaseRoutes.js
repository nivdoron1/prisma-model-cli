"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBaseRoutes = createBaseRoutes;
const express_1 = __importDefault(require("express"));
function createBaseRoutes(controller) {
    const router = express_1.default.Router();
    router.post('/', controller.create);
    router.post('/bulk', controller.createMany);
    router.get('/all', controller.findMany);
    router.get('/', controller.findManyWithPagination);
    router.get('/:id', controller.findById);
    router.post('/find-one', controller.findOne);
    router.put('/:id', controller.updateById);
    router.put('/', controller.updateOne);
    router.delete('/:id', controller.deleteById);
    router.delete('/', controller.deleteOne);
    router.post('/count', controller.count);
    router.post('/exists', controller.exists);
    router.post('/upsert', controller.upsert);
    router.post('/raw-query', controller.queryRaw);
    router.post('/raw-exec', controller.executeRaw);
    router.post('/filter', controller.findWithFilters);
    return router;
}
