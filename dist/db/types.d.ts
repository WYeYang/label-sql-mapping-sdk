import { DatabaseType, TableConfig } from '../config';
/**
 * 数据库连接配置
 */
export interface DBConfig {
    type: DatabaseType;
    path?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
}
/**
 * 查询条件
 */
export interface QueryCondition {
    field: string;
    operator: string;
    value: any;
}
/**
 * 查询选项
 */
export interface QueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
}
/**
 * 查询结果
 */
export interface QueryResult {
    rows: any[];
    total?: number;
}
/**
 * 数据库操作接口
 */
export interface Database {
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
/**
 * 查询构建器接口
 */
export interface QueryBuilder {
    /**
     * 设置查询的表
     * @param tables 表配置数组
     * @returns 查询构建器
     */
    from(tables: TableConfig[]): QueryBuilder;
    /**
     * 添加WHERE条件
     * @param condition SQL条件字符串
     * @returns 查询构建器
     */
    where(condition: string): QueryBuilder;
    /**
     * 添加限制
     * @param limit 限制数
     * @param offset 偏移量
     * @returns 查询构建器
     */
    limit(limit: number, offset?: number): QueryBuilder;
    /**
     * 添加排序
     * @param field 排序字段
     * @param direction 排序方向
     * @returns 查询构建器
     */
    orderBy(field: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
    /**
     * 构建SQL查询语句
     * @returns SQL查询语句
     */
    build(): string;
}
//# sourceMappingURL=types.d.ts.map