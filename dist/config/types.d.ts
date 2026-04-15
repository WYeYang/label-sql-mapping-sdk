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
    tables: TableConfig[];
}
/**
 * 映射项
 */
export interface MappingItem {
    condition: string;
    name: string;
}
/**
 * 标签映射
 */
export interface LabelMapping {
    id: string;
    name: string;
    items: MappingItem[];
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
}
//# sourceMappingURL=types.d.ts.map