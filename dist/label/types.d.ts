import { MappingItem } from '../config/types';
/**
 * 扩展标签映射
 */
export interface ExtensionMapping {
    id: string;
    name: string;
    description?: string;
    items: MappingItem[];
}
/**
 * 工具调用结果
 */
export interface ToolCallResult {
    labels: ExtensionMapping[];
    sql?: string;
}
//# sourceMappingURL=types.d.ts.map