// SDK核心类

import * as dotenv from 'dotenv';
import { Database, DatabaseFactory } from './db';
import { QueryExecutor } from './db/query-executor';
import { NLPQuery } from './ai/nlp-query';
import { LLMManager } from './ai/llm-manager';
import { OpenAILLM } from './ai/openai-llm';
import { LLM } from './ai/types';
import { AppConfigManager } from './config/app-config';
import { SqlHelper } from './db/sql-helper';
import { QueryResult } from './db/types';

dotenv.config();

export { QueryResult } from './db/types';

export class LSMSDK {
  private readonly database;
  private readonly llmManager: LLMManager;
  private readonly nlpQuery: NLPQuery;
  private readonly queryExecutor: QueryExecutor;
  private inited = false;

  private constructor(
    lsmConfigPath: string,
    llm?: LLM
  ) {
    const appConfigManager = AppConfigManager.new(lsmConfigPath);
    const lsmConfig = appConfigManager.getLSMConfig();

    this.database = DatabaseFactory.create(appConfigManager, lsmConfig);
    this.llmManager = new LLMManager(llm ?? new OpenAILLM(appConfigManager.getLLMConfig()));
    this.nlpQuery = new NLPQuery(this.llmManager, lsmConfig);
    
    const sqlHelper = SqlHelper.create(lsmConfig);
    sqlHelper.setExtensions(appConfigManager.getExtensions());
    this.queryExecutor = new QueryExecutor(this.database, sqlHelper, appConfigManager.getExtensions());
  }

  static async fromAppConfig(lsmConfigPath: string, llm?: LLM): Promise<LSMSDK> {
    const sdk = new LSMSDK(lsmConfigPath, llm);
    await sdk.database.init();
    sdk.inited = true;
    return sdk;
  }

  /**
   * 自然语言查询
   */
  async query(options: {
    query?: string;
    sql?: string;
    page?: number;
    pageSize?: number;
  }): Promise<QueryResult> {
    const { query, sql, page = 1, pageSize = 20 } = options;

    let explanation: string | undefined;
    let fullSqlStr = sql ?? '';

    if (query) {
      const result = await this.nlpQuery.execute(query);
      explanation = result.explanation;
      fullSqlStr = result.sql;
    } else if (sql) {
      fullSqlStr = sql;
    } else {
      throw new Error('请提供 query 或 sql 参数');
    }

    if (!fullSqlStr.trim()) {
      throw new Error('SQL不能为空');
    }

    const execResult = this.queryExecutor.execute(fullSqlStr, page, pageSize);
    
    return {
      ...execResult,
      sql: fullSqlStr,
      explanation
    };
  }
}
