import { LLMManager, ParseResult } from './llm-manager';
import { LSMConfig } from '../config';
export { ParseResult };
/**
 * 自然语言查询工具
 */
export declare class NLPQuery {
    private llmManager;
    private config;
    constructor(llmManager: LLMManager, config: LSMConfig);
    execute(query: string): Promise<ParseResult>;
}
//# sourceMappingURL=nlp-query.d.ts.map