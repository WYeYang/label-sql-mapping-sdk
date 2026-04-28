// SQL解析与构建工具

import { LSMConfig } from '../config';
import type { ExtensionMapping, MappingItem } from '../config';

/**
 * 从完整SQL中提取WHERE及后面的所有内容（含ORDER BY/LIMIT/OFFSET）
 */
export function extractWhereAndAfter(sql: string): string {
  // 如果有 WHERE，提取 WHERE 及其后面的所有内容（包括 LIMIT 和 ORDER BY）
  if (/\bWHERE\b/i.test(sql)) {
    const match = sql.match(/\bWHERE\b\s+(.+)$/is);
    return match ? match[0].trim() : '';
  }
  // 如果没有 WHERE，提取 LIMIT 和 ORDER BY（如果有的话）
  const limitMatch = sql.match(/\bLIMIT\s+\d+\b/i);
  const orderMatch = sql.match(/\bORDER\s+BY\b.+$/i);
  const parts: string[] = [];
  if (orderMatch) parts.push(orderMatch[0]);
  if (limitMatch) parts.push(limitMatch[0]);
  return parts.join(' ');
}

/** 判断SQL是否包含LIMIT */
export const hasLimit = (sql: string) => /\bLIMIT\b/i.test(sql);

/**
 * 提取 SQL 中的 LIMIT 值
 */
export function extractLimit(sql: string): number | null {
  const match = sql.match(/\bLIMIT\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 如果 AI 返回的 LIMIT 大于 pageSize，替换成 pageSize
 */
export function replaceLimit(sql: string, pageSize: number): string {
  if (!hasLimit(sql)) return sql;
  const limit = extractLimit(sql);
  if (limit !== null && limit > pageSize) {
    return sql.replace(/\bLIMIT\s+\d+/i, `LIMIT ${pageSize}`);
  }
  return sql;
}

/**
 * 将 WHERE 条件追加到 SQL 末尾
 */
export function appendWhereCondition(sql: string, condition: string): string {
  const normalizedSql = sql.trim();
  const upperSql = normalizedSql.toUpperCase();
  
  if (upperSql.includes('WHERE')) {
    // 已有 WHERE，添加 AND 条件
    const beforeWhere = normalizedSql.substring(0, normalizedSql.toUpperCase().indexOf('WHERE') + 5);
    const afterWhere = normalizedSql.substring(normalizedSql.toUpperCase().indexOf('WHERE') + 5);
    return `${beforeWhere} ${afterWhere.trim()} AND ${condition}`;
  } else {
    // 没有 WHERE，直接添加
    return `${normalizedSql} WHERE ${condition}`;
  }
}

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
  private _extensions: ExtensionMapping[] = [];
  private extIds: Set<string> = new Set();

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

  /**
   * 设置扩展标签
   */
  setExtensions(extensions: ExtensionMapping[]): void {
    this._extensions = extensions;
    this.extIds = new Set(extensions.map(e => e.id));
  }

  /**
   * 根据 ID 获取扩展标签配置
   */
  getExtensionById(id: string): ExtensionMapping | undefined {
    return this._extensions.find(ext => ext.id === id);
  }

  /**
   * 根据关键词匹配扩展标签
   */
  matchExtensions(keywords: string[]): ExtensionMapping[] {
    if (!keywords?.length) return [];
    const lower = keywords.map(k => k.toLowerCase());
    return this._extensions.filter(ext => 
      lower.includes(ext.id.toLowerCase()) ||
      lower.includes(ext.name.toLowerCase()) ||
      (ext.items && ext.items.some((item: MappingItem) => lower.some(k => item.value.toLowerCase().includes(k))))
    );
  }

  /**
   * 从行数据中排除扩展标签字段
   */
  excludeExtensions(row: any): any {
    const result: any = {};
    for (const key of Object.keys(row)) {
      if (!this.extIds.has(key)) result[key] = row[key];
    }
    return result;
  }

  /**
   * 构建扩展标签 SQL 子句
   */
  buildExtensionSelect(extensions: ExtensionMapping[]): string {
    if (!extensions.length) return '';
    const cases = extensions.map(ext => {
      if (!ext.items?.length) return '';
      const whens = ext.items.map((item: MappingItem) => {
        const cond = item.condition || '1=1';
        const val = item.value;
        return `WHEN ${cond} THEN '${val}'`;
      }).join(' ');
      return whens ? `CASE ${whens} END AS ${ext.id}` : '';
    }).filter(Boolean);
    return cases.join(', ');
  }

  buildCountSql(whereAndAfter: string): string {
    return `SELECT COUNT(*) as total FROM ${this.fromClause} ${whereAndAfter}`.trim();
  }

  buildLabelSql(whereAndAfter: string, hasLimit: boolean, pageSize: number, offset: number): string {
    const sql = `SELECT ${this.labelSelectClause} FROM ${this.fromClause} ${whereAndAfter}`;
    return hasLimit ? sql.trim() : `${sql} LIMIT ${pageSize} OFFSET ${offset}`.trim();
  }

  /**
   * 构建基础 SQL（SELECT FROM）
   */
  buildBaseSql(): string {
    return `SELECT ${this.fromClause}`;
  }

  /**
   * 从 parseResult 构建初始 SQL
   */
  buildInitialSql(parseResult: any): string {
    let sql = this.buildBaseSql();
    if (parseResult.where) {
      const where = parseResult.where.trim();
      sql = where.toUpperCase().startsWith('WHERE ') 
        ? `${sql} ${where}`
        : `${sql} WHERE ${where}`;
    }
    if (parseResult.order) sql += ` ORDER BY ${parseResult.order}`;
    if (parseResult.limit) sql += ` LIMIT ${parseResult.limit}`;
    return sql;
  }

  /**
   * 构建完整查询 SQL（主标签 + 扩展标签）
   */
  buildQuerySql(whereAndAfter: string, extensions: ExtensionMapping[], pageSize: number, offset: number): string {
    const extSelect = this.buildExtensionSelect(extensions);
    const base = `SELECT ${this.labelSelectClause}${extSelect ? ', ' + extSelect : ''} FROM ${this.fromClause} ${whereAndAfter}`;
    return `${base} LIMIT ${pageSize} OFFSET ${offset}`.trim();
  }
}
