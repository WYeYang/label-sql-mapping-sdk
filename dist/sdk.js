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
const sql_builder_1 = require("./db/sql-builder");
dotenv.config();
class LSMSDK {
    constructor(appConfigPath, lsmConfigPath, llm) {
        this.inited = false;
        const appConfigManager = app_config_1.AppConfigManager.getInstance(appConfigPath, lsmConfigPath);
        this.lsmConfig = appConfigManager.getLSMConfig();
        this.database = db_1.DatabaseFactory.create(appConfigManager, this.lsmConfig);
        this.llmManager = new llm_manager_1.LLMManager(llm ?? new openai_llm_1.OpenAILLM(appConfigManager.getLLMConfig()));
        this.nlpQuery = new nlp_query_1.NLPQuery(this.llmManager, this.lsmConfig);
        this.sqlBuilder = new sql_builder_1.SQLBuilder(this.lsmConfig);
    }
    static async fromAppConfig(appConfigPath, lsmConfigPath, llm) {
        const sdk = new LSMSDK(appConfigPath, lsmConfigPath, llm);
        await sdk.database.init();
        sdk.inited = true;
        return sdk;
    }
    /**
     * 自然语言查询
     * AI只生成WHERE条件，SELECT由程序拼接
     */
    async query(options) {
        const { query, where, sql, page = 1, pageSize = 20 } = options;
        let finalWhere;
        let explanation;
        if (query) {
            // 自然语言查询：AI生成WHERE条件
            const result = await this.nlpQuery.execute(query);
            finalWhere = result.sql; // 旧接口返回的是where
            explanation = result.explanation;
        }
        else if (where) {
            // 直接传入WHERE条件
            finalWhere = where;
        }
        else if (sql) {
            // 完整SQL（兼容旧接口）
            // 尝试提取WHERE子句
            const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/i);
            finalWhere = whereMatch ? whereMatch[1] : '';
        }
        else {
            throw new Error('请提供 query、where 或 sql 参数');
        }
        // 构建完整SQL
        const offset = (page - 1) * pageSize;
        const fullSql = this.sqlBuilder.build(finalWhere, { limit: pageSize, offset });
        // 计数
        const countSql = this.sqlBuilder.buildCount(finalWhere);
        const countResult = this.database.query(countSql);
        const total = countResult.rows[0]?.total || 0;
        // 执行查询
        const queryResult = this.database.query(fullSql);
        return {
            sql: fullSql,
            data: queryResult.rows,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            explanation
        };
    }
    /**
     * 仅生成WHERE条件（不执行查询）
     */
    async generateFilter(query) {
        const result = await this.llmManager.generateFilter(query, this.lsmConfig.rawContent ?? '');
        return {
            where: result.where,
            explanation: result.explanation
        };
    }
    /**
     * 执行自定义WHERE条件查询
     */
    queryByWhere(where, options) {
        return this.query({ where, ...options });
    }
}
exports.LSMSDK = LSMSDK;
//# sourceMappingURL=sdk.js.map