import { LLMConfig } from '../ai';
export interface AppConfig {
    database: {
        path: string;
    };
    llm: {
        apiKey?: string;
        apiUrl?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
    };
}
export declare class AppConfigManager {
    private config;
    private configPath;
    constructor(configPath: string);
    load(): void;
    getDatabasePath(): string | null;
    getLLMConfig(): LLMConfig;
}
//# sourceMappingURL=app-config.d.ts.map