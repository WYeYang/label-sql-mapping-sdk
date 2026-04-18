import { QueryMode } from './db/query-executor';
import { LLM } from './ai/types';
import { QueryResult } from './db/types';
export { QueryResult } from './db/types';
export { QueryMode } from './db/query-executor';
export declare class LSMSDK {
    private readonly database;
    private readonly llmManager;
    private readonly nlpQuery;
    private readonly queryExecutor;
    private readonly extMerger;
    private inited;
    private constructor();
    static fromAppConfig(lsmConfigPath: string, llm?: LLM): Promise<LSMSDK>;
    /**
     * 自然语言查询
     * @param options.query 自然语言查询
     * @param options.sql 原始SQL（与query二选一）
     * @param options.page 页码，默认1
     * @param options.pageSize 每页数量，默认20
     * @param options.mode 查询模式：list(列表) 或 detail(详情)
     * @param options.extensions 扩展标签值列表（会根据配置找到对应ID后合并）
     */
    query(options: {
        query?: string;
        sql?: string;
        page?: number;
        pageSize?: number;
        mode?: QueryMode;
        extensions?: string[];
    }): Promise<QueryResult>;
    /**
     * 将 WHERE 条件追加到 SQL 末尾
     */
    private appendWhereCondition;
}
//# sourceMappingURL=sdk.d.ts.map