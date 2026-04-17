// SQL查询构建器

import { LSMConfig, TableConfig } from '../config';

/**
 * SQL构建器
 * 根据 main.yaml 配置拼接完整的 SQL 语句
 */
export class SQLBuilder {
  private config: LSMConfig;
  private tables: TableConfig[];
  private joinClause: string = '';

  constructor(config: LSMConfig) {
    this.config = config;
    this.tables = config.database.tables || [];
    this.buildJoins();
  }

  /**
   * 构建 JOIN 子句
   */
  private buildJoins(): void {
    if (this.tables.length <= 1) {
      return;
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

    this.joinClause = joins.join(' ');
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
   * 构建 CASE WHEN 子句（用于标签查询）
   */
  private buildLabelCaseClauses(): string[] {
    const clauses: string[] = [];

    for (const mapping of this.config.mappings || []) {
      for (const item of mapping.items) {
        // {field} - 直接返回字段值
        if (item.name === '{field}') {
          const fieldMatch = item.condition?.match(/\.(\w+)/);
          if (fieldMatch) {
            clauses.push(`${item.condition} AS ${mapping.id}`);
          }
          continue;
        }

        // {xxx} - 直接返回字段值
        const fieldMatch = item.name.match(/\{(\w+)\}/);
        if (fieldMatch) {
          clauses.push(`${item.condition || fieldMatch[1]} AS ${mapping.id}`);
          continue;
        }

        // {keyword} - 跳过
        if (item.condition?.includes('{keyword}')) {
          continue;
        }

        // 正常条件
        if (item.condition && item.condition !== 'all') {
          const value = item.name.replace(/'/g, "''");
          clauses.push(`CASE WHEN ${item.condition} THEN '${value}' END AS ${mapping.id}`);
        } else {
          // all 条件
          const value = item.name.replace(/'/g, "''");
          clauses.push(`'${value}' AS ${mapping.id}`);
        }
      }
    }

    return clauses;
  }

  /**
   * 拼接完整 SQL
   */
  build(sql?: string, options?: {
    orderBy?: string;
    limit?: number;
    offset?: number;
    labels?: boolean;  // 是否只返回 id 和标签
    count?: boolean;  // 是否只返回 COUNT
  }): string {
    const mainTable = this.tables[0];
    const mainAlias = mainTable.alias || mainTable.name;
    const parts: string[] = [];

    if (options?.count) {
      parts.push('SELECT COUNT(*) as total');
    } else if (options?.labels) {
      // 只返回 id 和标签
      const labelClauses = this.buildLabelCaseClauses();
      parts.push(`SELECT ${mainAlias}.id${labelClauses.length > 0 ? ', ' + labelClauses.join(', ') : ''}`);
    } else {
      parts.push('SELECT *');
    }

    if (sql) {
      // 完整 SQL 作为子查询
      parts.push(`FROM (${sql}) AS t`);
    } else {
      parts.push('FROM ' + this.buildFromClause());
      if (this.joinClause) {
        parts.push(this.joinClause);
      }
    }

    if (options?.count) {
      return parts.join(' ');
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
