import { LLM } from './types';
export interface FilterResult {
    sql: string;
    explanation: string;
}
export interface ParseResult extends FilterResult {
    extensions?: ExtensionInfo[];
}
export interface ExtensionInfo {
    id: string;
    values: string[];
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
    parseQuery(naturalLanguageQuery: string, schema: string): Promise<ParseResult>;
}
//# sourceMappingURL=llm-manager.d.ts.map