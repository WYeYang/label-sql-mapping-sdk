// 应用配置管理器

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { LLMConfig } from '../ai';

export interface AppConfig {
  database: {
    path: string;
  };
  llm: {
    apiKey?: string;
    apiUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export class AppConfigManager {
  private config: AppConfig | null = null;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  load() {
    if (fs.existsSync(this.configPath)) {
      const content = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.parse(content);
    }
  }

  getDatabasePath(): string | null {
    return this.config?.database?.path || null;
  }

  getLLMConfig(): LLMConfig {
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
