"use strict";
// 大模型管理器
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMManager = void 0;
/**
 * LLM Manager
 */
class LLMManager {
    constructor(llm) {
        this.llm = llm;
    }
    /**
     * 生成筛选条件（WHERE子句）
     * 只生成 WHERE 部分，SELECT 由程序拼接
     */
    async generateFilter(naturalLanguageQuery, schema) {
        const systemPrompt = `根据用户输入生成SQLite条件片段。

输出JSON格式，包含以下字段：
- where: 筛选条件表达式，不含WHERE关键字
- orderBy: 排序表达式如atk DESC，无排序需求时为undefined
- limit: 数量，无数量限制时为undefined
- explanation: 用户意图解释

根据语义自行判断是否需要排序和数量限制。

请以JSON格式输出：`;
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Schema:\n${schema}\n\n查询: ${naturalLanguageQuery}` }
        ];
        const response = await this.llm.chat(messages);
        const result = JSON.parse(response);
        return {
            where: result.where?.trim() || '',
            orderBy: result.orderBy?.trim() || undefined,
            limit: result.limit,
            explanation: result.explanation?.trim() || ''
        };
    }
    /**
     * 兼容旧方法
     */
    async generateSQL(naturalLanguageQuery, schema) {
        const { where, explanation } = await this.generateFilter(naturalLanguageQuery, schema);
        return {
            sql: where,
            explanation
        };
    }
}
exports.LLMManager = LLMManager;
//# sourceMappingURL=llm-manager.js.map