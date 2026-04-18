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
    // 获取扩展标签简化配置
    const extSimplifiedText = AppConfigManager.get().getExtensionsSimplifiedText();

    console.log('[LLMManager] labels length:', schema.length, '| preview:', schema.substring(0, 200));

    const systemPrompt = `你是一个SQL查询生成器。

## labels 标签映射配置
${schema}

## extensions 扩展标签配置
${extSimplifiedText}

## 处理规则
1. extensions的item.condition会自动拼接为WHERE条件，返回匹配的标签ID和值即可，SQL中不要重复写
2. labels有items时，item.condition直接拼接到SQL；无items时根据condition含义自行推导
3. 优先使用extensions/labels匹配，匹配不到时再用LIKE自行推导

## 输出格式（JSON）
{
  "sql": "完整SQL语句（SELECT开头，不含extensions条件）",
  "explanation": "查询说明",
  "extensions": [{"id": "标签ID", "values": ["匹配的值"]}]
}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `查询: ${naturalLanguageQuery}` }
    ];

    const response = await this.llm.chat(messages);
    console.log('[LLM Raw Response]:', response);
    const result: ParseResult = JSON.parse(response);
    result.extensions = result.extensions || [];
    return result;
  }
}
