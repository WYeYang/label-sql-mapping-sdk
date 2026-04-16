import { LLMConfig } from '../ai';
import { LSMConfig } from './index';
export declare class AppConfigManager {
    readonly appConfigPath: string;
    readonly lsmConfigPath: string;
    private appConfig;
    private lsmConfig;
    private constructor();
    static getInstance(appConfigPath: string, lsmConfigPath: string): AppConfigManager;
    private load;
    getDatabasePath(): string;
    getLLMConfig(): LLMConfig;
    getLSMConfig(): LSMConfig;
}
//# sourceMappingURL=app-config.d.ts.map