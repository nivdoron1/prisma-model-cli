// routes/createBaseRoutes.js
const express = require('express');

/**
 * @param {Object} controller - An object implementing base controller methods
 * @returns {import('express').Router}
 */
function createBaseRoutes(controller) {
    const router = express.Router();

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

module.exports = { createBaseRoutes };
