// SDK核心类

import * as dotenv from 'dotenv';
import { Database, DatabaseFactory } from './db';
import { NLPQuery, NLResult } from './ai/nlp-query';
import { LLMManager } from './ai/llm-manager';
import { OpenAILLM } from './ai/openai-llm';
import { LLM } from './ai/types';
import { AppConfigManager } from './config/app-config';

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
  }

  static async fromAppConfig(appConfigPath: string, lsmConfigPath: string, llm?: LLM): Promise<LSMSDK> {
    const sdk = new LSMSDK(appConfigPath, lsmConfigPath, llm);
    await sdk.database.init();
    sdk.inited = true;
    return sdk;
  }

  async query(options: {
    query?: string;
    sql?: string;
    page?: number;
    pageSize?: number;
  }): Promise<QueryResult> {
    const { query, sql, page = 1, pageSize = 20 } = options;

    let finalSql: string;
    let explanation: string | undefined;

    if (query) {
      const result = await this.nlpQuery.execute(query);
      finalSql = result.sql;
      explanation = result.explanation;
    } else if (sql) {
      finalSql = sql;
    } else {
      throw new Error('请提供 query 或 sql 参数');
    }

    const countSql = `SELECT COUNT(*) as total FROM (${finalSql}) as count_query`;
    const countResult = this.database.query(countSql);
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * pageSize;
    const hasLimit = /\bLIMIT\b/i.test(finalSql);
    const paginatedSql = hasLimit ? finalSql : `${finalSql} LIMIT ${pageSize} OFFSET ${offset}`;
    const queryResult = this.database.query(paginatedSql);

    return {
      sql: paginatedSql,
      data: queryResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      explanation
    };
  }
}
