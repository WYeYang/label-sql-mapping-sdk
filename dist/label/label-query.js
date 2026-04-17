"use strict";
// 标签查询功能
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelQuery = void 0;
/**
 * 标签查询类
 */
class LabelQuery {
    /**
     * 构造函数
     * @param config LSM配置
     * @param database 数据库实例
     */
    constructor(config, database) {
        this.config = config;
        this.database = database;
    }
    /**
     * 查询标签数据列表
     * @param options 查询选项
     * @returns 标签数据列表
     */
    async getLabels(options = {}) {
        // 适配新旧配置格式：新格式支持 items 或 value+condition
        let labels = this.config.mappings.map(mapping => {
            // 如果有 items，使用 items
            if (mapping.items && mapping.items.length > 0) {
                return {
                    id: mapping.id,
                    name: mapping.name,
                    items: mapping.items.map(item => ({
                        condition: item.condition,
                        value: item.value
                    }))
                };
            }
            // 否则使用 value（单值模式）
            return {
                id: mapping.id,
                name: mapping.name,
                items: [{
                        condition: mapping.condition,
                        value: mapping.value || ''
                    }]
            };
        });
        // 应用过滤
        if (options.filter) {
            const filter = options.filter.toLowerCase();
            labels = labels.filter(label => label.id.toLowerCase().includes(filter) ||
                label.name.toLowerCase().includes(filter));
        }
        // 应用排序
        if (options.sortBy) {
            labels.sort((a, b) => {
                let compareValue = 0;
                if (options.sortBy === 'id') {
                    compareValue = a.id.localeCompare(b.id);
                }
                else if (options.sortBy === 'name') {
                    compareValue = a.name.localeCompare(b.name);
                }
                return options.sortDirection === 'DESC' ? -compareValue : compareValue;
            });
        }
        return labels;
    }
    /**
     * 查询指定数据的主标签
     * @param dataId 数据ID
     * @returns 主标签查询结果
     */
    async getMainLabel(dataId) {
        const results = [];
        // 遍历所有标签
        for (const mapping of this.config.mappings) {
            // 获取标签项列表（适配新旧格式）
            const items = mapping.items && mapping.items.length > 0
                ? mapping.items
                : mapping.value ? [{ condition: mapping.condition, value: mapping.value }]
                    : [];
            // 遍历标签的所有项
            for (const item of items) {
                // 跳过纯字段标签（无 condition 或 condition 是字段引用）
                if (!item.condition || item.value.includes('{keyword}')) {
                    continue;
                }
                // 构建查询SQL
                const sql = `SELECT * FROM ${this.config.database.tables[0].name} WHERE id = '${dataId}' AND ${item.condition}`;
                try {
                    // 执行查询
                    const queryResult = await this.database.query(sql);
                    // 如果查询有结果，说明数据匹配此标签项
                    if (queryResult.rows && queryResult.rows.length > 0) {
                        results.push({
                            labelId: mapping.id,
                            labelName: mapping.name,
                            itemValue: item.value,
                            condition: item.condition
                        });
                        // 每个标签只取第一个匹配的项
                        break;
                    }
                }
                catch (error) {
                    // 忽略查询错误，继续下一个标签项
                    console.warn(`查询标签 ${mapping.id} 时出错: ${error.message}`);
                }
            }
        }
        return results;
    }
    /**
     * 根据标签ID获取标签信息
     * @param labelId 标签ID
     * @returns 标签数据
     */
    getLabelById(labelId) {
        const mapping = this.config.mappings.find(m => m.id === labelId);
        if (!mapping) {
            return null;
        }
        // 获取标签项列表（适配新旧格式）
        const items = mapping.items && mapping.items.length > 0
            ? mapping.items
            : mapping.value ? [{ condition: mapping.condition, value: mapping.value }]
                : [];
        return {
            id: mapping.id,
            name: mapping.name,
            items: items.map(item => ({
                condition: item.condition,
                value: item.value
            }))
        };
    }
    /**
     * 转换标签为SQL条件
     * @param labelId 标签ID
     * @param itemValue 标签项值
     * @returns SQL条件
     */
    getLabelCondition(labelId, itemValue) {
        const mapping = this.config.mappings.find(m => m.id === labelId);
        if (!mapping) {
            return null;
        }
        // 获取标签项列表（适配新旧格式）
        const items = mapping.items && mapping.items.length > 0
            ? mapping.items
            : mapping.value ? [{ condition: mapping.condition, value: mapping.value }]
                : [];
        const item = items.find(i => i.value === itemValue);
        if (!item) {
            return null;
        }
        return item.condition || null;
    }
}
exports.LabelQuery = LabelQuery;
//# sourceMappingURL=label-query.js.map