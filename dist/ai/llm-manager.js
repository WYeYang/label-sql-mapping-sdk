"use strict";
// 大模型管理器
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMManager = void 0;
const app_config_1 = require("../config/app-config");
/**
 * LLM Manager
 */
class LLMManager {
    constructor(llm) {
        this.llm = llm;
    }
    /**
     * 解析自然语言查询意图
     * 返回完整SQL语句
     */
    async parseQuery(naturalLanguageQuery, schema) {
        // 获取扩展标签原始内容
        const extRawContent = app_config_1.AppConfigManager.get().getExtensionsRawContent();
        const systemPrompt = `你是一个SQL查询生成器。

## 数据库Schema
${schema}

## 扩展标签配置
${extRawContent}

## 任务
根据用户输入，生成完整的SQL查询语句。

## 输出格式
严格输出JSON，字段说明：
- sql: string — 完整SQL语句，以SELECT开头
- explanation: string — 解释生成的查询
- extensions: Array<{id: string, values: string[]}> — 用户需要的扩展标签，id为标签ID，values为匹配的值（与配置中items的value字段对应）`;
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `查询: ${naturalLanguageQuery}` }
        ];
        const response = await this.llm.chat(messages);
        const result = JSON.parse(response);
        result.extensions = result.extensions || [];
        return result;
    }
}
exports.LLMManager = LLMManager;
//# sourceMappingURL=llm-manager.js.map