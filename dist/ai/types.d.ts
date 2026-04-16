export interface LLM {
    chat(messages: {
        role: 'system' | 'user' | 'assistant';
        content: string;
    }[]): Promise<string>;
}
export interface LLMConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
}
//# sourceMappingURL=types.d.ts.map