// lib/dbService.js
const { PrismaClient } = require('@prisma/client');
const prisma = require('../../lib/db');

/**
 * @template T
 * @template TCreateInput
 * @template TUpdateInput
 * @template TWhereInput
 */
class GenericPrismaService {
    constructor(modelName) {
        this.prisma = prisma;
        this.modelName = modelName;
    }

    get delegate() {
        return this.prisma[this.modelName.toLowerCase()];
    }

    async create(data) {
        return await this.delegate.create({ data });
    }

    async createMany(data) {
        return await this.delegate.createMany({ data, skipDuplicates: true });
    }

    async findById(id) {
        return await this.delegate.findUnique({ where: { id } });
    }

    async findOne(where) {
        return await this.delegate.findFirst({ where });
    }

    async findMany(options = {}) {
        const { where, pagination, sort, include, select } = options;
        const query = { where, include, select };

        if (sort && sort.length > 0) {
            query.orderBy = sort.map((s) => ({ [s.field]: s.direction }));
        }

        if (pagination) {
            const { page = 1, limit = 10 } = pagination;
            query.skip = (page - 1) * limit;
            query.take = limit;
        }

        return await this.delegate.findMany(query);
    }

    async findManyWithPagination(options = {}) {
        const {
            where,
            pagination = { page: 1, limit: 10 },
            sort,
            include,
            select,
        } = options;

        const { page = 1, limit = 10 } = pagination;
        const total = await this.count(where);
        const data = await this.findMany({ where, pagination, sort, include, select });
        const totalPages = Math.ceil(total / limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    async updateById(id, data) {
        return await this.delegate.update({ where: { id }, data });
    }

    async updateOne(where, data) {
        return await this.delegate.update({ where, data });
    }

    async updateMany(where, data) {
        return await this.delegate.updateMany({ where, data });
    }

    async upsert(where, create, update) {
        return await this.delegate.upsert({ where, create, update });
    }

    async deleteById(id) {
        return await this.delegate.delete({ where: { id } });
    }

    async deleteOne(where) {
        return await this.delegate.delete({ where });
    }

    async deleteMany(where) {
        return await this.delegate.deleteMany({ where });
    }

    async count(where) {
        return await this.delegate.count({ where });
    }

    async exists(where) {
        const count = await this.count(where);
        return count > 0;
    }

    async findWithFilters(filters) {
        const {
            search,
            searchFields = [],
            dateRange,
            status,
            customWhere = {},
            pagination,
            sort,
            include,
        } = filters;

        const where = { ...customWhere };

        if (search && searchFields.length > 0) {
            where.OR = searchFields.map((field) => ({
                [field]: { contains: search, mode: 'insensitive' },
            }));
        }

        if (dateRange) {
            const dateFilter = {};
            if (dateRange.from) dateFilter.gte = dateRange.from;
            if (dateRange.to) dateFilter.lte = dateRange.to;
            if (Object.keys(dateFilter).length > 0) {
                where[dateRange.field] = dateFilter;
            }
        }

        if (status) {
            where.status = Array.isArray(status) ? { in: status } : status;
        }

        return await this.findManyWithPagination({
            where,
            pagination,
            sort,
            include,
        });
    }

    async executeRaw(query) {
        return await this.prisma.$executeRawUnsafe(query);
    }

    async queryRaw(query) {
        return await this.prisma.$queryRawUnsafe(query);
    }

    async transaction(fn) {
        return await this.prisma.$transaction(fn);
    }
}

/**
 * @template T
 * @template TC
 * @template TU
 * @template TW
 * @param {PrismaClient} prisma
 * @param {string} modelName
 * @returns {GenericPrismaService}
 */
function createService(prisma, modelName) {
    return new GenericPrismaService(modelName);
}

module.exports = {
    GenericPrismaService,
    createService,
};
