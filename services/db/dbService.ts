import { PrismaClient } from '@prisma/client';
import { BulkResult, PaginationOptions, SortOptions, PaginatedResult } from './types';
import prisma from '../../lib/db';

// Generic Prisma Service Class
export class GenericPrismaService<
    T extends Record<string, unknown>,
    TCreateInput extends Record<string, unknown>,
    TUpdateInput extends Record<string, unknown>,
    TWhereInput extends Record<string, unknown>
> {
    protected prisma = prisma;
    constructor(
        private modelName: string
    ) { }

    // Get the delegate for the current model
    private get delegate(): Record<string, unknown> {
        return (this.prisma as Record<string, unknown>)[this.modelName.toLowerCase()] as Record<string, unknown>;
    }

    /**
     * Create a single record
     */
    async create(data: TCreateInput): Promise<T> {
        const delegate = this.delegate as {
            create: (args: { data: TCreateInput }) => Promise<T>;
        };
        return await delegate.create({ data });
    }

    /**
     * Bulk create multiple records
     */
    async createMany(data: TCreateInput[]): Promise<BulkResult> {
        const delegate = this.delegate as {
            createMany: (args: { data: TCreateInput[]; skipDuplicates?: boolean }) => Promise<BulkResult>;
        };
        return await delegate.createMany({
            data,
            skipDuplicates: true,
        });
    }

    /**
     * Find a single record by ID
     */
    async findById(id: string | number): Promise<T | null> {
        const delegate = this.delegate as {
            findUnique: (args: { where: { id: string | number } }) => Promise<T | null>;
        };
        return await delegate.findUnique({
            where: { id },
        });
    }

    /**
     * Find a single record by custom where clause
     */
    async findOne(where: TWhereInput): Promise<T | null> {
        const delegate = this.delegate as {
            findFirst: (args: { where: TWhereInput }) => Promise<T | null>;
        };
        return await delegate.findFirst({ where });
    }

    /**
     * Find multiple records with pagination, filtering, and sorting
     */
    async findMany(options: {
        where?: TWhereInput;
        pagination?: PaginationOptions;
        sort?: SortOptions<T>[];
        include?: Record<string, unknown>;
        select?: Record<string, unknown>;
    } = {}): Promise<T[]> {
        const {
            where,
            pagination,
            sort,
            include,
            select,
        } = options;

        const query: Record<string, unknown> = {
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

        const delegate = this.delegate as {
            findMany: (args: Record<string, unknown>) => Promise<T[]>;
        };
        return await delegate.findMany(query);
    }

    /**
     * Find multiple records with pagination info
     */
    async findManyWithPagination(options: {
        where?: TWhereInput;
        pagination?: PaginationOptions;
        sort?: SortOptions<T>[];
        include?: Record<string, unknown>;
        select?: Record<string, unknown>;
    } = {}): Promise<PaginatedResult<T>> {
        const {
            where,
            pagination = { page: 1, limit: 10 },
            sort,
            include,
            select,
        } = options;

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
    async updateById(id: string | number, data: TUpdateInput): Promise<T> {
        const delegate = this.delegate as {
            update: (args: { where: { id: string | number }; data: TUpdateInput }) => Promise<T>;
        };
        return await delegate.update({
            where: { id },
            data,
        });
    }

    /**
     * Update a single record by custom where clause
     */
    async updateOne(where: TWhereInput, data: TUpdateInput): Promise<T> {
        const delegate = this.delegate as {
            update: (args: { where: TWhereInput; data: TUpdateInput }) => Promise<T>;
        };
        return await delegate.update({
            where,
            data,
        });
    }

    /**
     * Bulk update multiple records
     */
    async updateMany(where: TWhereInput, data: TUpdateInput): Promise<BulkResult> {
        const delegate = this.delegate as {
            updateMany: (args: { where: TWhereInput; data: TUpdateInput }) => Promise<BulkResult>;
        };
        return await delegate.updateMany({
            where,
            data,
        });
    }

    /**
     * Upsert a record (update if exists, create if not)
     */
    async upsert(
        where: TWhereInput,
        create: TCreateInput,
        update: TUpdateInput
    ): Promise<T> {
        const delegate = this.delegate as {
            upsert: (args: { where: TWhereInput; create: TCreateInput; update: TUpdateInput }) => Promise<T>;
        };
        return await delegate.upsert({
            where,
            create,
            update,
        });
    }

    /**
     * Delete a single record by ID
     */
    async deleteById(id: string | number): Promise<T> {
        const delegate = this.delegate as {
            delete: (args: { where: { id: string | number } }) => Promise<T>;
        };
        return await delegate.delete({
            where: { id },
        });
    }

    /**
     * Delete a single record by custom where clause
     */
    async deleteOne(where: TWhereInput): Promise<T> {
        const delegate = this.delegate as {
            delete: (args: { where: TWhereInput }) => Promise<T>;
        };
        return await delegate.delete({
            where,
        });
    }

    /**
     * Bulk delete multiple records
     */
    async deleteMany(where: TWhereInput): Promise<BulkResult> {
        const delegate = this.delegate as {
            deleteMany: (args: { where: TWhereInput }) => Promise<BulkResult>;
        };
        return await delegate.deleteMany({
            where,
        });
    }

    /**
     * Count records
     */
    async count(where?: TWhereInput): Promise<number> {
        const delegate = this.delegate as {
            count: (args?: { where?: TWhereInput }) => Promise<number>;
        };
        return await delegate.count({
            where,
        });
    }

    /**
     * Check if record exists
     */
    async exists(where: TWhereInput): Promise<boolean> {
        const count = await this.count(where);
        return count > 0;
    }

    /**
     * Find records with advanced filtering
     */
    async findWithFilters(filters: {
        search?: string;
        searchFields?: (keyof T)[];
        dateRange?: {
            field: keyof T;
            from?: Date;
            to?: Date;
        };
        status?: string | string[];
        customWhere?: TWhereInput;
        pagination?: PaginationOptions;
        sort?: SortOptions<T>[];
        include?: Record<string, unknown>;
    }): Promise<PaginatedResult<T>> {
        const {
            search,
            searchFields = [],
            dateRange,
            status,
            customWhere = {} as TWhereInput,
            pagination,
            sort,
            include,
        } = filters;

        const where: Record<string, unknown> = { ...customWhere };

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
            const dateFilter: Record<string, Date> = {};
            if (dateRange.from) dateFilter.gte = dateRange.from;
            if (dateRange.to) dateFilter.lte = dateRange.to;

            if (Object.keys(dateFilter).length > 0) {
                where[dateRange.field as string] = dateFilter;
            }
        }

        // Add status filter
        if (status) {
            where.status = Array.isArray(status) ? { in: status } : status;
        }

        return await this.findManyWithPagination({
            where: where as TWhereInput,
            pagination,
            sort,
            include,
        });
    }

    /**
     * Execute raw SQL query
     */
    async executeRaw(query: string): Promise<number> {
        return await this.prisma.$executeRawUnsafe(query);
    }

    /**
     * Query raw SQL
     */
    async queryRaw(query: string): Promise<unknown[]> {
        return await this.prisma.$queryRawUnsafe(query);
    }

    /**
     * Transaction wrapper
     */
    async transaction<R>(fn: (tx: PrismaClient) => Promise<R>): Promise<R> {
        return await this.prisma.$transaction(fn);
    }
}


// Factory function to create service instances
export function createService<
    T extends Record<string, unknown>,
    TC extends Record<string, unknown>,
    TU extends Record<string, unknown>,
    TW extends Record<string, unknown>
>(
    prisma: PrismaClient,
    modelName: string
): GenericPrismaService<T, TC, TU, TW> {
    return new GenericPrismaService<T, TC, TU, TW>(modelName);
}
