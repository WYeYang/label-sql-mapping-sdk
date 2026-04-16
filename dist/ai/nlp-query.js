"use strict";
// 自然语言查询工具
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLPQuery = void 0;
/**
 * 自然语言查询工具
 */
class NLPQuery {
    constructor(llmManager, config) {
        this.llmManager = llmManager;
        this.config = config;
    }
    async execute(query) {
        const schema = this.config.rawContent ?? '';
        const result = await this.llmManager.generateFilter(query, schema);
        return {
            sql: result.where, // 兼容旧接口
            where: result.where,
            explanation: result.explanation
        };
    }
}
exports.NLPQuery = NLPQuery;
//# sourceMappingURL=nlp-query.js.map