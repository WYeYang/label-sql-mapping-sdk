// SDK核心类

import * as dotenv from 'dotenv';
import { Database, DatabaseFactory } from './db';
import { QueryExecutor, QueryMode } from './db/query-executor';
import { ExtensionMerger, ExtensionInfo } from './ai/extension-merger';
import { LLMManager } from './ai/llm-manager';
import { OpenAILLM } from './ai/openai-llm';
import { LLM } from './ai/types';
import { AppConfigManager } from './config/app-config';
import { SqlHelper, appendWhereCondition } from './db/sql-helper';
import { QueryResult as BaseQueryResult } from './db/types';

dotenv.config();

export { LLM } from './ai/types';
export { ExtensionInfo } from './ai/extension-merger';
export { LSMConfig, DatabaseConfig, LabelMapping, MappingItem } from './config/types';
export { ExtensionMapping } from './config/app-config';
export { LLMConfig } from './ai/types';

/**
 * SDK 查询结果
 */
export interface QueryResult extends BaseQueryResult {
  /** 额外输出字段（根据用户systemPrompt要求） */
  extra?: any;
}

/**
 * SDK 配置选项
 */
export interface LSMSDKOptions {
  /** labels.yaml 路径、lsm-* 包名，或不传（自动查找） */
  configPath?: string;
  /** lsm-sdk-js.yaml 路径，可选（不传则自动向上查找） */
  sdkConfigPath?: string;
  /** 自定义 LLM，可选（不传则从 lsm-sdk-js.yaml 读取） */
  llm?: LLM;
}

/**
 * SDK 核心 - 查询流程
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                           query() 入口                              │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ 1. 外部 extensions → extMerger.buildFromValues()                     │
 * │    └─ 输入: ["光", "战士族"]                                         │
 * │    └─ 输出: ExtensionInfo[] { id, values }                          │
 * │                                                                      │
 * │ 2. 自然语言查询 → llmManager.parseQuery()                           │
 * │    └─ Stage1: 预处理，输出 where / extensions / keywords             │
 * │    └─ 代码: 用 keywords 搜索 items                                   │
 * │    └─ Stage2: 补充 extensions，返回最终结果                          │
 * │                                                                      │
 * │ 3. 合并 extensions                                                   │
 * │    └─ AI extensions + 外部 extensions → aiExtensions[]               │
 * │                                                                      │
 * │ 4. 构建 SQL                                                          │
 * │    └─ base: "SELECT * FROM cards"                                   │
 * │    └─ AI where: "field >= 100" (如果有)                               │
 * │    └─ 代码拼接: extMerger.buildWhereConditions(aiExtensions)         │
 * │        └─ 根据 extensions 的 id-values 查配置，拼接 WHERE            │
 * │    └─ limit: AI 返回的 limit (如果有)                                │
 * │                                                                      │
 * │ 5. 执行查询 → queryExecutor.execute()                               │
 * │    └─ count: 总数                                                    │
 * │    └─ data: 分页数据                                                 │
 * │    └─ extensions: 返回的扩展标签信息                                 │
 * └─────────────────────────────────────────────────────────────────────┘
 */

export class LSMSDK {
  private readonly database;
  private readonly llmManager: LLMManager;
  private readonly queryExecutor: QueryExecutor;
  private readonly extMerger: ExtensionMerger;
  private readonly sqlHelper: SqlHelper;
  private readonly appConfigManager: AppConfigManager;

  constructor(options?: LSMSDKOptions) {
    this.appConfigManager = AppConfigManager.new(options?.configPath, options?.sdkConfigPath);
    const labelsConfig = this.appConfigManager.getLabelsConfig();
    const extensions = this.appConfigManager.getExtensions();
    
    let llm: LLM;
    if (options?.llm) {
      // 使用传入的 LLM
      llm = options.llm;
    } else {
      // 从 lsm-sdk-js.yaml 读取 LLM 配置
      const llmConfig = this.appConfigManager.getLLMConfig();
      llm = new OpenAILLM(llmConfig);
    }
    
    this.database = DatabaseFactory.create(this.appConfigManager, labelsConfig);
    this.llmManager = new LLMManager(llm);
    
    const allMappings = this.appConfigManager.getAllMappings();
    this.sqlHelper = SqlHelper.create(labelsConfig);
    this.sqlHelper.setExtensions(allMappings);
    this.queryExecutor = new QueryExecutor(this.database, this.sqlHelper, allMappings);
    this.extMerger = new ExtensionMerger(allMappings);
  }

