// SQL查询构建器

import { LSMConfig, TableConfig } from '../config';

/**
 * SQL构建器
 * 根据 main.yaml 配置拼接完整的 SQL 语句
 */
export class SQLBuilder {
  private config: LSMConfig;
  private tables: TableConfig[];
  private selectFields: string;
  private joinClause: string;

  constructor(config: LSMConfig) {
    this.config = config;
    this.tables = config.database.tables || [];
    this.selectFields = this.buildSelectFields();
    this.joinClause = this.buildJoinClause();
  }

  /**
   * 构建 SELECT 字段
   */
  private buildSelectFields(): string {
    if (this.tables.length === 0) {
      return '*';
    }

    // 默认主表所有字段
    const mainTable = this.tables[0];
    const mainAlias = mainTable.alias || mainTable.name;

    if (this.tables.length === 1) {
      return `${mainAlias}.*`;
    }

    // 多表时，主表字段 + 附表别名.字段
    const fields: string[] = [`${mainAlias}.*`];

    for (let i = 1; i < this.tables.length; i++) {
      const table = this.tables[i];
      const alias = table.alias || table.name;
      // 附表只取必要字段，避免冲突
      fields.push(`${alias}.name as ${alias}_name`);
    }

    return fields.join(', ');
  }

  /**
   * 构建 JOIN 子句
   */
  private buildJoinClause(): string {
    if (this.tables.length <= 1) {
      return '';
    }

    const mainTable = this.tables[0];
    const mainAlias = mainTable.alias || mainTable.name;
    const joins: string[] = [];

    for (let i = 1; i < this.tables.length; i++) {
      const table = this.tables[i];
      const alias = table.alias || table.name;
      const joinType = (table.join || 'LEFT').toUpperCase();
      // 默认使用 id 关联
      joins.push(`${joinType} JOIN ${table.name} AS ${alias} ON ${mainAlias}.id = ${alias}.id`);
    }

    return joins.join(' ');
  }

  /**
   * 构建 FROM 子句
   */
  private buildFromClause(): string {
    if (this.tables.length === 0) {
      throw new Error('未配置数据表');
    }

    const mainTable = this.tables[0];
    const mainAlias = mainTable.alias || mainTable.name;
    return `${mainTable.name} AS ${mainAlias}`;
  }

  /**
   * 拼接完整 SQL
   */
  build(where: string, options?: {
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): string {
    const parts: string[] = ['SELECT ' + this.selectFields];
    parts.push('FROM ' + this.buildFromClause());

    if (this.joinClause) {
      parts.push(this.joinClause);
    }

    if (where && where.trim()) {
      parts.push('WHERE ' + where);
    }

    if (options?.orderBy) {
      parts.push('ORDER BY ' + options.orderBy);
    }

    if (options?.limit !== undefined) {
      parts.push('LIMIT ' + options.limit);
    }

    if (options?.offset !== undefined) {
      parts.push('OFFSET ' + options.offset);
    }

    return parts.join(' ');
  }

  /**
   * 生成计数 SQL
   */
  buildCount(where: string): string {
    if (this.tables.length === 0) {
      throw new Error('未配置数据表');
    }

    const mainTable = this.tables[0];
    const mainAlias = mainTable.alias || mainTable.name;
    const parts: string[] = ['SELECT COUNT(*) as total'];
    parts.push('FROM ' + this.buildFromClause());

    if (this.joinClause) {
      parts.push(this.joinClause);
    }

    if (where && where.trim()) {
      parts.push('WHERE ' + where);
    }

    return parts.join(' ');
  }
}
