"use strict";
// 自然语言数据库查询工具
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NaturalLanguageQuery = void 0;
const dotenv = __importStar(require("dotenv"));
const sdk_1 = require("./sdk");
const nlp_query_1 = require("./ai/nlp-query");
const llm_manager_1 = require("./ai/llm-manager");
const app_config_1 = require("./config/app-config");
dotenv.config();
class NaturalLanguageQuery {
    constructor(appConfigPath, lsmConfigPath) {
        const appConfigManager = new app_config_1.AppConfigManager(appConfigPath);
        appConfigManager.load();
        const dbPath = appConfigManager.getDatabasePath();
        const llmConfig = appConfigManager.getLLMConfig();
        if (!dbPath) {
            throw new Error('错误: 请在配置文件中配置数据库文件路径');
        }
        const dbConfig = { type: 'sqlite', path: dbPath };
        this.sdk = new sdk_1.LSMSDK(lsmConfigPath, dbConfig);
        const llmManager = new llm_manager_1.LLMManager(llmConfig);
        this.nlpQuery = new nlp_query_1.NLPQuery(this.sdk.getDatabase(), llmManager, lsmConfigPath);
    }
    async query(query) {
        const result = await this.nlpQuery.execute({ query });
        return {
            sql: result.sql,
            data: result.results || [],
            explanation: result.explanation
        };
    }
    async close() {
        await this.sdk.close();
    }
}
exports.NaturalLanguageQuery = NaturalLanguageQuery;
//# sourceMappingURL=natural-language-query.js.map