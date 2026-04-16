// 大模型管理器

import { LLM } from './types';

/**
 * LLM Manager
 */
export class LLMManager {
  private llm: LLM;

  constructor(llm: LLM) {
    this.llm = llm;
  }

  async generateSQL(naturalLanguageQuery: string, schema: string): Promise<{ sql: string; explanation: string }> {
    const systemPrompt = `你是一个SQL生成器，根据用户的自然语言查询和数据库schema生成SQLite查询语句。返回JSON格式：{"sql": "SQL查询语句", "explanation": "SQL解释"}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Schema:\n${schema}\n\n查询: ${naturalLanguageQuery}` }
    ];

    const response = await this.llm.chat(messages);
    const result = JSON.parse(response);

    return {
      sql: result.sql.trim(),
      explanation: result.explanation.trim()
    };
  }
}
