import { LSMConfig } from './config';
import { Database, DBConfig, QueryResult } from './db';
/**
 * LSM SDK 核心类
 */
export declare class LSMSDK {
    private config;
    private database;
    /**
     * 构造函数
     * @param configPath LSM配置文件路径
     * @param dbConfig 数据库配置
     */
    constructor(configPath: string, dbConfig: DBConfig);
    /**
     * 获取LSM配置
     * @returns LSM配置
     */
    getConfig(): LSMConfig;
    /**
     * 获取数据库实例
     * @returns 数据库实例
     */
    getDatabase(): Database;
    /**
     * 执行查询
     * @param condition SQL条件
     * @param options 查询选项
     * @returns 查询结果
     */
    query(condition: string, options?: {
        limit?: number;
        offset?: number;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<QueryResult>;
    /**
     * 执行SQL语句
     * @param sql SQL语句
     * @param params 参数
     * @returns 受影响的行数
     */
    execute(sql: string, params?: any[]): Promise<number>;
    /**
     * 关闭SDK
     */
    close(): Promise<void>;
}
//# sourceMappingURL=sdk.d.ts.map