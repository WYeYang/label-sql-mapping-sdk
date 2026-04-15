"use strict";
// 数据库工厂
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseFactory = void 0;
const sqlite_1 = require("./sqlite");
/**
 * 数据库工厂
 */
class DatabaseFactory {
    /**
     * 创建数据库实例
     * @param config 数据库配置
     * @returns 数据库实例
     */
    static create(config) {
        switch (config.type) {
            case 'sqlite':
                return new sqlite_1.SQLiteDatabase(config);
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
exports.DatabaseFactory = DatabaseFactory;
//# sourceMappingURL=factory.js.map