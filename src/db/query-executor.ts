// 查询执行器

import { Database, DBQueryResult } from '../db';
import { SqlHelper, extractWhereAndAfter, hasLimit, replaceLimit, extractLimit } from './sql-helper';
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
    // 提取原始 LIMIT 值（用于确定总数上限）
    const originalLimit = extractLimit(fullSqlStr);
    
    // 去掉 SQL 中的 LIMIT，用于构建 countSql 和 querySql
    const sqlWithoutLimit = fullSqlStr.replace(/\bLIMIT\s+\d+/i, '').trim();
    const whereAndAfter = extractWhereAndAfter(sqlWithoutLimit);

    // 第一次 SQL：count，获取总数
    const countSql = this.sqlHelper.buildCountSql(whereAndAfter);
    const countResult: DBQueryResult = this.database.query(countSql);
    const rawTotal = countResult.rows[0]?.total || 0;
    
    // 确定最终总数：如果有原始 LIMIT，取 min(原始 LIMIT, 总数)
    const total = originalLimit !== null ? Math.min(originalLimit, rawTotal) : rawTotal;

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
    
    // 计算实际要取的数量：如果有原始 LIMIT，不能超过 total - offset
    let actualLimit = pageSize;
    if (originalLimit !== null) {
      actualLimit = Math.min(pageSize, Math.max(0, total - offset));
    }
    
    // 构建查询 SQL：如果 offset 超过 total，就加 LIMIT 0
    let querySql: string;
    if (offset >= total) {
      querySql = `${baseSql} LIMIT 0`;
    } else {
      querySql = `${baseSql} LIMIT ${actualLimit} OFFSET ${offset}`;
    }
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
