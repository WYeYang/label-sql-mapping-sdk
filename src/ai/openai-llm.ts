// OpenAI LLM 实现

import { LLM, LLMConfig, Message, Tool } from './types';
import { OpenAI } from 'openai';

export class OpenAILLM implements LLM {
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
    this.model = config.model;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 500;
  }

  async chat(messages: Omit<Message, 'toolCalls' | 'toolCallId'>[]): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages as any,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      response_format: { type: "json_object" }
    });
    return response.choices[0].message.content!;
  }

  async chatWithTools(
    messages: Message[],
    tools: Tool[],
    onToolCall: (name: string, args: Record<string, any>) => Promise<string>
  ): Promise<string> {
    // 转换消息格式
    const chatMessages = this.convertMessages(messages);
    
    // 调用 API
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: chatMessages as any,
      tools: tools as any,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    });

    const choice = response.choices[0] as any;
    
    // 检查是否需要工具调用
    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      // 处理工具调用
      const toolCalls = choice.message.tool_calls as any[];
      const toolResults: { tool_call_id: string; role: string; content: string }[] = [];

      for (const call of toolCalls) {
        const args = JSON.parse(call.function.arguments);
        const result = await onToolCall(call.function.name, args);
        toolResults.push({
          tool_call_id: call.id,
          role: 'tool',
          content: result
        });
      }

      // 追加工具结果到消息
      chatMessages.push(choice.message as any);
      toolResults.forEach(r => chatMessages.push(r as any));

      // 继续调用获取最终响应
      const finalResponse = await this.openai.chat.completions.create({
        model: this.model,
        messages: chatMessages as any,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      return (finalResponse.choices[0] as any).message.content!;
    }

    return (choice.message as any).content ?? '';
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: Message[]): any[] {
    return messages.map(msg => {
      const result: any = {
        role: msg.role,
        content: msg.content
      };
      
      if (msg.name) {
        result.name = msg.name;
      }
      
      if (msg.toolCalls) {
        result.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: tc.function
        }));
      }
      
      if (msg.toolCallId) {
        result.tool_call_id = msg.toolCallId;
      }
      
      return result;
    });
  }
}
