/**
 * 数据库类型
 */
export type DatabaseType = 'mysql' | 'postgres' | 'sqlite' | 'mssql';
/**
 * Join类型
 */
export type JoinType = 'inner' | 'left' | 'right' | 'outer';
/**
 * 表配置
 */
export interface TableConfig {
    name: string;
    alias?: string;
    join?: JoinType;
    on?: string;
}
/**
 * 数据库配置
 */
export interface DatabaseConfig {
    type: DatabaseType;
    path?: string;
    tables: TableConfig[];
}
/**
 * 映射项
 */
export interface MappingItem {
    condition?: string;
    value: string;
}
/**
 * 标签映射
 * 支持两种模式：
 * 1. items 模式：多个条件映射到不同值（互斥或可叠加）
 * 2. value 模式：单个条件直接返回字段值
 */
export interface LabelMapping {
    id: string;
    name: string;
    description?: string;
    condition?: string;
    value?: string;
    items?: MappingItem[];
}
/**
 * LSM 配置
 */
export interface LSMConfig {
    version: string;
    name: string;
    id: string;
    database: DatabaseConfig;
    mappings: LabelMapping[];
    rawContent?: string;
}
/**
 * 扩展标签值
 */
export interface ExtensionValue {
    name: string;
    values: string[];
}
//# sourceMappingURL=types.d.ts.map