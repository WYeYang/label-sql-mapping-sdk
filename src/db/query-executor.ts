// 查询执行器

import { Database, DBQueryResult } from '../db';
import { SqlHelper, extractWhereAndAfter, hasLimit } from './sql-helper';
import type { ExtensionMapping } from '../config';
import { ExtensionValue, QueryResult } from './types';

/**
 * 查询执行器返回结果（不含 sql 和 explanation）
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
  execute(fullSqlStr: string, page: number, pageSize: number): QueryExecResult {
    const whereAndAfter = extractWhereAndAfter(fullSqlStr);

    // 第一次 SQL：count
    const countSql = this.sqlHelper.buildCountSql(whereAndAfter);
    const countResult: DBQueryResult = this.database.query(countSql);
    const total = countResult.rows[0]?.total || 0;

    // 根据 total 决定扩展标签范围
    let extMappings: ExtensionMapping[];
    if (total === 1) {
      extMappings = this.extensions;
    } else {
      extMappings = [];
    }

    // 构建 SQL
    const extSelect = extMappings.length ? this.sqlHelper.buildExtensionSelect(extMappings) : '';
    const mainSelect = this.sqlHelper.labelSelectClause;
    const fromClause = this.sqlHelper.fromClause;

    const baseSql = extSelect
      ? `SELECT ${mainSelect}, ${extSelect} FROM ${fromClause} ${whereAndAfter}`
      : `SELECT ${mainSelect} FROM ${fromClause} ${whereAndAfter}`;

    const offset = (page - 1) * pageSize;
    const querySql = hasLimit(fullSqlStr) ? baseSql : `${baseSql} LIMIT ${pageSize} OFFSET ${offset}`;

    const queryResult: DBQueryResult = this.database.query(querySql);

    // 提取扩展标签
    const extensions: Record<string, ExtensionValue> = {};
    if (extMappings.length) {
      const extracted = this.sqlHelper.extractExtensions(queryResult.rows);
      for (const ext of extMappings) {
        const values = extracted[ext.id];
        if (values?.length) {
          extensions[ext.name] = { name: ext.name, values };
        }
      }
    }

    return { 
      data: queryResult.rows, 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize),
      extensions: Object.keys(extensions).length ? extensions : undefined
    };
  }
}
