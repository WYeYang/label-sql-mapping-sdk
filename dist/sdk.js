"use strict";
// SDK核心类
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
exports.LSMSDK = void 0;
const dotenv = __importStar(require("dotenv"));
const db_1 = require("./db");
const query_executor_1 = require("./db/query-executor");
const nlp_query_1 = require("./ai/nlp-query");
const extension_merger_1 = require("./ai/extension-merger");
const llm_manager_1 = require("./ai/llm-manager");
const openai_llm_1 = require("./ai/openai-llm");
const app_config_1 = require("./config/app-config");
const sql_helper_1 = require("./db/sql-helper");
dotenv.config();
class LSMSDK {
    constructor(lsmConfigPath, llm) {
        this.inited = false;
        const appConfigManager = app_config_1.AppConfigManager.new(lsmConfigPath);
        const lsmConfig = appConfigManager.getLSMConfig();
        const extensions = appConfigManager.getExtensions();
        this.database = db_1.DatabaseFactory.create(appConfigManager, lsmConfig);
        this.llmManager = new llm_manager_1.LLMManager(llm ?? new openai_llm_1.OpenAILLM(appConfigManager.getLLMConfig()));
        this.nlpQuery = new nlp_query_1.NLPQuery(this.llmManager, lsmConfig);
        const sqlHelper = sql_helper_1.SqlHelper.create(lsmConfig);
        sqlHelper.setExtensions(extensions);
        this.queryExecutor = new query_executor_1.QueryExecutor(this.database, sqlHelper, extensions);
        this.extMerger = new extension_merger_1.ExtensionMerger(extensions);
    }
    static async fromAppConfig(lsmConfigPath, llm) {
        const sdk = new LSMSDK(lsmConfigPath, llm);
        await sdk.database.init();
        sdk.inited = true;
        return sdk;
    }
    /**
     * 自然语言查询
     * @param options.query 自然语言查询
     * @param options.sql 原始SQL（与query二选一）
     * @param options.page 页码，默认1
     * @param options.pageSize 每页数量，默认20
     * @param options.mode 查询模式：list(列表) 或 detail(详情)
     * @param options.extensions 扩展标签值列表（会根据配置找到对应ID后合并）
     */
    async query(options) {
        const { query, sql, page = 1, pageSize = 20, mode = 'list' } = options;
        let explanation;
        let fullSqlStr = sql ?? '';
        // 构建 extensions：外部传入的值 + AI 返回的 extensions
        let aiExtensions = this.extMerger.buildFromValues(options.extensions ?? []);
        if (query) {
            const result = await this.nlpQuery.execute(query);
            explanation = result.explanation;
            fullSqlStr = result.sql;
            aiExtensions = this.extMerger.merge(aiExtensions, result.extensions ?? []);
        }
        else if (sql) {
            fullSqlStr = sql;
        }
        else {
            throw new Error('请提供 query 或 sql 参数');
        }
        if (!fullSqlStr.trim()) {
            throw new Error('SQL不能为空');
        }
        const execResult = this.queryExecutor.execute(fullSqlStr, page, pageSize, mode, aiExtensions);
        return {
            ...execResult,
            sql: fullSqlStr,
            explanation
        };
    }
}
exports.LSMSDK = LSMSDK;
//# sourceMappingURL=sdk.js.map