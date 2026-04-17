// 应用配置管理器

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { LLMConfig } from '../ai';
import { LSMConfig, parseConfig } from './index';

let instance: AppConfigManager | null = null;

/** 自动查找配置文件 */
function findConfig(dir: string, names: string[]): string | null {
  for (const name of names) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** 从 node_modules 查找 lsm 配置文件 */
function findInModules(startDir: string): string | null {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const nodeModules = path.join(dir, 'node_modules');
    if (fs.existsSync(nodeModules)) {
      // 查找 lsm-* 前缀的包
      const entries = fs.readdirSync(nodeModules, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('lsm-')) {
          const config = findConfig(path.join(nodeModules, entry.name), ['lsm.yaml', 'lsm.yml']);
          if (config) return config;
        }
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

export class AppConfigManager {
  private appConfig: Record<string, any> | null = null;
  private lsmConfig: LSMConfig | null = null;

  private constructor(
    public readonly appConfigPath: string,
    public readonly lsmConfigPath: string
  ) {}

  static getInstance(appConfigPath: string, lsmConfigPath: string): AppConfigManager {
    if (instance) return instance;
    
    const configDir = path.dirname(lsmConfigPath);
    // 查找优先级：命令行传入 > config目录 > node_modules
    let foundLsmPath = appConfigPath !== lsmConfigPath ? appConfigPath : null;
    if (!foundLsmPath) foundLsmPath = findConfig(configDir, ['lsm.yaml', 'lsm.yml']);
    if (!foundLsmPath) foundLsmPath = findInModules(configDir);
    
    instance = new AppConfigManager(foundLsmPath || appConfigPath, lsmConfigPath);
    instance.load();
    return instance;
  }

  private load(): void {
    if (fs.existsSync(this.appConfigPath)) {
      const content = fs.readFileSync(this.appConfigPath, 'utf8');
      this.appConfig = yaml.parse(content);
    }
    this.lsmConfig = parseConfig(this.lsmConfigPath);
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
}
