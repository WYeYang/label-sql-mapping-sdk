import { DatabaseType } from '../config';
/**
 * 数据库连接配置
 */
export interface DBConfig {
    type: DatabaseType;
    path?: string;
}
/**
 * 数据库查询结果（原始）
 */
export interface DBQueryResult {
    rows: any[];
}
/**
 * 扩展标签值
 */
export interface ExtensionValue {
    name: string;
    values: string[];
}
/**
 * SDK 统一查询结果
 */
export interface QueryResult {
    sql: string;
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    explanation?: string;
    /** 扩展标签（列表模式下独立返回） */
    extensions?: Record<string, ExtensionValue>;
}
/**
 * 数据库操作接口
 */
export interface Database {
    query(sql: string): DBQueryResult;
    close(): void;
    getType(): DatabaseType;
    init(): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map