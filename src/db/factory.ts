// 数据库工厂

import { Database, DBConfig } from './types';
import { SQLiteDatabase } from './sqlite';
import { DatabaseType } from '../config';

/**
 * 数据库工厂
 */
export class DatabaseFactory {
  /**
   * 创建数据库实例
   * @param config 数据库配置
   * @returns 数据库实例
   */
  static create(config: DBConfig): Database {
    switch (config.type) {
      case 'sqlite':
        return new SQLiteDatabase(config);
      case 'mysql':
        // 未来实现MySQL支持
        throw new Error('MySQL数据库暂不支持');
      case 'postgres':
        // 未来实现PostgreSQL支持
        throw new Error('PostgreSQL数据库暂不支持');
      case 'mssql':
        // 未来实现SQL Server支持
        throw new Error('SQL Server数据库暂不支持');
      default:
        throw new Error(`不支持的数据库类型: ${config.type}`);
    }
  }
}
