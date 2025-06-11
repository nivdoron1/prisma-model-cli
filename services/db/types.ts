// Generic types for pagination and filtering
export interface PaginationOptions {
    page?: number;
    limit?: number;
}

export interface SortOptions<T> {
    field: keyof T;
    direction: 'asc' | 'desc';
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

export interface BulkResult {
    count: number;
}