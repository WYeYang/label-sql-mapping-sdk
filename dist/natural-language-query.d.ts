export interface QueryResult {
    sql: string;
    data: any[];
    explanation?: string;
}
export declare class NaturalLanguageQuery {
    private sdk;
    private nlpQuery;
    constructor(appConfigPath: string, lsmConfigPath: string);
    query(query: string): Promise<QueryResult>;
    close(): Promise<void>;
}
//# sourceMappingURL=natural-language-query.d.ts.map