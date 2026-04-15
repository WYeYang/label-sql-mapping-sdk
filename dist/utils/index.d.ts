/**
 * 格式化时间
 * @param date 日期对象或时间戳
 * @returns 格式化后的时间字符串
 */
export declare function formatDate(date: Date | number): string;
/**
 * 生成唯一ID
 * @returns 唯一ID
 */
export declare function generateId(): string;
/**
 * 深拷贝对象
 * @param obj 要拷贝的对象
 * @returns 拷贝后的对象
 */
export declare function deepClone<T>(obj: T): T;
/**
 * 防抖函数
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * 节流函数
 * @param func 要执行的函数
 * @param limit 时间限制（毫秒）
 * @returns 节流后的函数
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否为有效邮箱
 */
export declare function isValidEmail(email: string): boolean;
/**
 * 验证URL格式
 * @param url URL地址
 * @returns 是否为有效URL
 */
export declare function isValidUrl(url: string): boolean;
//# sourceMappingURL=index.d.ts.map