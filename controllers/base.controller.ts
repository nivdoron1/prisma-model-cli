import { GenericPrismaService } from "../services/db/dbService";

export abstract class BaseController<
    T extends Record<string, unknown>,
    TCreate extends Record<string, unknown>,
    TUpdate extends Record<string, unknown>,
    TWhere extends Record<string, unknown>
> {
    protected constructor(
        protected readonly service: GenericPrismaService<T, TCreate, TUpdate, TWhere>
    ) { }

    async create(body: TCreate): Promise<T> {
        return this.service.create(body);
    }

    async createMany(body: TCreate[]): Promise<{ count: number }> {
        return this.service.createMany(body);
    }

    async findById(id: string): Promise<T | null> {
        return this.service.findById(id);
    }

    async findOne(where: TWhere): Promise<T | null> {
        return this.service.findOne(where);
    }

    async findMany(): Promise<T[]> {
        return this.service.findMany();
    }

    async findManyWithPagination(page: number, limit: number) {
        return this.service.findManyWithPagination({ pagination: { page, limit } });
    }

    async updateById(id: string, data: TUpdate): Promise<T> {
        return this.service.updateById(id, data);
    }

    async updateOne(where: TWhere, data: TUpdate): Promise<T> {
        return this.service.updateOne(where, data);
    }

    async deleteById(id: string): Promise<T> {
        return this.service.deleteById(id);
    }

    async deleteOne(where: TWhere): Promise<T> {
        return this.service.deleteOne(where);
    }

    async count(where: TWhere): Promise<{ total: number }> {
        const total = await this.service.count(where);
        return { total };
    }

    async exists(where: TWhere): Promise<{ exists: boolean }> {
        const exists = await this.service.exists(where);
        return { exists };
    }

    async upsert(where: TWhere, create: TCreate, update: TUpdate): Promise<T> {
        return this.service.upsert(where, create, update);
    }

    async queryRaw(query: string): Promise<unknown[]> {
        return this.service.queryRaw(query);
    }

    async executeRaw(query: string): Promise<{ affected: number }> {
        const affected = await this.service.executeRaw(query);
        return { affected };
    }

    async findWithFilters(filters: any): Promise<unknown> {
        return this.service.findWithFilters(filters);
    }
}
