"use strict";
// 大模型管理器
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMManager = void 0;
const openai_1 = require("openai");
/**
 * 大模型管理器
 */
class LLMManager {
    /**
     * 构造函数
     * @param config 大模型配置
     */
    constructor(config) {
        this.config = config;
        this.openai = new openai_1.OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl
        });
    }
    /**
     * 获取大模型配置
     * @returns 大模型配置
     */
    getConfig() {
        return this.config;
    }
    /**
     * 更新大模型配置
     * @param config 新的配置
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.openai = new openai_1.OpenAI({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseUrl
        });
    }
    /**
     * 生成SQL查询
     * @param naturalLanguageQuery 自然语言查询
     * @param schema 数据库 schema 信息
     * @returns 生成的SQL查询
     */
    async generateSQL(naturalLanguageQuery, schema) {
        console.log(`生成SQL查询: ${naturalLanguageQuery}`);
        console.log(`数据库schema: ${schema}`);
        // 检查配置
        if (!this.config.apiKey || !this.config.baseUrl) {
            throw new Error('大模型配置不完整，缺少API Key或API URL');
        }
        try {
            // 使用OpenAI SDK调用LLM API
            const response = await this.openai.chat.completions.create({
                model: this.config.model || 'qwen3.5-flash',
                messages: [
                    {
                        role: 'system',
                        content: `你是一个SQL生成器，根据用户的自然语言查询和数据库schema生成正确的SQL查询。

请生成符合SQLite语法的查询语句，并返回JSON格式，包含以下字段：
- sql: 生成的SQL查询语句
- explanation: 对SQL查询的解释，说明为什么这样写

示例输出：
{
  "sql": "SELECT * FROM table1 t1 LEFT JOIN table2 t2 ON t1.id = t2.id WHERE t1.name LIKE '%keyword%'",
  "explanation": "根据用户查询，需要在table1表中查找name字段包含关键词的记录，同时通过LEFT JOIN连接table2表获取完整信息。"
}`
                    },
                    {
                        role: 'user',
                        content: `根据以下schema信息，生成查询"${naturalLanguageQuery}"的SQL语句：

${schema}`
                    }
                ],
                temperature: this.config.temperature || 0.7,
                max_tokens: this.config.maxTokens || 500,
                response_format: { type: "json_object" }
            });
            if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
                const content = response.choices[0].message.content.trim();
                const result = JSON.parse(content);
                if (result.sql && result.explanation) {
                    return {
                        sql: result.sql.replace(/;$/, ''),
                        explanation: result.explanation
                    };
                }
                else {
                    throw new Error('LLM返回的JSON格式不正确，缺少必要字段');
                }
            }
            throw new Error('LLM返回格式错误，无法获取SQL查询');
        }
        catch (error) {
            throw new Error(`调用LLM API失败: ${error.message}`);
        }
    }
}
exports.LLMManager = LLMManager;
//# sourceMappingURL=llm-manager.js.map