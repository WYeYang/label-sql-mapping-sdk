import { LLMConfig } from './types';
/**
 * 大模型管理器
 */
export declare class LLMManager {
    private config;
    private openai;
    /**
     * 构造函数
     * @param config 大模型配置
     */
    constructor(config: LLMConfig);
    /**
     * 获取大模型配置
     * @returns 大模型配置
     */
    getConfig(): LLMConfig;
    /**
     * 更新大模型配置
     * @param config 新的配置
     */
    updateConfig(config: Partial<LLMConfig>): void;
    /**
     * 生成SQL查询
     * @param naturalLanguageQuery 自然语言查询
     * @param schema 数据库 schema 信息
     * @returns 生成的SQL查询
     */
    generateSQL(naturalLanguageQuery: string, schema: string): Promise<{
        sql: string;
        explanation: string;
    }>;
}
//# sourceMappingURL=llm-manager.d.ts.map