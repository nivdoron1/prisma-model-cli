import { GraphQLError } from 'graphql';
import { GenericPrismaService } from '../services/db/dbService';

export interface GraphQLContext {
    user?: {
        id: string;
        email: string;
        role: string;
    };
    request: {
        ip: string;
        headers: Record<string, string>;
    };
}

export interface PaginationInput {
    page?: number;
    limit?: number;
}

export interface SortInput<T> {
    field: keyof T;
    direction: 'ASC' | 'DESC';
}

export interface FilterInput<T> {
    search?: string;
    searchFields?: (keyof T)[];
    dateRange?: {
        field: keyof T;
        from?: Date;
        to?: Date;
    };
    status?: string | string[];
    pagination?: PaginationInput;
    sort?: SortInput<T>[];
}

export interface UpsertInput<TCreate, TUpdate, TWhere> {
    where: TWhere;
    create: TCreate;
    update: TUpdate;
}

export interface BulkResult {
    count: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export abstract class BaseGraphQLResolver<
    TModel extends Record<string, unknown>,
    TCreateInput extends Record<string, unknown>,
    TUpdateInput extends Record<string, unknown>,
    TWhereInput extends Record<string, unknown>
> {
    protected constructor(
        protected service: GenericPrismaService<TModel, TCreateInput, TUpdateInput, TWhereInput>
    ) { }

    // Query Resolvers
    async findById(
        parent: unknown,
        args: { id: string },
        context: GraphQLContext
    ): Promise<TModel | null> {
        try {
            return await this.service.findById(args.id);
        } catch (error: unknown) {
            throw this.handleError('Find By ID Error', error);
        }
    }

    async findOne(
        parent: unknown,
        args: { where?: TWhereInput },
        context: GraphQLContext
    ): Promise<TModel | null> {
        try {
            return await this.service.findOne(args.where || ({} as TWhereInput));
        } catch (error: unknown) {
            throw this.handleError('Find One Error', error);
        }
    }

    async findMany(
        parent: unknown,
        args: {
            where?: TWhereInput;
            pagination?: PaginationInput;
            sort?: SortInput<TModel>[];
        },
        context: GraphQLContext
    ): Promise<TModel[]> {
        try {
            const { where, pagination, sort } = args;
            return await this.service.findMany({
                where,
                pagination: pagination ? {
                    page: pagination.page || 1,
                    limit: pagination.limit || 10
                } : undefined,
                sort: sort?.map(s => ({
                    field: s.field,
                    direction: s.direction.toLowerCase() as 'asc' | 'desc'
                }))
            });
        } catch (error: unknown) {
            throw this.handleError('Find Many Error', error);
        }
    }

    async findManyWithPagination(
        parent: unknown,
        args: { filters?: FilterInput<TModel> },
        context: GraphQLContext
    ): Promise<PaginatedResult<TModel>> {
        try {
            const filters = args.filters || {};

            return await this.service.findWithFilters({
                search: filters.search,
                searchFields: filters.searchFields,
                dateRange: filters.dateRange,
                status: filters.status,
                pagination: filters.pagination ? {
                    page: filters.pagination.page || 1,
                    limit: filters.pagination.limit || 10
                } : { page: 1, limit: 10 },
                sort: filters.sort?.map(s => ({
                    field: s.field,
                    direction: s.direction.toLowerCase() as 'asc' | 'desc'
                }))
            });
        } catch (error: unknown) {
            throw this.handleError('Paginated Find Error', error);
        }
    }

    async count(
        parent: unknown,
        args: { where?: TWhereInput },
        context: GraphQLContext
    ): Promise<number> {
        try {
            return await this.service.count(args.where);
        } catch (error: unknown) {
            throw this.handleError('Count Error', error);
        }
    }

    async exists(
        parent: unknown,
        args: { where: TWhereInput },
        context: GraphQLContext
    ): Promise<boolean> {
        try {
            return await this.service.exists(args.where);
        } catch (error: unknown) {
            throw this.handleError('Exists Error', error);
        }
    }

    // Mutation Resolvers
    async create(
        parent: unknown,
        args: { data: TCreateInput },
        context: GraphQLContext
    ): Promise<TModel> {
        try {
            return await this.service.create(args.data);
        } catch (error: unknown) {
            throw this.handleError('Create Error', error);
        }
    }

    async createMany(
        parent: unknown,
        args: { data: TCreateInput[] },
        context: GraphQLContext
    ): Promise<BulkResult> {
        try {
            const result = await this.service.createMany(args.data);
            return { count: result.count };
        } catch (error: unknown) {
            throw this.handleError('Bulk Create Error', error);
        }
    }

    async updateById(
        parent: unknown,
        args: { id: string; data: TUpdateInput },
        context: GraphQLContext
    ): Promise<TModel> {
        try {
            return await this.service.updateById(args.id, args.data);
        } catch (error: unknown) {
            throw this.handleError('Update By ID Error', error);
        }
    }

    async updateOne(
        parent: unknown,
        args: { where: TWhereInput; data: TUpdateInput },
        context: GraphQLContext
    ): Promise<TModel> {
        try {
            return await this.service.updateOne(args.where, args.data);
        } catch (error: unknown) {
            throw this.handleError('Update One Error', error);
        }
    }

    async updateMany(
        parent: unknown,
        args: { where: TWhereInput; data: TUpdateInput },
        context: GraphQLContext
    ): Promise<BulkResult> {
        try {
            const result = await this.service.updateMany(args.where, args.data);
            return { count: result.count };
        } catch (error: unknown) {
            throw this.handleError('Bulk Update Error', error);
        }
    }

    async deleteById(
        parent: unknown,
        args: { id: string },
        context: GraphQLContext
    ): Promise<TModel> {
        try {
            return await this.service.deleteById(args.id);
        } catch (error: unknown) {
            throw this.handleError('Delete By ID Error', error);
        }
    }

    async deleteOne(
        parent: unknown,
        args: { where: TWhereInput },
        context: GraphQLContext
    ): Promise<TModel> {
        try {
            return await this.service.deleteOne(args.where);
        } catch (error: unknown) {
            throw this.handleError('Delete One Error', error);
        }
    }

    async deleteMany(
        parent: unknown,
        args: { where: TWhereInput },
        context: GraphQLContext
    ): Promise<BulkResult> {
        try {
            const result = await this.service.deleteMany(args.where);
            return { count: result.count };
        } catch (error: unknown) {
            throw this.handleError('Bulk Delete Error', error);
        }
    }

    async upsert(
        parent: unknown,
        args: { input: UpsertInput<TCreateInput, TUpdateInput, TWhereInput> },
        context: GraphQLContext
    ): Promise<TModel> {
        try {
            const { where, create, update } = args.input;
            return await this.service.upsert(where, create, update);
        } catch (error: unknown) {
            throw this.handleError('Upsert Error', error);
        }
    }

    // Advanced Query Methods
    async findWithCustomQuery(
        parent: unknown,
        args: { query: string },
        context: GraphQLContext
    ): Promise<unknown[]> {
        try {
            // Only allow if user has admin privileges
            this.checkAdminAccess(context);
            return await this.service.queryRaw(args.query);
        } catch (error: unknown) {
            throw this.handleError('Custom Query Error', error);
        }
    }

    async executeCustomQuery(
        parent: unknown,
        args: { query: string },
        context: GraphQLContext
    ): Promise<{ affected: number }> {
        try {
            // Only allow if user has admin privileges
            this.checkAdminAccess(context);
            const affected = await this.service.executeRaw(args.query);
            return { affected };
        } catch (error: unknown) {
            throw this.handleError('Execute Query Error', error);
        }
    }

    // Subscription Resolvers (if needed)
    async subscribeToChanges(
        parent: unknown,
        args: { where?: TWhereInput },
        context: GraphQLContext
    ): Promise<AsyncIterator<TModel>> {
        // Implementation depends on your subscription setup (e.g., Redis, WebSockets)
        // This is a placeholder for subscription functionality
        throw new GraphQLError('Subscriptions not implemented');
    }

    // Utility Methods
    protected checkAdminAccess(context: GraphQLContext): void {
        if (!context.user || context.user.role !== 'admin') {
            throw new GraphQLError('Admin access required', {
                extensions: { code: 'FORBIDDEN' }
            });
        }
    }

    protected checkAuthentication(context: GraphQLContext): void {
        if (!context.user) {
            throw new GraphQLError('Authentication required', {
                extensions: { code: 'UNAUTHENTICATED' }
            });
        }
    }

    protected handleError(label: string, error: unknown): GraphQLError {
        if (error instanceof Error) {
            console.error(`${label}:`, error.message);

            // Handle specific Prisma errors
            if (error.message.includes('Record to update not found')) {
                return new GraphQLError('Record not found', {
                    extensions: { code: 'NOT_FOUND' }
                });
            }

            if (error.message.includes('Unique constraint failed')) {
                return new GraphQLError('Duplicate entry', {
                    extensions: { code: 'DUPLICATE_ENTRY' }
                });
            }

            if (error.message.includes('Foreign key constraint failed')) {
                return new GraphQLError('Invalid reference', {
                    extensions: { code: 'INVALID_REFERENCE' }
                });
            }

            return new GraphQLError(error.message, {
                extensions: { code: 'INTERNAL_ERROR' }
            });
        } else {
            console.error(`${label}:`, error);
            return new GraphQLError('Unknown error occurred', {
                extensions: { code: 'INTERNAL_ERROR' }
            });
        }
    }

    // Field Resolvers (for complex nested data)
    protected createFieldResolver<TField>(
        fieldName: keyof TModel,
        resolver: (parent: TModel, args: Record<string, unknown>, context: GraphQLContext) => Promise<TField>
    ): (parent: TModel, args: Record<string, unknown>, context: GraphQLContext) => Promise<TField> {
        return async (parent: TModel, args: Record<string, unknown>, context: GraphQLContext): Promise<TField> => {
            try {
                return await resolver(parent, args, context);
            } catch (error: unknown) {
                throw this.handleError(`Field Resolver Error (${String(fieldName)})`, error);
            }
        };
    }

    // Batch loading helper (for DataLoader integration)
    protected createBatchLoader<TKey, TValue>(
        batchLoadFn: (keys: readonly TKey[]) => Promise<(TValue | Error)[]>
    ): (key: TKey) => Promise<TValue> {
        // This is a simplified version - in production, you'd use DataLoader
        const cache = new Map<TKey, Promise<TValue>>();

        return async (key: TKey): Promise<TValue> => {
            if (cache.has(key)) {
                return cache.get(key)!;
            }

            const promise = batchLoadFn([key]).then(results => {
                const result = results[0];
                if (result instanceof Error) {
                    throw result;
                }
                return result;
            });

            cache.set(key, promise);
            return promise;
        };
    }
    }