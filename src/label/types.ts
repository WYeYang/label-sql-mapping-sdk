// 标签查询类型定义

import { LabelMapping, MappingItem } from '../config';

/**
 * 标签数据
 */
export interface LabelData {
  id: string;          // 标签ID
  name: string;        // 标签名称
  items: LabelItem[];  // 标签项
}

/**
 * 标签项
 */
export interface LabelItem {
  condition?: string;   // SQL条件（可选）
  value: string;        // 字段引用或展示值
}

/**
 * 标签查询选项
 */
export interface LabelQueryOptions {
  filter?: string;     // 标签过滤条件
  sortBy?: 'id' | 'name'; // 排序字段
  sortDirection?: 'ASC' | 'DESC'; // 排序方向
}

/**
 * 主标签查询结果
 */
export interface MainLabelResult {
  labelId: string;     // 标签ID
  labelName: string;   // 标签名称
  itemValue: string;    // 标签项值
  condition?: string;   // 匹配的SQL条件
}
