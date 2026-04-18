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
        // 获取扩展标签简化配置
        const extSimplifiedText = app_config_1.AppConfigManager.get().getExtensionsSimplifiedText();
        const systemPrompt = `你是一个SQL查询生成器。

## 数据库Schema
${schema}

## 扩展标签配置
${extSimplifiedText}

## 任务
根据用户输入，生成完整的SQL查询语句。

## 输出格式
直接输出JSON对象，结构如下：
{
  "sql": "完整SQL语句，以SELECT开头",
  "explanation": "解释生成的查询",
  "extensions": [{"id": "扩展标签的ID（来自扩展标签配置）", "values": ["用户需要的标签值，用于额外的标签查询，不是SQL的组成部分"]}]
}`;
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