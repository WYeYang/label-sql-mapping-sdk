// SQLite数据库实现

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { Database as IDatabase, DBConfig, DBQueryResult } from './types';
import { DatabaseType as DBKind } from '../config';

export class SQLiteDatabase implements IDatabase {
  private db: DatabaseType | null = null;

  constructor(config: DBConfig) {
    if (!config.path) {
      throw new Error('SQLite数据库路径不能为空');
    }
    this.path = config.path;
  }

  private path: string;

  async init(): Promise<void> {
    if (this.db) return;
    this.db = new Database(this.path, { readonly: true });
  }

  query(sql: string): DBQueryResult {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
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
