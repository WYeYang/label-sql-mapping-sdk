// 扩展标签合并器

import type { ExtensionMapping } from '../config';

/**
 * 扩展标签信息
 */
export interface ExtensionInfo {
  id: string;
  values: string[];
}

/**
 * 扩展标签合并器
 * 封装扩展标签的构建和合并逻辑
 */
/**
 * 扩展标签合并器
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                         ExtensionInfo                               │
 * │  { id: "attr", values: ["光", "暗"] }                               │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                       buildFromValues()                             │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  输入: ["光", "暗", "战士族"]                                         │
 * │  遍历 extensions 配置，按 id 分组 values                              │
 * │  输出: [                                                            │
 * │    { id: "attr", values: ["光", "暗"] },                             │
 * │    { id: "race", values: ["战士族"] }                                │
 * │  ]                                                                  │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                    buildWhereConditions()                          │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  输入: ExtensionInfo[]                                               │
 * │  遍历 extensions，根据 id 查配置，支持：                              │
 * │    - 有 items → 标签值筛选（精确匹配）                                 │
 * │    - 无 items 但有 value → 约定值解析（>, <, ~, 模糊匹配）            │
 * │  输出: WHERE 条件字符串                                               │
 * └─────────────────────────────────────────────────────────────────────┘
 */

export class ExtensionMerger {
  constructor(private extensions: ExtensionMapping[]) {}

  /**
   * 根据值列表构建 extensions（按 ID 分组）
   */
  buildFromValues(values: string[]): ExtensionInfo[] {
    if (!values.length) return [];
    const extMap = new Map<string, string[]>();
    for (const ext of this.extensions) {
      for (const item of (ext.items ?? [])) {
        if (values.includes(item.value)) {
          const existing = extMap.get(ext.id) ?? [];
          existing.push(item.value);
          extMap.set(ext.id, [...new Set(existing)]);
        }
      }
    }
    return Array.from(extMap.entries()).map(([id, vals]) => ({ id, values: vals }));
  }

  /**
   * 根据 extensions 构建 WHERE 条件
   * 返回形如 "(condition1) OR (condition2)" 的条件
   */
  buildWhereConditions(extensions: ExtensionInfo[]): string {
    if (!extensions.length) return '';
    
    // 分类：枚举型（有 items）用 AND，文本型（无 items）用 OR
    const enumConditions: string[] = [];
    const textConditions: string[] = [];

    for (const ext of extensions) {
      const extMapping = this.extensions.find(e => e.id === ext.id);
      if (!extMapping) continue;

      const valueConditions: string[] = [];

      for (const value of ext.values) {
        // 情况 1：有 items → 优先查 items（标签值筛选）
        let matched = false;
        if (extMapping.items?.length) {
          const item = extMapping.items.find(i => i.value === value);
          if (item?.condition) {
            valueConditions.push(item.condition);
            matched = true;
          }
        }

        // 情况 2：没匹配到 items 或没有 items → 尝试解析约定值
        if (!matched && extMapping.value) {
          const parsedCondition = this.parseConventionValue(extMapping.value, value);
          if (parsedCondition) {
            valueConditions.push(parsedCondition);
          }
        }
      }

      // 拼接条件
      if (valueConditions.length) {
        const extCondition = valueConditions.length === 1 
          ? valueConditions[0] 
          : `(${valueConditions.join(' OR ')})`;
        
        const finalCondition = extMapping.condition 
          ? `(${extMapping.condition} AND ${extCondition})` 
          : extCondition;
        
        // 按类型分组
        if (extMapping.items?.length) {
          enumConditions.push(finalCondition);
        } else {
          textConditions.push(finalCondition);
        }
      }
    }

    // 组合结果：枚举型 AND，文本型 OR
    const parts: string[] = [];
    if (enumConditions.length) {
      parts.push(enumConditions.join(' AND '));
    }
    if (textConditions.length) {
      parts.push(textConditions.length === 1 
        ? textConditions[0] 
        : `(${textConditions.join(' OR ')})`);
    }

    return parts.length ? parts.join(' AND ') : '';
  }

  /**
   * 解析约定值
   * 支持格式：
   * - ">5", "<2000", ">=1000", "<=5000"
   * - "1000~2000", "~2000", "1000~"
   * - "模糊匹配文本"
   */
  private parseConventionValue(field: string, value: string): string | null {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    // 约定 1：范围 "min~max"
    if (trimmedValue.includes('~')) {
      const [minStr, maxStr] = trimmedValue.split('~', 2);
      const hasMin = minStr.trim() !== '';
      const hasMax = maxStr.trim() !== '';

      if (!hasMin && !hasMax) return null;

      const rangeConditions: string[] = [];
      if (hasMin) {
        const min = this.tryParseNumber(minStr.trim());
        rangeConditions.push(`${field} >= ${min}`);
      }
      if (hasMax) {
        const max = this.tryParseNumber(maxStr.trim());
        rangeConditions.push(`${field} <= ${max}`);
      }
      return rangeConditions.length ? rangeConditions.join(' AND ') : null;
    }

    // 约定 2：操作符 ">", "<", ">=", "<="
    const operatorMatch = trimmedValue.match(/^\s*(>=|<=|>|<)\s*(.+)\s*$/);
    if (operatorMatch) {
      const operator = operatorMatch[1];
      const numValue = this.tryParseNumber(operatorMatch[2].trim());
      return `${field} ${operator} ${numValue}`;
    }

    // 约定 3：默认模糊匹配（无 items 时）
    // 如果是纯数字，用等于而不是 LIKE
    const num = Number(trimmedValue);
    if (!isNaN(num)) {
      return `${field} = ${num}`;
    }
    return `${field} LIKE '%${trimmedValue.replace(/'/g, "''")}%'`;
  }

  /**
   * 尝试解析数字，失败则返回带引号的字符串
   */
  private tryParseNumber(str: string): number | string {
    const num = Number(str);
    return isNaN(num) ? `'${str.replace(/'/g, "''")}'` : num;
  }

  /**
   * 获取所有扩展标签配置
   */
  getExtensions(): ExtensionMapping[] {
    return this.extensions;
  }
}
