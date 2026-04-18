# Label-SQL Mapping (LSM) SDK

通过自然语言或 SQL 查询结构化数据库的 SDK，支持配置驱动的多数据库扩展。

> **声明**：当前仅支持 SQLite 数据库。

## LSM 规范

LSM (Label-SQL Mapping) 定义标签与 SQL 之间的映射规则。

### 核心格式

```yaml
version: "1.0"
name: 配置名称
id: 配置唯一标识

database:
  type: sqlite
  tables:
    - name: 表名
      alias: 别名

mappings:
  # 单值模式
  - id: field_id
    name: 字段名称
    value: 表别名.字段名

  # 单值模式 + 条件
  - id: field_with_condition
    name: 字段名称
    condition: 表别名.类型字段 = 1
    value: 表别名.字段名

  # 多值模式（items）
  - id: enum_field
    name: 枚举字段
    items:
      - condition: 表别名.字段 = 1
        value: 状态一
      - condition: 表别名.字段 = 2
        value: 状态二
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 标签唯一ID |
| `name` | 是 | 标签类型名称 |
| `description` | 否 | 标签描述，用于 AI 理解标签含义 |
| `condition` | 否 | 前置条件，所有 items 共享 |
| `value` | 否 | 单一值（单值模式）或默认值（items模式） |
| `items` | 否 | 映射项数组（多值模式） |

### 映射项 (items)

| 字段 | 必填 | 说明 |
|------|------|------|
| `condition` | 否 | 匹配条件 |
| `value` | 是 | 字段引用或展示值 |

### 模式详解

**单值模式**：直接输出字段值

```yaml
- id: title
  name: 标题
  value: p.title
```

→ SQL：`CASE WHEN 1=1 THEN p.title END AS title`

**单值模式 + 条件**：满足条件时输出字段值

```yaml
- id: price
  name: 价格
  condition: p.type = 1
  value: p.price
```

→ SQL：`CASE WHEN p.type = 1 THEN p.price END AS price`

**多值模式 (items)**：多个条件映射到不同值

```yaml
- id: category
  name: 类别
  items:
    - condition: c.type = 1
      value: 食品
    - condition: c.type = 2
      value: 服装
```

→ SQL：
```sql
CASE 
  WHEN c.type = 1 THEN '食品'
  WHEN c.type = 2 THEN '服装'
END AS category
```

**多值模式 + 前置条件 + 默认值**：前置条件被所有 items 共享，最后一个 items 使用 value 作为默认值

```yaml
- id: order_status
  name: 订单状态
  condition: o.type = 1
  value: 待处理
  items:
    - condition: o.status = 1
      value: 已支付
    - condition: o.status = 2
      value: 已发货
```

→ SQL：
```sql
CASE 
  WHEN o.type = 1 AND o.status = 1 THEN '已支付'
  WHEN o.type = 1 AND o.status = 2 THEN '已发货'
  WHEN o.type = 1 THEN '待处理'
END AS order_status
```

### value 类型推断

| value 格式 | 类型 | SQL输出 |
|-----------|------|---------|
| `p.name` | 字段引用（包含`.`） | `p.name` |
| 其他 | 字符串 | `'value'` |

## 核心概念

**LSM** = Label-SQL Mapping，将自然语言映射为 SQL 查询的规范。

- **标签 (Label)**：业务含义的字段，如"名称"、"价格"、"品牌"
- **映射 (Mapping)**：标签到 SQL 条件的转换规则
- **扩展标签 (Extension)**：按需加载的附加映射，如"品牌"、"分类"

## 已实现配置包

| 包名 | 说明 |
|------|------|
| [lsm-ygopro-database](https://github.com/WYeYang/lsm-ygopro-database) | YGOPRO 卡牌数据库 |

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

创建配置文件夹（包含 main.yaml、数据库、extensions）：

```bash
# 项目结构
my-project/
├── lsm-products-config/      # 配置文件夹
│   ├── main.yaml             # 主配置
│   ├── products.db           # 数据库文件
│   └── extensions/           # 扩展标签（可选）
└── lsm.yaml                  # LLM 配置
```

### 3. 配置 lsm.yaml

> **提示**：如果调用方已配置其他 LLM，则无需配置 `lsm.yaml`，传入现有 LLM 即可使用自然语言查询，避免重复配置 API。

在项目根目录创建 `lsm.yaml` 文件（用于自然语言查询）：

**项目结构：**

```
my-project/
├── node_modules/
│   ├── label-sql-mapping-sdk/  # LSM SDK（npm 安装）
│   └── lsm-xxx-database/       # lsm-* 配置包（npm 安装，二选一）
├── lsm-products-config/        # 自定义配置（手动创建，二选一）
│   ├── main.yaml               # 主配置
│   ├── products.db             # 数据库文件
│   └── extensions/             # 扩展标签（可选）
└── lsm.yaml                    # LLM 配置（项目根目录）
```

**lsm.yaml 结构：**

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

> **提示**：如果传入 `llm` 参数创建 SDK，则无需配置 `lsm.yaml`，LLM 配置会使用传入的实现。

## 使用

```javascript
import { LSMSDK } from 'label-sql-mapping-sdk';

// 自动查找 lsm-* 包
const sdk = new LSMSDK();

// 指定 lsm-* 包名
const sdk = new LSMSDK({ configPath: 'lsm-xxx-database' });

// 指定配置文件路径
const sdk = new LSMSDK({ configPath: './lsm-products-config/main.yaml' });

// 传入自定义 LLM
const sdk = new LSMSDK({ configPath: './lsm-products-config/main.yaml', llm: customLLM });

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
| `main.yaml` | 直接路径 或 `node_modules/lsm-*/main.yaml` |
| `lsm.yaml` | 指定路径；未指定则从 `node_modules` 上级目录向上查找 |
| `extensions/` | 从 main.yaml 同级 `extensions/` 目录加载 |

### main.yaml

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
| `items` | 否 | 枚举值列表 |

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

### `new LSMSDK(options?)`

创建 SDK 实例：

```typescript
interface LSMSDKOptions {
  configPath?: string;  // main.yaml 路径、lsm-* 包名，或不传（自动查找）
  lsmPath?: string;     // lsm.yaml 路径，可选（不传则自动向上查找）
  llm?: LLM;            // 自定义 LLM，可选
}
```

### `sdk.query(options)`

```typescript
interface QueryOptions {
  query?: string;      // 自然语言查询
  sql?: string;         // 原始 SQL（与 query 二选一）
  page?: number;        // 页码，默认 1
  pageSize?: number;    // 每页数量，默认 20
  mode?: 'list' | 'detail';  // 查询模式，默认 'list'
  extensions?: string[]; // 扩展标签值
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
  "explanation": "查询价格大于50的产品"
}
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
lsm-cli -c ./config/main.yaml -q "价格大于100的产品"
# Total: 50 | Page 1/3
# ...

# SQL 查询
lsm-cli -c ./config/main.yaml -s "SELECT * FROM products WHERE id < 10"
# Total: 10 | Page 1/1
# SQL: SELECT * FROM products WHERE id < 10
# ...

# 分页
lsm-cli -c ./config/main.yaml -q "电子产品" -p 2 -ps 10
# Total: 100 | Page 2/10
# ...

# 输出 JSON
lsm-cli -c ./config/main.yaml -q "价格大于100的产品" --json
# {"data":[...],"total":50,...}
```

## 多数据库支持

通过 npm 安装不同的配置包切换数据库：

```bash
npm install lsm-xxx-database
```

只需安装不同的 `lsm-*` 配置包，SDK 代码无需改动。
