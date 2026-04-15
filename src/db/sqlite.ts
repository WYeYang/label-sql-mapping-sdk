// SQLite数据库实现

import * as sqlite3 from 'sqlite3';
import { Database, DBConfig, QueryResult } from './types';
import { DatabaseType } from '../config';

/**
 * SQLite数据库实现
 */
export class SQLiteDatabase implements Database {
  private db: sqlite3.Database;
  private type: DatabaseType = 'sqlite';

  /**
   * 构造函数
   * @param config 数据库配置
   */
  constructor(config: DBConfig) {
    if (!config.path) {
      throw new Error('SQLite数据库路径不能为空');
    }

    this.db = new sqlite3.Database(config.path, (err) => {
      if (err) {
        throw new Error(`连接SQLite数据库失败: ${err.message}`);
      }
    });
  }

  /**
   * 执行SQL查询
   * @param sql SQL语句
   * @param params 参数
   * @returns 查询结果
   */
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(new Error(`查询失败: ${err.message}`));
          return;
        }

        resolve({
          rows: rows || []
        });
      });
    });
  }

  /**
   * 执行SQL语句（无返回结果）
   * @param sql SQL语句
   * @param params 参数
   * @returns 受影响的行数
   */
  async execute(sql: string, params: any[] = []): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`执行SQL失败: ${err.message}`));
          return;
        }

        resolve(this.changes);
      });
    });
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(new Error(`关闭数据库连接失败: ${err.message}`));
          return;
        }

        resolve();
      });
    });
  }

  /**
   * 获取数据库类型
   * @returns 数据库类型
   */
  getType(): DatabaseType {
    return this.type;
  }
}
