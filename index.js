// index.js
const BaseController = require('./controllers/baseController');
const { createBaseRoutes } = require('./routes/createBaseRoutes');
const { GenericPrismaService } = require('./services/db/dbService');

module.exports = {
    BaseController,
    createBaseRoutes,
    GenericPrismaService
};
