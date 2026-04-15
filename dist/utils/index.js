"use strict";
// 工具函数
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.generateId = generateId;
exports.deepClone = deepClone;
exports.debounce = debounce;
exports.throttle = throttle;
exports.isValidEmail = isValidEmail;
exports.isValidUrl = isValidUrl;
/**
 * 格式化时间
 * @param date 日期对象或时间戳
 * @returns 格式化后的时间字符串
 */
function formatDate(date) {
    const d = new Date(date);
    return d.toISOString();
}
/**
 * 生成唯一ID
 * @returns 唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
/**
 * 深拷贝对象
 * @param obj 要拷贝的对象
 * @returns 拷贝后的对象
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * 防抖函数
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
/**
 * 节流函数
 * @param func 要执行的函数
 * @param limit 时间限制（毫秒）
 * @returns 节流后的函数
 */
function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否为有效邮箱
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * 验证URL格式
 * @param url URL地址
 * @returns 是否为有效URL
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=index.js.map