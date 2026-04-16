"use strict";
// SQLite数据库实现
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteDatabase = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class SQLiteDatabase {
    constructor(config) {
        this.db = null;
        if (!config.path) {
            throw new Error('SQLite数据库路径不能为空');
        }
        this.path = config.path;
    }
    async init() {
        if (this.db)
            return;
        this.db = new better_sqlite3_1.default(this.path, { readonly: true });
    }
    query(sql) {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        const rows = this.db.prepare(sql).all();
        return { rows };
    }
    close() {
        this.db?.close();
    }
    getType() {
        return 'sqlite';
    }
}
exports.SQLiteDatabase = SQLiteDatabase;
//# sourceMappingURL=sqlite.js.map