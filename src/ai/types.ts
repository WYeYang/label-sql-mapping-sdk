// AI模块类型定义

/**
 * 大模型配置
 */
export interface LLMConfig {
  provider: string;      // 模型提供商
  apiKey: string;        // API密钥
  model: string;         // 模型名称
  baseUrl?: string;      // API基础URL
  temperature?: number;  // 温度参数
  maxTokens?: number;    // 最大 tokens
  timeout?: number;      // 超时时间（毫秒）
}

/**
 * 自然语言查询请求
 */
export interface NLPQueryRequest {
  query: string;         // 自然语言查询语句
  context?: any;         // 上下文信息
  maxResults?: number;   // 最大返回结果数
}

/**
 * 自然语言查询结果
 */
export interface NLPQueryResult {
  sql: string;           // 生成的SQL语句
  results: any[];        // 查询结果
  explanation?: string;  // 解释说明
}

/**
 * AI检索请求
 */
export interface AIRetrievalRequest {
  query: string;         // 检索查询语句
  labels?: string[];     // 标签过滤
  limit?: number;        // 限制返回数量
}

/**
 * AI检索结果
 */
export interface AIRetrievalResult {
  items: AIRetrievalItem[]; // 检索结果项
  total: number;          // 总结果数
}

/**
 * AI检索结果项
 */
export interface AIRetrievalItem {
  id: string;            // 数据ID
  content: any;          // 数据内容
  score: number;         // 相关度分数
  labels: string[];      // 关联标签
}
