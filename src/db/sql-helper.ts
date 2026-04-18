// SQL解析与构建工具

import { LSMConfig } from '../config';
import type { ExtensionMapping, MappingItem } from '../config';
import type { ExtensionInfo } from '../ai/llm-manager';

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
      ext.items.some((item: MappingItem) => lower.some(k => item.value.toLowerCase().includes(k)))
    );
  }

  /**
   * 从行数据中提取扩展标签
   */
  extractExtensions(rows: any[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const ext of this._extensions) {
      const matched = new Set<string>();
      for (const row of rows) {
        if (row[ext.id]) matched.add(row[ext.id]);
      }
      if (matched.size > 0) result[ext.id] = Array.from(matched);
    }
    return result;
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
      const whens = ext.items.map((item: MappingItem) => {
        const cond = item.condition || '1=1';
        const val = item.value;
        return `WHEN ${cond} THEN '${val}'`;
      }).join(' ');
      return whens ? `CASE ${whens} END AS ${ext.id}` : '';
    }).filter(Boolean);
    return cases.join(', ');
  }

  /**
   * 根据 AI 返回的扩展标签信息构建 CASE WHEN
   * @param extInfos AI 返回的扩展标签信息 [{id, values}]
   */
  buildCaseWhenByExtInfo(extInfos: ExtensionInfo[]): string {
    if (!extInfos?.length) return '';
    const cases = extInfos.map(info => {
      const mapping = this.getExtensionById(info.id);
      if (!mapping) return '';
      // 根据 values 过滤匹配的 items（直接匹配 value 字段）
      const matched = mapping.items.filter(item => info.values.includes(item.value));
      if (!matched.length) return '';
      const whens = matched.map(item => {
        const cond = item.condition || '1=1';
        const val = item.value;
        return `WHEN ${cond} THEN '${val}'`;
      }).join(' ');
      return `CASE ${whens} END AS ${info.id}`;
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
   * 构建完整查询 SQL（主标签 + 扩展标签）
   */
  buildQuerySql(whereAndAfter: string, extensions: ExtensionMapping[], pageSize: number, offset: number): string {
    const extSelect = this.buildExtensionSelect(extensions);
    const base = `SELECT ${this.labelSelectClause}${extSelect ? ', ' + extSelect : ''} FROM ${this.fromClause} ${whereAndAfter}`;
    return `${base} LIMIT ${pageSize} OFFSET ${offset}`.trim();
  }

  /**
   * 构建完整查询 SQL（主标签 + 扩展标签，使用 AI 返回的扩展标签信息）
   */
  buildQuerySqlByExtInfo(whereAndAfter: string, extInfos: ExtensionInfo[], pageSize: number, offset: number): string {
    const extSelect = this.buildCaseWhenByExtInfo(extInfos);
    const base = `SELECT ${this.labelSelectClause}${extSelect ? ', ' + extSelect : ''} FROM ${this.fromClause} ${whereAndAfter}`;
    return `${base} LIMIT ${pageSize} OFFSET ${offset}`.trim();
  }
}
