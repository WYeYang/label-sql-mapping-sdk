export interface YGOCard {
    id: number;
    name: string;
    atk?: number;
    def?: number;
    level?: number;
    desc?: string;
    [key: string]: any;
}
export interface YGOQueryResult {
    sql: string;
    cards: YGOCard[];
    explanation?: string;
}
export declare class YGOProQuery {
    private sdk;
    private nlpQuery;
    /**
     * 构造函数
     * @param appConfigPath 应用配置文件路径
     * @param lsmConfigPath LSM配置文件路径
     */
    constructor(appConfigPath: string, lsmConfigPath: string);
    /**
     * 执行自然语言查询
     * @param query 自然语言查询
     * @returns 查询结果
     */
    query(query: string): Promise<YGOQueryResult>;
    /**
     * 关闭SDK
     */
    close(): Promise<void>;
}
//# sourceMappingURL=ygopro-query.d.ts.map