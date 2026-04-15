// Git操作类型定义

/**
 * Git仓库配置
 */
export interface GitConfig {
  repoUrl: string;      // 仓库URL
  branch?: string;      // 分支名称
  localPath: string;    // 本地存储路径
  databaseFile: string; // 数据库文件路径（相对于仓库根目录）
}

/**
 * Git更新结果
 */
export interface GitUpdateResult {
  success: boolean;     // 是否成功
  message: string;      // 结果消息
  updated: boolean;     // 是否有更新
  newCommit?: string;   // 新的提交哈希
  oldCommit?: string;   // 旧的提交哈希
}

/**
 * Git仓库状态
 */
export interface GitStatus {
  branch: string;       // 当前分支
  commit: string;       // 当前提交
  status: string;       // 仓库状态
  remoteUrl: string;    // 远程仓库URL
}
