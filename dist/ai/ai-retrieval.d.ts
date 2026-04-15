import { AIRetrievalRequest, AIRetrievalResult } from './types';
import { Database } from '../db';
/**
 * AI检索工具
 */
export declare class AIRetrieval {
    private database;
    /**
     * 构造函数
     * @param database 数据库实例
     */
    constructor(database: Database);
    /**
     * 执行AI检索
     * @param request 检索请求
     * @returns 检索结果
     */
    retrieve(request: AIRetrievalRequest): Promise<AIRetrievalResult>;
    /**
     * 从数据中提取标签
     * @param data 数据
     * @returns 标签数组
     */
    private extractLabels;
}
//# sourceMappingURL=ai-retrieval.d.ts.map