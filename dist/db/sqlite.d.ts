import { Database as IDatabase, DBConfig, QueryResult } from './types';
import { DatabaseType as DBKind } from '../config';
export declare class SQLiteDatabase implements IDatabase {
    private db;
    constructor(config: DBConfig);
    private path;
    init(): Promise<void>;
    query(sql: string): QueryResult;
    close(): void;
    getType(): DBKind;
}
//# sourceMappingURL=sqlite.d.ts.map