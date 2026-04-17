// SDK核心类

import * as dotenv from 'dotenv';
import { Database, DatabaseFactory } from './db';
import { NLPQuery } from './ai/nlp-query';
import { LLMManager } from './ai/llm-manager';
import { OpenAILLM } from './ai/openai-llm';
import { LLM } from './ai/types';
import { AppConfigManager } from './config/app-config';
import { SQLBuilder } from './db/sql-builder';

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
  private readonly sqlBuilder;
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
    this.sqlBuilder = new SQLBuilder(this.lsmConfig);
  }

  static async fromAppConfig(appConfigPath: string, lsmConfigPath: string, llm?: LLM): Promise<LSMSDK> {
    const sdk = new LSMSDK(appConfigPath, lsmConfigPath, llm);
    await sdk.database.init();
    sdk.inited = true;
    return sdk;
  }

  /**
   * 自然语言查询
   * AI只生成WHERE条件，SELECT由程序拼接
   */
  async query(options: {
    query?: string;
    sql?: string;
    page?: number;
    pageSize?: number;
  }): Promise<QueryResult> {
    const { query, sql, page = 1, pageSize = 20 } = options;

    let explanation: string | undefined;
    let sqlStr = sql ?? '';

    if (query) {
      // 自然语言查询：AI生成WHERE条件
      const result = await this.nlpQuery.execute(query);
      explanation = result.explanation;
      sqlStr = this.sqlBuilder.build(result.where, { orderBy: result.orderBy, limit: result.limit });
    }

    if (!sqlStr) {
      throw new Error('请提供 query 或 sql 参数');
    }

    // 计数
    const countSql = this.sqlBuilder.build(sqlStr, { count: true });
    const countResult = this.database.query(countSql);
    const total = countResult.rows[0]?.total || 0;

    // 执行查询（最后拼接 labels）
    const fullSql = this.sqlBuilder.build(sqlStr, { labels: true, limit: pageSize, offset: (page - 1) * pageSize });
    const queryResult = this.database.query(fullSql);

    return {
      sql: sqlStr,
      data: queryResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      explanation
    };
  }
}
