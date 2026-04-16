"use strict";
// 数据库工厂
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseFactory = void 0;
const sqlite_1 = require("./sqlite");
/**
 * 数据库工厂
 */
class DatabaseFactory {
    static create(appConfigManager, lsmConfig) {
        const dbPath = appConfigManager.getDatabasePath();
        if (!dbPath) {
            throw new Error('错误: 请在应用配置文件中配置数据库文件路径');
        }
        const config = { type: lsmConfig.database.type, path: dbPath };
        switch (config.type) {
            case 'sqlite':
                return new sqlite_1.SQLiteDatabase(config);
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
exports.DatabaseFactory = DatabaseFactory;
//# sourceMappingURL=factory.js.map