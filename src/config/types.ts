// LSM 配置类型定义

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
  name: string;        // 表名
  alias?: string;      // 表别名
  join?: JoinType;     // join类型
  on?: string;         // join条件
}

/**
 * 数据库配置
 */
export interface DatabaseConfig {
  type: DatabaseType;    // 数据库类型
  tables: TableConfig[]; // 表配置数组
}

/**
 * 映射项
 */
export interface MappingItem {
  condition: string;   // SQL条件
  name: string;        // 显示名称
}

/**
 * 标签映射
 */
export interface LabelMapping {
  id: string;          // 标签唯一ID
  name: string;        // 标签类型名称
  items: MappingItem[]; // 映射项数组
}

/**
 * LSM 配置
 */
export interface LSMConfig {
  version: string;             // 规范版本
  name: string;                // 配置名称
  id: string;                  // 配置唯一标识
  database: DatabaseConfig;    // 数据库配置
  mappings: LabelMapping[];    // 标签映射集合
  rawContent?: string;         // 原始配置文件内容
}
