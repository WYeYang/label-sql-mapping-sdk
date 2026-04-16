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
    private inited;
    private constructor();
    static fromAppConfig(appConfigPath: string, lsmConfigPath: string, llm?: LLM): Promise<LSMSDK>;
    query(options: {
        query?: string;
        sql?: string;
        page?: number;
        pageSize?: number;
    }): Promise<QueryResult>;
}
//# sourceMappingURL=sdk.d.ts.map