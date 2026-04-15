import { LSMConfig } from '../config';
import { Database } from '../db';
import { LabelData, LabelQueryOptions, MainLabelResult } from './types';
/**
 * 标签查询类
 */
export declare class LabelQuery {
    private config;
    private database;
    /**
     * 构造函数
     * @param config LSM配置
     * @param database 数据库实例
     */
    constructor(config: LSMConfig, database: Database);
    /**
     * 查询标签数据列表
     * @param options 查询选项
     * @returns 标签数据列表
     */
    getLabels(options?: LabelQueryOptions): Promise<LabelData[]>;
    /**
     * 查询指定数据的主标签
     * @param dataId 数据ID
     * @returns 主标签查询结果
     */
    getMainLabel(dataId: string): Promise<MainLabelResult[]>;
    /**
     * 根据标签ID获取标签信息
     * @param labelId 标签ID
     * @returns 标签数据
     */
    getLabelById(labelId: string): LabelData | null;
    /**
     * 转换标签为SQL条件
     * @param labelId 标签ID
     * @param itemName 标签项名称
     * @returns SQL条件
     */
    getLabelCondition(labelId: string, itemName: string): string | null;
}
//# sourceMappingURL=label-query.d.ts.map