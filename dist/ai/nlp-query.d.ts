import { LLMManager } from './llm-manager';
import { LSMConfig } from '../config';
/**
 * 自然语言查询工具
 */
export declare class NLPQuery {
    private llmManager;
    private config;
    constructor(llmManager: LLMManager, config: LSMConfig);
    execute(query: string): Promise<import("./llm-manager").FilterResult>;
}
//# sourceMappingURL=nlp-query.d.ts.map