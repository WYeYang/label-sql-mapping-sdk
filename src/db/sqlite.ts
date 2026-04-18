// SQLite数据库实现

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { Database as IDatabase, DBConfig, DBQueryResult } from './types';
import { DatabaseType as DBKind } from '../config';

export class SQLiteDatabase implements IDatabase {
  private db: DatabaseType;

  constructor(config: DBConfig) {
    console.log('[SQLiteDatabase] config.path:', config.path);
    if (!config.path) {
      throw new Error('SQLite数据库路径不能为空');
    }
    this.db = new Database(config.path, { readonly: true });
    this.path = config.path;
  }

  private path: string;

  query(sql: string): DBQueryResult {
    const rows = this.db.prepare(sql).all();
    return { rows };
  }

  close(): void {
    this.db?.close();
  }

  getType(): DBKind {
    return 'sqlite';
  }
}
