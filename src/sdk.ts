// SDK核心类

import * as dotenv from 'dotenv';
import { Database, DatabaseFactory } from './db';
import { QueryExecutor, QueryMode } from './db/query-executor';
import { NLPQuery, ParseResult } from './ai/nlp-query';
import { ExtensionMerger } from './ai/extension-merger';
import { LLMManager } from './ai/llm-manager';
import { OpenAILLM } from './ai/openai-llm';
import { LLM } from './ai/types';
import { AppConfigManager } from './config/app-config';
import { SqlHelper } from './db/sql-helper';
import { QueryResult } from './db/types';

dotenv.config();

export { QueryResult } from './db/types';
export { QueryMode } from './db/query-executor';

export class LSMSDK {
  private readonly database;
  private readonly llmManager: LLMManager;
  private readonly nlpQuery: NLPQuery;
  private readonly queryExecutor: QueryExecutor;
  private readonly extMerger: ExtensionMerger;
  private inited = false;

  private constructor(
    configPath: string,
    lsmPath?: string
  ) {
    const appConfigManager = AppConfigManager.new(configPath, lsmPath);
    const lsmConfig = appConfigManager.getLSMConfig();
    const extensions = appConfigManager.getExtensions();
    const llm = appConfigManager.getLLMConfig();
    
    this.database = DatabaseFactory.create(appConfigManager, lsmConfig);
    this.llmManager = new LLMManager(new OpenAILLM(llm));
    this.nlpQuery = new NLPQuery(this.llmManager, lsmConfig);
    
    const sqlHelper = SqlHelper.create(lsmConfig);
    sqlHelper.setExtensions(extensions);
    this.queryExecutor = new QueryExecutor(this.database, sqlHelper, extensions);
    this.extMerger = new ExtensionMerger(extensions);
  }

  /**
   * 从配置文件创建 SDK 实例
   * @param configPath main.yaml: lsm-* 包名或文件路径（不传则自动查找）
   * @param lsmPath lsm.yaml: 可选，文件路径（不传则自动向上查找）
   */
  static async fromAppConfig(configPath?: string, lsmPath?: string): Promise<LSMSDK> {
    // 默认使用 'lsm' 表示自动查找任意 lsm-* 包
    const sdk = new LSMSDK(configPath || 'lsm', lsmPath);
    await sdk.database.init();
    sdk.inited = true;
    return sdk;
  }

  /**
   * 自然语言查询
   * @param options.query 自然语言查询
   * @param options.sql 原始SQL（与query二选一）
   * @param options.page 页码，默认1
   * @param options.pageSize 每页数量，默认20
   * @param options.mode 查询模式：list(列表) 或 detail(详情)
   * @param options.extensions 扩展标签值列表（会根据配置找到对应ID后合并）
   */
  async query(options: {
    query?: string;
    sql?: string;
    page?: number;
    pageSize?: number;
    mode?: QueryMode;
    extensions?: string[];
  }): Promise<QueryResult> {
    const { query, sql, page = 1, pageSize = 20, mode = 'list' } = options;

    let explanation: string | undefined;
    let fullSqlStr = sql ?? '';

    // 构建 extensions：外部传入的值 + AI 返回的 extensions
    let aiExtensions = this.extMerger.buildFromValues(options.extensions ?? []);
    if (query) {
      const result = await this.nlpQuery.execute(query);
      explanation = result.explanation;
      fullSqlStr = result.sql;
      aiExtensions = this.extMerger.merge(aiExtensions, result.extensions ?? []);
    } else if (sql) {
      fullSqlStr = sql;
    } else {
      throw new Error('请提供 query 或 sql 参数');
    }

    // 根据 extensions 构建 WHERE 条件并拼接到 SQL
    const whereCondition = this.extMerger.buildWhereConditions(aiExtensions);
    if (whereCondition) {
      fullSqlStr = this.appendWhereCondition(fullSqlStr, whereCondition);
    }

    if (!fullSqlStr.trim()) {
      throw new Error('SQL不能为空');
    }

    const execResult = this.queryExecutor.execute(fullSqlStr, page, pageSize, mode, aiExtensions);
    
    return {
      ...execResult,
      sql: fullSqlStr,
      explanation
    };
  }

  /**
   * 将 WHERE 条件追加到 SQL 末尾
   */
  private appendWhereCondition(sql: string, condition: string): string {
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
}
