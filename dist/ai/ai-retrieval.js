"use strict";
// AI检索工具
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRetrieval = void 0;
/**
 * AI检索工具
 */
class AIRetrieval {
    /**
     * 构造函数
     * @param database 数据库实例
     */
    constructor(database) {
        this.database = database;
    }
    /**
     * 执行AI检索
     * @param request 检索请求
     * @returns 检索结果
     */
    async retrieve(request) {
        try {
            // 构建查询SQL
            let sql = 'SELECT * FROM cards WHERE 1=1';
            const params = [];
            // 添加标签过滤
            if (request.labels && request.labels.length > 0) {
                // 这里简化处理，实际应该根据标签映射生成对应的SQL条件
                sql += ' AND type IN (?)';
                params.push(request.labels);
            }
            // 添加查询条件
            if (request.query) {
                sql += ' AND name LIKE ?';
                params.push(`%${request.query}%`);
            }
            // 添加限制
            if (request.limit) {
                sql += ' LIMIT ?';
                params.push(request.limit);
            }
            // 执行查询
            const result = await this.database.query(sql, params);
            // 构建检索结果
            const items = result.rows.map((row, index) => ({
                id: row.id.toString(),
                content: row,
                score: 1.0 - (index * 0.1), // 模拟分数
                labels: this.extractLabels(row)
            }));
            return {
                items,
                total: items.length
            };
        }
        catch (error) {
            console.error(`AI检索失败: ${error.message}`);
            return {
                items: [],
                total: 0
            };
        }
    }
    /**
     * 从数据中提取标签
     * @param data 数据
     * @returns 标签数组
     */
    extractLabels(data) {
        const labels = [];
        // 这里根据数据结构提取标签
        // 实际实现应该根据LSM配置中的映射关系提取标签
        if (data.type) {
            labels.push(`type:${data.type}`);
        }
        if (data.attribute) {
            labels.push(`attribute:${data.attribute}`);
        }
        if (data.race) {
            labels.push(`race:${data.race}`);
        }
        return labels;
    }
}
exports.AIRetrieval = AIRetrieval;
//# sourceMappingURL=ai-retrieval.js.map