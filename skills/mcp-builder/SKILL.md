---
name: mcp-builder
description: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
version: "1.0.0"
license: MIT
metadata:
  hermes:
    tags: [mcp, development]
---

# MCP 服务器构建

系统化设计、实现、测试和部署 Model Context Protocol 服务器的方法论。

## 1. 协议核心概念

MCP 定义三种原语：

- **Tools（工具）**：AI 助手主动调用的函数，有副作用。如搜索、创建、删除操作。
- **Resources（资源）**：AI 助手只读访问的数据源，用 URI 标识。如 `users://{id}/profile`。
- **Prompts（提示词模板）**：预定义交互模板，引导用户触发工作流。

**选择原则：** 执行操作 → Tool | 读取数据 → Resource | 引导交互 → Prompt

## 2. 项目结构规范

### TypeScript
```
my-mcp-server/
├── src/
│   ├── index.ts          # 入口，注册 tools/resources
│   ├── tools/             # 按功能拆分
│   ├── resources/
│   └── lib/               # 客户端封装、校验逻辑
├── tests/
├── package.json
└── tsconfig.json
```

关键依赖：`@modelcontextprotocol/sdk` + `zod`

### Python
```
my-mcp-server/
├── src/my_mcp_server/
│   ├── server.py
│   ├── tools/
│   └── lib/
├── tests/
└── pyproject.toml
```

关键依赖：`mcp` + `pydantic`

## 3. Tool 设计原则

### 命名
- `snake_case` 格式，动词开头：`search_users`、`create_issue`、`delete_file`
- 名称自解释，AI 助手靠名称选工具，模糊命名导致误调用

### 参数
- 每个参数有类型约束和 `.describe()` 描述
- 可选参数给默认值，减少 AI 决策负担
- 用枚举代替布尔开关

```typescript
server.tool("search_issues", {
  query: z.string().describe("搜索关键词"),
  status: z.enum(["open", "closed", "all"]).default("open").describe("状态筛选"),
  limit: z.number().min(1).max(100).default(20).describe("返回上限"),
}, async ({ query, status, limit }) => { /* ... */ });
```

### 描述
说明**用途 + 返回内容 + 限制**，这是 AI 选择工具的关键依据：

```typescript
server.tool("search_users",
  "根据姓名或邮箱搜索用户。返回 ID、姓名、邮箱列表。模糊匹配，最多 50 条。",
  schema, handler);
```

### 输出
- 结构化数据 → JSON，人类可读内容 → Markdown
- 始终用 `content: [{ type: "text", text: "..." }]` 格式返回

## 4. 输入验证和错误处理

用 Zod/Pydantic 做 Schema 级校验，业务级校验放 handler 开头：

```typescript
server.tool("get_user", { id: z.string() }, async ({ id }) => {
  try {
    const user = await db.getUser(id);
    if (!user) {
      return {
        content: [{ type: "text", text: `用户 ${id} 不存在，请检查 ID。` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(user, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: `查询失败：${err.message}` }],
      isError: true,
    };
  }
});
```

**错误处理四原则：**
1. 永远不让服务器崩溃 — try/catch 包裹所有外部调用
2. 返回可操作的错误信息 — 告诉 AI 问题是什么、能做什么
3. 使用 `isError: true` — 让 AI 知道调用失败
4. 区分错误类型 — 参数错误、权限不足、资源不存在、服务不可用

## 5. 资源管理和生命周期

```typescript
// 资源注册
server.resource("user-profile", "users://{userId}/profile", async (uri) => {
  const profile = await db.getProfile(extractId(uri));
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(profile) }] };
});

// 生命周期：先初始化 → 再 connect → 监听关闭信号
const db = await Database.connect(config.dbUrl);
await server.connect(new StdioServerTransport());
process.on("SIGINT", async () => { await db.disconnect(); await server.close(); process.exit(0); });
```

关键点：使用连接池、所有外部调用设超时、优雅关闭清理资源。

## 6. 测试策略

