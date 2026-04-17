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
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
const index_1 = require("./index");
let instance = null;
/** 自动查找配置文件 */
function findConfig(dir, names) {
    for (const name of names) {
        const p = path.join(dir, name);
        if (fs.existsSync(p))
            return p;
    }
    return null;
}
/** 从 node_modules 查找 lsm 配置文件 */
function findInModules(startDir) {
    let dir = startDir;
    while (dir !== path.dirname(dir)) {
        const nodeModules = path.join(dir, 'node_modules');
        if (fs.existsSync(nodeModules)) {
            // 查找 lsm-* 前缀的包
            const entries = fs.readdirSync(nodeModules, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('lsm-')) {
                    const config = findConfig(path.join(nodeModules, entry.name), ['lsm.yaml', 'lsm.yml']);
                    if (config)
                        return config;
                }
            }
        }
        dir = path.dirname(dir);
    }
    return null;
}
class AppConfigManager {
    constructor(appConfigPath, lsmConfigPath) {
        this.appConfigPath = appConfigPath;
        this.lsmConfigPath = lsmConfigPath;
        this.appConfig = null;
        this.lsmConfig = null;
    }
    static getInstance(appConfigPath, lsmConfigPath) {
        if (instance)
            return instance;
        const configDir = path.dirname(lsmConfigPath);
        // 查找优先级：命令行传入 > config目录 > node_modules
        let foundLsmPath = appConfigPath !== lsmConfigPath ? appConfigPath : null;
        if (!foundLsmPath)
            foundLsmPath = findConfig(configDir, ['lsm.yaml', 'lsm.yml']);
        if (!foundLsmPath)
            foundLsmPath = findInModules(configDir);
        instance = new AppConfigManager(foundLsmPath || appConfigPath, lsmConfigPath);
        instance.load();
        return instance;
    }
    load() {
        if (fs.existsSync(this.appConfigPath)) {
            const content = fs.readFileSync(this.appConfigPath, 'utf8');
            this.appConfig = yaml.parse(content);
        }
        this.lsmConfig = (0, index_1.parseConfig)(this.lsmConfigPath);
    }
    getDatabasePath() {
        // 优先从 LSM config 读取
        let dbPath = this.lsmConfig?.database?.path;
        // 其次从 app config 读取
        if (!dbPath) {
            dbPath = this.appConfig?.database?.path;
        }
        if (!dbPath) {
            throw new Error('错误: 请在配置文件中配置数据库文件路径');
        }
        if (!path.isAbsolute(dbPath)) {
            const configDir = path.dirname(this.lsmConfigPath);
            return path.resolve(configDir, dbPath);
        }
        return dbPath;
    }
    getLLMConfig() {
        const llmConfig = this.appConfig?.llm;
        if (!llmConfig) {
            throw new Error('错误: 请在配置文件中配置 LLM');
        }
        const apiKey = process.env.OPENAI_API_KEY || llmConfig.apiKey;
        const baseUrl = process.env.OPENAI_API_URL || llmConfig.apiUrl;
        const model = process.env.OPENAI_MODEL || llmConfig.model;
        if (!apiKey) {
            throw new Error('错误: 请配置 LLM apiKey');
        }
        if (!baseUrl) {
            throw new Error('错误: 请配置 LLM apiUrl');
        }
        if (!model) {
            throw new Error('错误: 请配置 LLM model');
        }
        return {
            apiKey,
            baseUrl,
            model,
            temperature: llmConfig.temperature,
            maxTokens: llmConfig.maxTokens
        };
    }
    getLSMConfig() {
        if (!this.lsmConfig) {
            throw new Error('LSM 配置未初始化');
        }
        return this.lsmConfig;
    }
}
exports.AppConfigManager = AppConfigManager;
//# sourceMappingURL=app-config.js.map