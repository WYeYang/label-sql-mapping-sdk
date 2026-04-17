"use strict";
// LSM 配置解析器
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
exports.parseConfig = parseConfig;
exports.validateLSMConfig = validateLSMConfig;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
let configCache = null;
let cachedPath = null;
/**
 * 解析LSM配置文件（单例模式）
 */
function parseConfig(configPath) {
    if (configCache && cachedPath === configPath) {
        return configCache;
    }
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const parsedConfig = yaml.parse(configContent);
        validateConfig(parsedConfig);
        const processedConfig = processConfigDefaults(parsedConfig);
        processedConfig.rawContent = configContent;
        configCache = processedConfig;
        cachedPath = configPath;
        return processedConfig;
    }
    catch (error) {
        throw new Error(`解析配置文件失败: ${error.message}`);
    }
}
/**
 * 验证配置结构
 * @param config 配置对象
 */
function validateConfig(config) {
    if (!config) {
        throw new Error('配置文件为空');
    }
    if (!config.version) {
        throw new Error('缺少version字段');
    }
    if (!config.name) {
        throw new Error('缺少name字段');
    }
    if (!config.id) {
        throw new Error('缺少id字段');
    }
    if (!config.database) {
        throw new Error('缺少database字段');
    }
    if (!config.database.type) {
        throw new Error('缺少database.type字段');
    }
    if (!config.database.tables || !Array.isArray(config.database.tables)) {
        throw new Error('缺少database.tables字段或格式不正确');
    }
    if (config.database.tables.length === 0) {
        throw new Error('database.tables数组不能为空');
    }
    if (!config.mappings || !Array.isArray(config.mappings)) {
        throw new Error('缺少mappings字段或格式不正确');
    }
    // 验证每个映射项 - 支持单值模式(value+condition)和完整模式(items)
    config.mappings.forEach((mapping, index) => {
        if (!mapping.id) {
            throw new Error(`第${index + 1}个映射缺少id字段`);
        }
        if (!mapping.name) {
            throw new Error(`第${index + 1}个映射缺少name字段`);
        }
        // 单值模式：只有 value 和/或 condition，没有 items
        const hasValue = 'value' in mapping;
        const hasCondition = 'condition' in mapping;
        const hasItems = mapping.items && Array.isArray(mapping.items);
        // 必须有 items 数组，或者至少有 value/condition（单值模式）
        if (!hasItems && !(hasValue || hasCondition)) {
            throw new Error(`第${index + 1}个映射缺少items字段或格式不正确`);
        }
    });
}
/**
 * 处理配置默认值
 * @param config 配置对象
 * @returns 处理后的配置对象
 */
function processConfigDefaults(config) {
    const processedConfig = { ...config };
    // 处理表配置默认值
    processedConfig.database.tables = processedConfig.database.tables.map((table, index) => {
        const processedTable = { ...table };
        // 为第一个表设置默认别名（主表）
        if (index === 0) {
            processedTable.alias = processedTable.alias || table.name;
        }
        else {
            // 为子表设置默认值
            processedTable.alias = processedTable.alias || table.name;
            processedTable.join = processedTable.join || 'left';
            // 默认join条件：主表别名.id = 当前表别名.id
            if (!processedTable.on && index > 0) {
                const mainTableAlias = processedConfig.database.tables[0].alias || processedConfig.database.tables[0].name;
                processedTable.on = `${mainTableAlias}.id = ${processedTable.alias}.id`;
            }
        }
        return processedTable;
    });
    return processedConfig;
}
/**
 * 验证配置是否符合LSM规范
 * @param config LSM配置对象
 * @returns 是否符合规范
 */
function validateLSMConfig(config) {
    try {
        validateConfig(config);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=parser.js.map