### 单元测试 — 业务逻辑与 MCP 注册分离
```typescript
// tools/search.ts 导出纯函数
export async function searchUsers(query: string, limit: number) { /* ... */ }

// search.test.ts 独立测试
test("返回匹配结果", async () => {
  const results = await searchUsers("alice", 10);
  expect(results[0].name).toContain("Alice");
});
```

### 集成测试 — 用 SDK Client 做端到端验证
```typescript
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
const client = new Client({ name: "test", version: "1.0.0" });
await client.connect(clientTransport);
const result = await client.callTool("search_users", { query: "test" });
expect(result.isError).toBeFalsy();
```

### MCP Inspector — 交互式调试
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

在浏览器中查看所有 tools/resources，手动调用并查看结果。

**测试要点：** 每个 Tool 覆盖正常 + 异常路径、边界值、外部服务失败模拟。

## 7. 安全考虑

**权限控制：**
- 最小权限原则，读写 Tool 分离
- 危险操作要求确认参数（如 `confirm: true`）

**输入安全：**
- SQL 注入 → 参数化查询，绝不拼接
- 路径遍历 → 校验路径，禁止 `../`
- 命令注入 → 用 `execFile` 而非 `exec`

**敏感数据：**
- 密钥通过环境变量传入，不硬编码
- 日志不打印完整敏感信息
- 返回数据做脱敏处理

**沙箱：** 文件操作限制目录、网络请求限制白名单、设置资源配额。

## 8. 部署和分发

### npm 发布
```json
{ "bin": { "mcp-server-myservice": "dist/index.js" }, "files": ["dist"] }
```

用户配置：
```json
{ "mcpServers": { "myservice": { "command": "npx", "args": ["@yourorg/mcp-server-myservice"], "env": { "API_KEY": "xxx" } } } }
```

### pip 发布
```toml
[project.scripts]
mcp-server-myservice = "my_mcp_server.server:main"
```

### Docker — 适用于复杂依赖或隔离场景
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./ && RUN npm ci --production
COPY dist ./dist
ENTRYPOINT ["node", "dist/index.js"]
```

## 9. 调试技巧

**关键：MCP 用 stdio 通信，不能用 `console.log`，会破坏协议流。**

```typescript
// 错误
console.log("debug");
// 正确
console.error("[DEBUG]", info);
// 更好
server.sendLoggingMessage({ level: "info", data: "处理中" });
```

**常见问题：**

| 症状 | 原因 | 解决 |
|------|------|------|
| 启动无响应 | transport 未连接 | 检查 `server.connect()` |
| Tool 不出现 | 注册在 connect 之后 | 先注册再 connect |
| AI 不调用 Tool | 描述不清晰 | 改善名称和描述 |
| 参数总错 | Schema 不明确 | 添加 `.describe()` |
| 调用超时 | 外部服务慢 | 加超时和缓存 |

**调试流程：** Inspector 验证基本功能 → 手动调用确认输入输出 → 连接真实 AI 客户端观察调用模式 → 根据实际行为调整设计。

## 10. 构建检查清单

### 设计
- [ ] 明确 Tools vs Resources vs Prompts 分工
- [ ] Tool 命名 `动词_名词`，描述说明用途和返回内容
- [ ] 参数简洁，可选参数有合理默认值

### 实现
- [ ] 输入用 Zod/Pydantic 校验
- [ ] 外部调用有 try/catch 和超时
- [ ] 错误返回 `isError: true` 并附可操作信息
- [ ] 不用 `console.log`（用 stderr 或 SDK 日志）
- [ ] 敏感数据走环境变量

### 测试
- [ ] 核心逻辑有单元测试
- [ ] 有集成测试验证 MCP 协议交互
- [ ] 用 MCP Inspector 手动验证过
- [ ] 用真实 AI 客户端测试过

### 部署
- [ ] README 含安装和配置说明
- [ ] 提供客户端配置 JSON 示例
- [ ] 遵循 semver，无硬编码密钥
