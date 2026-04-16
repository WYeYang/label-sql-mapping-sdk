import { LLMManager } from './llm-manager';
import { LSMConfig } from '../config';
export interface NLResult {
    sql: string;
    where: string;
    explanation: string;
}
/**
 * 自然语言查询工具
 */
export declare class NLPQuery {
    private llmManager;
    private config;
    constructor(llmManager: LLMManager, config: LSMConfig);
    execute(query: string): Promise<NLResult>;
}
//# sourceMappingURL=nlp-query.d.ts.map