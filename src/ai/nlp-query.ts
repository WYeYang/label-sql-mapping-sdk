// 自然语言查询工具

import { LLMManager, ParseResult, ExtensionInfo } from './llm-manager';
import { LSMConfig, AppConfigManager, MappingItem } from '../config';
import { extractWhereAndAfter, hasLimit, extractLimit, replaceLimit, appendWhereCondition, mergeWhereConditions } from '../db/sql-helper';

export { ParseResult, ExtensionInfo };

/**
 * 自然语言查询工具
 */
export class NLPQuery {
  private llmManager: LLMManager;
  private config: LSMConfig;
  private defaultSelect: string;
  private defaultLimit: number = 20;

  constructor(llmManager: LLMManager, config: LSMConfig, defaultSelect: string = '*', defaultLimit: number = 20) {
    this.llmManager = llmManager;
    this.config = config;
    this.defaultSelect = defaultSelect;
    this.defaultLimit = defaultLimit;
  }

  async execute(query: string): Promise<ParseResult> {
    const result = await this.llmManager.parseQuery(query, '');
    console.log('[NLPQuery] Generated result:', JSON.stringify(result));
    return result;
  }

  /**
   * 根据LLM返回的where和extensions生成完整SQL
   */
  buildSQL(result: ParseResult, page: number = 1): string {
    const tables = this.config.database?.tables || [];
    const mainTable = tables.find(t => !t.join) || tables[0];
    const alias = mainTable?.alias || 't';

    // 构建基础SELECT
    let sql = `SELECT ${this.defaultSelect} FROM ${mainTable?.name || 'datas'} ${alias}`;

    // 处理JOIN
    for (const table of tables) {
      if (table.join && table.on) {
        sql += ` ${table.join.toUpperCase()} JOIN ${table.name} ${table.alias} ON ${table.on}`;
      }
    }

    // 处理WHERE条件
    const conditions: string[] = [];

    // 1. LLM返回的where条件
    if (result.where) {
      conditions.push(result.where);
    }

    // 2. extensions中的condition（从配置获取并拼接）
    if (result.extensions) {
      for (const ext of result.extensions) {
        const mapping = AppConfigManager.get().getMapping(ext.id);
        if (mapping && ext.values.length > 0) {
          // 找到匹配值的condition
          for (const value of ext.values) {
            const item = mapping.items.find((i: MappingItem) => i.value === value);
            if (item && item.condition) {
              conditions.push(item.condition);
            }
          }
        }
      }
    }

    // 合并WHERE条件
    if (conditions.length > 0) {
      const mergedWhere = mergeWhereConditions(conditions);
      sql = appendWhereCondition(sql, mergedWhere);
    }

    // 处理LIMIT
    let limit = result.limit || this.defaultLimit;
    if (limit > this.defaultLimit) {
      limit = this.defaultLimit;
    }

    sql += ` LIMIT ${limit}`;

    // 处理OFFSET
    if (page > 1) {
      sql += ` OFFSET ${(page - 1) * limit}`;
    }

    return sql;
  }
}
