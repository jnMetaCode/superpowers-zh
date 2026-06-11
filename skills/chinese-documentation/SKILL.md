---
name: chinese-documentation
description: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
version: "1.0.0"
license: MIT
metadata:
  hermes:
    tags: [documentation, chinese]
---

# 中文技术文档写作规范

## 概述

中文技术文档最常见的问题不是内容不够，而是**读起来别扭**——中英文挤在一起没有空格、全角半角混用、一股机翻味。本技能提供一套完整的中文技术文档写作规范，让你的文档**专业、好读、不出戏**。

**核心原则：** 排版服务于阅读体验，规范服务于一致性，内容服务于读者。

**参考标准：** [中文文案排版指北](https://github.com/sparanoid/chinese-copywriting-guidelines)

## 中文排版规范

### 空格

**中英文之间加空格：**

```
# 好
使用 Git 进行版本管理，配合 Jenkins 实现持续集成。

# 坏
使用Git进行版本管理，配合Jenkins实现持续集成。
```

**中文与数字之间加空格：**

```
# 好
本次更新包含 3 个新功能和 12 个 Bug 修复。

# 坏
本次更新包含3个新功能和12个Bug修复。
```

**数字与单位之间加空格：**

```
# 好
文件大小不超过 5 MB，响应时间控制在 200 ms 以内。

# 坏
文件大小不超过5MB，响应时间控制在200ms以内。
```

**例外：度数、百分比等不加空格：**

```
# 好
今天气温 32°C，CPU 使用率 95%。

# 坏
今天气温 32 °C，CPU 使用率 95 %。
```

**链接前后加空格：**

```
# 好
请参考 [官方文档](https://example.com) 获取更多信息。

# 坏
请参考[官方文档](https://example.com)获取更多信息。
```

### 标点符号

**中文语境使用全角标点：**

```
# 好
注意：该接口需要鉴权，请先获取 Token。

# 坏
注意:该接口需要鉴权,请先获取 Token.
```

**全角标点与英文/数字之间不加空格：**

```
# 好
项目使用 MIT 协议，详见 LICENSE 文件。

# 坏
项目使用 MIT 协议 ，详见 LICENSE 文件 。
```

**括号的使用：**

```
# 中文语境用全角括号
请运行安装命令（详见下方说明）。

# 括号内有英文或数字时用半角括号
该项目基于 Spring Boot (v3.2.0) 开发。

# 纯英文内容用半角括号
See the documentation (README.md) for details.
```

**引号的使用：**

```
# 中文使用直角引号（推荐）
「确定」按钮触发表单提交，「取消」按钮关闭弹窗。

# 也可以使用弯引号（视团队规范而定）
"确定"按钮触发表单提交，"取消"按钮关闭弹窗。

# 嵌套引号
他说：「请点击『确定』按钮。」
```

### 数字

```
# 阿拉伯数字（技术文档中统一使用半角数字）
支持最多 100 个并发连接。

# 不要用中文数字写技术参数
# 坏：支持最多一百个并发连接。

# 数字使用半角字符
版本号 v2.1.0，端口号 8080，HTTP 状态码 200。
```

## 中英混排最佳实践

### 术语处理原则

**保留英文的情况：**

- 专有名词：React、Kubernetes、Redis、MySQL
- 行业通用缩写：API、SDK、CLI、ORM、CI/CD
- 命令和代码：`npm install`、`git commit`
- 协议和标准：HTTP、TCP/IP、JSON、REST
- 没有公认中文翻译的术语：debounce、throttle、middleware

**翻译为中文的情况：**

- 有公认翻译的通用概念：数据库、服务器、浏览器、框架
- 描述性短语：version control → 版本控制，load balancing → 负载均衡
- 文档标题和章节名（尽量中文，技术名词可保留英文）

### 首次出现标注翻译

技术术语首次出现时，标注中英对照：

```
# 好
本系统采用消息队列（Message Queue）实现异步通信，
使用死信队列（Dead Letter Queue）处理消费失败的消息。

# 后续出现直接使用
消息队列的消费者需要实现幂等性……
```

### 避免过度翻译

```
# 好：保留业界通用英文术语
在 Controller 层做参数校验，Service 层处理业务逻辑。

# 坏：强行翻译反而看不懂
在控制器层做参数校验，服务层处理业务逻辑。

# 好
使用 Redis 做 Session 缓存。

# 坏
使用"远程字典服务"做"会话"缓存。
```

## API 文档中英对照格式

### 接口文档模板

```markdown
## 创建订单 / Create Order

### 基本信息

- **请求方式 (Method):** POST
- **请求路径 (Path):** `/api/v1/orders`
- **鉴权方式 (Auth):** Bearer Token
- **Content-Type:** application/json

### 请求参数 (Request Parameters)

| 参数名 (Field) | 类型 (Type) | 必填 (Required) | 说明 (Description) |
|----------------|-------------|-----------------|-------------------|
| product_id | string | 是 | 商品 ID (Product ID) |
| quantity | integer | 是 | 购买数量 (Quantity)，最小值为 1 |
| address_id | string | 是 | 收货地址 ID (Shipping address ID) |
| coupon_code | string | 否 | 优惠券码 (Coupon code) |

### 请求示例 (Request Example)

\```json
{
  "product_id": "prod_abc123",
  "quantity": 2,
  "address_id": "addr_xyz789",
  "coupon_code": "SUMMER2024"
}
\```

### 响应参数 (Response Parameters)

| 参数名 (Field) | 类型 (Type) | 说明 (Description) |
|----------------|-------------|-------------------|
| order_id | string | 订单 ID (Order ID) |
| status | string | 订单状态 (Order status): pending / paid / shipped |
| total_amount | integer | 订单总金额，单位：分 (Total amount in cents) |
| created_at | string | 创建时间 (Created at)，ISO 8601 格式 |

### 响应示例 (Response Example)

\```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order_id": "ord_20240315001",
    "status": "pending",
    "total_amount": 9900,
    "created_at": "2024-03-15T10:30:00+08:00"
  }
}
\```

### 错误码 (Error Codes)

| 错误码 (Code) | 说明 (Description) | 处理建议 (Suggestion) |
|---------------|--------------------|--------------------|
| 40001 | 商品不存在 (Product not found) | 检查 product_id 是否正确 |
| 40002 | 库存不足 (Insufficient stock) | 减少购买数量或稍后重试 |
| 40003 | 优惠券已过期 (Coupon expired) | 移除 coupon_code 或更换优惠券 |
```

### 金额表示约定

```
# 好：明确说明单位
total_amount: 9900  // 单位：分（即 99.00 元）

# 坏：不说明单位，造成歧义
total_amount: 99.00  // 是元还是分？浮点数会有精度问题
```

## README.md 中文模板

国内开源项目常用的 README 结构：

```markdown
# 项目名称

[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

简短一句话介绍项目是什么、解决什么问题。

## 特性

- 特性一：简要描述
- 特性二：简要描述
- 特性三：简要描述

## 快速开始

### 环境要求

- Node.js >= 20
- MySQL >= 8.0

### 安装

\```bash
npm install your-package
\```

### 基本用法

\```typescript
import { YourPackage } from 'your-package';

const client = new YourPackage({ apiKey: 'your-key' });
const result = await client.doSomething();
\```

## 文档

- [使用指南](./docs/guide.md)
- [API 参考](./docs/api.md)
- [常见问题](./docs/faq.md)
- [更新日志](./CHANGELOG.md)

## 示例

更多示例请查看 [examples](./examples) 目录。

## 贡献指南

欢迎提交 Issue 和 Pull Request。请先阅读 [贡献指南](./CONTRIBUTING.md)。

### 本地开发

\```bash
# 克隆项目
git clone https://gitee.com/your-org/your-project.git

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test
\```

## 致谢

- [依赖项目一](https://example.com) — 简要说明
- [依赖项目二](https://example.com) — 简要说明

## 许可证

[MIT](./LICENSE)
```

## 常见问题与避坑指南

### 问题一：机翻味

**特征：** 句式生硬、不符合中文表达习惯。

```
# 机翻味
这个函数被用来计算用户的折扣。如果你想要获取更多信息，请参考文档。

# 自然中文
这个函数用于计算用户折扣。更多信息请参考文档。
```

**要点：**
- 避免被动语态（"被用来" → "用于"）
- 避免冗余代词（"你想要" → 直接说）
- 避免直译英文句式

### 问题二：句式欧化

**特征：** 长定语、多重从句、一句话说不完。

```
# 欧化句式
这是一个可以帮助开发者在不需要手动配置复杂的构建工具链的情况下
快速搭建现代化前端项目的脚手架工具。

# 正常中文
这是一个前端脚手架工具，帮助开发者快速搭建项目，免去手动配置构建工具链的麻烦。
```

**要点：**
- 长句拆成短句
- 把定语从句改成并列句
- 一句话只说一件事

### 问题三：过度翻译

```
# 过度翻译
请打开您的"终端模拟器"，运行"节点包管理器"的安装命令。

# 正常写法
请打开终端，运行 npm install。
```

### 问题四：中英标点混用

```
# 坏：中文句子用了英文逗号和句号
请先安装依赖,然后运行测试.

# 好：中文句子用全角标点
请先安装依赖，然后运行测试。

# 坏：英文内容用了中文标点
Run `npm install`，then `npm test`。

# 好：英文内容用半角标点
Run `npm install`, then `npm test`.
```

### 问题五：缺乏结构化

```
# 坏：一大段文字没有分段
本系统使用 Redis 做缓存提高查询性能同时使用 MySQL 做持久化存储
数据写入时先写 MySQL 再异步更新 Redis 缓存读取时先查 Redis 如果
未命中再查 MySQL 并将结果回写缓存设置过期时间为 30 分钟……

# 好：用列表和分段组织信息
本系统的缓存策略如下：

- **存储层：** MySQL（持久化）+ Redis（缓存）
- **写入流程：** 先写 MySQL，再异步更新 Redis
- **读取流程：** 先查 Redis → 未命中则查 MySQL → 回写 Redis
- **缓存过期：** TTL 设为 30 分钟
```

## 写作检查清单

在发布文档前，逐项检查：

### 排版

- [ ] 中英文之间有空格
- [ ] 中文与数字之间有空格
- [ ] 中文语境使用全角标点
- [ ] 英文/代码部分使用半角标点
- [ ] 没有全角半角标点混用

### 术语

- [ ] 专有名词保留英文原文
- [ ] 首次出现的术语标注了中英对照
- [ ] 没有过度翻译业界通用术语
- [ ] 术语使用前后一致

### 内容

- [ ] 句子简短，没有欧化长句
- [ ] 没有不必要的被动语态
- [ ] 用列表和表格组织结构化信息
- [ ] 代码示例可以直接运行
- [ ] 没有"机翻味"

### 格式

- [ ] 标题层级正确（不跳级）
- [ ] 代码块标注了语言类型
- [ ] 链接可以正常访问
- [ ] 图片有 alt 文本
