// 应用配置管理器

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { LLMConfig } from '../ai';
import { LSMConfig, parseConfig } from './index';

let instance: AppConfigManager | null = null;

export class AppConfigManager {
  private appConfig: Record<string, any> | null = null;
  private lsmConfig: LSMConfig | null = null;

  private constructor(
    public readonly appConfigPath: string,
    public readonly lsmConfigPath: string
  ) {}

  static getInstance(appConfigPath: string, lsmConfigPath: string): AppConfigManager {
    if (!instance) {
      instance = new AppConfigManager(appConfigPath, lsmConfigPath);
      instance.load();
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

  getDatabasePath(): string {
    const dbPath = this.appConfig?.database?.path;
    if (!dbPath) {
      throw new Error('错误: 请在应用配置文件中配置数据库文件路径');
    }
    if (!path.isAbsolute(dbPath)) {
      const configDir = path.dirname(this.appConfigPath);
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
