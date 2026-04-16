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
const nlp_query_1 = require("./ai/nlp-query");
const llm_manager_1 = require("./ai/llm-manager");
const openai_llm_1 = require("./ai/openai-llm");
const app_config_1 = require("./config/app-config");
dotenv.config();
class LSMSDK {
    constructor(appConfigPath, lsmConfigPath, llm) {
        this.inited = false;
        const appConfigManager = app_config_1.AppConfigManager.getInstance(appConfigPath, lsmConfigPath);
        this.lsmConfig = appConfigManager.getLSMConfig();
        this.database = db_1.DatabaseFactory.create(appConfigManager, this.lsmConfig);
        this.llmManager = new llm_manager_1.LLMManager(llm ?? new openai_llm_1.OpenAILLM(appConfigManager.getLLMConfig()));
        this.nlpQuery = new nlp_query_1.NLPQuery(this.llmManager, this.lsmConfig);
    }
    static async fromAppConfig(appConfigPath, lsmConfigPath, llm) {
        const sdk = new LSMSDK(appConfigPath, lsmConfigPath, llm);
        await sdk.database.init();
        sdk.inited = true;
        return sdk;
    }
    async query(options) {
        const { query, sql, page = 1, pageSize = 20 } = options;
        let finalSql;
        let explanation;
        if (query) {
            const result = await this.nlpQuery.execute(query);
            finalSql = result.sql;
            explanation = result.explanation;
        }
        else if (sql) {
            finalSql = sql;
        }
        else {
            throw new Error('请提供 query 或 sql 参数');
        }
        const countSql = `SELECT COUNT(*) as total FROM (${finalSql}) as count_query`;
        const countResult = this.database.query(countSql);
        const total = countResult.rows[0]?.total || 0;
        const offset = (page - 1) * pageSize;
        const hasLimit = /\bLIMIT\b/i.test(finalSql);
        const paginatedSql = hasLimit ? finalSql : `${finalSql} LIMIT ${pageSize} OFFSET ${offset}`;
        const queryResult = this.database.query(paginatedSql);
        return {
            sql: paginatedSql,
            data: queryResult.rows,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            explanation
        };
    }
}
exports.LSMSDK = LSMSDK;
//# sourceMappingURL=sdk.js.map