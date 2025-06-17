import { GraphQLScalarType, Kind } from 'graphql';
import { GraphQLError } from 'graphql';
import { BaseGraphQLResolver, GraphQLContext } from './BaseGraphQLResolver';
import { GenericPrismaService } from '../services/db/dbService';

// Custom Scalar Types
export const DateTimeScalar = new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value: unknown): string {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'string') {
            return new Date(value).toISOString();
        }
        throw new GraphQLError('Value must be a Date or string');
    },
    parseValue(value: unknown): Date {
        if (typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new GraphQLError('Invalid date string');
            }
            return date;
        }
        throw new GraphQLError('Value must be a string');
    },
    parseLiteral(ast): Date {
        if (ast.kind === Kind.STRING) {
            const date = new Date(ast.value);
            if (isNaN(date.getTime())) {
                throw new GraphQLError('Invalid date string');
            }
            return date;
        }
        throw new GraphQLError('Value must be a string');
    },
});

export const JSONScalar = new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize(value: unknown): unknown {
        return value;
    },
    parseValue(value: unknown): unknown {
        return value;
    },
    parseLiteral(ast): unknown {
        switch (ast.kind) {
            case Kind.STRING:
                try {
                    return JSON.parse(ast.value);
                } catch {
                    throw new GraphQLError('Invalid JSON string');
                }
            case Kind.OBJECT:
                return ast;
            case Kind.LIST:
                return ast;
            case Kind.INT:
                return parseInt(ast.value, 10);
            case Kind.FLOAT:
                return parseFloat(ast.value);
            case Kind.BOOLEAN:
                return ast.value;
            case Kind.NULL:
                return null;
            default:
                throw new GraphQLError('Invalid JSON value');
        }
    },
});

// Base Resolvers Map
export const baseScalarResolvers = {
    DateTime: DateTimeScalar,
    JSON: JSONScalar,
};

// Resolver Factory Function
class ConcreteGraphQLResolver<
    TModel extends Record<string, unknown>,
    TCreateInput extends Record<string, unknown>,
    TUpdateInput extends Record<string, unknown>,
    TWhereInput extends Record<string, unknown>
> extends BaseGraphQLResolver<TModel, TCreateInput, TUpdateInput, TWhereInput> {
    constructor(service: GenericPrismaService<TModel, TCreateInput, TUpdateInput, TWhereInput>) {
        super(service);
    }
}

export function createBaseResolvers<
    TModel extends Record<string, unknown>,
    TCreateInput extends Record<string, unknown>,
    TUpdateInput extends Record<string, unknown>,
    TWhereInput extends Record<string, unknown>
>(
    service: GenericPrismaService<TModel, TCreateInput, TUpdateInput, TWhereInput>,
    modelName: string
): Record<string, unknown> {
    const resolver = new ConcreteGraphQLResolver(service);
    const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    return {
        Query: {
            [`${lowerModelName}`]: resolver.findOne.bind(resolver),
            [`${lowerModelName}ById`]: resolver.findById.bind(resolver),
            [`${lowerModelName}s`]: resolver.findMany.bind(resolver),
            [`${lowerModelName}sPaginated`]: resolver.findManyWithPagination.bind(resolver),
            [`${lowerModelName}Count`]: resolver.count.bind(resolver),
            [`${lowerModelName}Exists`]: resolver.exists.bind(resolver),
        },
        Mutation: {
            [`create${modelName}`]: resolver.create.bind(resolver),
            [`createMany${modelName}s`]: resolver.createMany.bind(resolver),
            [`update${modelName}`]: resolver.updateById.bind(resolver),
            [`update${modelName}ByWhere`]: resolver.updateOne.bind(resolver),
            [`updateMany${modelName}s`]: resolver.updateMany.bind(resolver),
            [`delete${modelName}`]: resolver.deleteById.bind(resolver),
            [`delete${modelName}ByWhere`]: resolver.deleteOne.bind(resolver),
            [`deleteMany${modelName}s`]: resolver.deleteMany.bind(resolver),
            [`upsert${modelName}`]: resolver.upsert.bind(resolver),
        },
    };
}

// Middleware for GraphQL Context
export interface GraphQLMiddleware {
    (context: GraphQLContext): Promise<void>;
}

export const authenticationMiddleware: GraphQLMiddleware = async (context: GraphQLContext) => {
    const token = context.request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        throw new GraphQLError('Authentication token required', {
            extensions: { code: 'UNAUTHENTICATED' }
        });
    }

    // Implement your token validation logic here
    // For example, JWT verification
    try {
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // context.user = decoded;
    } catch (error) {
        throw new GraphQLError('Invalid authentication token', {
            extensions: { code: 'UNAUTHENTICATED' }
        });
    }
};

