// 数据库操作类型定义

import { DatabaseType } from '../config';

/**
 * 数据库连接配置
 */
export interface DBConfig {
  type: DatabaseType;    // 数据库类型
  path?: string;         // SQLite数据库文件路径
}

/**
 * 查询结果
 */
export interface QueryResult {
  rows: any[];           // 查询结果行
}

/**
 * 数据库操作接口
 */
export interface Database {
  query(sql: string): QueryResult;
  close(): void;
  getType(): DatabaseType;
  init(): Promise<void>;
}
