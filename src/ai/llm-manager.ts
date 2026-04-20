// 大模型管理器 - 两阶段查询流程

import { LLM } from './types';
import { AppConfigManager } from '../config/app-config';

export interface ParseResult {
  where: string;
  limit: number;
  explanation: string;
  extensions: any[];
}

export interface Stage1Result {
  /** 能直接生成的预处理 WHERE 条件 */
  where: string;
  /** limit */
  limit?: number;
  /** explanation */
  explanation?: string;
  /** 能直接确定的 id-values 绑定 */
  extensions: {
    id: string;
    values: string[];
  }[];
  /** 无法匹配、需交给Stage2处理的关键词 */
  keywords: string[];
}

/**
 * LLM Manager - 两阶段查询
 */
export class LLMManager {
  private llm: LLM;

  constructor(llm: LLM) {
    this.llm = llm;
  }

  async parseQuery(naturalLanguageQuery: string): Promise<ParseResult> {
    // 获取主配置（带 values 和 description）
    const mainMappingsText = AppConfigManager.get().getMainMappingsSimplifiedText();
    console.log('[LLMManager] mainMappings length:', mainMappingsText.length);
    
    // 第一轮：预处理
    const stage1Result = await this.stage1(naturalLanguageQuery, mainMappingsText);
    console.log('[LLMManager] stage1:', JSON.stringify(stage1Result));

    // 代码用关键词搜索 items
    const matchedItemsText = AppConfigManager.get().searchByKeywords(stage1Result.keywords);
    console.log('[LLMManager] matched items:\n', matchedItemsText);

    // 第二轮：生成 SQL
    const stage2Result = await this.stage2(
      naturalLanguageQuery,
      matchedItemsText,
      stage1Result.keywords,
      stage1Result.where,
      stage1Result.extensions
    );
    console.log('[LLMManager] stage2:', JSON.stringify(stage2Result));

    return {
      where: stage2Result.where || '',
      limit: stage2Result.limit || 10,
      explanation: stage2Result.explanation || '',
      extensions: stage2Result.extensions || []
    };
  }

  /**
   * 第一阶段：预处理 - 区分能直接生成 WHERE 和需要查配置的
   */
  private async stage1(
    query: string, 
    mainMappingsText: string
  ): Promise<Stage1Result> {
    const systemPrompt = `你是一个SQL查询分析器。

## 主配置（id, name, description, values）
${mainMappingsText}

## 任务
分析用户的自然语言查询，分三类处理：

1. **where（能直接生成WHERE条件的，如数值比较）**
2. **extensions（能直接确定id-values绑定的，如属性=光）**
3. **keywords（无法匹配的词，交给Stage2处理）**

## 输出格式（JSON）
{
  "where": "WHERE条件",
  "extensions": [
    {"id": "标签ID", "values": ["匹配的values"]}
  ],
  "keywords": ["无法匹配的关键词"]
}`;

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `查询: ${query}` }
    ]);

    const jsonStr = response;
    const result = JSON.parse(jsonStr) as Stage1Result;
    result.where = result.where || '';
    result.extensions = result.extensions || [];
    result.keywords = result.keywords || [];
    return result;
  }

  /**
   * 第二阶段：根据keywords匹配items，补充extensions
   */
  private async stage2(
    query: string,
    matchedItemsText: string,
    keywords: string[],
    stage1Where: string,
    stage1Extensions: { id: string; values: string[] }[]
  ): Promise<Stage1Result> {
    const systemPrompt = `你是一个SQL查询生成器。

## 用户查询
${query}

---
上方是用户的原始问题。下方是系统预处理的结果，参考使用。
---

## Stage1 预处理条件（直接使用）
${stage1Where || '(无)'}

## Stage1 已确定的 extensions（直接使用）
${JSON.stringify(stage1Extensions)}

## 关键词（无法直接确定、需匹配的词）
${keywords.join(', ') || '(无)'}

## 匹配的 items（用keywords匹配到的items，用于补充extensions）
${matchedItemsText || '(无)'}

---
根据用户意图，参考上方Stage1结果，补充keywords匹配的items，直接输出完整结果。
---

## 输出格式（JSON）
{
  "where": "WHERE条件",
  "limit": 用户指定的数量，没指定返回 null,
  "explanation": "查询说明",
  "extensions": [
    {"id": "标签ID", "values": ["匹配的values"]}
  ]
}`;

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `根据上述配置输出 id 和 values 绑定` }
    ]);

    const jsonStr = response;
    const result = JSON.parse(jsonStr) as Stage1Result;

    return result;
  }
}
