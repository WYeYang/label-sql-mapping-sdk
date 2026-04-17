// 大模型管理器

import { LLM } from './types';

interface FilterResult {
  hasIntent: boolean;
  where: string;
  orderBy?: string;
  limit?: number;
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
   * 返回查询条件、排序、数量限制等片段
   */
  async parseQuery(naturalLanguageQuery: string, schema: string): Promise<FilterResult> {
    const systemPrompt = `根据用户输入生成SQLite条件片段。

Schema:
${schema}

输出JSON格式，包含以下字段：
- hasIntent: 用户是否有查询意图，无查询意图时为 false
- where: 筛选条件表达式，无筛选意图时为空字符串
- orderBy: 排序表达式，无排序需求时为undefined
- limit: 数量，无数量限制时为undefined
- explanation: 解释where、orderBy、limit的内容，无查询意图时为空字符串

请以JSON格式输出：`;

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
    const { where, explanation } = await this.parseQuery(naturalLanguageQuery, schema);
    return {
      sql: where,
      explanation
    };
  }
}
