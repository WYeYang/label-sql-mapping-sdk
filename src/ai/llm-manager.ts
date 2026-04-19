// 大模型管理器

import { LLM, Message } from './types';
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
  details?: string; // 详细信息（从工具调用获取）
}

type MessageWithTool = Message & { role: 'system' | 'user' | 'assistant' | 'tool' };

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
    const extensionTools = AppConfigManager.get().getExtensionTools();

    console.log('[LLMManager] labels length:', schema.length, '| preview:', schema.substring(0, 200));
    console.log('[LLMManager] extension tools:', extensionTools.length);

    const systemPrompt = `你是一个SQL查询生成器。

## labels 标签映射配置
${schema}

## extensions 扩展标签配置（简版）
${extSimplifiedText}

## 处理规则
1. extensions的item.condition会自动拼接为WHERE条件
2. labels有items时，item.condition直接拼接到SQL；无items时根据condition含义自行推导
3. 优先使用extensions/labels匹配，匹配不到时再用LIKE自行推导

## 重要：工具调用
遇到extensions标签时，**必须**先调用对应工具获取详细信息，根据详细信息中的description理解标签含义，再生成SQL。
工具调用示例：
- 用户说"卡组检索白龙" → 先调用 get_effect_type_detail(value="卡组检索") 获取详细说明

## 输出格式（JSON）
{
  "sql": "完整SQL语句（SELECT开头，不含extensions条件）",
  "explanation": "查询说明",
  "extensions": [{"id": "标签ID", "values": ["匹配的值"]}]
}`;

    const messages: MessageWithTool[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `查询: ${naturalLanguageQuery}` }
    ];

    // 第一轮：LLM决定是否调用工具
    console.log('[LLMManager] calling chatWithTools with', extensionTools.length, 'tools');
    const { content, toolCalls } = await this.llm.chatWithTools(messages, extensionTools);
    console.log('[LLMManager] first response:', content, '| toolCalls:', JSON.stringify(toolCalls));

    // 处理工具调用
    let finalContent = content;
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const extId = toolCall.name.replace('get_', '').replace('_detail', '');
        const value = toolCall.arguments.value as string;

        console.log('[LLMManager] calling tool:', toolCall.name, 'value:', value);

        // 获取extension详情
        const detail = AppConfigManager.get().getExtensionDetail(extId, value);
        console.log('[LLMManager] extension detail:', detail);

        if (detail) {
          // 将工具结果作为消息追加
          messages.push({
            role: 'assistant',
            content: `调用工具: ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`
          });
          messages.push({
            role: 'tool',
            content: detail
          });
        }
      }

      // 第二轮：根据工具返回结果生成SQL
      const secondResponse = await this.llm.chat(messages);
      console.log('[LLMManager] second response:', secondResponse);
      finalContent = secondResponse;
    }

    const result: ParseResult = JSON.parse(finalContent);
    result.extensions = result.extensions || [];
    return result;
  }
}
