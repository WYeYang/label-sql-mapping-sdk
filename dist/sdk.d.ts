import { LLM } from './ai/types';
import { QueryResult } from './db/types';
export { QueryResult } from './db/types';
export declare class LSMSDK {
    private readonly database;
    private readonly llmManager;
    private readonly nlpQuery;
    private readonly queryExecutor;
    private inited;
    private constructor();
    static fromAppConfig(lsmConfigPath: string, llm?: LLM): Promise<LSMSDK>;
    /**
     * 自然语言查询
     */
    query(options: {
        query?: string;
        sql?: string;
        page?: number;
        pageSize?: number;
    }): Promise<QueryResult>;
}
//# sourceMappingURL=sdk.d.ts.map