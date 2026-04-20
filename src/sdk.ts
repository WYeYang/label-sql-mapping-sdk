// SDK核心类

import * as dotenv from 'dotenv';
import { Database, DatabaseFactory } from './db';
import { QueryExecutor, QueryMode } from './db/query-executor';
import { LLMManager } from './ai/llm-manager';
import { OpenAILLM } from './ai/openai-llm';
import { LLM } from './ai/types';
import { AppConfigManager } from './config/app-config';
import { SqlHelper, appendWhereCondition } from './db/sql-helper';
import { QueryResult } from './db/types';
import { buildWhereConditions } from './ai/extension-merger';

dotenv.config();

export { QueryResult } from './db/types';
export { QueryMode } from './db/query-executor';
export { LLM } from './ai/types';

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

export class LSMSDK {
  private readonly database;
  private readonly llmManager: LLMManager;
  private readonly queryExecutor: QueryExecutor;

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
    
    const sqlHelper = SqlHelper.create(labelsConfig);
    sqlHelper.setExtensions(extensions);
    this.queryExecutor = new QueryExecutor(this.database, sqlHelper, extensions);
  }

  /**
   * 自然语言查询
   * @param options.query 自然语言查询
   * @param options.sql 原始SQL（与query二选一）
   * @param options.page 页码，默认1
   * @param options.pageSize 每页数量，默认20
   * @param options.mode 查询模式：list(列表) 或 detail(详情)
   * @param options.extensions 扩展标签值列表（会根据配置找到对应ID后合并）
   */
  async query(options: {
    query?: string;
    sql?: string;
    page?: number;
    pageSize?: number;
    mode?: QueryMode;
    extensions?: string[];
  }): Promise<QueryResult> {
    const { query, sql, page = 1, pageSize = 20, mode = 'list' } = options;

    let explanation: string | undefined;
    let fullSqlStr = sql ?? '';

    if (query) {
      const result = await this.llmManager.parseQuery(query);
      explanation = result.explanation;
      
      // 使用 LLM 生成的 WHERE 条件
      const llmWhere = result.where || '1=1';
      fullSqlStr = `SELECT * FROM cards WHERE ${llmWhere} LIMIT ${result.limit}`;
      
      // 解析 extensions 获取 condition
      const aiExtensions = AppConfigManager.get().findConditions(result.extensions || []);
      
      // 根据 extensions 构建 WHERE 条件并拼接到 SQL
      const whereCondition = buildWhereConditions(aiExtensions);
      if (whereCondition) {
        fullSqlStr = appendWhereCondition(fullSqlStr, whereCondition);
      }
    } else if (sql) {
      fullSqlStr = sql;
    } else {
      throw new Error('请提供 query 或 sql 参数');
    }

    if (!fullSqlStr.trim()) {
      throw new Error('SQL不能为空');
    }

    const aiExtensions = AppConfigManager.get().findConditions([]);
    const execResult = this.queryExecutor.execute(fullSqlStr, page, pageSize, mode, aiExtensions);
    
    return {
      ...execResult,
      sql: fullSqlStr,
      explanation
    };
  }
}
