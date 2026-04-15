import { TableConfig } from '../config';
import { QueryBuilder } from './types';
/**
 * 查询构建器实现
 */
export declare class SQLQueryBuilder implements QueryBuilder {
    private tables;
    private whereClause;
    private limitClause;
    private orderByClause;
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
    /**
     * 构建FROM子句，包含表连接
     * @returns FROM子句
     */
    private buildFromClause;
}
//# sourceMappingURL=query-builder.d.ts.map