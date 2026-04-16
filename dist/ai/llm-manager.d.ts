import { LLM } from './types';
/**
 * LLM Manager
 */
export declare class LLMManager {
    private llm;
    constructor(llm: LLM);
    /**
     * 生成筛选条件（WHERE子句）
     * 只生成 WHERE 部分，SELECT 由程序拼接
     */
    generateFilter(naturalLanguageQuery: string, schema: string): Promise<{
        where: string;
        explanation: string;
    }>;
    /**
     * 兼容旧方法
     */
    generateSQL(naturalLanguageQuery: string, schema: string): Promise<{
        sql: string;
        explanation: string;
    }>;
}
//# sourceMappingURL=llm-manager.d.ts.map