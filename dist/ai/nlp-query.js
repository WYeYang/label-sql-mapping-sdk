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
        return this.llmManager.generateSQL(query, schema);
    }
}
exports.NLPQuery = NLPQuery;
//# sourceMappingURL=nlp-query.js.map