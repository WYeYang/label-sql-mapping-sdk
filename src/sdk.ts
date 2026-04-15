// SDK核心类

import { LSMConfig, parseConfig } from './config';
import { Database, DBConfig, DatabaseFactory, SQLQueryBuilder, QueryResult } from './db';

/**
 * LSM SDK 核心类
 */
export class LSMSDK {
  private config: LSMConfig;
  private database: Database;

  /**
   * 构造函数
   * @param configPath LSM配置文件路径
   * @param dbConfig 数据库配置
   */
  constructor(configPath: string, dbConfig: DBConfig) {
    // 解析LSM配置
    this.config = parseConfig(configPath);
    
    // 创建数据库实例
    this.database = DatabaseFactory.create(dbConfig);
  }

  /**
   * 获取LSM配置
   * @returns LSM配置
   */
  getConfig(): LSMConfig {
    return this.config;
  }

  /**
   * 获取数据库实例
   * @returns 数据库实例
   */
  getDatabase(): Database {
    return this.database;
  }

  /**
   * 执行查询
   * @param condition SQL条件
   * @param options 查询选项
   * @returns 查询结果
   */
  async query(condition: string, options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<QueryResult> {
    // 创建查询构建器
    const queryBuilder = new SQLQueryBuilder();
    
    // 构建SQL查询
    const sql = queryBuilder
      .from(this.config.database.tables)
      .where(condition)
      .limit(options?.limit || 0, options?.offset || 0)
      .orderBy(options?.orderBy || '', options?.orderDirection || 'ASC')
      .build();
    
    // 执行查询
    return this.database.query(sql);
  }

  /**
   * 执行SQL语句
   * @param sql SQL语句
   * @param params 参数
   * @returns 受影响的行数
   */
  async execute(sql: string, params?: any[]): Promise<number> {
    return this.database.execute(sql, params);
  }

  /**
   * 关闭SDK
   */
  async close(): Promise<void> {
    await this.database.close();
  }
}
