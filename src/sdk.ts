// SDK核心类

import * as dotenv from 'dotenv';
import { Database, DatabaseFactory } from './db';
import { NLPQuery, NLResult } from './ai/nlp-query';
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
    where?: string;
    sql?: string;
    page?: number;
    pageSize?: number;
  }): Promise<QueryResult> {
    const { query, where, sql, page = 1, pageSize = 20 } = options;

    let finalWhere: string;
    let explanation: string | undefined;

    if (query) {
      // 自然语言查询：AI生成WHERE条件
      const result = await this.nlpQuery.execute(query);
      finalWhere = result.sql; // 旧接口返回的是where
      explanation = result.explanation;
    } else if (where) {
      // 直接传入WHERE条件
      finalWhere = where;
    } else if (sql) {
      // 完整SQL（兼容旧接口）
      // 尝试提取WHERE子句
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/i);
      finalWhere = whereMatch ? whereMatch[1] : '';
    } else {
      throw new Error('请提供 query、where 或 sql 参数');
    }

    // 构建完整SQL
    const offset = (page - 1) * pageSize;
    const fullSql = this.sqlBuilder.build(finalWhere, { limit: pageSize, offset });

    // 计数
    const countSql = this.sqlBuilder.buildCount(finalWhere);
    const countResult = this.database.query(countSql);
    const total = countResult.rows[0]?.total || 0;

    // 执行查询
    const queryResult = this.database.query(fullSql);

    return {
      sql: fullSql,
      data: queryResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      explanation
    };
  }

  /**
   * 仅生成WHERE条件（不执行查询）
   */
  async generateFilter(query: string): Promise<{ where: string; explanation: string }> {
    const result = await this.llmManager.generateFilter(query, this.lsmConfig.rawContent ?? '');
    return {
      where: result.where,
      explanation: result.explanation
    };
  }

  /**
   * 执行自定义WHERE条件查询
   */
  queryByWhere(where: string, options?: { page?: number; pageSize?: number }): Promise<QueryResult> {
    return this.query({ where, ...options });
  }
}
