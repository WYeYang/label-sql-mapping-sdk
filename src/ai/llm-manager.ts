// 大模型管理器

import { LLM } from './types';

export interface FilterResult {
  sql: string;       // 完整SQL，如 SELECT * FROM ... WHERE ... ORDER BY ...
  explanation: string;
}

/**
 * LLM Manager
 */
export class LLMManager {
  private llm: LLM;

  constructor(llm: LLM) {
    this.llm = llm;
  }

  /**
   * 解析自然语言查询意图
   * 返回完整SQL语句
   */
  async parseQuery(naturalLanguageQuery: string, schema: string): Promise<FilterResult> {
    const systemPrompt = `你是一个SQL查询生成器。

## 数据库Schema
${schema}

## 任务
根据用户输入，生成完整的SQL查询语句。

## 输出格式
严格输出JSON，字段说明：
- sql: string — 完整SQL语句，以SELECT开头
- explanation: string — 解释生成的查询

## 示例
用户输入：价格大于100的商品，按价格降序
输出：
{"sql":"SELECT * FROM products AS p WHERE p.price > 100 ORDER BY p.price DESC","explanation":"筛选价格大于100的记录，按价格降序排列"}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `查询: ${naturalLanguageQuery}` }
    ];

    const response = await this.llm.chat(messages);
    const result: FilterResult = JSON.parse(response);

    return result;
  }

  /**
   * 兼容旧方法
   */
  async generateSQL(naturalLanguageQuery: string, schema: string): Promise<{ sql: string; explanation: string }> {
    const { sql, explanation } = await this.parseQuery(naturalLanguageQuery, schema);
    return {
      sql,
      explanation
    };
  }
}
