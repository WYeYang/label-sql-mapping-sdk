import { LLM } from './types';
/**
 * LLM Manager
 */
export declare class LLMManager {
    private llm;
    constructor(llm: LLM);
    generateSQL(naturalLanguageQuery: string, schema: string): Promise<{
        sql: string;
        explanation: string;
    }>;
}
//# sourceMappingURL=llm-manager.d.ts.map