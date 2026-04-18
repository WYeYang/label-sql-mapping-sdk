# Label-SQL Mapping (LSM) SDK

## 简介

LSM SDK 是一个用于处理 Label-SQL Mapping 规范的工具库，提供了配置解析、数据库查询、标签管理等功能。

## 主要特性

- **配置解析**：解析 LSM 规范的 YAML 配置文件
- **数据库查询**：根据标签生成 SQL 查询并执行
- **标签管理**：获取和管理标签信息
- **扩展标签**：支持通过 Tool Calling 按需获取扩展标签配置
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

// 初始化 SDK
const sdk = await LSMSDK.fromAppConfig(configPath, configPath);
```

### 自然语言查询

```javascript
// 执行自然语言查询
const result = await sdk.query({ query: '攻击力大于3000的怪兽' });

console.log(result.data);
console.log(result.total);
```

### 单条查询（合并扩展标签）

```javascript
// 根据卡片ID查询，返回主标签和匹配的扩展标签
const result = await sdk.queryById(12345678);

console.log(result.data);      // 主标签数据
console.log(result.extensions); // 匹配的扩展标签，如 { series: ['青眼系列'], rarity: ['UR'] }
```

### 获取扩展标签配置

```javascript
// 获取所有扩展标签
const extensions = sdk.getExtensions();

// 根据关键词搜索
const seriesExt = sdk.getExtensions('系列');
```

## 扩展标签配置

扩展标签配置存储在 `extensions/` 目录下，每个文件定义一类扩展标签：

```yaml
# extensions/series.yaml
id: series
name: 系列
description: 游戏王卡片所属系列
items:
  - condition: t.name LIKE '%青眼%'
    value: 青眼系列
  - condition: t.name LIKE '%黑魔导%'
    value: 黑魔导系列
```

## Tool Calling

SDK 支持通过 Tool Calling 让 AI 按需获取扩展标签配置：

```javascript
const sdk = await LSMSDK.fromAppConfig(configPath, configPath, customLLM);

// SDK 会自动注册 getExtensionLabels 工具
// AI 在需要时会调用此工具获取扩展标签配置
const result = await sdk.query({ query: '青眼系列的UR卡' });
```

## CLI 工具

LSM SDK 还提供了一个 CLI 工具，用于执行各种操作：

```bash
# 执行查询
lsm query "type = '怪兽'" --config ./config/main.yaml

# 单条查询
lsm query --id 12345678 --config ./config/main.yaml

# 查看标签
lsm labels --config ./config/main.yaml

# 从 Git 仓库更新数据库
lsm git-update --url https://github.com/user/card-database.git --path ./db --file card.db

# 自然语言查询
lsm nlp "查找所有青眼白龙相关的卡片" --config ./config/main.yaml
```

## 相关项目

- [label-sql-mapping-spec](https://github.com/user/label-sql-mapping-spec) - LSM 1.0 规范文档
- [lsm-ygopro-database](https://github.com/user/lsm-ygopro-database) - 游戏王数据库配置
- [ygopro-card-cli](https://github.com/user/ygopro-card-cli) - 游戏王卡片查询 CLI 工具