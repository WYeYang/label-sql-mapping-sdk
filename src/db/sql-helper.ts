// SQL解析与构建工具

import { LSMConfig } from '../config';

/**
 * 从完整SQL中提取WHERE及后面的所有内容（含ORDER BY/LIMIT/OFFSET）
 */
export function extractWhereAndAfter(sql: string): string {
  return sql.match(/WHERE\s+.+$/i)?.[0].trim() ?? '';
}

/** 判断SQL是否包含LIMIT */
export const hasLimit = (sql: string) => /\bLIMIT\b/i.test(sql);

/** SQL转义：字段引用原样输出，字符串值加引号 */
const esc = (v: string) => v.includes('.') ? v : `'${v.replace(/'/g, "''")}'`;

/** 构建FROM子句 */
function buildFromClause(tables: LSMConfig['database']['tables']): string {
  const main = tables[0];
  const mainAlias = main.alias || main.name;
  const joins = tables.slice(1).map(t => {
    const alias = t.alias || t.name;
    const join = (t.join || 'LEFT').toUpperCase();
    const on = t.on || `${mainAlias}.id = ${alias}.id`;
    return `${join} JOIN ${t.name} AS ${alias} ON ${on}`;
  });
  return `${main.name} AS ${mainAlias}${joins.length ? ' ' + joins.join(' ') : ''}`;
}

/** 合并前置条件和item条件 */
function mergeCondition(prefix: string | undefined, itemCond: string | undefined): string {
  if (!prefix) return itemCond || '1=1';
  if (!itemCond) return prefix;
  return `(${prefix}) AND (${itemCond})`;
}

/** 构建单个label子句 */
function buildLabelClause(id: string, mapping: LSMConfig['mappings'][0]): string {
  const { condition, value, items = [] } = mapping;
  // 单值模式
  if (value !== undefined && !items.length) {
    return condition
      ? `CASE WHEN ${condition} THEN ${esc(value)} END AS ${id}`
      : `${esc(value)} AS ${id}`;
  }
  // items模式
  const whens = items.map(item => {
    const cond = mergeCondition(condition, item.condition);
    return `WHEN ${cond} THEN ${esc(item.value)}`;
  });
  // 默认值：前置条件存在时作为WHEN
  if (value !== undefined && condition) {
    whens.push(`WHEN ${condition} THEN ${esc(value)}`);
  }
  return whens.length ? `CASE ${whens.join(' ')} END AS ${id}` : '';
}

/** 构建完整SELECT子句 */
function buildSelectClause(mainAlias: string, mappings: LSMConfig['mappings']): string {
  const labels = (mappings || []).map(m => buildLabelClause(m.id, m));
  return `${mainAlias}.id${labels.length ? ', ' + labels.join(', ') : ''}`;
}

/**
 * SQL构建器（单例）
 */
export class SqlHelper {
  private static _instance: SqlHelper | null = null;
  readonly fromClause: string;
  readonly labelSelectClause: string;

  private constructor(config: LSMConfig) {
    const tables = config.database.tables;
    if (!tables?.length) throw new Error('缺少数据表配置');
    this.fromClause = buildFromClause(tables);
    this.labelSelectClause = buildSelectClause(
      tables[0].alias || tables[0].name,
      config.mappings
    );
  }

  static create(config: LSMConfig): SqlHelper {
    return this._instance ??= new SqlHelper(config);
  }

  buildCountSql(whereAndAfter: string): string {
    return `SELECT COUNT(*) as total FROM ${this.fromClause} ${whereAndAfter}`.trim();
  }

  buildLabelSql(whereAndAfter: string, hasLimit: boolean, pageSize: number, offset: number): string {
    const sql = `SELECT ${this.labelSelectClause} FROM ${this.fromClause} ${whereAndAfter}`;
    return hasLimit ? sql.trim() : `${sql} LIMIT ${pageSize} OFFSET ${offset}`.trim();
  }
}
