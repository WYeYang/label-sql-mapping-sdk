"use strict";
// Git仓库管理
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitManager = void 0;
const simpleGit = __importStar(require("simple-git"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Git仓库管理器
 */
class GitManager {
    /**
     * 构造函数
     * @param config Git仓库配置
     */
    constructor(config) {
        this.config = config;
        this.git = simpleGit.simpleGit();
    }
    /**
     * 初始化Git仓库
     * @returns 初始化结果
     */
    async initialize() {
        try {
            // 检查本地路径是否存在
            if (!fs.existsSync(this.config.localPath)) {
                // 创建目录
                fs.mkdirSync(this.config.localPath, { recursive: true });
                // 克隆仓库
                await this.git.clone(this.config.repoUrl, this.config.localPath, this.config.branch ? { '--branch': this.config.branch } : {});
                return true;
            }
            else {
                // 本地路径已存在，检查是否是Git仓库
                const gitDir = path.join(this.config.localPath, '.git');
                if (fs.existsSync(gitDir)) {
                    // 是Git仓库，切换到指定分支
                    this.git = simpleGit.simpleGit(this.config.localPath);
                    if (this.config.branch) {
                        await this.git.checkout(this.config.branch);
                    }
                    return true;
                }
                else {
                    // 不是Git仓库，删除目录并重新克隆
                    fs.rmSync(this.config.localPath, { recursive: true, force: true });
                    fs.mkdirSync(this.config.localPath, { recursive: true });
                    // 克隆仓库
                    await this.git.clone(this.config.repoUrl, this.config.localPath, this.config.branch ? { '--branch': this.config.branch } : {});
                    return true;
                }
            }
        }
        catch (error) {
            console.error(`初始化Git仓库失败: ${error.message}`);
            return false;
        }
    }
    /**
     * 更新Git仓库
     * @returns 更新结果
     */
    async update() {
        try {
            // 确保仓库已初始化
            if (!await this.initialize()) {
                return {
                    success: false,
                    message: '仓库初始化失败',
                    updated: false
                };
            }
            // 获取当前提交
            const oldStatus = await this.git.status();
            const oldCommit = oldStatus.current || '';
            // 拉取最新代码
            await this.git.pull();
            // 获取更新后的提交
            const newStatus = await this.git.status();
            const newCommit = newStatus.current || '';
            // 检查是否有更新
            const updated = oldCommit !== newCommit;
            return {
                success: true,
                message: updated ? '仓库更新成功' : '仓库已是最新',
                updated,
                newCommit,
                oldCommit
            };
        }
        catch (error) {
            console.error(`更新Git仓库失败: ${error.message}`);
            return {
                success: false,
                message: `更新失败: ${error.message}`,
                updated: false
            };
        }
    }
    /**
     * 获取Git仓库状态
     * @returns 仓库状态
     */
    async getStatus() {
        try {
            // 确保仓库已初始化
            if (!await this.initialize()) {
                return null;
            }
            // 获取状态
            const status = await this.git.status();
            // 获取远程URL
            const remotes = await this.git.getRemotes(true);
            const remoteUrl = remotes[0]?.refs.fetch || '';
            return {
                branch: status.current || '',
                commit: status.current || '',
                status: status.detached ? 'detached' : 'normal',
                remoteUrl
            };
        }
        catch (error) {
            console.error(`获取Git仓库状态失败: ${error.message}`);
            return null;
        }
    }
    /**
     * 获取数据库文件路径
     * @returns 数据库文件路径
     */
    getDatabasePath() {
        return path.join(this.config.localPath, this.config.databaseFile);
    }
    /**
     * 检查数据库文件是否存在
     * @returns 是否存在
     */
    databaseExists() {
        return fs.existsSync(this.getDatabasePath());
    }
}
exports.GitManager = GitManager;
//# sourceMappingURL=git-manager.js.map