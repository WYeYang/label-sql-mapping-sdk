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

## 重要提示
- extensions配置是独立的标签系统，通过extensions字段返回，不要直接拼接到SQL中
- 有items的mapping：item.condition是完整的WHERE条件片段，直接引用
- 无items的mapping：AI根据condition的参考意义自行推导WHERE条件
- 匹配优先级：先检查extensions/labels是否有对应标签，有则通过extensions返回且SQL中不要用LIKE重复过滤；只有extensions没匹配到时才能用LIKE等方法自行推导SQL条件

## 任务
根据用户输入，生成完整的SQL查询语句。

## 输出格式
直接输出JSON对象，结构如下：
{
  "sql": "完整SQL语句，以SELECT开头",
  "explanation": "解释生成的查询",
  "extensions": [{"id": "extensions配置中的标签ID", "values": ["匹配到的标签值列表，这些值会在SQL外通过位运算等条件过滤"]}]
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
