// 自然语言查询工具

import { LLMManager } from './llm-manager';
import { LSMConfig } from '../config';

export interface NLResult {
  sql: string;         // WHERE条件（兼容旧接口）
  where: string;       // WHERE条件
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
    const result = await this.llmManager.generateFilter(query, schema);
    return {
      sql: result.where,      // 兼容旧接口
      where: result.where,
      explanation: result.explanation
    };
  }
}
