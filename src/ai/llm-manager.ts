// 大模型管理器 - 两阶段查询流程

import { LLM } from './types';
import { AppConfigManager, ExtensionMapping } from '../config/app-config';

export interface ParseResult {
  where: string;
  limit: number;
  explanation: string;
  extensions: ExtensionMapping[];
}

export interface Stage1Result {
  neededExtensions: { id: string }[];
  explanation: string;
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
    // 获取简版配置
    const mappingsText = AppConfigManager.get().getMappingsSimplifiedText();
    console.log('[LLMManager] mappings length:', mappingsText.length);
    
    // 第一轮：识别 extensions
    const stage1Result = await this.stage1(naturalLanguageQuery, mappingsText);
    console.log('[LLMManager] stage1:', JSON.stringify(stage1Result));

    // 代码获取 extensions 完整配置
    const extensionDetails = AppConfigManager.get().getExtensionDetails(stage1Result.neededExtensions);
    console.log('[LLMManager] got extension details:', extensionDetails.length);

    // 第二轮：生成 SQL
    const stage2Result = await this.stage2(naturalLanguageQuery, extensionDetails);
    console.log('[LLMManager] stage2:', JSON.stringify(stage2Result));

    return stage2Result;
  }

  /**
   * 第一阶段：识别需要的 extensions
   */
  private async stage1(
    query: string, 
    mappingsText: string
  ): Promise<Stage1Result> {
    const systemPrompt = `你是一个标签识别器。

## mappings 配置（id, name, values）
${mappingsText}

## 任务
分析用户的自然语言查询，返回需要用到的标签ID列表。

## 输出格式（JSON）
{
  "neededExtensions": [{"id": "标签ID"}, ...],
  "explanation": "识别说明"
}`;

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `查询: ${query}` }
    ]);

    const jsonStr = response;
    const result = JSON.parse(jsonStr) as Stage1Result;
    result.neededExtensions = result.neededExtensions || [];
    return result;
  }

  /**
   * 第二阶段：生成 SQL 意图
   * 只传用户输入 + extensions 完整配置
   */
  private async stage2(
    query: string,
    extensionDetails: ExtensionMapping[]
  ): Promise<ParseResult> {
    const extDetailsText = JSON.stringify(extensionDetails, null, 2);

    const systemPrompt = `你是一个SQL查询生成器。

## 用户查询
${query}

## extensions 完整配置
${extDetailsText}

## 输出规范（JSON）
{
  "where": "(AI自行推导的条件组合)",
  "limit": 查询的数据条数(AI自行推导),
  "explanation": "AI对返回结果的说明",
  "extensions": [{"id": "标签ID", "values": ["值"]}]  // AI参考extensions配置，选择直接添加到where或输出标签由代码拼接
}`;

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `根据上述配置生成 SQL` }
    ]);

    const jsonStr = response;
    const result = JSON.parse(jsonStr) as ParseResult;
    result.extensions = result.extensions || [];
    return result;
  }
}
