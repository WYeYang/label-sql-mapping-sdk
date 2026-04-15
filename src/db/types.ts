// 数据库操作类型定义

import { DatabaseType, TableConfig } from '../config';

/**
 * 数据库连接配置
 */
export interface DBConfig {
  type: DatabaseType;    // 数据库类型
  path?: string;         // SQLite数据库文件路径
  host?: string;         // 数据库主机（非SQLite）
  port?: number;         // 数据库端口（非SQLite）
  user?: string;         // 数据库用户名（非SQLite）
  password?: string;     // 数据库密码（非SQLite）
  database?: string;     // 数据库名称（非SQLite）
}

/**
 * 查询条件
 */
export interface QueryCondition {
  field: string;         // 字段名
  operator: string;      // 操作符（=, !=, >, <, >=, <=, LIKE, IN等）
  value: any;            // 值
}

/**
 * 查询选项
 */
export interface QueryOptions {
  limit?: number;        // 限制返回记录数
  offset?: number;       // 偏移量
  orderBy?: string;      // 排序字段
  orderDirection?: 'ASC' | 'DESC'; // 排序方向
}

/**
 * 查询结果
 */
export interface QueryResult {
  rows: any[];           // 查询结果行
  total?: number;        // 总记录数（如果有）
}

/**
 * 数据库操作接口
 */
export interface Database {
  /**
   * 执行SQL查询
   * @param sql SQL语句
   * @param params 参数
   * @returns 查询结果
   */
  query(sql: string, params?: any[]): Promise<QueryResult>;
  
  /**
   * 执行SQL语句（无返回结果）
   * @param sql SQL语句
   * @param params 参数
   * @returns 受影响的行数
   */
  execute(sql: string, params?: any[]): Promise<number>;
  
  /**
   * 关闭数据库连接
   */
  close(): Promise<void>;
  
  /**
   * 获取数据库类型
   * @returns 数据库类型
   */
  getType(): DatabaseType;
}

/**
 * 查询构建器接口
 */
export interface QueryBuilder {
  /**
   * 设置查询的表
   * @param tables 表配置数组
   * @returns 查询构建器
   */
  from(tables: TableConfig[]): QueryBuilder;
  
  /**
   * 添加WHERE条件
   * @param condition SQL条件字符串
   * @returns 查询构建器
   */
  where(condition: string): QueryBuilder;
  
  /**
   * 添加限制
   * @param limit 限制数
   * @param offset 偏移量
   * @returns 查询构建器
   */
  limit(limit: number, offset?: number): QueryBuilder;
  
  /**
   * 添加排序
   * @param field 排序字段
   * @param direction 排序方向
   * @returns 查询构建器
   */
  orderBy(field: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  
  /**
   * 构建SQL查询语句
   * @returns SQL查询语句
   */
  build(): string;
}
