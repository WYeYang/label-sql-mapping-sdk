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

export { QueryMode } from './db/query-executor';
export { LLM } from './ai/types';
export { ExtensionInfo } from './ai/extension-merger';

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

  constructor(options?: LSMSDKOptions) {
    const appConfigManager = AppConfigManager.new(options?.configPath, options?.sdkConfigPath);
    const labelsConfig = appConfigManager.getLabelsConfig();
    const extensions = appConfigManager.getExtensions();
    
    let llm: LLM;
    if (options?.llm) {
      // 使用传入的 LLM
      llm = options.llm;
    } else {
      // 从 lsm-sdk-js.yaml 读取 LLM 配置
      const llmConfig = appConfigManager.getLLMConfig();
      llm = new OpenAILLM(llmConfig);
    }
    
    this.database = DatabaseFactory.create(appConfigManager, labelsConfig);
    this.llmManager = new LLMManager(llm);
    
    this.sqlHelper = SqlHelper.create(labelsConfig);
    this.sqlHelper.setExtensions(extensions);
    this.queryExecutor = new QueryExecutor(this.database, this.sqlHelper, extensions);
    this.extMerger = new ExtensionMerger(extensions);
  }

  /**
   * 自然语言查询
   * @param options.query 自然语言查询
   * @param options.sql 原始SQL（与query二选一）
   * @param options.page 页码，默认1
   * @param options.pageSize 每页数量，默认20
   * @param options.mode 查询模式：list(列表) 或 detail(详情)
   * @param options.extensions 扩展标签（id+values格式）
   * @param options.systemPrompt 额外的系统提示词
   */
  async query(options: {
    query?: string;
    sql?: string;
    page?: number;
    pageSize?: number;
    mode?: QueryMode;
    extensions?: ExtensionInfo[];
    systemPrompt?: string;
  }): Promise<QueryResult> {
    const { query, sql, page = 1, pageSize = 20, mode = 'list', systemPrompt } = options;

    let explanation: string | undefined;
    let extra: any;
    let fullSqlStr = sql ?? '';

    // 构建 extensions：外部传入的 extensions
    let aiExtensions: ExtensionInfo[] = options.extensions ?? [];
    if (query) {
      const result = await this.llmManager.parseQuery(query, systemPrompt);
      explanation = result.explanation;
      extra = result.extra;
      
      // 合并 extensions
      aiExtensions = [...aiExtensions, ...(result.extensions ?? [])];
      
      // 构建完整SQL（使用 fromClause 避免硬编码表名）
      const baseSelect = `SELECT ${this.sqlHelper.fromClause}`;
      if (result.where) {
        const where = result.where.trim();
        fullSqlStr = where.toUpperCase().startsWith('WHERE ') 
          ? `${baseSelect} ${where}`
          : `${baseSelect} WHERE ${where}`;
      } else {
        fullSqlStr = baseSelect;
      }
      if (result.limit) fullSqlStr += ` LIMIT ${result.limit}`;
    } else if (sql) {
      fullSqlStr = sql;
    } else {
      // 如果没有 query 和 sql，但有 extensions，也可以查询
      if (aiExtensions.length === 0) {
        throw new Error('请提供 query 或 sql 或 extensions 参数');
      }
      // 基础 SQL
      fullSqlStr = `SELECT ${this.sqlHelper.fromClause}`;
    }

    // 根据 extensions 构建 WHERE 条件并拼接到 SQL
    const whereCondition = this.extMerger.buildWhereConditions(aiExtensions);
    if (whereCondition) {
      fullSqlStr = appendWhereCondition(fullSqlStr, whereCondition);
    }

    if (!fullSqlStr.trim()) {
      throw new Error('SQL不能为空');
    }

    const execResult = this.queryExecutor.execute(fullSqlStr, page, pageSize, mode, aiExtensions);
    
    return {
      ...execResult,
      sql: fullSqlStr,
      explanation,
      extra
    };
  }
}
