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
export class ExtensionMerger {
  constructor(private extensions: ExtensionMapping[]) {}

  /**
   * 根据值列表构建 extensions（按 ID 分组）
   */
  buildFromValues(values: string[]): ExtensionInfo[] {
    if (!values.length) return [];
    const extMap = new Map<string, string[]>();
    for (const ext of this.extensions) {
      for (const item of ext.items) {
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
    const conditions: string[] = [];
    for (const ext of extensions) {
      const extMapping = this.extensions.find(e => e.id === ext.id);
      if (!extMapping) continue;
      for (const value of ext.values) {
        const item = extMapping.items.find(i => i.value === value);
        if (item?.condition) {
          conditions.push(`(${item.condition})`);
        }
      }
    }
    return conditions.length ? conditions.join(' OR ') : '';
  }

  /**
   * 获取所有扩展标签配置
   */
  getExtensions(): ExtensionMapping[] {
    return this.extensions;
  }
}
