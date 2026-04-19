// 自然语言查询工具

import { LLMManager, ParseResult } from './llm-manager';
import { LSMConfig } from '../config';

export { ParseResult };

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

  async execute(query: string): Promise<ParseResult> {
    const result = await this.llmManager.parseQuery(query);
    console.log('[NLPQuery] Generated SQL:', result.sql);
    return result;
  }
}
