/**
 * Git仓库配置
 */
export interface GitConfig {
    repoUrl: string;
    branch?: string;
    localPath: string;
    databaseFile: string;
}
/**
 * Git更新结果
 */
export interface GitUpdateResult {
    success: boolean;
    message: string;
    updated: boolean;
    newCommit?: string;
    oldCommit?: string;
}
/**
 * Git仓库状态
 */
export interface GitStatus {
    branch: string;
    commit: string;
    status: string;
    remoteUrl: string;
}
//# sourceMappingURL=types.d.ts.map