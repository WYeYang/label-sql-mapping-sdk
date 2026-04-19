// LLM 接口

/**
 * 消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * 消息
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
}

/**
 * 工具参数定义
 */
export interface ToolParam {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

/**
 * 工具定义
 */
export interface Tool {
  name: string;
  description: string;
  params: ToolParam[];
}

/**
 * 工具调用结果
 */
export interface ToolCall {
  name: string;
  arguments: Record<string, string | number | boolean>;
}

/**
 * LLM 接口
 */
export interface LLM {
  /**
   * 对话
   */
  chat(messages: Message[]): Promise<string>;

  /**
   * 带工具调用的对话
   */
  chatWithTools(messages: Message[], tools: Tool[]): Promise<{
    content: string;
    toolCalls: ToolCall[];
  }>;
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
