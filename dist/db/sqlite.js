"use strict";
// SQLite数据库实现
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteDatabase = void 0;
const sqlite3 = __importStar(require("sqlite3"));
/**
 * SQLite数据库实现
 */
class SQLiteDatabase {
    /**
     * 构造函数
     * @param config 数据库配置
     */
    constructor(config) {
        this.type = 'sqlite';
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
    async query(sql, params = []) {
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
    async execute(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
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
    async close() {
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
    getType() {
        return this.type;
    }
}
exports.SQLiteDatabase = SQLiteDatabase;
//# sourceMappingURL=sqlite.js.map