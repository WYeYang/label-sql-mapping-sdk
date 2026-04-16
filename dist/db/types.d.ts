import { DatabaseType } from '../config';
/**
 * 数据库连接配置
 */
export interface DBConfig {
    type: DatabaseType;
    path?: string;
}
/**
 * 查询结果
 */
export interface QueryResult {
    rows: any[];
}
/**
 * 数据库操作接口
 */
export interface Database {
    query(sql: string): QueryResult;
    close(): void;
    getType(): DatabaseType;
    init(): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map