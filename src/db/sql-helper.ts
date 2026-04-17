// SQL解析与构建工具

import { LSMConfig } from '../config';

/**
 * 从完整SQL中提取WHERE及后面的所有内容（含ORDER BY/LIMIT/OFFSET）
 */
export function extractWhereAndAfter(sql: string): string {
  const match = sql.match(/WHERE\s+.+$/i);
  return match ? match[0].trim() : '';
}

/**
 * 判断SQL是否包含LIMIT
 */
export function hasLimit(sql: string): boolean {
  return /\bLIMIT\b/i.test(sql);
}

/**
 * SQL构建器（单例）
 * 持有预计算的fromClause和labelSelectClause
 */
export class SqlHelper {
  private static instance: SqlHelper | null = null;
  private readonly _fromClause: string;
  private readonly _labelSelectClause: string;

  private constructor(config: LSMConfig) {
    const tables = config.database.tables;
    const mappings = config.mappings;

    if (!tables || tables.length === 0) {
      throw new Error('缺少数据表配置');
    }

    // 构建FROM子句
    const mainTable = tables[0];
    const mainAlias = mainTable.alias || mainTable.name;
    let from = `${mainTable.name} AS ${mainAlias}`;
    for (let i = 1; i < tables.length; i++) {
      const table = tables[i];
      const alias = table.alias || table.name;
      const joinType = (table.join || 'LEFT').toUpperCase();
      const on = table.on || `${mainAlias}.id = ${alias}.id`;
      from += ` ${joinType} JOIN ${table.name} AS ${alias} ON ${on}`;
    }
    this._fromClause = from;

    // 构建label SELECT子句
    const clauses: string[] = [];
    for (const mapping of mappings || []) {
      for (const item of mapping.items) {
        if (item.name === '{field}') {
          const fieldMatch = item.condition?.match(/\.(\w+)/);
          if (fieldMatch) {
            clauses.push(`${item.condition} AS ${mapping.id}`);
          }
          continue;
        }

        const fieldMatch = item.name.match(/\{(\w+)\}/);
        if (fieldMatch) {
          clauses.push(`${item.condition || fieldMatch[1]} AS ${mapping.id}`);
          continue;
        }

        if (item.condition?.includes('{keyword}')) {
          continue;
        }

        if (item.condition && item.condition !== 'all') {
          const value = item.name.replace(/'/g, "''");
          clauses.push(`CASE WHEN ${item.condition} THEN '${value}' END AS ${mapping.id}`);
        } else {
          const value = item.name.replace(/'/g, "''");
          clauses.push(`'${value}' AS ${mapping.id}`);
        }
      }
    }
    this._labelSelectClause = `${mainAlias}.id${clauses.length > 0 ? ', ' + clauses.join(', ') : ''}`;
  }

  static create(config: LSMConfig): SqlHelper {
    if (!SqlHelper.instance) {
      SqlHelper.instance = new SqlHelper(config);
    }
    return SqlHelper.instance;
  }

  get fromClause(): string {
    return this._fromClause;
  }

  get labelSelectClause(): string {
    return this._labelSelectClause;
  }

  buildCountSql(whereAndAfter: string): string {
    return `SELECT COUNT(*) as total FROM ${this._fromClause} ${whereAndAfter}`.trim();
  }

  buildLabelSql(whereAndAfter: string, sqlHasLimit: boolean, pageSize: number, offset: number): string {
    const sql = `SELECT ${this._labelSelectClause} FROM ${this._fromClause} ${whereAndAfter}`;
    if (sqlHasLimit) {
      return sql.trim();
    }
    return `${sql} LIMIT ${pageSize} OFFSET ${offset}`.trim();
  }
}
