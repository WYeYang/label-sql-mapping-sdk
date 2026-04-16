import { LLM } from './ai/types';
export interface QueryResult {
    sql: string;
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    explanation?: string;
}
export declare class LSMSDK {
    private readonly lsmConfig;
    private readonly database;
    private readonly llmManager;
    private readonly nlpQuery;
    private readonly sqlBuilder;
    private inited;
    private constructor();
    static fromAppConfig(appConfigPath: string, lsmConfigPath: string, llm?: LLM): Promise<LSMSDK>;
    /**
     * 自然语言查询
     * AI只生成WHERE条件，SELECT由程序拼接
     */
    query(options: {
        query?: string;
        where?: string;
        sql?: string;
        page?: number;
        pageSize?: number;
    }): Promise<QueryResult>;
    /**
     * 仅生成WHERE条件（不执行查询）
     */
    generateFilter(query: string): Promise<{
        where: string;
        explanation: string;
    }>;
    /**
     * 执行自定义WHERE条件查询
     */
    queryByWhere(where: string, options?: {
        page?: number;
        pageSize?: number;
    }): Promise<QueryResult>;
}
//# sourceMappingURL=sdk.d.ts.map