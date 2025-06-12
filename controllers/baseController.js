const { GenericPrismaService } = require('../services/db/dbService');

class BaseController {
    /**
     * @param {GenericPrismaService} service
     */
    constructor(service) {
        this.service = service;
    }

    async create(req, res) {
        try {
            const result = await this.service.create(req.body);
            res.status(201).json(result);
        } catch (error) {
            this.handleError(res, 'Create Error', error);
        }
    }

    async createMany(req, res) {
        try {
            const result = await this.service.createMany(req.body);
            res.status(201).json(result);
        } catch (error) {
            this.handleError(res, 'Bulk Create Error', error);
        }
    }

    async findById(req, res) {
        try {
            const record = await this.service.findById(req.params.id);
            res.json(record);
        } catch (error) {
            this.handleError(res, 'Find By ID Error', error);
        }
    }

    async findOne(req, res) {
        try {
            const record = await this.service.findOne(req.body);
            res.json(record);
        } catch (error) {
            this.handleError(res, 'Find One Error', error);
        }
    }

    async findMany(req, res) {
        try {
            const records = await this.service.findMany();
            res.json(records);
        } catch (error) {
            this.handleError(res, 'Find Many Error', error);
        }
    }

    async findManyWithPagination(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await this.service.findManyWithPagination({ pagination: { page, limit } });
            res.json(result);
        } catch (error) {
            this.handleError(res, 'Pagination Error', error);
        }
    }

    async updateById(req, res) {
        try {
            const updated = await this.service.updateById(req.params.id, req.body);
            res.json(updated);
        } catch (error) {
            this.handleError(res, 'Update By ID Error', error);
        }
    }

    async updateOne(req, res) {
        try {
            const { where, data } = req.body;
            const updated = await this.service.updateOne(where, data);
            res.json(updated);
        } catch (error) {
            this.handleError(res, 'Update One Error', error);
        }
    }

    async deleteById(req, res) {
        try {
            const deleted = await this.service.deleteById(req.params.id);
            res.json(deleted);
        } catch (error) {
            this.handleError(res, 'Delete By ID Error', error);
        }
    }

    async deleteOne(req, res) {
        try {
            const deleted = await this.service.deleteOne(req.body);
            res.json(deleted);
        } catch (error) {
            this.handleError(res, 'Delete One Error', error);
        }
    }

    async count(req, res) {
        try {
            const total = await this.service.count(req.body);
            res.json({ total });
        } catch (error) {
            this.handleError(res, 'Count Error', error);
        }
    }

    async exists(req, res) {
        try {
            const exists = await this.service.exists(req.body);
            res.json({ exists });
        } catch (error) {
            this.handleError(res, 'Exists Error', error);
        }
    }

    async upsert(req, res) {
        try {
            const { where, create, update } = req.body;
            const result = await this.service.upsert(where, create, update);
            res.json(result);
        } catch (error) {
            this.handleError(res, 'Upsert Error', error);
        }
    }

    async queryRaw(req, res) {
        try {
            const result = await this.service.queryRaw(req.body.query);
            res.json(result);
        } catch (error) {
            this.handleError(res, 'Query Raw Error', error);
        }
    }

    async executeRaw(req, res) {
        try {
            const affected = await this.service.executeRaw(req.body.query);
            res.json({ affected });
        } catch (error) {
            this.handleError(res, 'Execute Raw Error', error);
        }
    }

    async findWithFilters(req, res) {
        try {
            const result = await this.service.findWithFilters(req.body);
            res.json(result);
        } catch (error) {
            this.handleError(res, 'Filter Error', error);
        }
    }

    handleError(res, label, error) {
        console.error(`${label}:`, error);
        res.status(500).json({ error: error?.message || 'Unknown error' });
    }
}

module.exports = BaseController;
