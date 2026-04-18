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
 * 数据库查询结果（原始）
 */
export interface DBQueryResult {
  rows: any[];           // 查询结果行
}

/**
 * SDK 统一查询结果
 */
export interface QueryResult {
  sql: string;
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  explanation?: string;
}

/**
 * 数据库操作接口
 */
export interface Database {
  query(sql: string): DBQueryResult;
  close(): void;
  getType(): DatabaseType;
  init(): Promise<void>;
}
