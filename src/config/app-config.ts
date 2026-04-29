// 应用配置管理器

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { pinyin } from 'pinyin-pro';
import { LLMConfig } from '../ai';
import { LSMConfig, parseConfig, processConfigDefaults, MappingItem } from './index';

let instance: AppConfigManager | null = null;

/** 从目录链查找 SDK 配置文件 (lsm-sdk-js.yaml) */
function findSDKConfig(startDir: string): string | null {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const sdkPath = path.join(dir, 'lsm-sdk-js.yaml');
    if (fs.existsSync(sdkPath)) return sdkPath;
    const sdkYmlPath = path.join(dir, 'lsm-sdk-js.yml');
    if (fs.existsSync(sdkYmlPath)) return sdkYmlPath;
    dir = path.dirname(dir);
  }
  return null;
}

/** 从目录链查找 lsm-* 包路径
 * @param packageName 可选，指定包名（如 'lsm-xxx'），不指定则返回第一个找到的包
 */
function findLsmPackage(startDir: string, packageName?: string): string | null {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const nodeModules = path.join(dir, 'node_modules');
    if (fs.existsSync(nodeModules)) {
      if (packageName) {
        // 指定包名，直接查找
        const packagePath = path.join(nodeModules, packageName);
        if (fs.existsSync(packagePath)) return packagePath;
      } else {
        // 不指定包名，返回第一个包含 labels.yaml 的 lsm-* 包
        const entries = fs.readdirSync(nodeModules);
        for (const name of entries) {
          if (name.startsWith('lsm-') && fs.existsSync(path.join(nodeModules, name, 'labels.yaml'))) {
            return path.join(nodeModules, name);
          }
        }
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * 扩展标签映射
 */
export interface ExtensionMapping {
  id: string;           // 标签唯一ID
  name: string;          // 标签展示名称
  description?: string; // 标签描述
  items?: MappingItem[]; // 映射项数组（可选）
  condition?: string;   // 前置条件（可选）
  value?: string;       // 字段值（可选）
  range?: {            // 数值范围（可选）
    min?: number;
    max?: number;
  };
}

/**
 * 应用配置管理器
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                          配置加载流程                                │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                      │
 * │  new() 静态方法                                                      │
 * │  ├─ 查找 labels.yaml                                                 │
 * │  │   ├─ 参数指定路径                                                  │
 * │  │   ├─ 参数指定包名 (lsm-xxx)                                        │
 * │  │   └─ 空参数自动查找 node_modules/lsm-*                             │
 * │  │                                                                   │
 * │  └─ 查找 lsm-sdk-js.yaml                                             │
 * │      ├─ 参数指定路径                                                  │
 * │      └─ 从 node_modules 上级向上查找                                   │
 * │                                                                      │
 * │  load() 实例方法                                                     │
 * │  ├─ 解析 labels.yaml → this.labelsConfig                             │
 * │  └─ 读取 extensions/*.yaml → this.extensions Map                     │
 * │                                                                      │
 * │  提供方法:                                                            │
 * │  ├─ getDatabasePath() → 数据库文件路径                               │
 * │  ├─ getLLMConfig() → LLM 配置 (apiKey/apiUrl/model)                  │
 * │  ├─ getLabelsConfig() → 完整配置对象                                 │
 * │  ├─ getExtensions() → ExtensionMapping[]                            │
 * │  ├─ getExtensionById(id) → ExtensionMapping                         │
 * │  ├─ getMainMappingsSimplifiedText() → Stage1 提示词                  │
 * │  └─ searchByKeywords(keywords) → 匹配的 items 文本                   │
 * │                                                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 */

export class AppConfigManager {
  private labelsConfig: LSMConfig | null = null;
  private extensions: Map<string, ExtensionMapping> = new Map();
  private allMappings: ExtensionMapping[] = [];  // 合并后的列表
  private extensionsSimplifiedText: string | null = null;
  private labelsYamlContent: string | null = null;  // 缓存 labels.yaml 内容
  private sdkConfig: any = null;  // 缓存 lsm-sdk-js.yaml 配置

  private constructor(
    public readonly labelsPath: string,
    public readonly sdkConfigPath: string
  ) {
    this.load();
  }

  /**
   * 创建新实例
   * @param configPath labels.yaml: 文件路径、'lsm'（自动查找）或 lsm-* 包名
   * @param sdkConfigPath lsm-sdk-js.yaml: 文件路径，可选（不传则从 labels.yaml 目录向上查找）
   */
  static new(configPath?: string, sdkConfigPath?: string): AppConfigManager {
    let labelsYamlPath: string;
    let packagePath: string | null = null;
    
    if (!configPath) {
      // 空值，自动查找任意 lsm-* 包
      const found = findLsmPackage(process.cwd());
      if (!found) {
        throw new Error('找不到 lsm-* 包，请先安装，如: npm install lsm-xxx');
      }
      packagePath = found;
      labelsYamlPath = path.join(packagePath, 'labels.yaml');
    } else if (/[\/\\]|\.ya?ml$/.test(configPath)) {
      // 文件路径
      labelsYamlPath = path.resolve(configPath);
      if (!fs.existsSync(labelsYamlPath)) {
        throw new Error(`找不到 labels.yaml: ${labelsYamlPath}`);
      }
    } else {
      // 当作包名查找
      const found = findLsmPackage(process.cwd(), configPath);
      if (!found) {
        throw new Error(`找不到 lsm-* 包: ${configPath}`);
      }
      packagePath = found;
      labelsYamlPath = path.join(packagePath, 'labels.yaml');
    }
    
    // 查找 lsm-sdk-js.yaml
    let sdkConfigYamlPath: string | null = null;
    
    if (sdkConfigPath) {
      // 参数指定路径
      sdkConfigYamlPath = fs.existsSync(sdkConfigPath) ? path.resolve(sdkConfigPath) : null;
    } else if (packagePath) {
      // 从 node_modules 上级向上查找
      const searchDir = path.dirname(path.dirname(packagePath));
      sdkConfigYamlPath = findSDKConfig(searchDir);
    } else {
      // 从 labels.yaml 所在目录向上查找
      const searchDir = path.dirname(labelsYamlPath);
      sdkConfigYamlPath = findSDKConfig(searchDir);
    }
    
    console.log(`[AppConfig] labels.yaml: ${labelsYamlPath}`);
    console.log(`[AppConfig] lsm-sdk-js.yaml: ${sdkConfigYamlPath}`);
    
    instance = new AppConfigManager(labelsYamlPath, sdkConfigYamlPath || labelsYamlPath);
    return instance;
  }

  /**
   * 获取已有实例
   */
  static get(): AppConfigManager {
    if (!instance) {
      throw new Error('AppConfigManager 未初始化，请先调用 new()');
    }
    return instance;
  }

  private load(): void {
    // 1. 解析 labels.yaml
    if (fs.existsSync(this.labelsPath)) {
      this.labelsYamlContent = fs.readFileSync(this.labelsPath, 'utf8');
      const parsed = yaml.parse(this.labelsYamlContent);
      this.labelsConfig = processConfigDefaults(parsed);
    }

    // 2. 读取 extensions 目录下的所有扩展配置
    const extDir = path.join(path.dirname(this.labelsPath), 'extensions');
    if (fs.existsSync(extDir)) {
      const files = fs.readdirSync(extDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      for (const file of files) {
        const filePath = path.join(extDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = yaml.parse(content);
          if (parsed && parsed.id && parsed.items && Array.isArray(parsed.items)) {
            this.extensions.set(parsed.id, parsed);
          }
        } catch (err) {
          console.error(`[AppConfigManager] Failed to load extension ${file}:`, err);
        }
      }
    }

    // 3. 合并 labelsConfig.mappings 和 extensions 到 allMappings
    const labelMappings = this.labelsConfig?.mappings || [];
    const extensionMappings = Array.from(this.extensions.values());
    this.allMappings = [...labelMappings, ...extensionMappings] as any[];
  }

  /**
   * 获取 SDK 配置（lsm-sdk-js.yaml）
   */
  getSDKConfig(): any {
    if (this.sdkConfig) {
      return this.sdkConfig;
    }
    if (!fs.existsSync(this.sdkConfigPath)) {
      throw new Error('错误: 找不到 lsm-sdk-js.yaml 配置文件');
    }
    const sdkContent = fs.readFileSync(this.sdkConfigPath, 'utf8');
    this.sdkConfig = yaml.parse(sdkContent);
    return this.sdkConfig;
  }

  getDatabasePath(): string {
    const sdkConfig = this.getSDKConfig();
    let dbPath = sdkConfig?.databasePath;
    if (!dbPath) {
      throw new Error('错误: 请在 lsm-sdk-js.yaml 中配置 databasePath');
    }
    if (!path.isAbsolute(dbPath)) {
      // 从 lsm-sdk-js.yaml 所在目录解析相对路径
      const configDir = path.dirname(this.sdkConfigPath);
      return path.resolve(configDir, dbPath);
    }
    return dbPath;
  }

  getLLMConfig(): LLMConfig {
    // 从 lsm-sdk-js.yaml 中查找 llm 配置
    const sdkConfig = this.getSDKConfig();
    const llmConfig = sdkConfig?.llm;
    
    if (!llmConfig) {
      throw new Error('错误: 请在 lsm-sdk-js.yaml 中配置 LLM');
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

  getLabelsConfig(): LSMConfig {
    if (!this.labelsConfig) {
      throw new Error('标签配置未初始化');
    }
    return this.labelsConfig;
  }

  /**
   * 获取配置目录
   */
  getConfigDir(): string {
    return path.dirname(this.labelsPath);
  }

  /**
   * 获取所有扩展标签
   */
  getExtensions(): ExtensionMapping[] {
    return Array.from(this.extensions.values());
  }

  /**
   * 根据 ID 获取扩展标签
   */
  getExtensionById(id: string): ExtensionMapping | undefined {
    return this.extensions.get(id);
  }

  /**
   * 获取 labels.yaml 完整内容（缓存）
   */
  getMainMappingsSimplifiedText(): string {
    return this.labelsYamlContent || '';
  }

  /**
   * 获取所有 mappings（mappings + extensions）
   */
  getAllMappings(): ExtensionMapping[] {
    return this.allMappings as ExtensionMapping[];
  }

  /**
   * 关键词匹配（子串匹配 + 拼音辅助）
   */
  private keywordSearch(keywords: string): any[][] {
    const matchedMap = new Map<string, any>();  // key: mapping.id
    
    // 1. 预处理：去掉特殊字符，只保留中文、英文、数字
    const cleanKeywords = keywords.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '');
    const kwLower = cleanKeywords.toLowerCase();
    
    // 2. 生成 tokens - 只生成 2-5 字符的子串和英文单词
    const tokens: string[] = [];
    
    // 处理中文：2-5字符子串
    const chineseChars = kwLower.match(/[\u4e00-\u9fa5]+/g) || [];
    for (const chinese of chineseChars) {
      for (let len = Math.min(5, chinese.length); len >= 2; len--) {
        for (let i = 0; i <= chinese.length - len; i++) {
          tokens.push(chinese.substring(i, i + len));
        }
      }
    }
    
    // 处理英文：整个单词，不拆成单个字母
    const englishWords = kwLower.match(/[a-zA-Z]+/g) || [];
    for (const word of englishWords) {
      if (word.length >= 2) {
        tokens.push(word);
      }
    }
    
    // 去重
    const uniqueTokens = Array.from(new Set(tokens));
    
    // 3. 生成搜索关键词的拼音（用于拼音匹配）
    const kwPinyin = kwLower ? this.toPinyin(kwLower) : '';
    
    console.log(`[AppConfig] 搜索 tokens: ${uniqueTokens.slice(0, 15).join(', ')}${uniqueTokens.length > 15 ? '...' : ''} (共 ${uniqueTokens.length} 个)`);
    if (kwPinyin) {
      console.log(`[AppConfig] 搜索拼音: ${kwPinyin.substring(0, 100)}...`);
    }
    
    for (const mapping of this.extensions.values()) {
      if (!mapping.items || mapping.items.length === 0) continue;
      
      const matchedItems: Array<{ item: any; count: number }> = [];
      const valueSet = new Set<string>();
      
      for (const item of mapping.items) {
        const valueLower = item.value.toLowerCase();
        const descLower = item.description?.toLowerCase() || '';
        const searchStr = `${valueLower} ${descLower}`;
        
        // 生成 item 的拼音
        const itemPinyin = this.toPinyin(searchStr);
        
        // 统计匹配次数
        let matchCount = 0;
        
        // 检查 1: 子串匹配（必须有至少一个子串匹配）
        const matchedTokens: string[] = [];
        for (const token of uniqueTokens) {
          if (searchStr.includes(token)) {
            matchedTokens.push(token);
            matchCount++;
          }
        }
        
        // 如果没有子串匹配，直接跳过
        if (matchCount === 0) {
          continue;
        }
        
        // 检查 2: 拼音匹配（作为加分项）
        if (kwPinyin && (itemPinyin.includes(kwPinyin) || kwPinyin.includes(itemPinyin))) {
          matchCount += 1;
        }
        
        if (!valueSet.has(item.value)) {
          matchedItems.push({ item, count: matchCount });
          valueSet.add(item.value);
        }
      }
      
      if (matchedItems.length > 0) {
        // 按匹配次数排序，取 top 5
        const sortedItems = matchedItems
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(x => [x.item.value, x.item.condition] as any);
        
        matchedMap.set(mapping.id, {
          id: mapping.id,
          name: mapping.name,
          items: sortedItems
        });
        
        console.log(`[AppConfig] ${mapping.name}: 匹配到 ${sortedItems.length} 个 items，前5个:`, sortedItems.slice(0, 5).map(([value]) => value));
      }
    }
    
    const result = Array.from(matchedMap.values()).map(({ id, name, items }) => [id, name, items]);
    console.log(`[AppConfig] 总匹配配置数: ${result.length}`);
    
    return result;  // 返回原始数组，不做 JSON.stringify
  }

  /**
   * 格式化搜索结果为纯文本
   */
  public formatSearchResult(result: any[]): string {
    if (!result || result.length === 0) {
      return '';
    }
    
    return result.map(([id, name, items]) => {
      const itemsStr = items.map(([value, condition]: [string, string]) => 
        `${value} | ${condition}`
      ).join('\n  ');
      return `${id} (${name}):\n  ${itemsStr}`;
    }).join('\n');
  }

  /**
   * 文本转拼音 - 只对中文部分转拼音
   */
  private toPinyin(text: string): string {
    if (!text) return '';
    try {
      // 只对中文部分转拼音，英文/数字保留原样
      return text.replace(/[\u4e00-\u9fa5]+/g, (chinesePart) => {
        return pinyin(chinesePart, {
          toneType: 'none',
          type: 'string'
        }).toLowerCase();
      });
    } catch (err) {
      console.error(`[AppConfig] 拼音转换失败:`, err);
      return text;
    }
  }

  /**
   * 用 keywords 搜索 extension mappings（仅关键词匹配）
   * @param keywords 用户输入的关键词（字符串）
   * @returns 纯文本格式的匹配 item 列表
   */
  async searchByKeywords(keywords: string): Promise<string> {
    if (!keywords || !keywords.trim()) return '';
    
    console.log('[AppConfig] 使用关键词匹配');
    const result = await this.keywordSearch(keywords);
    return this.formatSearchResult(result);
  }

  /**
   * 根据 extensions 查找 condition
   */
  findConditions(extensions: { id: string; values: string[] }[]): any[] {
    const result: any[] = [];
    
    for (const ext of extensions) {
      const mapping = this.allMappings.find(m => m.id === ext.id);
      if (!mapping) continue;
      
      const matchedItems = mapping.items?.filter(item => ext.values.includes(item.value));
      if (matchedItems && matchedItems.length > 0) {
        result.push({
          id: mapping.id,
          name: mapping.name,
          items: matchedItems.map(item => ({
            value: item.value,
            condition: item.condition
          }))
        });
      }
    }
    
    return result;
  }
}