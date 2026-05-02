# Label-SQL Mapping (LSM) SDK

通过自然语言或 SQL 查询结构化数据库的 SDK，支持配置驱动的多数据库扩展。

> **声明**：当前仅支持 SQLite 数据库。

[LSM 规范](https://github.com/WYeYang/label-sql-mapping-spec) - 定义标签与 SQL 的映射规则格式

## 核心概念

**LSM** = Label-SQL Mapping，将自然语言映射为 SQL 查询的规范。

- **标签 (Label)**：业务含义的字段，如"名称"、"价格"、"品牌"
- **映射 (Mapping)**：标签到 SQL 条件的转换规则
- **扩展标签 (Extension)**：按需加载的附加映射，如"品牌"、"分类"

## 安装

### 1. 安装 SDK

```bash
npm install label-sql-mapping-sdk
```

### 2. 安装配置

有两种方式：

**方式 A：安装 `lsm-*` 配置包**

```bash
npm install lsm-xxx-database
```

**方式 B：指定配置文件路径**

创建配置文件夹（包含 labels.yaml、数据库、extensions）：

```bash
# 项目结构
my-project/
├── lsm-products-config/      # 配置文件夹
│   ├── labels.yaml           # 标签配置
│   ├── products.db           # 数据库文件
│   └── extensions/           # 扩展标签（可选）
└── lsm-sdk-js.yaml           # SDK 配置
```

### 3. 配置 lsm-sdk-js.yaml

> **提示**：如果调用方已配置其他 LLM，则无需配置 `lsm-sdk-js.yaml`，传入现有 LLM 即可使用自然语言查询，避免重复配置 API。

在项目根目录创建 `lsm-sdk-js.yaml` 文件（用于自然语言查询）：

**项目结构：**

```
my-project/
├── node_modules/
│   ├── label-sql-mapping-sdk/  # LSM SDK（npm 安装）
│   └── lsm-xxx-database/       # lsm-* 配置包（npm 安装，二选一）
├── lsm-products-config/        # 自定义配置（手动创建，二选一）
│   ├── labels.yaml             # 标签配置
│   ├── products.db             # 数据库文件
│   └── extensions/             # 扩展标签（可选）
└── lsm-sdk-js.yaml             # SDK 配置（项目根目录）
```

**lsm-sdk-js.yaml 结构：**

必须是 OpenAI 规范的 API，支持 OpenAI、阿里通义、DeepSeek 等兼容服务：

```yaml
llm:
  apiKey: ${OPENAI_API_KEY}  # ${VAR_NAME} 表示从环境变量读取
  apiUrl: https://api.openai.com/v1  # API 地址
  model: gpt-3.5-turbo  # 模型名称
  temperature: 0.7
  maxTokens: 1000
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `llm.apiKey` | 是 | API 密钥，支持 `${ENV_VAR}` 格式从环境变量读取 |
| `llm.apiUrl` | 是 | API 地址 |
| `llm.model` | 是 | 模型名称 |
| `llm.temperature` | 否 | 温度参数，默认 `0.7` |
| `llm.maxTokens` | 否 | 最大 token 数，默认 `1000` |

> **提示**：如果传入 `llm` 参数创建 SDK，则无需配置 `lsm-sdk-js.yaml`，LLM 配置会使用传入的实现。

## 使用

```javascript
import { LSMSDK } from 'label-sql-mapping-sdk';

// 自动查找 lsm-* 包
const sdk = new LSMSDK();

// 指定 lsm-* 包名
const sdk = new LSMSDK({ configPath: 'lsm-xxx-database' });

// 指定配置文件路径
const sdk = new LSMSDK({ configPath: './lsm-products-config/labels.yaml' });

// 传入自定义 LLM
const sdk = new LSMSDK({ configPath: './lsm-products-config/labels.yaml', llm: customLLM });

// 自然语言查询（自动初始化数据库）
const result = await sdk.query({ query: '价格大于1000的商品' });
```

### 自定义 LLM

SDK 支持传入自定义 LLM 实现：

```javascript
import { LSMSDK, LLM } from 'label-sql-mapping-sdk';

const customLLM: LLM = {
  async chat(messages) {
    // 实现 chat 方法
    return 'response';
  }
};

// 传入自定义 LLM
const sdk = new LSMSDK({ configPath: './config', llm: customLLM });
```

## 配置说明

### 配置文件查找规则

| 文件 | 说明 |
|------|------|
| `labels.yaml` | 直接路径 或 `node_modules/lsm-*/labels.yaml` |
| `lsm-sdk-js.yaml` | 指定路径；未指定则从 `node_modules` 上级目录向上查找 |
| `extensions/` | 从 labels.yaml 同级 `extensions/` 目录加载 |

### labels.yaml

定义数据库连接和标签映射：

```yaml
version: "1.0"
name: 商品配置
id: product_labels
database:
  type: sqlite
  path: ./products.db
  tables:
    - name: products
      alias: p
mappings:
  - id: name
    name: 名称
    value: p.name
  - id: price
    name: 价格
    condition: p.price IS NOT NULL
    value: p.price
```

**字段说明：**

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 标签唯一标识，AI 识别用 |
| `name` | 是 | 人类可读的显示名称 |
| `description` | 否 | AI 理解标签用途的描述 |
| `condition` | 否 | SQL WHERE 条件 |
| `value` | 否 | 返回结果使用的字段 |
| `items` | 否 | 枚举值列表（有 items 时为标签值筛选） |
| `range` | 否 | 数值范围约束（有 range 时为数值类型），如 `{ min: 0, max: 5000 }` |

### extensions/ 扩展标签

扩展标签用于定义业务维度的筛选条件：

```yaml
# extensions/brand.yaml
id: brand
name: 品牌
items:
  - condition: p.name LIKE '%Apple%'
    value: Apple 系列
  - condition: p.name LIKE '%Samsung%'
    value: Samsung 系列
```

## SDK 方法

### 导出类型

SDK 导出以下类型供使用：

```typescript
import {
  LSMConfig,
  DatabaseConfig,
  LabelMapping,
  MappingItem,
  ExtensionMapping,
  LLMConfig,
  LLM,
  ExtensionInfo
} from 'label-sql-mapping-sdk';
```

### `new LSMSDK(options?)`

创建 SDK 实例：

```typescript
interface LSMSDKOptions {
  configPath?: string;      // labels.yaml 路径、lsm-* 包名，或不传（自动查找）
  sdkConfigPath?: string;    // lsm-sdk-js.yaml 路径，可选（不传则自动向上查找）
  llm?: LLM;                 // 自定义 LLM，可选
}
```

### `sdk.query(options)`

```typescript
interface ExtensionInfo {
  id: string;
  values: string[];
}

interface QueryOptions {
  query?: string;           // 自然语言查询
  sql?: string;              // 原始 SQL（与 query 二选一）
  page?: number;             // 页码，默认 1
  pageSize?: number;         // 每页数量，默认 20
  extensions?: ExtensionInfo[]; // 扩展标签（id+values格式），传 { id: 'id', values: ['12345'] } 查单条详情
  systemPrompt?: string;      // 额外的系统提示词
}
```

返回示例：

```json
{
  "data": [
    { "id": 1, "name": "产品A", "price": 100, "category": "电子产品" }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5,
  "sql": "SELECT * FROM products WHERE price > 50 LIMIT 20",
  "explanation": "查询价格大于50的产品",
  "extra": "额外输出内容" // 根据 systemPrompt 输出
}
```

### 新功能使用示例

#### 1. id+values 筛选
```typescript
const result = await sdk.query({
  extensions: [
    { id: 'category', values: ['电子产品'] },
    { id: 'brand', values: ['Apple'] }
  ]
});
```

#### 2. 数值比较
```typescript
const result = await sdk.query({
  extensions: [
    { id: 'price', values: ['>1000'] },     // 大于
    { id: 'stock', values: ['<=50'] }       // 小于等于
  ]
});
```

#### 3. 数值范围查询
```typescript
const result = await sdk.query({
  extensions: [
    { id: 'price', values: ['1000~5000'] }, // 范围
    { id: 'price', values: ['~5000'] },     // 只上限
    { id: 'price', values: ['1000~'] }      // 只下限
  ]
});
```

#### 4. 查询单条详情（通过 id）
```typescript
const result = await sdk.query({
  extensions: [
    { id: 'id', values: ['12345'] }
  ]
});
```

#### 4. 模糊匹配
```typescript
const result = await sdk.query({
  extensions: [
    { id: 'name', values: ['手机'] }
  ]
});
```

#### 5. 额外系统提示词和 extra 返回字段
```typescript
const result = await sdk.query({
  query: '找一款手机',
  systemPrompt: '请分析这款手机的优缺点'
});

console.log(result.extra); // AI 根据 systemPrompt 输出的额外内容
```

#### 6. 混合使用
```typescript
const result = await sdk.query({
  extensions: [
    { id: 'category', values: ['电子产品'] },
    { id: 'price', values: ['1000~5000'] }
  ],
  systemPrompt: '优先推荐销量高的产品'
});
```

### extensions 搜索逻辑

#### ExtensionInfo 结构

```typescript
interface ExtensionInfo {
  id: string;      // 映射配置 id
  values?: string[]; // 单值或多值查询
  range?: {         // 范围查询
    min?: number;
    max?: number;
  };
}
```

#### 查询类型

| 查询类型 | 示例 | 输出 |
|---------|------|------|
| 单值 | `{ id: 'def', values: ['1500'] }` | `d.def = 1500` |
| 多值 OR | `{ id: 'def', values: ['1000', '1500', '2000'] }` | `d.def = 1000 OR d.def = 1500 OR d.def = 2000` |
| 范围 | `{ id: 'def', range: { min: 1000, max: 2000 } }` | `d.def >= 1000 AND d.def <= 2000` |
| 范围(仅最小) | `{ id: 'def', range: { min: 2000 } }` | `d.def >= 2000` |
| 范围(仅最大) | `{ id: 'def', range: { max: 1500 } }` | `d.def <= 1500` |

#### 配置类型判断

| 配置类型 | 判断依据 |
|---------|---------|
| **枚举型** | `mapping.items` 存在 |
| **文本型** | `mapping.items` 为空 |

#### 连接规则

| 配置类型 | 多 values 连接 | 多 id 连接 |
|---------|--------------|-----------|
| **枚举型** | OR | AND |
| **文本型** | OR | OR |

#### 示例说明

```typescript
// 枚举型多 id → AND
extensions: [
  { id: 'category', values: ['电子产品'] },
  { id: 'brand', values: ['Apple'] }
]
// → category = '电子产品' AND brand = 'Apple'

// 文本型多 id → OR
extensions: [
  { id: 'name', values: ['手机'] },
  { id: 'desc', values: ['手机'] }
]
// → name LIKE '%手机%' OR desc LIKE '%手机%'
```

### 配置访问方法

SDK 开放了直接访问读取成功配置的功能：

```typescript
// 获取完整的 labels 配置
const labelsConfig = sdk.getLabelsConfig();

// 获取数据库配置
const dbConfig = sdk.getDatabaseConfig();

// 获取数据库文件路径
const dbPath = sdk.getDatabasePath();

// 获取所有标签映射配置
const labelMappings = sdk.getLabelMappings();

// 获取所有扩展标签配置
const extensions = sdk.getExtensions();

// 根据 ID 获取标签映射配置
const mapping = sdk.getLabelMappingById('price');

// 根据 ID 获取扩展标签配置
const extension = sdk.getExtensionById('brand');

// 获取配置目录路径
const configDir = sdk.getConfigDir();

// 获取 labels.yaml 原始内容
const labelsYaml = sdk.getLabelsYamlContent();
```

## CLI 工具

```bash
# 自然语言查询（自动查找 lsm-* 包）
lsm-cli -c -q "价格大于100的产品"
# Total: 50 | Page 1/3
# SQL: SELECT * FROM products WHERE price > 100 LIMIT 20
# Explanation: 查询价格大于100的产品
# 
# Data:
# [{"id":1,"name":"产品A","price":150,...},...]

# 指定 lsm-* 包名
lsm-cli -c lsm-xxx-database -q "价格大于100的产品"
# Total: 50 | Page 1/3
# ...

# 指定配置文件路径
lsm-cli -c ./config/labels.yaml -q "价格大于100的产品"
# Total: 50 | Page 1/3
# ...

# SQL 查询
lsm-cli -c ./config/labels.yaml -s "SELECT * FROM products WHERE id < 10"
# Total: 10 | Page 1/1
# SQL: SELECT * FROM products WHERE id < 10
# ...

# 分页
lsm-cli -c ./config/labels.yaml -q "电子产品" -p 2 -ps 10
# Total: 100 | Page 2/10
# ...

# 输出 JSON
lsm-cli -c ./config/labels.yaml -q "价格大于100的产品" --json
# {"data":[...],"total":50,...}
```

## 多数据库支持

通过 npm 安装不同的配置包切换数据库：

```bash
npm install lsm-xxx-database
```

只需安装不同的 `lsm-*` 配置包，SDK 代码无需改动。