export const rateLimitMiddleware: GraphQLMiddleware = async (context: GraphQLContext) => {
    const clientIp = context.request.ip;

    // Implement rate limiting logic here
    // For example, using Redis or in-memory store

    // Simple in-memory rate limiting (not suitable for production)
    const requestCounts = new Map<string, { count: number; resetTime: number }>();
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    const clientData = requestCounts.get(clientIp) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
        clientData.count = 1;
        clientData.resetTime = now + windowMs;
    } else {
        clientData.count++;
    }

    requestCounts.set(clientIp, clientData);

    if (clientData.count > maxRequests) {
        throw new GraphQLError('Rate limit exceeded', {
            extensions: { code: 'RATE_LIMITED' }
        });
    }
};

// Error Handling Utilities
export class GraphQLErrorHandler {
    static handlePrismaError(error: Error): GraphQLError {
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

        if (error.message.includes('Record to delete does not exist')) {
            return new GraphQLError('Record not found for deletion', {
                extensions: { code: 'NOT_FOUND' }
            });
        }

        return new GraphQLError('Database operation failed', {
            extensions: { code: 'DATABASE_ERROR' }
        });
    }

    static handleValidationError(field: string, message: string): GraphQLError {
        return new GraphQLError(`Validation error in field '${field}': ${message}`, {
            extensions: { code: 'VALIDATION_ERROR', field }
        });
    }

    static handleAuthorizationError(resource: string, action: string): GraphQLError {
        return new GraphQLError(`Not authorized to ${action} ${resource}`, {
            extensions: { code: 'FORBIDDEN', resource, action }
        });
    }
}

// Validation Utilities
export class GraphQLValidator {
    static validateRequiredFields<T extends Record<string, unknown>>(
        data: T,
        requiredFields: (keyof T)[]
    ): void {
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null) {
                throw GraphQLErrorHandler.handleValidationError(
                    String(field),
                    'This field is required'
                );
            }
        }
    }

    static validateEmail(email: string): void {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw GraphQLErrorHandler.handleValidationError('email', 'Invalid email format');
        }
    }

    static validateLength(
        value: string,
        field: string,
        min?: number,
        max?: number
    ): void {
        if (min !== undefined && value.length < min) {
            throw GraphQLErrorHandler.handleValidationError(
                field,
                `Must be at least ${min} characters long`
            );
        }

        if (max !== undefined && value.length > max) {
            throw GraphQLErrorHandler.handleValidationError(
                field,
                `Must be no more than ${max} characters long`
            );
        }
    }

    static validateRange(
        value: number,
        field: string,
        min?: number,
        max?: number
    ): void {
        if (min !== undefined && value < min) {
            throw GraphQLErrorHandler.handleValidationError(
                field,
                `Must be at least ${min}`
            );
        }

        if (max !== undefined && value > max) {
            throw GraphQLErrorHandler.handleValidationError(
                field,
                `Must be no more than ${max}`
            );
        }
    }
}

// Pagination Utilities
export class PaginationUtils {
    static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
        const validatedPage = Math.max(1, page || 1);
        const validatedLimit = Math.min(100, Math.max(1, limit || 10));

        return { page: validatedPage, limit: validatedLimit };
    }

    static calculateOffset(page: number, limit: number): number {
        return (page - 1) * limit;
    }

    static calculateTotalPages(total: number, limit: number): number {
        return Math.ceil(total / limit);
    }
}

// Query Complexity Analysis
export class QueryComplexityAnalyzer {
    static analyzeQuery(query: string): number {
        // Simple complexity analysis based on query depth and field count
        const depth = (query.match(/{/g) || []).length;
        const fields = (query.match(/\w+(?=\s*[:{])/g) || []).length;

        return depth * 2 + fields;
    }

    static validateComplexity(query: string, maxComplexity: number = 100): void {
        const complexity = this.analyzeQuery(query);

        if (complexity > maxComplexity) {
            throw new GraphQLError('Query too complex', {
                extensions: { code: 'QUERY_TOO_COMPLEX', complexity, maxComplexity }
            });
        }
    }
}

// Performance Monitoring
export class GraphQLPerformanceMonitor {
    private static requestTimes = new Map<string, number[]>();

    static recordRequestTime(operationName: string, duration: number): void {
        if (!this.requestTimes.has(operationName)) {
            this.requestTimes.set(operationName, []);
        }

        const times = this.requestTimes.get(operationName)!;
        times.push(duration);

        // Keep only last 100 requests
        if (times.length > 100) {
            times.shift();
        }
    }

    static getAverageRequestTime(operationName: string): number {
        const times = this.requestTimes.get(operationName) || [];
        if (times.length === 0) return 0;

        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    static getSlowQueries(threshold: number = 1000): Array<{ operation: string; avgTime: number }> {
        const slowQueries: Array<{ operation: string; avgTime: number }> = [];

        for (const [operation, times] of this.requestTimes.entries()) {
            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            if (avgTime > threshold) {
                slowQueries.push({ operation, avgTime });
            }
        }

        return slowQueries.sort((a, b) => b.avgTime - a.avgTime);
    }
}