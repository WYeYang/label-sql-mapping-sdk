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

  /**
   * 生成筛选条件（WHERE子句）
   * 只生成 WHERE 部分，SELECT 由程序拼接
   */
  async generateFilter(naturalLanguageQuery: string, schema: string): Promise<{ where: string; explanation: string }> {
    const systemPrompt = `你是一个SQL筛选条件生成器。

任务：根据用户的自然语言查询，生成SQLite的WHERE筛选条件。

规则：
1. 只生成WHERE子句，不需要SELECT、FROM等部分
2. WHERE子句应该描述"筛选什么"，不包含排序(LIMIT/ORDER BY)
3. 使用中文别名来匹配schema中的字段
4. 如果无法确定筛选条件，返回空字符串 ""
5. 多个条件用 AND 连接

返回JSON格式：{"where": "WHERE条件", "explanation": "条件解释"}

示例：
查询: 攻击力大于2000的怪兽
返回: {"where": "d.atk > 2000", "explanation": "筛选攻击力大于2000的卡片"}

查询: 暗属性战士族怪兽
返回: {"where": "d.attribute = 32 AND d.race = 1", "explanation": "筛选暗属性且战士族的怪兽"}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Schema:\n${schema}\n\n查询: ${naturalLanguageQuery}` }
    ];

    const response = await this.llm.chat(messages);
    const result = JSON.parse(response);

    return {
      where: result.where?.trim() || '',
      explanation: result.explanation?.trim() || ''
    };
  }

  /**
   * 兼容旧方法
   */
  async generateSQL(naturalLanguageQuery: string, schema: string): Promise<{ sql: string; explanation: string }> {
    const { where, explanation } = await this.generateFilter(naturalLanguageQuery, schema);
    return {
      sql: where,
      explanation
    };
  }
}
