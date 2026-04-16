// 自然语言查询工具

import * as fs from 'fs';
import * as path from 'path';
import { NLPQueryRequest, NLPQueryResult } from './types';
import { Database } from '../db';
import { LLMManager } from './llm-manager';

/**
 * 自然语言查询工具
 */
export class NLPQuery {
  private database: Database;
  private llmManager: LLMManager;
  private configPath: string;
  private schema: string | null = null;

  /**
   * 构造函数
   * @param database 数据库实例
   * @param llmManager 大模型管理器
   * @param configPath LSM配置文件路径
   */
  constructor(database: Database, llmManager: LLMManager, configPath: string) {
    this.database = database;
    this.llmManager = llmManager;
    this.configPath = configPath;
  }

  /**
   * 执行自然语言查询
   * @param request 查询请求
   * @returns 查询结果
   */
  async execute(request: NLPQueryRequest): Promise<NLPQueryResult> {
    try {
      // 获取数据库schema信息
      const schema = await this.getDatabaseSchema();

      // 生成SQL查询
      const result = await this.llmManager.generateSQL(request.query, schema);

      // 执行SQL查询
      const queryResult = await this.database.query(result.sql);

      return {
        sql: result.sql,
        results: queryResult.rows,
        explanation: result.explanation
      };
    } catch (error) {
      console.error(`自然语言查询失败: ${(error as Error).message}`);
      return {
        sql: '',
        results: [],
        explanation: `查询失败: ${(error as Error).message}`
      };
    }
  }

  /**
   * 获取数据库schema信息
   * @returns schema信息
   */
  private async getDatabaseSchema(): Promise<string> {
    if (this.schema) {
      return this.schema;
    }

    let yamlContent = '';
    if (fs.existsSync(this.configPath)) {
      yamlContent = fs.readFileSync(this.configPath, 'utf8');
    }

    this.schema = yamlContent;

    return this.schema;
  }
}
