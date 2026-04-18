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
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * 工具调用
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * LLM 接口
 * 支持工具调用
 */
export interface LLM {
  /**
   * 基础对话
   */
  chat(messages: Omit<Message, 'toolCalls' | 'toolCallId'>[]): Promise<string>;

  /**
   * 带工具调用的对话
   * @param messages 消息历史
   * @param tools 工具定义
   * @param onToolCall 工具调用回调
   */
  chatWithTools(
    messages: Message[],
    tools: Tool[],
    onToolCall: (name: string, args: Record<string, any>) => Promise<string>
  ): Promise<string>;
}

/**
 * 工具定义
 */
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, any>;
  };
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
