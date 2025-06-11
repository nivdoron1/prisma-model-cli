import { Request, Response } from 'express';
import { GenericPrismaService } from '../services/db/dbService';

export abstract class BaseController<
    T extends Record<string, unknown>,
    TCreate extends Record<string, unknown>,
    TUpdate extends Record<string, unknown>,
    TWhere extends Record<string, unknown>
> {
    protected constructor(protected service: GenericPrismaService<T, TCreate, TUpdate, TWhere>) { }

    async create(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.service.create(req.body as TCreate);
            res.status(201).json(result);
        } catch (error: unknown) {
            this.handleError(res, 'Create Error', error);
        }
    }

    async createMany(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.service.createMany(req.body as TCreate[]);
            res.status(201).json(result);
        } catch (error: unknown) {
            this.handleError(res, 'Bulk Create Error', error);
        }
    }

    async findById(req: Request, res: Response): Promise<void> {
        try {
            const record = await this.service.findById(req.params.id);
            res.json(record);
        } catch (error: unknown) {
            this.handleError(res, 'Find By ID Error', error);
        }
    }

    async findOne(req: Request, res: Response): Promise<void> {
        try {
            const record = await this.service.findOne(req.body as TWhere);
            res.json(record);
        } catch (error: unknown) {
            this.handleError(res, 'Find One Error', error);
        }
    }

    async findMany(req: Request, res: Response): Promise<void> {
        try {
            const records = await this.service.findMany();
            res.json(records);
        } catch (error: unknown) {
            this.handleError(res, 'Find Many Error', error);
        }
    }

    async findManyWithPagination(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await this.service.findManyWithPagination({
                pagination: { page, limit },
            });
            res.json(result);
        } catch (error: unknown) {
            this.handleError(res, 'Pagination Error', error);
        }
    }

    async updateById(req: Request, res: Response): Promise<void> {
        try {
            const updated = await this.service.updateById(req.params.id, req.body as TUpdate);
            res.json(updated);
        } catch (error: unknown) {
            this.handleError(res, 'Update By ID Error', error);
        }
    }

    async updateOne(req: Request, res: Response): Promise<void> {
        try {
            const { where, data } = req.body as { where: TWhere; data: TUpdate };
            const updated = await this.service.updateOne(where, data);
            res.json(updated);
        } catch (error: unknown) {
            this.handleError(res, 'Update One Error', error);
        }
    }

    async deleteById(req: Request, res: Response): Promise<void> {
        try {
            const deleted = await this.service.deleteById(req.params.id);
            res.json(deleted);
        } catch (error: unknown) {
            this.handleError(res, 'Delete By ID Error', error);
        }
    }

    async deleteOne(req: Request, res: Response): Promise<void> {
        try {
            const deleted = await this.service.deleteOne(req.body as TWhere);
            res.json(deleted);
        } catch (error: unknown) {
            this.handleError(res, 'Delete One Error', error);
        }
    }

    async count(req: Request, res: Response): Promise<void> {
        try {
            const total = await this.service.count(req.body as TWhere);
            res.json({ total });
        } catch (error: unknown) {
            this.handleError(res, 'Count Error', error);
        }
    }

    async exists(req: Request, res: Response): Promise<void> {
        try {
            const exists = await this.service.exists(req.body as TWhere);
            res.json({ exists });
        } catch (error: unknown) {
            this.handleError(res, 'Exists Error', error);
        }
    }

    async upsert(req: Request, res: Response): Promise<void> {
        try {
            const { where, create, update } = req.body as {
                where: TWhere;
                create: TCreate;
                update: TUpdate;
            };
            const result = await this.service.upsert(where, create, update);
            res.json(result);
        } catch (error: unknown) {
            this.handleError(res, 'Upsert Error', error);
        }
    }

    async queryRaw(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.service.queryRaw(req.body.query as string);
            res.json(result);
        } catch (error: unknown) {
            this.handleError(res, 'Query Raw Error', error);
        }
    }

    async executeRaw(req: Request, res: Response): Promise<void> {
        try {
            const affected = await this.service.executeRaw(req.body.query as string);
            res.json({ affected });
        } catch (error: unknown) {
            this.handleError(res, 'Execute Raw Error', error);
        }
    }

    async findWithFilters(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.service.findWithFilters(req.body);
            res.json(result);
        } catch (error: unknown) {
            this.handleError(res, 'Filter Error', error);
        }
    }

    public handleError(res: Response, label: string, error: unknown): void {
        if (error instanceof Error) {
            console.error(`${label}:`, error.message);
            res.status(500).json({ error: error.message });
        } else {
            console.error(`${label}:`, error);
            res.status(500).json({ error: 'Unknown error occurred' });
        }
    }
}
