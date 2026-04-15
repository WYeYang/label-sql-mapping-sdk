/**
 * 大模型配置
 */
export interface LLMConfig {
    provider: string;
    apiKey: string;
    model: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
}
/**
 * 自然语言查询请求
 */
export interface NLPQueryRequest {
    query: string;
    context?: any;
    maxResults?: number;
}
/**
 * 自然语言查询结果
 */
export interface NLPQueryResult {
    sql: string;
    results: any[];
    explanation?: string;
}
/**
 * AI检索请求
 */
export interface AIRetrievalRequest {
    query: string;
    labels?: string[];
    limit?: number;
}
/**
 * AI检索结果
 */
export interface AIRetrievalResult {
    items: AIRetrievalItem[];
    total: number;
}
/**
 * AI检索结果项
 */
export interface AIRetrievalItem {
    id: string;
    content: any;
    score: number;
    labels: string[];
}
//# sourceMappingURL=types.d.ts.map