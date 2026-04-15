#!/usr/bin/env node

// CLI工具入口

import { Command } from 'commander';
import { LSMSDK } from '../sdk';
import { DBConfig } from '../db';
import { GitManager, GitConfig } from '../git';
import { LabelQuery } from '../label';
import { LLMManager, NLPQuery, AIRetrieval } from '../ai';
import * as fs from 'fs';
import * as path from 'path';

// 创建命令行解析器
const program = new Command();

// 版本信息
program
  .version('1.0.0')
  .description('LSM (Label-SQL Mapping) CLI工具');

// 配置文件路径
let configPath: string = '';
let dbPath: string = '';

// 全局选项
program
  .option('-c, --config <path>', 'LSM配置文件路径')
  .option('-d, --database <path>', '数据库文件路径');

// 查询命令
program
  .command('query')
  .description('执行查询')
  .argument('<condition>', 'SQL条件')
  .option('-l, --limit <number>', '限制返回数量')
  .option('-o, --offset <number>', '偏移量')
  .option('-s, --sort <field>', '排序字段')
  .option('-d, --direction <direction>', '排序方向 (ASC/DESC)')
  .action(async (condition, options) => {
    try {
      // 验证参数
      if (!configPath) {
        console.error('错误: 请指定配置文件路径');
        process.exit(1);
      }
      
      if (!dbPath) {
        console.error('错误: 请指定数据库文件路径');
        process.exit(1);
      }
      
      // 初始化SDK
      const dbConfig: DBConfig = {
        type: 'sqlite',
        path: dbPath
      };
      
      const sdk = new LSMSDK(configPath, dbConfig);
      
      // 执行查询
      const result = await sdk.query(condition, {
        limit: options.limit ? parseInt(options.limit) : undefined,
        offset: options.offset ? parseInt(options.offset) : undefined,
        orderBy: options.sort,
        orderDirection: options.direction as 'ASC' | 'DESC'
      });
      
      // 显示结果
      console.log('查询结果:');
      console.log(JSON.stringify(result.rows, null, 2));
      
      // 关闭SDK
      await sdk.close();
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// 标签命令
program
  .command('labels')
  .description('管理标签')
  .option('-f, --filter <filter>', '标签过滤条件')
  .option('-s, --sort <field>', '排序字段 (id/name)')
  .option('-d, --direction <direction>', '排序方向 (ASC/DESC)')
  .action(async (options) => {
    try {
      // 验证参数
      if (!configPath) {
        console.error('错误: 请指定配置文件路径');
        process.exit(1);
      }
      
      if (!dbPath) {
        console.error('错误: 请指定数据库文件路径');
        process.exit(1);
      }
      
      // 初始化SDK
      const dbConfig: DBConfig = {
        type: 'sqlite',
        path: dbPath
      };
      
      const sdk = new LSMSDK(configPath, dbConfig);
      
      // 创建标签查询实例
      const labelQuery = new LabelQuery(sdk.getConfig(), sdk.getDatabase());
      
      // 查询标签
      const labels = await labelQuery.getLabels({
        filter: options.filter,
        sortBy: options.sort as 'id' | 'name',
        sortDirection: options.direction as 'ASC' | 'DESC'
      });
      
      // 显示结果
      console.log('标签列表:');
      labels.forEach(label => {
        console.log(`- ${label.id}: ${label.name} (${label.items.length}个项)`);
      });
      
      // 关闭SDK
      await sdk.close();
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// 主标签查询命令
program
  .command('main-label')
  .description('查询指定数据的主标签')
  .argument('<id>', '数据ID')
  .action(async (id) => {
    try {
      // 验证参数
      if (!configPath) {
        console.error('错误: 请指定配置文件路径');
        process.exit(1);
      }
      
      if (!dbPath) {
        console.error('错误: 请指定数据库文件路径');
        process.exit(1);
      }
      
      // 初始化SDK
      const dbConfig: DBConfig = {
        type: 'sqlite',
        path: dbPath
      };
      
      const sdk = new LSMSDK(configPath, dbConfig);
      
      // 创建标签查询实例
      const labelQuery = new LabelQuery(sdk.getConfig(), sdk.getDatabase());
      
      // 查询主标签
      const mainLabels = await labelQuery.getMainLabel(id);
      
      // 显示结果
      console.log('主标签查询结果:');
      mainLabels.forEach(label => {
        console.log(`- ${label.labelName}: ${label.itemName}`);
      });
      
      // 关闭SDK
      await sdk.close();
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Git更新命令
program
  .command('git-update')
  .description('从Git仓库更新数据库')
  .option('-u, --url <url>', 'Git仓库URL')
  .option('-b, --branch <branch>', 'Git分支')
  .option('-p, --path <path>', '本地存储路径')
  .option('-f, --file <file>', '数据库文件路径（相对于仓库根目录）')
  .action(async (options) => {
    try {
      // 验证参数
      if (!options.url) {
        console.error('错误: 请指定Git仓库URL');
        process.exit(1);
      }
      
      if (!options.path) {
        console.error('错误: 请指定本地存储路径');
        process.exit(1);
      }
      
      if (!options.file) {
        console.error('错误: 请指定数据库文件路径');
        process.exit(1);
      }
      
      // 创建Git配置
      const gitConfig: GitConfig = {
        repoUrl: options.url,
        branch: options.branch,
        localPath: options.path,
        databaseFile: options.file
      };
      
      // 初始化Git管理器
      const gitManager = new GitManager(gitConfig);
      
      // 初始化仓库
      await gitManager.initialize();
      
      // 更新仓库
      const result = await gitManager.update();
      
      // 显示结果
      console.log(`Git更新结果: ${result.message}`);
      if (result.updated) {
        console.log(`新提交: ${result.newCommit}`);
        console.log(`旧提交: ${result.oldCommit}`);
      }
      
      // 检查数据库文件
      if (gitManager.databaseExists()) {
        console.log(`数据库文件位置: ${gitManager.getDatabasePath()}`);
      } else {
        console.error('错误: 数据库文件不存在');
        process.exit(1);
      }
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// 自然语言查询命令
program
  .command('nlp')
  .description('自然语言查询')
  .argument('<query>', '自然语言查询语句')
  .option('-m, --model <model>', '大模型名称')
  .option('-k, --api-key <key>', 'API密钥')
  .action(async (query, options) => {
    try {
      // 验证参数
      if (!configPath) {
        console.error('错误: 请指定配置文件路径');
        process.exit(1);
      }
      
      if (!dbPath) {
        console.error('错误: 请指定数据库文件路径');
        process.exit(1);
      }
      
      if (!options.apiKey) {
        console.error('错误: 请指定API密钥');
        process.exit(1);
      }
      
      // 初始化SDK
      const dbConfig: DBConfig = {
        type: 'sqlite',
        path: dbPath
      };
      
      const sdk = new LSMSDK(configPath, dbConfig);
      
      // 初始化大模型管理器
      const llmConfig = {
        provider: 'openai',
        apiKey: options.apiKey,
        model: options.model || 'gpt-3.5-turbo'
      };
      
      const llmManager = new LLMManager(llmConfig);
      
      // 初始化自然语言查询
      const nlpQuery = new NLPQuery(sdk.getDatabase(), llmManager);
      
      // 执行查询
      const result = await nlpQuery.execute({ query });
      
      // 显示结果
      console.log('自然语言查询结果:');
      console.log(`生成的SQL: ${result.sql}`);
      console.log('查询结果:');
      console.log(JSON.stringify(result.results, null, 2));
      if (result.explanation) {
        console.log(`解释: ${result.explanation}`);
      }
      
      // 关闭SDK
      await sdk.close();
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(process.argv);

// 获取全局选项
const globalOptions = program.opts();
configPath = globalOptions.config || '';
dbPath = globalOptions.database || '';

// 验证必要参数
if (!configPath && program.args.length > 0 && program.args[0] !== 'git-update') {
  console.error('错误: 请指定配置文件路径');
  process.exit(1);
}

if (!dbPath && program.args.length > 0 && program.args[0] !== 'git-update') {
  console.error('错误: 请指定数据库文件路径');
  process.exit(1);
}
