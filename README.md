# Label-SQL Mapping (LSM) SDK

## 简介

LSM SDK 是一个用于处理 Label-SQL Mapping 规范的工具库，提供了配置解析、数据库查询、标签管理等功能。

## 主要特性

- **配置解析**：解析 LSM 规范的 YAML 配置文件
- **数据库查询**：根据标签生成 SQL 查询并执行
- **标签管理**：获取和管理标签信息
- **Git 集成**：从 Git 仓库更新数据库
- **大模型集成**：支持自然语言查询
- **CLI 工具**：提供命令行接口

## 安装

```bash
npm install label-sql-mapping-sdk
```

## 基本用法

### 初始化 SDK

```javascript
const { LSMSDK } = require('label-sql-mapping-sdk');

// 配置文件路径
const configPath = './config/main.yaml';

// 数据库配置
const dbConfig = {
  type: 'sqlite',
  path: './database.db'
};

// 初始化 SDK
const sdk = new LSMSDK(configPath, dbConfig);
```

### 执行查询

```javascript
// 执行查询
const result = await sdk.query('type = "怪兽"');

// 显示结果
console.log(result.rows);

// 关闭 SDK
await sdk.close();
```

### 标签查询

```javascript
const { LabelQuery } = require('label-sql-mapping-sdk/dist/label');

// 创建标签查询实例
const labelQuery = new LabelQuery(sdk.getConfig(), sdk.getDatabase());

// 获取所有标签
const labels = await labelQuery.getLabels();

// 获取指定卡片的主标签
const mainLabels = await labelQuery.getMainLabel('12345678');
```

### Git 管理

```javascript
const { GitManager } = require('label-sql-mapping-sdk/dist/git');

// Git 配置
const gitConfig = {
  repoUrl: 'https://github.com/user/card-database.git',
  branch: 'main',
  localPath: './db',
  databaseFile: 'card.db'
};

// 初始化 Git 管理器
const gitManager = new GitManager(gitConfig);

// 初始化仓库
await gitManager.initialize();

// 更新仓库
const result = await gitManager.update();
```

### 自然语言查询

```javascript
const { LLMManager, NLPQuery } = require('label-sql-mapping-sdk/dist/ai');

// 大模型配置
const llmConfig = {
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_API_KEY',
  model: 'gpt-3.5-turbo'
};

// 初始化大模型管理器
const llmManager = new LLMManager(llmConfig);

// 初始化自然语言查询
const nlpQuery = new NLPQuery(sdk.getDatabase(), llmManager);

// 执行自然语言查询
const result = await nlpQuery.execute({ query: '查找所有青眼白龙相关的卡片' });

// 显示结果
console.log(result.sql);
console.log(result.results);
```

## CLI 工具

LSM SDK 还提供了一个 CLI 工具，用于执行各种操作：

```bash
# 执行查询
lsm query "type = \"怪兽\"" --database ./database.db --config ./config/main.yaml

# 查看标签
lsm labels --database ./database.db --config ./config/main.yaml

# 从 Git 仓库更新数据库
lsm git-update --url https://github.com/user/card-database.git --path ./db --file card.db

# 自然语言查询
lsm nlp "查找所有青眼白龙相关的卡片" --database ./database.db --config ./config/main.yaml --api-key YOUR_OPENAI_API_KEY
```

## 相关项目

- [label-sql-mapping-spec](https://github.com/user/label-sql-mapping-spec) - LSM 1.0 规范文档
- [lsm-ygopro-database](https://github.com/user/lsm-ygopro-database) - 游戏王数据库配置
- [ygopro-card-cli](https://github.com/user/ygopro-card-cli) - 游戏王卡片查询 CLI 工具