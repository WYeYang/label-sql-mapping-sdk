// 查询执行器

import { Database, DBQueryResult } from '../db';
import { SqlHelper, extractWhereAndAfter, hasLimit, replaceLimit } from './sql-helper';
import type { ExtensionMapping } from '../config';
import type { ExtensionValue } from './types';
import { QueryResult } from './types';

/**
 * 查询模式
 */
export type QueryMode = 'list' | 'detail';

/**
 * AI 返回的扩展标签信息
 */
export interface AIExtensions extends ExtensionMapping {}

/**
 * 查询执行器返回结果
 */
type QueryExecResult = Pick<QueryResult, 'data' | 'total' | 'page' | 'pageSize' | 'totalPages' | 'extensions'>;

/**
 * 查询执行器
 * 封装 SQL 执行和结果处理逻辑
 */
export class QueryExecutor {
  constructor(
    private database: Database,
    private sqlHelper: SqlHelper,
    private extensions: ExtensionMapping[]
  ) {}

  /**
   * 执行查询
   */
  execute(fullSqlStr: string, page: number, pageSize: number, mode: QueryMode = 'list', aiExtensions?: AIExtensions[]): QueryExecResult {
    // AI 返回的 LIMIT 如果大于 pageSize，替换成 pageSize
    const normalizedSql = replaceLimit(fullSqlStr, pageSize);
    const whereAndAfter = extractWhereAndAfter(normalizedSql);

    // 第一次 SQL：count
    const countSql = this.sqlHelper.buildCountSql(whereAndAfter);
    const countResult: DBQueryResult = this.database.query(countSql);
    const total = countResult.rows[0]?.total || 0;

    let extMappings: ExtensionMapping[] = [];
    let extensionsResult: Record<string, ExtensionValue> | undefined;

    if (mode === 'detail') {
      // 详情模式：查询全部扩展标签，嵌入每条数据
      extMappings = this.extensions;
    } else {
      // 列表模式：根据 AI 返回的扩展标签构建独立字段
      if (aiExtensions?.length) {
        extensionsResult = {};
        for (const ext of aiExtensions) {
          extensionsResult[ext.name] = {
            name: ext.name,
            values: ext.items?.map(i => i.value) ?? []
          };
        }
      }
    }

    // 构建 SQL
    const extSelect = extMappings.length ? this.sqlHelper.buildExtensionSelect(extMappings) : '';
    const mainSelect = this.sqlHelper.labelSelectClause;
    const fromClause = this.sqlHelper.fromClause;

    const baseSql = extSelect
      ? `SELECT ${mainSelect}, ${extSelect} FROM ${fromClause} ${whereAndAfter}`
      : `SELECT ${mainSelect} FROM ${fromClause} ${whereAndAfter}`;

    const offset = (page - 1) * pageSize;
    const querySql = hasLimit(normalizedSql) ? baseSql : `${baseSql} LIMIT ${pageSize} OFFSET ${offset}`;

    const queryResult: DBQueryResult = this.database.query(querySql);

    return { 
      data: queryResult.rows, 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize),
      extensions: Object.keys(extensionsResult || {}).length ? extensionsResult : undefined
    };
  }
}
