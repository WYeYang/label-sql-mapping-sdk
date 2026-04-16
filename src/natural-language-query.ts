// 自然语言数据库查询工具

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { LSMSDK } from './sdk';
import { NLPQuery } from './ai/nlp-query';
import { LLMManager } from './ai/llm-manager';
import { AppConfigManager } from './config/app-config';
import { DBConfig } from './db';
import { DatabaseType } from './config';

dotenv.config();

export interface QueryResult {
  sql: string;
  data: any[];
  explanation?: string;
}

export class NaturalLanguageQuery {
  private sdk: LSMSDK;
  private nlpQuery: NLPQuery;

  constructor(appConfigPath: string, lsmConfigPath: string) {
    const appConfigManager = new AppConfigManager(appConfigPath);
    appConfigManager.load();

    const dbPath = appConfigManager.getDatabasePath();
    const llmConfig = appConfigManager.getLLMConfig();

    if (!dbPath) {
      throw new Error('错误: 请在配置文件中配置数据库文件路径');
    }

    const dbConfig: DBConfig = { type: 'sqlite' as DatabaseType, path: dbPath };
    this.sdk = new LSMSDK(lsmConfigPath, dbConfig);
    const llmManager = new LLMManager(llmConfig);
    this.nlpQuery = new NLPQuery(this.sdk.getDatabase(), llmManager, lsmConfigPath);
  }

  async query(query: string): Promise<QueryResult> {
    const result = await this.nlpQuery.execute({ query });
    
    return {
      sql: result.sql,
      data: result.results || [],
      explanation: result.explanation
    };
  }

  async close(): Promise<void> {
    await this.sdk.close();
  }
}
