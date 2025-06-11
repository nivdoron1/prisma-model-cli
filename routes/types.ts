import { RequestHandler } from "express";

export interface IBaseController {
    create: RequestHandler;
    createMany: RequestHandler;
    findById: RequestHandler;
    findOne: RequestHandler;
    findMany: RequestHandler;
    findManyWithPagination: RequestHandler;
    updateById: RequestHandler;
    updateOne: RequestHandler;
    deleteById: RequestHandler;
    deleteOne: RequestHandler;
    count: RequestHandler;
    exists: RequestHandler;
    upsert: RequestHandler;
    queryRaw: RequestHandler;
    executeRaw: RequestHandler;
    findWithFilters: RequestHandler;
}