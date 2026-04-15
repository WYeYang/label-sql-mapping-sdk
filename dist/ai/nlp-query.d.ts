import { NLPQueryRequest, NLPQueryResult } from './types';
import { Database } from '../db';
import { LLMManager } from './llm-manager';
/**
 * 自然语言查询工具
 */
export declare class NLPQuery {
    private database;
    private llmManager;
    /**
     * 构造函数
     * @param database 数据库实例
     * @param llmManager 大模型管理器
     */
    constructor(database: Database, llmManager: LLMManager);
    /**
     * 执行自然语言查询
     * @param request 查询请求
     * @returns 查询结果
     */
    execute(request: NLPQueryRequest): Promise<NLPQueryResult>;
    /**
     * 获取数据库schema信息
     * @returns schema信息
     */
    private getDatabaseSchema;
}
//# sourceMappingURL=nlp-query.d.ts.map