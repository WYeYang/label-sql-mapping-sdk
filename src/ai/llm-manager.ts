// 大模型管理器

import { LLM } from './types';
import { AppConfigManager } from '../config/app-config';

export interface FilterResult {
  sql: string;       // 完整SQL
  explanation: string;
}

export interface ParseResult extends FilterResult {
  extensions?: ExtensionInfo[];  // 用户需要的扩展标签
}

export interface ExtensionInfo {
  id: string;       // 标签ID
  values: string[]; // AI 识别的展示值列表
}

/**
 * LLM Manager
 */
export class LLMManager {
  private llm: LLM;

  constructor(llm: LLM) {
    this.llm = llm;
  }

  /**
   * 解析自然语言查询意图
   * 返回完整SQL语句
   */
  async parseQuery(naturalLanguageQuery: string, schema: string): Promise<ParseResult> {
    // 获取扩展标签原始内容
    const extRawContent = AppConfigManager.get().getExtensionsRawContent();

    const systemPrompt = `你是一个SQL查询生成器。

## 数据库Schema
${schema}

## 扩展标签配置
${extRawContent}

## 任务
根据用户输入，生成完整的SQL查询语句。

## 输出格式
严格输出JSON，字段说明：
- sql: string — 完整SQL语句，以SELECT开头
- explanation: string — 解释生成的查询
- extensions: Array<{id: string, values: string[]}> — 用户需要的扩展标签，id为标签ID，values为匹配的值（与配置中items的value字段对应）`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `查询: ${naturalLanguageQuery}` }
    ];

    const response = await this.llm.chat(messages);
    const result: ParseResult = JSON.parse(response);
    result.extensions = result.extensions || [];
    return result;
  }
}
