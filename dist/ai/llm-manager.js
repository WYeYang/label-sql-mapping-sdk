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
    async generateSQL(naturalLanguageQuery, schema) {
        const systemPrompt = `你是一个SQL生成器，根据用户的自然语言查询和数据库schema生成SQLite查询语句。返回JSON格式：{"sql": "SQL查询语句", "explanation": "SQL解释"}`;
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Schema:\n${schema}\n\n查询: ${naturalLanguageQuery}` }
        ];
        const response = await this.llm.chat(messages);
        const result = JSON.parse(response);
        return {
            sql: result.sql.trim(),
            explanation: result.explanation.trim()
        };
    }
}
exports.LLMManager = LLMManager;
//# sourceMappingURL=llm-manager.js.map