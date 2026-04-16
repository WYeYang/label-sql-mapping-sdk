// 自然语言查询工具

import { LLMManager } from './llm-manager';
import { LSMConfig } from '../config';

export interface NLResult {
  sql: string;
  explanation: string;
}

/**
 * 自然语言查询工具
 */
export class NLPQuery {
  private llmManager: LLMManager;
  private config: LSMConfig;

  constructor(llmManager: LLMManager, config: LSMConfig) {
    this.llmManager = llmManager;
    this.config = config;
  }

  async execute(query: string): Promise<NLResult> {
    const schema = this.config.rawContent ?? '';
    return this.llmManager.generateSQL(query, schema);
  }
}
