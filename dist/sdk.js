"use strict";
// SDK核心类
Object.defineProperty(exports, "__esModule", { value: true });
exports.LSMSDK = void 0;
const config_1 = require("./config");
const db_1 = require("./db");
/**
 * LSM SDK 核心类
 */
class LSMSDK {
    /**
     * 构造函数
     * @param configPath LSM配置文件路径
     * @param dbConfig 数据库配置
     */
    constructor(configPath, dbConfig) {
        // 解析LSM配置
        this.config = (0, config_1.parseConfig)(configPath);
        // 创建数据库实例
        this.database = db_1.DatabaseFactory.create(dbConfig);
    }
    /**
     * 获取LSM配置
     * @returns LSM配置
     */
    getConfig() {
        return this.config;
    }
    /**
     * 获取数据库实例
     * @returns 数据库实例
     */
    getDatabase() {
        return this.database;
    }
    /**
     * 执行查询
     * @param condition SQL条件
     * @param options 查询选项
     * @returns 查询结果
     */
    async query(condition, options) {
        // 创建查询构建器
        const queryBuilder = new db_1.SQLQueryBuilder();
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
    async execute(sql, params) {
        return this.database.execute(sql, params);
    }
    /**
     * 关闭SDK
     */
    async close() {
        await this.database.close();
    }
}
exports.LSMSDK = LSMSDK;
//# sourceMappingURL=sdk.js.map