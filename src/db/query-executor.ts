// 查询执行器

import { Database, DBQueryResult } from '../db';
import { SqlHelper, extractWhereAndAfter, hasLimit, replaceLimit } from './sql-helper';
import type { ExtensionMapping } from '../config';
import { QueryResult } from './types';
import type { ExtensionInfo } from '../ai/extension-merger';

/**
 * 查询模式
 */
export type QueryMode = 'list' | 'detail';

/**
 * 查询执行器返回结果
 */
type QueryExecResult = Pick<QueryResult, 'data' | 'total' | 'page' | 'pageSize' | 'totalPages' | 'extensions'>;

/**
 * 查询执行器
 * 封装 SQL 执行和结果处理逻辑
 */
/**
 * 查询执行器
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                         execute()                                   │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  输入: fullSqlStr, page, pageSize, mode, aiExtensions               │
 * │                                                                      │
 * │  1. 规范化 SQL                                                        │
 * │     └─ replaceLimit: AI LIMIT > pageSize 时替换为 pageSize            │
 * │     └─ extractWhereAndAfter: 提取 WHERE 及之后内容                     │
 * │                                                                      │
 * │  2. COUNT 查询                                                        │
 * │     └─ buildCountSql: "SELECT COUNT(*) FROM ..."                     │
 * │                                                                      │
 * │  3. 扩展标签处理                                                       │
 * │     ├─ detail 模式: extMappings = this.extensions (全部)             │
 * │     └─ list 模式: extensionsResult = aiExtensions (直接返回)         │
 * │                                                                      │
 * │  4. 构建并执行查询                                                     │
 * │     └─ SELECT 主字段 [扩展字段] FROM ... WHERE ... LIMIT ...          │
 * │                                                                      │
 * │  输出: { data, total, page, pageSize, totalPages, extensions }       │
 * └─────────────────────────────────────────────────────────────────────┘
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
  execute(fullSqlStr: string, page: number, pageSize: number, mode: QueryMode = 'list', aiExtensions?: ExtensionInfo[]): QueryExecResult {
    // AI 返回的 LIMIT 如果大于 pageSize，替换成 pageSize
    const normalizedSql = replaceLimit(fullSqlStr, pageSize);
    const whereAndAfter = extractWhereAndAfter(normalizedSql);

    // 第一次 SQL：count
    const countSql = this.sqlHelper.buildCountSql(whereAndAfter);
    const countResult: DBQueryResult = this.database.query(countSql);
    const total = countResult.rows[0]?.total || 0;

    let extMappings: ExtensionMapping[] = [];
    let extensionsResult: ExtensionInfo[] | undefined;

    if (mode === 'detail') {
      // 详情模式：查询全部扩展标签，嵌入每条数据
      extMappings = this.extensions;
    } else {
      // 列表模式：直接返回 AI 扩展标签
      extensionsResult = aiExtensions;
    }

    // 构建 SQL：list 和 detail 都使用 labelSelectClause，detail 额外包含 extensions
    const mainSelect = this.sqlHelper.labelSelectClause;
    const extSelect = mode === 'detail' && extMappings.length ? this.sqlHelper.buildExtensionSelect(extMappings) : '';
    const selectClause = extSelect ? `${mainSelect}, ${extSelect}` : mainSelect;
    const fromClause = this.sqlHelper.fromClause;

    const baseSql = `SELECT ${selectClause} FROM ${fromClause} ${whereAndAfter}`;

    const offset = (page - 1) * pageSize;
    const querySql = hasLimit(normalizedSql) ? baseSql : `${baseSql} LIMIT ${pageSize} OFFSET ${offset}`;

    const queryResult: DBQueryResult = this.database.query(querySql);

    return { 
      data: queryResult.rows, 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize),
      extensions: extensionsResult?.length ? extensionsResult : undefined
    };
  }
}
