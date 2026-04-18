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
        this.extensions = new Map();
        this.extensionsLoaded = false;
        this.extensionsSimplified = null;
        this.load();
    }
    /**
     * 创建新实例（会自动查找配置文件）
     */
    static new(lsmConfigPath) {
        const configDir = path.dirname(lsmConfigPath);
        // 查找优先级：config目录 > node_modules
        let foundLsmPath = findConfig(configDir, ['lsm.yaml', 'lsm.yml']);
        if (!foundLsmPath)
            foundLsmPath = findInModules(configDir);
        instance = new AppConfigManager(foundLsmPath || lsmConfigPath, lsmConfigPath);
        return instance;
    }
    /**
     * 获取已有实例
     */
    static get() {
        if (!instance) {
            throw new Error('AppConfigManager 未初始化，请先调用 new()');
        }
        return instance;
    }
    load() {
        if (fs.existsSync(this.appConfigPath)) {
            const content = fs.readFileSync(this.appConfigPath, 'utf8');
            this.appConfig = yaml.parse(content);
        }
        this.lsmConfig = (0, index_1.parseConfig)(this.lsmConfigPath);
    }
    /**
     * 加载扩展标签配置
     */
    loadExtensions() {
        if (this.extensionsLoaded)
            return;
        const extDir = path.join(path.dirname(this.lsmConfigPath), 'extensions');
        if (!fs.existsSync(extDir)) {
            this.extensionsLoaded = true;
            return;
        }
        const files = fs.readdirSync(extDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        for (const file of files) {
            const filePath = path.join(extDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const parsed = yaml.parse(content);
                if (parsed && parsed.id) {
                    const ext = {
                        id: parsed.id,
                        name: parsed.name || parsed.id,
                        description: parsed.description,
                        items: (parsed.items || []).map((item) => ({
                            condition: item.condition,
                            value: item.value
                        }))
                    };
                    this.extensions.set(ext.id, ext);
                }
            }
            catch (err) {
                console.error(`[AppConfigManager] Failed to load extension ${file}:`, err);
            }
        }
        this.extensionsLoaded = true;
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
    /**
     * 获取配置目录
     */
    getConfigDir() {
        return path.dirname(this.lsmConfigPath);
    }
    /**
     * 获取扩展标签的原始 YAML 内容
     */
    getExtensionsRawContent() {
        const extDir = path.join(path.dirname(this.lsmConfigPath), 'extensions');
        if (!fs.existsSync(extDir))
            return '';
        const files = fs.readdirSync(extDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        const contents = [];
        for (const file of files) {
            const filePath = path.join(extDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                contents.push(`### ${file}\n\`\`\`yaml\n${content}\n\`\`\``);
            }
            catch (err) {
                console.error(`[AppConfigManager] Failed to read ${file}:`, err);
            }
        }
        return contents.join('\n\n');
    }
    /**
     * 获取所有扩展标签
     */
    getExtensions() {
        if (!this.extensionsLoaded)
            this.loadExtensions();
        return Array.from(this.extensions.values());
    }
    /**
     * 根据 ID 获取扩展标签
     */
    getExtensionById(id) {
        if (!this.extensionsLoaded)
            this.loadExtensions();
        return this.extensions.get(id);
    }
    /**
     * 根据关键词搜索扩展标签
     */
    searchExtensions(keywords) {
        if (!this.extensionsLoaded)
            this.loadExtensions();
        if (!keywords) {
            return this.getExtensions();
        }
        const lower = keywords.toLowerCase();
        return this.getExtensions().filter(ext => {
            const matchName = ext.name.toLowerCase().includes(lower);
            const matchDesc = ext.description?.toLowerCase().includes(lower);
            const matchId = ext.id.toLowerCase().includes(lower);
            const matchItems = ext.items.some(item => item.value?.toLowerCase().includes(lower));
            return matchName || matchDesc || matchId || matchItems;
        });
    }
    /**
     * 获取简化的扩展标签（只包含 id, name, description, values，不含 condition）
     * 用于传给 AI，仅提取一次并缓存
     */
    getExtensionsSimplified() {
        if (this.extensionsSimplified) {
            return this.extensionsSimplified;
        }
        if (!this.extensionsLoaded)
            this.loadExtensions();
        this.extensionsSimplified = Array.from(this.extensions.values()).map(ext => ({
            id: ext.id,
            name: ext.name,
            description: ext.description,
            values: ext.items.map(item => item.value).filter((v) => !!v)
        }));
        return this.extensionsSimplified;
    }
    /**
     * 获取简化的扩展标签文本格式
     * 用于直接传给 AI
     */
    getExtensionsSimplifiedText() {
        const simplified = this.getExtensionsSimplified();
        return simplified.map(ext => {
            const lines = [
                `id: ${ext.id}`,
                `name: ${ext.name}`,
                ext.description ? `description: ${ext.description}` : '',
                `values: [${ext.values.join(', ')}]`
            ].filter(Boolean);
            return lines.join('\n');
        }).join('\n\n');
    }
}
exports.AppConfigManager = AppConfigManager;
//# sourceMappingURL=app-config.js.map