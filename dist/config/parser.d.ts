import { LSMConfig } from './types';
/**
 * 解析LSM配置文件（单例模式）
 */
export declare function parseConfig(configPath: string): LSMConfig;
/**
 * 验证配置是否符合LSM规范
 * @param config LSM配置对象
 * @returns 是否符合规范
 */
export declare function validateLSMConfig(config: LSMConfig): boolean;
//# sourceMappingURL=parser.d.ts.map