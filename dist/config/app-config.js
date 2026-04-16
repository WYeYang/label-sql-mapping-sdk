"use strict";
// 应用配置管理器
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
exports.AppConfigManager = void 0;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
class AppConfigManager {
    constructor(configPath) {
        this.config = null;
        this.configPath = configPath;
    }
    load() {
        if (fs.existsSync(this.configPath)) {
            const content = fs.readFileSync(this.configPath, 'utf8');
            this.config = yaml.parse(content);
        }
    }
    getDatabasePath() {
        return this.config?.database?.path || null;
    }
    getLLMConfig() {
        const llmConfig = this.config?.llm || {};
        return {
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY || llmConfig.apiKey || '',
            baseUrl: process.env.OPENAI_API_URL || llmConfig.apiUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            model: process.env.OPENAI_MODEL || llmConfig.model || 'qwen3.5-flash',
            temperature: llmConfig.temperature || 0.7,
            maxTokens: llmConfig.maxTokens || 500
        };
    }
}
exports.AppConfigManager = AppConfigManager;
//# sourceMappingURL=app-config.js.map