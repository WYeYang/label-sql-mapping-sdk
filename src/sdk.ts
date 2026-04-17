// SDK核心类

import * as dotenv from 'dotenv';
import { Database, DatabaseFactory } from './db';
import { NLPQuery } from './ai/nlp-query';
import { LLMManager } from './ai/llm-manager';
import { OpenAILLM } from './ai/openai-llm';
import { LLM } from './ai/types';
import { AppConfigManager } from './config/app-config';
import { SqlHelper, extractWhereAndAfter, hasLimit } from './db/sql-helper';

dotenv.config();

export interface QueryResult {
  sql: string;
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  explanation?: string;
}

export class LSMSDK {
  private readonly lsmConfig;
  private readonly database;
  private readonly llmManager;
  private readonly nlpQuery;
  private readonly sqlHelper: SqlHelper;
  private inited = false;

  private constructor(
    appConfigPath: string,
    lsmConfigPath: string,
    llm?: LLM
  ) {
    const appConfigManager = AppConfigManager.getInstance(appConfigPath, lsmConfigPath);

    this.lsmConfig = appConfigManager.getLSMConfig();
    this.database = DatabaseFactory.create(appConfigManager, this.lsmConfig);
    this.llmManager = new LLMManager(llm ?? new OpenAILLM(appConfigManager.getLLMConfig()));
    this.nlpQuery = new NLPQuery(this.llmManager, this.lsmConfig);
    this.sqlHelper = SqlHelper.create(this.lsmConfig);
  }

  static async fromAppConfig(appConfigPath: string, lsmConfigPath: string, llm?: LLM): Promise<LSMSDK> {
    const sdk = new LSMSDK(appConfigPath, lsmConfigPath, llm);
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

    const whereAndAfter = extractWhereAndAfter(fullSqlStr);
    const offset = (page - 1) * pageSize;

    // 计数
    const countSql = this.sqlHelper.buildCountSql(whereAndAfter);
    const countResult = this.database.query(countSql);
    const total = countResult.rows[0]?.total || 0;

    // label查询
    const labelSql = this.sqlHelper.buildLabelSql(
      whereAndAfter,
      hasLimit(fullSqlStr),
      pageSize,
      offset
    );
    const queryResult = this.database.query(labelSql);

    return {
      sql: fullSqlStr,
      data: queryResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      explanation
    };
  }
}
