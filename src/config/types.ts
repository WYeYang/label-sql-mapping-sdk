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
  condition?: string;  // 匹配条件
  value: string;       // 字段引用或展示值
}

/**
 * 标签映射
 * 支持两种模式：
 * 1. items 模式：多个条件映射到不同值（互斥或可叠加）
 * 2. value 模式：单个条件直接返回字段值
 */
export interface LabelMapping {
  id: string;          // 标签唯一ID
  name: string;        // 标签类型名称
  condition?: string;  // 前置条件（可选）
  value?: string;      // 单一值（单值模式）或默认值（items 模式匹配不到时）
  items?: MappingItem[]; // 映射项数组（多条件模式）
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
