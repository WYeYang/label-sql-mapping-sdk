// 扩展标签合并器

import { AppConfigManager } from '../config';

/**
 * 扩展标签合并器
 */
export class ExtensionMerger {
  /**
   * 根据值列表构建 extensions
   */
  buildFromValues(values: string[]): any[] {
    if (!values.length) return [];
    const allMappings = AppConfigManager.get().allMappings;
    
    return allMappings.flatMap(ext => {
      const filteredItems = ext.items?.filter(item => values.includes(item.value)) ?? [];
      return filteredItems.length > 0 ? [{ ...ext, items: filteredItems }] : [];
    });
  }

  /**
   * 根据 extensions 构建 WHERE 条件
   */
  buildWhereConditions(extensions: any[]): string {
    const conditions = extensions
      .flatMap(ext => ext.items ?? [])
      .filter(item => item.condition)
      .map(item => `(${item.condition})`);
    return conditions.join(' OR ');
  }
}
