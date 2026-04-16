"use strict";
// 自然语言查询工具
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
exports.NLPQuery = void 0;
const fs = __importStar(require("fs"));
/**
 * 自然语言查询工具
 */
class NLPQuery {
    /**
     * 构造函数
     * @param database 数据库实例
     * @param llmManager 大模型管理器
     * @param configPath LSM配置文件路径
     */
    constructor(database, llmManager, configPath) {
        this.schema = null;
        this.database = database;
        this.llmManager = llmManager;
        this.configPath = configPath;
    }
    /**
     * 执行自然语言查询
     * @param request 查询请求
     * @returns 查询结果
     */
    async execute(request) {
        try {
            // 获取数据库schema信息
            const schema = await this.getDatabaseSchema();
            // 生成SQL查询
            const result = await this.llmManager.generateSQL(request.query, schema);
            // 执行SQL查询
            const queryResult = await this.database.query(result.sql);
            return {
                sql: result.sql,
                results: queryResult.rows,
                explanation: result.explanation
            };
        }
        catch (error) {
            console.error(`自然语言查询失败: ${error.message}`);
            return {
                sql: '',
                results: [],
                explanation: `查询失败: ${error.message}`
            };
        }
    }
    /**
     * 获取数据库schema信息
     * @returns schema信息
     */
    async getDatabaseSchema() {
        if (this.schema) {
            return this.schema;
        }
        let yamlContent = '';
        if (fs.existsSync(this.configPath)) {
            yamlContent = fs.readFileSync(this.configPath, 'utf8');
        }
        this.schema = yamlContent;
        return this.schema;
    }
}
exports.NLPQuery = NLPQuery;
//# sourceMappingURL=nlp-query.js.map