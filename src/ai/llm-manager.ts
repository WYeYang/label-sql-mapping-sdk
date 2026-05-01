// 大模型管理器 - 两阶段查询流程

import { LLM } from './types';
import { AppConfigManager } from '../config/app-config';

export interface ParseResult {
  where: string;
  limit?: number;
  order?: string;           // 排序字段，如 "RANDOM()" 或 "RAND()"
  explanation?: string;
  extensions: any[];
  extra?: any;
}

export interface Stage1Result {
  /** 筛选条件，整体用一对括号包裹，如 (field = 100 AND type = 'book')，不带WHERE关键字 */
  where: string;
  /** limit */
  limit?: number;
  /** 排序字段，如 "RANDOM()" */
  order?: string;
  /** explanation */
  explanation?: string;
  extensions: {
    id: string;
    values: string[];
  }[];
  /** 无法匹配、需交给Stage2处理的关键词 */
  /** 额外输出字段（根据用户systemPrompt要求） */
  extra?: any;
}

/**
 * LLM Manager - 两阶段查询
 */
export class LLMManager {
  private llm: LLM;

  constructor(llm: LLM) {
    this.llm = llm;
  }

  async parseQuery(naturalLanguageQuery: string, extraSystemPrompt?: string): Promise<ParseResult> {
    // 先用 searchByKeywords 搜索匹配的 items
    const matchedItemsText = await AppConfigManager.get().searchByKeywords(naturalLanguageQuery);
    console.log('[LLMManager] matched items:\n', matchedItemsText);
    
    // 获取主配置（带 values 和 description）
    const mainMappingsText = AppConfigManager.get().getMainMappingsSimplifiedText();
    console.log('[LLMManager] mainMappings length:', mainMappingsText.length);
    
    // 第一轮：预处理（传入 matchedItemsText 作为提示词）
    const stage1Result = await this.stage1(naturalLanguageQuery, mainMappingsText, extraSystemPrompt, matchedItemsText);
    console.log('[LLMManager] stage1:', JSON.stringify(stage1Result));

    // // 如果没有关键词，直接返回 Stage1 结果，跳过 Stage2
    // if (!stage1Result.keywords || stage1Result.keywords.length === 0) {
    //   console.log('[LLMManager] 无关键词，跳过 Stage2');
    //   return stage1Result;
    // }

    // // 第二轮：生成 SQL（暂时注释）
    // const stage2Result = await this.stage2(
    //   naturalLanguageQuery,
    //   matchedItemsText,
    //   stage1Result.keywords,
    //   stage1Result.where,
    //   stage1Result.explanation,
    //   stage1Result.order,
    //   extraSystemPrompt
    // );
    // console.log('[LLMManager] stage2:', JSON.stringify(stage2Result));
    // return stage2Result;
    
    // 暂时直接返回 stage1 结果
    return stage1Result;
  }

  /**
   * 第一阶段：预处理 - 区分能直接生成 WHERE 和需要查配置的
   */
  private async stage1(
    query: string, 
    mainMappingsText: string,
    extraSystemPrompt?: string,
    matchedItemsText?: string
  ): Promise<Stage1Result> {
    let systemPrompt = `你是一个SQL查询分析器。

## 任务
分析用户的消息

## 重要规则
- **必须生成 WHERE 条件**：无论什么情况，都要生成有效的 WHERE 条件
- **如果找不到筛选条件，必须自行推导关键词使用LIKE在 t.name 或 t.desc 字段上进行文本匹配**
- 如果用户要求随机取N条数据（如"随便抽一张"、"随机选几张"），需要同时生成对应的 ORDER BY RANDOM() 和 LIMIT N 条件
- 如果无法分析出有效的 WHERE 条件，请返回空的 WHERE 条件字符串 ""

## 数据库字段和查询方法说明:
${mainMappingsText}
## 根据用户输入语义搜索到的相关映射选项（用于生成 SQL 的参考）:
${matchedItemsText}
## 额外说明:
${extraSystemPrompt}


## 输出格式（JSON）
{
  ##筛选条件，整体用一对括号包裹，不带WHERE关键字
  "where": ...,
  ##用户指定的数量，没指定返回 null
  "limit": ...,
  ##排序字段，如 "RANDOM()"（用于随机查询），没指定返回 null
  "order": ...,
  ##查询说明对生成的where解释
  "explanation": ...,
  ##额外输出字段（根据额外说明生成）
  "extra": ...
}`;

    console.log('\n========== Stage1 输入 ==========');
    console.log('\n系统提示词:\n' + systemPrompt);
    console.log('\n用户消息: 查询: ' + query);

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
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
    stage1Where: string,
    stage1Explanation?: string,
    stage1Order?: string,
    extraSystemPrompt?: string
  ): Promise<Stage1Result> {
    let systemPrompt = `你是一个SQL查询生成器。

    
目标: 根据查询结果和用户输入生成新的条件拼接到上一步生成的where条件后面,并且按照输出格式生成其他信息


## 上一步生成的where条件{{where}}:
${stage1Where}

## 上一步生成的解释{{stage1_explanation}}:
${stage1Explanation || ''}

## 上一步的排序字段{{stage1_order}}:
${stage1Order || ''}

## 上一步无法确定条件的关键词{{keyword}}:
${keywords.join(', ')}

## 根据关键词查询的额外信息{{extension_info}}:
${matchedItemsText}


## 额外说明:
${extraSystemPrompt}

## 重要规则

## 输出格式(JSON)
{
  ##筛选条件，整体用一对括号包裹，如 "(field = 100 AND type = 'book')"，不带WHERE关键字
  ##如果没有新条件，直接把上一步的where条件包裹在括号里返回
  "where": "(...)",
  # 用户指定的数量，没指定返回 null
  "limit": ...,
  ##排序字段，如 "RANDOM()"，直接使用上一步的 stage1_order
  "order": "${stage1Order || ''}",
  ##查询说明对最后生成的where解释
  "explanation": ...,
  ##匹配到的额外信息的id和values,只根据{{keyword}}和{{extension_info}}生成,并且已在where中使用的关键词不要放到这里
  "extensions": [
    {"id": "标签ID", "values": ["匹配的values"]}
  ]
  ##额外输出字段（根据额外说明生成）
  "extra": ...
}`;

    console.log('\n========== Stage2 输入 ==========');
    console.log(systemPrompt);

    const response = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ]);

    const jsonStr = response;
    console.log('\n========== Stage2 输出 ==========');
    console.log(jsonStr);
    const result = JSON.parse(jsonStr) as Stage1Result;

    return result;
  }
}
