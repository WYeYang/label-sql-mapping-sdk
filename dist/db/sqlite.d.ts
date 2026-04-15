import { Database, DBConfig, QueryResult } from './types';
import { DatabaseType } from '../config';
/**
 * SQLite数据库实现
 */
export declare class SQLiteDatabase implements Database {
    private db;
    private type;
    /**
     * 构造函数
     * @param config 数据库配置
     */
    constructor(config: DBConfig);
    /**
     * 执行SQL查询
     * @param sql SQL语句
     * @param params 参数
     * @returns 查询结果
     */
    query(sql: string, params?: any[]): Promise<QueryResult>;
    /**
     * 执行SQL语句（无返回结果）
     * @param sql SQL语句
     * @param params 参数
     * @returns 受影响的行数
     */
    execute(sql: string, params?: any[]): Promise<number>;
    /**
     * 关闭数据库连接
     */
    close(): Promise<void>;
    /**
     * 获取数据库类型
     * @returns 数据库类型
     */
    getType(): DatabaseType;
}
//# sourceMappingURL=sqlite.d.ts.map