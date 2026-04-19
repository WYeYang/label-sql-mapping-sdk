// 大模型管理器

import { LLM } from './types';
import { AppConfigManager, UnifiedLabel } from '../config/app-config';

export interface ParseResult {
  where?: string;         // WHERE条件（不含WHERE关键字）
  limit?: number;          // 限制数量
  extensions?: ExtensionInfo[];  // 扩展标签
  explanation?: string;   // 说明
}

export interface ExtensionInfo {
  id: string;       // 标签ID
  values: string[]; // 匹配的值列表
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
    const allMappings = AppConfigManager.get().getAllMappings();
    const simplifiedText = allMappings.map(m => {
      const values = m.items.map(i => i.value).filter(Boolean);
      const desc = m.description ? `\n  description: ${m.description}` : '';
      return `- id: ${m.id}\n  name: ${m.name}${desc}\n  values: [${values.join(', ')}]`;
    }).join('\n\n');

    console.log('[LLMManager] parsing query:', naturalLanguageQuery);

    // 第一轮：LLM解析需要哪些标签
    const firstPrompt = `你是一个SQL查询生成器。

## 标签配置（合并后简版）
${simplifiedText}

## 用户查询
${naturalLanguageQuery}

## 任务
分析用户查询，返回需要查询的标签ID列表。

## 输出格式（JSON）
{
  "neededExtensions": [{"id": "标签ID"}, ...]
}`;

    const firstResponse = await this.llm.chat([
      { role: 'system' as const, content: firstPrompt },
      { role: 'user' as const, content: naturalLanguageQuery }
    ]);

    console.log('[LLMManager] first response:', firstResponse);

    let neededExtensions: { id: string }[] = [];
    try {
      const parsed = JSON.parse(firstResponse);
      neededExtensions = parsed.neededExtensions || [];
    } catch {
      console.error('[LLMManager] failed to parse first response');
    }

    // 代码模拟工具调用：批量获取完整配置
    const extensionDetails = AppConfigManager.get().getMappingConfigs(
      neededExtensions.map(e => e.id)
    );
    console.log('[LLMManager] extension configs:', extensionDetails);

    // 格式化标签详情供 LLM 使用
    const formatMapping = (m: UnifiedLabel) => {
      const values = m.items.map(i => i.value).filter(Boolean);
      const desc = m.description ? `\n  description: ${m.description}` : '';
      return `- id: ${m.id}\n  name: ${m.name}${desc}\n  values: [${values.join(', ')}]`;
    };

    // 第二轮：LLM生成完整SQL
    const secondPrompt = `你是一个SQL查询生成器。

## 用户查询
${naturalLanguageQuery}

## 标签详情
${extensionDetails.map(formatMapping).join('\n\n')}

## 处理规则
- 根据标签详情中的description和values，理解标签含义
- condition字段表示需要通过extensions返回的条件

## 输出格式（JSON）
{
  "where": "WHERE条件片段（不含WHERE关键词）",
  "limit": 根据用户意图推断的返回数量,
  "extensions": [{"id": "标签ID", "values": ["匹配的值"]}],
  "explanation": "查询说明"
}`;

    const secondResponse = await this.llm.chat([
      { role: 'system' as const, content: secondPrompt },
      { role: 'user' as const, content: naturalLanguageQuery }
    ]);

    console.log('[LLMManager] second response:', secondResponse);

    try {
      return JSON.parse(secondResponse);
    } catch {
      return { explanation: '解析失败' };
    }
  }
}
