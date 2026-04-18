// LLM 接口

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 消息
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
}

/**
 * LLM 接口
 */
export interface LLM {
  /**
   * 对话
   */
  chat(messages: Message[]): Promise<string>;
}

/**
 * LLM 配置
 */
export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}
