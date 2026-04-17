/**
 * 标签数据
 */
export interface LabelData {
    id: string;
    name: string;
    items: LabelItem[];
}
/**
 * 标签项
 */
export interface LabelItem {
    condition?: string;
    value: string;
}
/**
 * 标签查询选项
 */
export interface LabelQueryOptions {
    filter?: string;
    sortBy?: 'id' | 'name';
    sortDirection?: 'ASC' | 'DESC';
}
/**
 * 主标签查询结果
 */
export interface MainLabelResult {
    labelId: string;
    labelName: string;
    itemValue: string;
    condition?: string;
}
//# sourceMappingURL=types.d.ts.map