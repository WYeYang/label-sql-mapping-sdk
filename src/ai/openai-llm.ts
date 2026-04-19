// OpenAI LLM 实现

import { LLM, LLMConfig, Message, Tool, ToolCall } from './types';
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

  async chat(messages: Message[]): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages as any,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      response_format: { type: "json_object" }
    });
    return response.choices[0].message.content!;
  }

  async chatWithTools(messages: Message[], tools: Tool[]): Promise<{
    content: string;
    toolCalls: ToolCall[];
  }> {
    const openaiTools = tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties: tool.params.reduce((acc, param) => {
            acc[param.name] = { type: param.type, description: param.description };
            return acc;
          }, {} as Record<string, { type: string; description: string }>),
          required: tool.params.filter(p => p.required).map(p => p.name)
        }
      }
    }));

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages as any,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      tools: openaiTools,
      tool_choice: 'auto'
    });

    const message = response.choices[0].message;
    const toolCalls: ToolCall[] = (message.tool_calls || []).map((call: any) => ({
      name: call.function.name,
      arguments: JSON.parse(call.function.arguments)
    }));

    return {
      content: message.content || '',
      toolCalls
    };
  }
}
