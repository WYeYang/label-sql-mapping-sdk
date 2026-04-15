// 查询构建器

import { TableConfig } from '../config';
import { QueryBuilder } from './types';

/**
 * 查询构建器实现
 */
export class SQLQueryBuilder implements QueryBuilder {
  private tables: TableConfig[] = [];
  private whereClause: string = '';
  private limitClause: string = '';
  private orderByClause: string = '';

  /**
   * 设置查询的表
   * @param tables 表配置数组
   * @returns 查询构建器
   */
  from(tables: TableConfig[]): QueryBuilder {
    this.tables = tables;
    return this;
  }

  /**
   * 添加WHERE条件
   * @param condition SQL条件字符串
   * @returns 查询构建器
   */
  where(condition: string): QueryBuilder {
    if (condition) {
      this.whereClause = `WHERE ${condition}`;
    }
    return this;
  }

  /**
   * 添加限制
   * @param limit 限制数
   * @param offset 偏移量
   * @returns 查询构建器
   */
  limit(limit: number, offset: number = 0): QueryBuilder {
    if (limit > 0) {
      this.limitClause = `LIMIT ${limit}`;
      if (offset > 0) {
        this.limitClause += ` OFFSET ${offset}`;
      }
    }
    return this;
  }

  /**
   * 添加排序
   * @param field 排序字段
   * @param direction 排序方向
   * @returns 查询构建器
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    if (field) {
      this.orderByClause = `ORDER BY ${field} ${direction}`;
    }
    return this;
  }

  /**
   * 构建SQL查询语句
   * @returns SQL查询语句
   */
  build(): string {
    if (this.tables.length === 0) {
      throw new Error('至少需要指定一个表');
    }

    // 构建FROM子句，包含表连接
    const fromClause = this.buildFromClause();

    // 构建完整的SQL语句
    const sql = `SELECT * FROM ${fromClause} ${this.whereClause} ${this.orderByClause} ${this.limitClause}`;

    return sql.trim();
  }

  /**
   * 构建FROM子句，包含表连接
   * @returns FROM子句
   */
  private buildFromClause(): string {
    if (this.tables.length === 0) {
      return '';
    }

    // 第一个表是主表
    const mainTable = this.tables[0];
    let fromClause = `${mainTable.name} ${mainTable.alias || mainTable.name}`;

    // 处理子表连接
    for (let i = 1; i < this.tables.length; i++) {
      const table = this.tables[i];
      const joinType = table.join || 'LEFT';
      const tableAlias = table.alias || table.name;
      const joinCondition = table.on || '';

      fromClause += ` ${joinType} JOIN ${table.name} ${tableAlias}`;
      if (joinCondition) {
        fromClause += ` ON ${joinCondition}`;
      }
    }

    return fromClause;
  }
}
