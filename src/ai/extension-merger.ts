// 扩展标签合并器

/**
 * 根据 extensions 构建 WHERE 条件
 */
export function buildWhereConditions(extensions: any[]): string {
  const conditions = extensions
    .flatMap(ext => ext.items ?? [])
    .filter(item => item.condition)
    .map(item => `(${item.condition})`);
  return conditions.join(' AND ');
}