  /**
   * 获取完整的 labels 配置
   */
  getLabelsConfig() {
    return this.appConfigManager.getLabelsConfig();
  }

  /**
   * 获取数据库配置
   */
  getDatabaseConfig() {
    return this.appConfigManager.getLabelsConfig().database;
  }

  /**
   * 获取数据库文件路径
   */
  getDatabasePath() {
    return this.appConfigManager.getDatabasePath();
  }

  /**
   * 获取所有标签映射配置
   */
  getLabelMappings() {
    return this.appConfigManager.getLabelsConfig().mappings;
  }

  /**
   * 获取所有扩展标签配置
   */
  getExtensions() {
    return this.appConfigManager.getExtensions();
  }

  /**
   * 根据 ID 获取标签映射配置
   */
  getLabelMappingById(id: string) {
    return this.appConfigManager.getLabelsConfig().mappings.find(m => m.id === id);
  }

  /**
   * 根据 ID 获取扩展标签配置
   */
  getExtensionById(id: string) {
    return this.appConfigManager.getExtensionById(id);
  }

  /**
   * 获取配置目录路径
   */
  getConfigDir() {
    return this.appConfigManager.getConfigDir();
  }

  /**
   * 获取 labels.yaml 原始内容
   */
  getLabelsYamlContent() {
    return this.appConfigManager.getMainMappingsSimplifiedText();
  }

  /**
   * 自然语言查询
   * @param options.query 自然语言查询
   * @param options.sql 原始SQL（与query二选一）
   * @param options.page 页码，默认1
   * @param options.pageSize 每页数量，默认20
   * @param options.extensions 扩展标签（id+values格式），传 { id: 'id', values: ['12345'] } 查单条详情
   * @param options.systemPrompt 额外的系统提示词
   */
  async query(options: {
    query?: string;
    sql?: string;
    page?: number;
    pageSize?: number;
    extensions?: ExtensionInfo[];
    systemPrompt?: string;
  }): Promise<QueryResult> {
    const { query, sql, page = 1, pageSize = 20, systemPrompt } = options;

    // 检测 extensions 中是否有 id='id'，如果有则用 detail 模式
    const aiExtensions: ExtensionInfo[] = options.extensions ?? [];
    const idExtension = aiExtensions.find(ext => ext.id === 'id');
    const isDetailMode = !!idExtension;
    const usePage = isDetailMode ? 1 : page;
    const usePageSize = isDetailMode ? 1 : pageSize;
    const useMode = isDetailMode ? 'detail' : 'list';

    let explanation: string | undefined;
    let extra: any;
    let fullSqlStr = sql ?? '';
    let parseResult: any = null;

    if (query) {
      parseResult = await this.llmManager.parseQuery(query, systemPrompt);
      explanation = parseResult.explanation;
      extra = parseResult.extra;
      
      // AI 没分析出来时报错
      if (!parseResult.where && !parseResult.order) {
        throw new Error('AI 未能理解查询条件，请尝试更具体地描述');
      }
      
      aiExtensions.push(...(parseResult.extensions ?? []));
      fullSqlStr = this.sqlHelper.buildInitialSql(parseResult);
    } else if (sql) {
      fullSqlStr = sql;
    } else if (aiExtensions.length > 0) {
      fullSqlStr = this.sqlHelper.buildBaseSql();
    } else {
      throw new Error('请提供 query 或 sql 或 extensions 参数');
    }

    // 根据 extensions 构建 WHERE 条件并拼接到 SQL
    const whereCondition = this.extMerger.buildWhereConditions(aiExtensions);
    if (whereCondition) {
      fullSqlStr = appendWhereCondition(fullSqlStr, whereCondition);
    }

    if (!fullSqlStr.trim()) {
      throw new Error('SQL不能为空');
    }

    const execResult = this.queryExecutor.execute(fullSqlStr, usePage, usePageSize, useMode, aiExtensions);
    
    return {
      ...execResult,
      sql: fullSqlStr,
      explanation,
      extra
    };
  }
}
