// 应用配置管理器

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
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
  items: MappingItem[];  // 映射项数组
}

export class AppConfigManager {
  private labelsConfig: LSMConfig | null = null;
  private extensions: Map<string, ExtensionMapping> = new Map();
  private extensionsLoaded = false;
  private extensionsSimplifiedText: string | null = null;

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
    // 解析 labels.yaml
    if (fs.existsSync(this.labelsPath)) {
      const content = fs.readFileSync(this.labelsPath, 'utf8');
      const parsed = yaml.parse(content);
      this.labelsConfig = processConfigDefaults(parsed);
      if (this.labelsConfig) {
        this.labelsConfig.rawContent = content;
      }
    }
  }

  /**
   * 加载扩展标签配置
   * 格式：items: [{condition, value}]
   */
  private loadExtensions(): void {
    if (this.extensionsLoaded) return;

    // 扩展配置从 labels.yaml 同级目录加载
    const extDir = path.join(path.dirname(this.labelsPath), 'extensions');
    
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
        if (parsed && parsed.id && parsed.items && Array.isArray(parsed.items)) {
          const ext: ExtensionMapping = {
            id: parsed.id,
            name: parsed.name || parsed.id,
            description: parsed.description,
            items: parsed.items.map((item: any) => ({
              condition: item.condition,
              value: item.value,
              description: item.description
            }))
          };
          this.extensions.set(ext.id, ext);
        }
      } catch (err) {
        console.error(`[AppConfigManager] Failed to load extension ${file}:`, err);
      }
    }

    this.extensionsLoaded = true;
  }

  getDatabasePath(): string {
    if (!this.labelsConfig) {
      throw new Error('标签配置未初始化');
    }
    let dbPath = this.labelsConfig.database?.path;
    if (!dbPath) {
      throw new Error('错误: 请在 labels.yaml 中配置数据库文件路径');
    }
    if (!path.isAbsolute(dbPath)) {
      // 从 labels.yaml 所在目录解析相对路径
      const configDir = path.dirname(this.labelsPath);
      return path.resolve(configDir, dbPath);
    }
    return dbPath;
  }

  getLLMConfig(): LLMConfig {
    // 从 lsm-sdk-js.yaml 中查找 llm 配置
    if (!fs.existsSync(this.sdkConfigPath)) {
      throw new Error('错误: 找不到 lsm-sdk-js.yaml 配置文件');
    }
    
    const sdkContent = fs.readFileSync(this.sdkConfigPath, 'utf8');
    const sdkParsed = yaml.parse(sdkContent);
    const llmConfig = sdkParsed?.llm;
    
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
   * 获取扩展标签详情（用于工具调用）
   * 返回description让LLM自行理解推导SQL
   */
  getExtensionDetail(extensionId: string, value: string): string | null {
    if (!this.extensionsLoaded) this.loadExtensions();
    const ext = this.extensions.get(extensionId);
    if (!ext) return null;

    const item = ext.items.find(i => i.value === value);
    if (!item) return null;

    // 返回描述信息，让LLM根据描述自行理解并推导SQL
    // 优先使用item.description，不存在时fallback到ext.description
    return JSON.stringify({
      extensionId: ext.id,
      extensionName: ext.name,
      value: item.value,
      description: item.description || ext.description,
    });
  }

  /**
   * 获取扩展标签的工具定义
   */
  getExtensionTools(): { name: string; description: string; params: { name: string; description: string; type: 'string' | 'number' | 'boolean'; required: boolean }[] }[] {
    if (!this.extensionsLoaded) this.loadExtensions();

    // 获取所有extensionId用于工具参数描述
    const allExtensionIds = Array.from(this.extensions.keys()).join(', ');

    return [{
      name: 'get_extension_detail',
      description: '获取标签详情，包括SQL示例和使用说明。当需要更详细地了解某个标签的含义和使用方式时调用此工具。',
      params: [
        {
          name: 'extensionId',
          description: `标签ID，可选值：${allExtensionIds}`,
          type: 'string' as const,
          required: true
        },
        {
          name: 'value',
          description: '要查询的标签值',
          type: 'string' as const,
          required: true
        }
      ]
    }];
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
