// 自然语言查询工具

import { NLPQueryRequest, NLPQueryResult } from './types';
import { Database } from '../db';
import { LLMManager } from './llm-manager';

/**
 * 自然语言查询工具
 */
export class NLPQuery {
  private database: Database;
  private llmManager: LLMManager;

  /**
   * 构造函数
   * @param database 数据库实例
   * @param llmManager 大模型管理器
   */
  constructor(database: Database, llmManager: LLMManager) {
    this.database = database;
    this.llmManager = llmManager;
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
      const sql = await this.llmManager.generateSQL(request.query, schema);

      // 执行SQL查询
      const queryResult = await this.database.query(sql);

      return {
        sql,
        results: queryResult.rows,
        explanation: `根据查询"${request.query}"生成的SQL查询`
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
    // 这里简化处理，实际应该查询数据库获取真实的schema信息
    // 对于SQLite，可以使用PRAGMA table_info()获取表结构
    return `
    表: cards
    字段:
    - id: 卡片ID
    - name: 卡片名称
    - type: 卡片类型
    - attribute: 属性
    - race: 种族
    - level: 等级
    - atk: 攻击力
    - def: 防御力
    - desc: 卡片描述
    `;
  }
}
