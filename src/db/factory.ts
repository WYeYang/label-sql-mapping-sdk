// 数据库工厂

import { Database, DBConfig } from './types';
import { SQLiteDatabase } from './sqlite';
import { AppConfigManager } from '../config';
import { LSMConfig } from '../config';

/**
 * 数据库工厂
 */
export class DatabaseFactory {
  static create(appConfigManager: AppConfigManager, lsmConfig: LSMConfig): Database {
    const dbPath = appConfigManager.getDatabasePath();
    if (!dbPath) {
      throw new Error('错误: 请在应用配置文件中配置数据库文件路径');
    }

    const config: DBConfig = { type: lsmConfig.database.type, path: dbPath };

    switch (config.type) {
      case 'sqlite':
        return new SQLiteDatabase(config);
      case 'mysql':
        throw new Error('MySQL数据库暂不支持');
      case 'postgres':
        throw new Error('PostgreSQL数据库暂不支持');
      case 'mssql':
        throw new Error('SQL Server数据库暂不支持');
      default:
        throw new Error(`不支持的数据库类型: ${config.type}`);
    }
  }
}
