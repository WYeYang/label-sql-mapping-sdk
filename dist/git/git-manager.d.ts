import { GitConfig, GitUpdateResult, GitStatus } from './types';
/**
 * Git仓库管理器
 */
export declare class GitManager {
    private config;
    private git;
    /**
     * 构造函数
     * @param config Git仓库配置
     */
    constructor(config: GitConfig);
    /**
     * 初始化Git仓库
     * @returns 初始化结果
     */
    initialize(): Promise<boolean>;
    /**
     * 更新Git仓库
     * @returns 更新结果
     */
    update(): Promise<GitUpdateResult>;
    /**
     * 获取Git仓库状态
     * @returns 仓库状态
     */
    getStatus(): Promise<GitStatus | null>;
    /**
     * 获取数据库文件路径
     * @returns 数据库文件路径
     */
    getDatabasePath(): string;
    /**
     * 检查数据库文件是否存在
     * @returns 是否存在
     */
    databaseExists(): boolean;
}
//# sourceMappingURL=git-manager.d.ts.map