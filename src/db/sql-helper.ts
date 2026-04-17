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
      const id = mapping.id;
      const items = mapping.items || [];
      const prefixCondition = mapping.condition;  // 前置条件
      const value = mapping.value;               // 单值模式的值或 items 模式的默认值

      // 单值模式：有 value 且没有 items
      if (value !== undefined && items.length === 0) {
        const condition = prefixCondition || '1=1';
        const isField = /^[dt]\.\w+$/.test(value);
        const isNumber = /^\d+$/.test(value);

        let clause: string;
        if (isField || isNumber) {
          clause = `WHEN ${condition} THEN ${value}`;
        } else {
          const safeValue = value.replace(/'/g, "''");
          clause = `WHEN ${condition} THEN '${safeValue}'`;
        }
        clauses.push(`CASE ${clause} END AS ${id}`);
        continue;
      }

      // items 模式
      if (items.length > 0 || value !== undefined) {
        const whenClauses: string[] = [];

        // 添加 items 的条件
        for (const item of items) {
          const itemValue = item.value;
          const matchCondition = item.condition || '1=1';
          const condition = prefixCondition 
            ? `${prefixCondition} AND ${matchCondition}` 
            : matchCondition;

          // 自动推断：包含 . 为字段，数字为数值，其他为字符串
          const isField = /^[dt]\.\w+$/.test(itemValue);
          const isNumber = /^\d+$/.test(itemValue);

          if (isField || isNumber) {
            whenClauses.push(`WHEN ${condition} THEN ${itemValue}`);
          } else {
            const safeValue = itemValue.replace(/'/g, "''");
            whenClauses.push(`WHEN ${condition} THEN '${safeValue}'`);
          }
        }

        // 添加默认值作为最后一个 WHEN（仍然需要前置条件）
        if (value !== undefined) {
          const isField = /^[dt]\.\w+$/.test(value);
          const isNumber = /^\d+$/.test(value);
          const defaultCondition = prefixCondition || '1=1';
          if (isField || isNumber) {
            whenClauses.push(`WHEN ${defaultCondition} THEN ${value}`);
          } else {
            const safeValue = value.replace(/'/g, "''");
            whenClauses.push(`WHEN ${defaultCondition} THEN '${safeValue}'`);
          }
        }

        clauses.push(`CASE ${whenClauses.join(' ')} END AS ${id}`);
        continue;
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
