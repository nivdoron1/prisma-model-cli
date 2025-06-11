"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericPrismaService = void 0;
exports.createService = createService;
const db_1 = __importDefault(require("../../lib/db"));
// Generic Prisma Service Class
class GenericPrismaService {
    constructor(modelName) {
        this.modelName = modelName;
        this.prisma = db_1.default;
    }
    // Get the delegate for the current model
    get delegate() {
        return this.prisma[this.modelName.toLowerCase()];
    }
    /**
     * Create a single record
     */
    async create(data) {
        const delegate = this.delegate;
        return await delegate.create({ data });
    }
    /**
     * Bulk create multiple records
     */
    async createMany(data) {
        const delegate = this.delegate;
        return await delegate.createMany({
            data,
            skipDuplicates: true,
        });
    }
    /**
     * Find a single record by ID
     */
    async findById(id) {
        const delegate = this.delegate;
        return await delegate.findUnique({
            where: { id },
        });
    }
    /**
     * Find a single record by custom where clause
     */
    async findOne(where) {
        const delegate = this.delegate;
        return await delegate.findFirst({ where });
    }
    /**
     * Find multiple records with pagination, filtering, and sorting
     */
    async findMany(options = {}) {
        const { where, pagination, sort, include, select, } = options;
        const query = {
            where,
            include,
            select,
        };
        // Add sorting
        if (sort && sort.length > 0) {
            query.orderBy = sort.map(s => ({
                [s.field]: s.direction,
            }));
        }
        // Add pagination
        if (pagination) {
            const { page = 1, limit = 10 } = pagination;
            query.skip = (page - 1) * limit;
            query.take = limit;
        }
        const delegate = this.delegate;
        return await delegate.findMany(query);
    }
    /**
     * Find multiple records with pagination info
     */
    async findManyWithPagination(options = {}) {
        const { where, pagination = { page: 1, limit: 10 }, sort, include, select, } = options;
        const { page = 1, limit = 10 } = pagination;
        // Get total count
        const total = await this.count(where);
        // Get data
        const data = await this.findMany({
            where,
            pagination: { page, limit },
            sort,
            include,
            select,
        });
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
    /**
     * Update a single record by ID
     */
    async updateById(id, data) {
        const delegate = this.delegate;
        return await delegate.update({
            where: { id },
            data,
        });
    }
    /**
     * Update a single record by custom where clause
     */
    async updateOne(where, data) {
        const delegate = this.delegate;
        return await delegate.update({
            where,
            data,
        });
    }
    /**
     * Bulk update multiple records
     */
    async updateMany(where, data) {
        const delegate = this.delegate;
        return await delegate.updateMany({
            where,
            data,
        });
    }
    /**
     * Upsert a record (update if exists, create if not)
     */
    async upsert(where, create, update) {
        const delegate = this.delegate;
        return await delegate.upsert({
            where,
            create,
            update,
        });
    }
    /**
     * Delete a single record by ID
     */
    async deleteById(id) {
        const delegate = this.delegate;
        return await delegate.delete({
            where: { id },
        });
    }
    /**
     * Delete a single record by custom where clause
     */
    async deleteOne(where) {
        const delegate = this.delegate;
        return await delegate.delete({
            where,
        });
    }
    /**
     * Bulk delete multiple records
     */
    async deleteMany(where) {
        const delegate = this.delegate;
        return await delegate.deleteMany({
            where,
        });
    }
    /**
     * Count records
     */
    async count(where) {
        const delegate = this.delegate;
        return await delegate.count({
            where,
        });
    }
    /**
     * Check if record exists
     */
    async exists(where) {
        const count = await this.count(where);
        return count > 0;
    }
    /**
     * Find records with advanced filtering
     */
    async findWithFilters(filters) {
        const { search, searchFields = [], dateRange, status, customWhere = {}, pagination, sort, include, } = filters;
        const where = { ...customWhere };
        // Add search functionality
        if (search && searchFields.length > 0) {
            where.OR = searchFields.map(field => ({
                [field]: {
                    contains: search,
                    mode: 'insensitive',
                },
            }));
        }
        // Add date range filter
        if (dateRange) {
            const dateFilter = {};
            if (dateRange.from)
                dateFilter.gte = dateRange.from;
            if (dateRange.to)
                dateFilter.lte = dateRange.to;
            if (Object.keys(dateFilter).length > 0) {
                where[dateRange.field] = dateFilter;
            }
        }
        // Add status filter
        if (status) {
            where.status = Array.isArray(status) ? { in: status } : status;
        }
        return await this.findManyWithPagination({
            where: where,
            pagination,
            sort,
            include,
        });
    }
    /**
     * Execute raw SQL query
     */
    async executeRaw(query) {
        return await this.prisma.$executeRawUnsafe(query);
    }
    /**
     * Query raw SQL
     */
    async queryRaw(query) {
        return await this.prisma.$queryRawUnsafe(query);
    }
    /**
     * Transaction wrapper
     */
    async transaction(fn) {
        return await this.prisma.$transaction(fn);
    }
}
exports.GenericPrismaService = GenericPrismaService;
// Factory function to create service instances
function createService(prisma, modelName) {
    return new GenericPrismaService(modelName);
}
