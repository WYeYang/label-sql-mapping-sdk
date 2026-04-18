// 应用配置管理器

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { LLMConfig } from '../ai';
import { LSMConfig, parseConfig, MappingItem } from './index';

let instance: AppConfigManager | null = null;

/** 自动查找配置文件 */
function findConfig(dir: string, names: string[]): string | null {
  for (const name of names) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** 从目录链查找 lsm 配置文件 */
function findLsmConfig(startDir: string): string | null {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const lsmPath = path.join(dir, 'lsm.yaml');
    if (fs.existsSync(lsmPath)) return lsmPath;
    const lsmYmlPath = path.join(dir, 'lsm.yml');
    if (fs.existsSync(lsmYmlPath)) return lsmYmlPath;
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
        // 不指定包名，返回第一个找到的包
        const entries = fs.readdirSync(nodeModules);
        for (const name of entries) {
          if (name.startsWith('lsm-')) {
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
  items: MappingItem[];  // 映射项数组
}

export class AppConfigManager {
  private appConfig: Record<string, any> | null = null;
  private lsmConfig: LSMConfig | null = null;
  private extensions: Map<string, ExtensionMapping> = new Map();
  private extensionsLoaded = false;
  private extensionsSimplifiedText: string | null = null;

  private constructor(
    public readonly appConfigPath: string,
    public readonly lsmConfigPath: string
  ) {
    this.load();
  }

  /**
   * 创建新实例
   * @param configPath main.yaml: 'lsm'（自动查找）或 lsm-* 包名
   * @param lsmPath lsm.yaml: 可选，文件路径，不传则自动向上查找
   */
  static new(configPath: string, lsmPath?: string): AppConfigManager {
    let packagePath: string;
    
    // 'lsm' 表示自动查找任意 lsm-* 包
    if (configPath === 'lsm') {
      const found = findLsmPackage(process.cwd());
      if (!found) {
        throw new Error('找不到 lsm-* 包，请先安装，如: npm install lsm-xxx');
      }
      packagePath = found;
    } else {
      // 当作包名查找
      const found = findLsmPackage(process.cwd(), configPath);
      if (!found) {
        throw new Error(`找不到 lsm-* 包: ${configPath}`);
      }
      packagePath = found;
    }
    
    const mainYamlPath = path.join(packagePath, 'main.yaml');
    
    // 查找 lsm.yaml（只支持路径）
    let appConfigPath: string | null = null;
    
    if (lsmPath) {
      // 参数指定路径
      appConfigPath = fs.existsSync(lsmPath) ? lsmPath : null;
    }
    
    if (!appConfigPath) {
      // 自动向上查找
      const searchDir = path.dirname(path.dirname(packagePath)); // node_modules 的父目录
      appConfigPath = findLsmConfig(searchDir);
    }
    
    if (!appConfigPath) {
      // 在当前包的目录查找
      const pkgLsmPath = path.join(packagePath, 'lsm.yaml');
      if (fs.existsSync(pkgLsmPath)) {
        appConfigPath = pkgLsmPath;
      }
    }
    
    // 如果没找到 lsm.yaml，使用 main.yaml
    if (!appConfigPath || !fs.existsSync(appConfigPath)) {
      appConfigPath = mainYamlPath;
    }
    
    instance = new AppConfigManager(appConfigPath, mainYamlPath);
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
    if (fs.existsSync(this.appConfigPath)) {
      const content = fs.readFileSync(this.appConfigPath, 'utf8');
      this.appConfig = yaml.parse(content);
    }
    this.lsmConfig = parseConfig(this.lsmConfigPath);
  }

  /**
   * 加载扩展标签配置
   * 支持两种格式：
   * 1. 有 items 的格式：items: [{condition, value}]
   * 2. 只有 values 的格式：values: ["value1", "value2"]
   */
  private loadExtensions(): void {
    if (this.extensionsLoaded) return;

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
          const ext: ExtensionMapping = {
            id: parsed.id,
            name: parsed.name || parsed.id,
            description: parsed.description,
            items: []
          };

          // 兼容两种格式
          if (parsed.items && Array.isArray(parsed.items)) {
            // 格式1: items: [{condition, value}]
            ext.items = parsed.items.map((item: any) => ({
              condition: item.condition,
              value: item.value
            }));
          } else if (parsed.values && Array.isArray(parsed.values)) {
            // 格式2: values: ["value1", "value2"]
            ext.items = parsed.values.map((v: string) => ({
              value: v
            }));
          }

          this.extensions.set(ext.id, ext);
        }
      } catch (err) {
        console.error(`[AppConfigManager] Failed to load extension ${file}:`, err);
      }
    }

    this.extensionsLoaded = true;
  }

  getDatabasePath(): string {
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

  getLLMConfig(): LLMConfig {
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

  getLSMConfig(): LSMConfig {
    if (!this.lsmConfig) {
      throw new Error('LSM 配置未初始化');
    }
    return this.lsmConfig;
  }

  /**
   * 获取配置目录
   */
  getConfigDir(): string {
    return path.dirname(this.lsmConfigPath);
  }

  /**
   * 获取所有扩展标签
   */
  getExtensions(): ExtensionMapping[] {
    if (!this.extensionsLoaded) this.loadExtensions();
    return Array.from(this.extensions.values());
  }

  /**
   * 根据 ID 获取扩展标签
   */
  getExtensionById(id: string): ExtensionMapping | undefined {
    if (!this.extensionsLoaded) this.loadExtensions();
    return this.extensions.get(id);
  }

  /**
   * 获取简化的扩展标签文本格式
   * 用于直接传给 AI，缓存结果
   */
  getExtensionsSimplifiedText(): string {
    if (this.extensionsSimplifiedText) {
      return this.extensionsSimplifiedText;
    }

    if (!this.extensionsLoaded) this.loadExtensions();

    const simplified = Array.from(this.extensions.values()).map(ext => ({
      id: ext.id,
      name: ext.name,
      description: ext.description,
      values: ext.items.map(item => item.value).filter((v): v is string => !!v)
    }));

    this.extensionsSimplifiedText = simplified.map(ext => {
      const lines = [
        `id: ${ext.id}`,
        `name: ${ext.name}`,
        ext.description ? `description: ${ext.description}` : '',
        `values: [${ext.values.join(', ')}]`
      ].filter(Boolean);
      return lines.join('\n');
    }).join('\n\n');

    return this.extensionsSimplifiedText;
  }
}
