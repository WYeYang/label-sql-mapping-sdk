// 标签查询功能

import { LSMConfig } from '../config';
import { Database, QueryResult } from '../db';
import { LabelData, LabelQueryOptions, MainLabelResult, LabelItem } from './types';

/**
 * 标签查询类
 */
export class LabelQuery {
  private config: LSMConfig;
  private database: Database;

  /**
   * 构造函数
   * @param config LSM配置
   * @param database 数据库实例
   */
  constructor(config: LSMConfig, database: Database) {
    this.config = config;
    this.database = database;
  }

  /**
   * 查询标签数据列表
   * @param options 查询选项
   * @returns 标签数据列表
   */
  async getLabels(options: LabelQueryOptions = {}): Promise<LabelData[]> {
    let labels: LabelData[] = this.config.mappings.map(mapping => ({
      id: mapping.id,
      name: mapping.name,
      items: mapping.items.map(item => ({
        condition: item.condition,
        value: item.value
      }))
    }));

    // 应用过滤
    if (options.filter) {
      const filter = options.filter.toLowerCase();
      labels = labels.filter(label => 
        label.id.toLowerCase().includes(filter) || 
        label.name.toLowerCase().includes(filter)
      );
    }

    // 应用排序
    if (options.sortBy) {
      labels.sort((a, b) => {
        let compareValue = 0;
        if (options.sortBy === 'id') {
          compareValue = a.id.localeCompare(b.id);
        } else if (options.sortBy === 'name') {
          compareValue = a.name.localeCompare(b.name);
        }
        return options.sortDirection === 'DESC' ? -compareValue : compareValue;
      });
    }

    return labels;
  }

  /**
   * 查询指定数据的主标签
   * @param dataId 数据ID
   * @returns 主标签查询结果
   */
  async getMainLabel(dataId: string): Promise<MainLabelResult[]> {
    const results: MainLabelResult[] = [];

    // 遍历所有标签
    for (const mapping of this.config.mappings) {
      // 遍历标签的所有项
      for (const item of mapping.items) {
        // 跳过纯字段标签（无 condition 或 condition 是字段引用）
        if (!item.condition || item.value.includes('{keyword}')) {
          continue;
        }

        // 构建查询SQL
        const sql = `SELECT * FROM ${this.config.database.tables[0].name} WHERE id = '${dataId}' AND ${item.condition}`;
        
        try {
          // 执行查询
          const queryResult = await this.database.query(sql);
          
          // 如果查询有结果，说明数据匹配此标签项
          if (queryResult.rows && queryResult.rows.length > 0) {
            results.push({
              labelId: mapping.id,
              labelName: mapping.name,
              itemValue: item.value,
              condition: item.condition
            });
            // 每个标签只取第一个匹配的项
            break;
          }
        } catch (error) {
          // 忽略查询错误，继续下一个标签项
          console.warn(`查询标签 ${mapping.id} 时出错: ${(error as Error).message}`);
        }
      }
    }

    return results;
  }

  /**
   * 根据标签ID获取标签信息
   * @param labelId 标签ID
   * @returns 标签数据
   */
  getLabelById(labelId: string): LabelData | null {
    const mapping = this.config.mappings.find(m => m.id === labelId);
    if (!mapping) {
      return null;
    }

    return {
      id: mapping.id,
      name: mapping.name,
      items: mapping.items.map(item => ({
        condition: item.condition,
        value: item.value
      }))
    };
  }

  /**
   * 转换标签为SQL条件
   * @param labelId 标签ID
   * @param itemValue 标签项值
   * @returns SQL条件
   */
  getLabelCondition(labelId: string, itemValue: string): string | null {
    const mapping = this.config.mappings.find(m => m.id === labelId);
    if (!mapping) {
      return null;
    }

    const item = mapping.items.find(i => i.value === itemValue);
    if (!item) {
      return null;
    }

    return item.condition || null;
  }
}
