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
  /** 筛选条件，整体用一对括号包裹，如 (field = 100 AND type = 'book')，不带WHERE关键字 */
  where: string;
  /** limit */
  limit?: number;
  /** explanation */
  explanation?: string;
  /** 能直接确定的 id-values 绑定（留空） */
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
      stage1Result.where
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

## 数据库字段和查询方法说明:
${mainMappingsText}

## 任务
分析用户的自然语言查询：

## 输出格式（JSON）
{
  ##筛选条件，整体用一对括号包裹，不带WHERE关键字
  "where": ...,
  ##生成查询不到where条件,需要下一步确认的关键词
  "keywords": [...]
}`;

    console.log('\n========== Stage1 输入 ==========');
    console.log('\n系统提示词:\n' + systemPrompt);
    console.log('\n用户消息: 查询: ' + query);

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `查询: ${query}` }
    ]);

    const jsonStr = response;
    console.log('\n========== Stage1 输出 ==========');
    console.log(jsonStr);
    const result = JSON.parse(jsonStr) as Stage1Result;
    return result;
  }

  /**
   * 第二阶段：根据keywords匹配items，补充extensions
   */
  private async stage2(
    query: string,
    matchedItemsText: string,
    keywords: string[],
    stage1Where: string
  ): Promise<Stage1Result> {
    const systemPrompt = `你是一个SQL查询生成器。

## 用户查询
${query}

---
上方是用户的原始问题。下方是系统预处理的结果，参考使用。
---

## 上一步生成的where条件{{where}}:
${stage1Where}

## 上一步无法确定条件的关键词{{keyword}}:
${keywords.join(', ')}

## 根据关键词查询的额外信息{{extension_info}}:
${matchedItemsText}

目标: 根据查询结果和用户输入生成新的条件拼接到上一步生成的where条件后面,并且按照下面输出格式生成其他信息

## 输出格式
{
  ##筛选条件，整体用一对括号包裹，如 (field = 100 AND type = 'book')，不带WHERE关键字
  "where": (...),
  # 用户指定的数量，没指定返回 null
  "limit": ...,
  ##查询说明对生成的where解释
  "explanation": ...,
  ##匹配到的额外信息的id和values,只根据{{keyword}}和{{extension_info}}生成,并且没有提取条件到where的才需要生成
  "extensions": [
    {"id": "标签ID", "values": ["匹配的values"]}
  ]
}`;

    console.log('\n========== Stage2 输入 ==========');
    console.log(systemPrompt);

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `根据上述配置输出 id 和 values 绑定` }
    ]);

    const jsonStr = response;
    console.log('\n========== Stage2 输出 ==========');
    console.log(jsonStr);
    const result = JSON.parse(jsonStr) as Stage1Result;

    return result;
  }
}
