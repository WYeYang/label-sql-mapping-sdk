"use strict";
// 游戏王卡片查询工具
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
exports.YGOProQuery = void 0;
const dotenv = __importStar(require("dotenv"));
const index_1 = require("./index");
dotenv.config();
class YGOProQuery {
    /**
     * 构造函数
     * @param appConfigPath 应用配置文件路径
     * @param lsmConfigPath LSM配置文件路径
     */
    constructor(appConfigPath, lsmConfigPath) {
        const appConfigManager = new index_1.AppConfigManager(appConfigPath);
        appConfigManager.load();
        const dbPath = appConfigManager.getDatabasePath();
        const llmConfig = appConfigManager.getLLMConfig();
        if (!dbPath) {
            throw new Error('错误: 请在 config.json 中配置数据库文件路径');
        }
        const dbConfig = { type: 'sqlite', path: dbPath };
        this.sdk = new index_1.LSMSDK(lsmConfigPath, dbConfig);
        const llmManager = new index_1.LLMManager(llmConfig);
        this.nlpQuery = new index_1.NLPQuery(this.sdk.getDatabase(), llmManager, lsmConfigPath);
    }
    /**
     * 执行自然语言查询
     * @param query 自然语言查询
     * @returns 查询结果
     */
    async query(query) {
        const result = await this.nlpQuery.execute({ query });
        return {
            sql: result.sql,
            cards: result.results || [],
            explanation: result.explanation
        };
    }
    /**
     * 关闭SDK
     */
    async close() {
        await this.sdk.close();
    }
}
exports.YGOProQuery = YGOProQuery;
//# sourceMappingURL=ygopro-query.js.map