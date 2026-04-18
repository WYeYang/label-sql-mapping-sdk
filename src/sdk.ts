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
    lsmConfigPath: string,
    llm?: LLM
  ) {
    const appConfigManager = AppConfigManager.new(lsmConfigPath);
    const lsmConfig = appConfigManager.getLSMConfig();
    const extensions = appConfigManager.getExtensions();

    this.database = DatabaseFactory.create(appConfigManager, lsmConfig);
    this.llmManager = new LLMManager(llm ?? new OpenAILLM(appConfigManager.getLLMConfig()));
    this.nlpQuery = new NLPQuery(this.llmManager, lsmConfig);
    
    const sqlHelper = SqlHelper.create(lsmConfig);
    sqlHelper.setExtensions(extensions);
    this.queryExecutor = new QueryExecutor(this.database, sqlHelper, extensions);
    this.extMerger = new ExtensionMerger(extensions);
  }

  static async fromAppConfig(lsmConfigPath: string, llm?: LLM): Promise<LSMSDK> {
    const sdk = new LSMSDK(lsmConfigPath, llm);
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
}
