import { LLM } from './types';
export interface FilterResult {
    sql: string;
    explanation: string;
}
/**
 * LLM Manager
 */
export declare class LLMManager {
    private llm;
    constructor(llm: LLM);
    /**
     * 解析自然语言查询意图
     * 返回完整SQL语句
     */
    parseQuery(naturalLanguageQuery: string, schema: string): Promise<FilterResult>;
    /**
     * 兼容旧方法
     */
    generateSQL(naturalLanguageQuery: string, schema: string): Promise<{
        sql: string;
        explanation: string;
    }>;
}
//# sourceMappingURL=llm-manager.d.ts.map