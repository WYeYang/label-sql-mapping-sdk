import { LLMConfig } from '../ai';
import { LSMConfig, MappingItem } from './index';
/**
 * 扩展标签映射
 */
export interface ExtensionMapping {
    id: string;
    name: string;
    description?: string;
    items: MappingItem[];
}
export declare class AppConfigManager {
    readonly appConfigPath: string;
    readonly lsmConfigPath: string;
    private appConfig;
    private lsmConfig;
    private extensions;
    private extensionsLoaded;
    private extensionsSimplifiedText;
    private constructor();
    /**
     * 创建新实例（会自动查找配置文件）
     */
    static new(lsmConfigPath: string): AppConfigManager;
    /**
     * 获取已有实例
     */
    static get(): AppConfigManager;
    private load;
    /**
     * 加载扩展标签配置
     * 支持两种格式：
     * 1. 有 items 的格式：items: [{condition, value}]
     * 2. 只有 values 的格式：values: ["value1", "value2"]
     */
    private loadExtensions;
    getDatabasePath(): string;
    getLLMConfig(): LLMConfig;
    getLSMConfig(): LSMConfig;
    /**
     * 获取配置目录
     */
    getConfigDir(): string;
    /**
     * 获取所有扩展标签
     */
    getExtensions(): ExtensionMapping[];
    /**
     * 根据 ID 获取扩展标签
     */
    getExtensionById(id: string): ExtensionMapping | undefined;
    /**
     * 获取简化的扩展标签文本格式
     * 用于直接传给 AI，缓存结果
     */
    getExtensionsSimplifiedText(): string;
}
//# sourceMappingURL=app-config.d.ts.map