# Coway AI Coach

销售团队客户跟进工作台 — 回复教练核心闭环。

## 文件结构

```
/
├── index.html        ← Staff 工作台（主入口）
├── manager.html      ← Manager 登录壳（功能后续 PART 添加）
├── api/
│   ├── auth.js       ← GET /api/auth 返回 staff 列表；POST /api/auth 登录
│   ├── data.js       ← 客户 & 互动历史 CRUD
│   └── coach.js      ← AI 调用（截图分析 / 知识问答）
├── lib/
│   └── token.js      ← HMAC-SHA256 session token 生成与验证
├── sql/
│   └── setup.sql     ← Supabase 建表 SQL（先跑这个）
└── vercel.json       ← coach.js 函数超时设为 30s（需 Vercel Pro）
```

## 以后改什么去哪改

| 要改什么 | 去哪改 |
|---------|-------|
| AI 模型 | `api/coach.js` 顶部 `MODELS` |
| System prompt 行为规则 | `api/coach.js` 顶部 `SYSTEM_RULES` |
| Token 有效期 | `lib/token.js` 顶部 `TOKEN_TTL_MS` |
| 知识库缓存时长 | `api/coach.js` 顶部 `KB_CACHE_TTL_MS` |
| 历史 context 条数 | `api/coach.js` 顶部 `HISTORY_LIMIT` |
| 客户状态选项 | `sql/setup.sql` CHECK 约束 + `index.html` `STATUS_LIST` |
| 前端颜色/样式 | `index.html` `:root` CSS 变量 |

## 环境变量（全部设在 Vercel）

| 变量名 | 用途 |
|--------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（后端专用，绝不暴露前端） |
| `ANTHROPIC_API_KEY` | Claude API key（绝不暴露前端） |

Manager 登录已改为 `managers` 表里的独立账号（见 `sql/2026-08-add-on.sql`），不再用共享的 `MANAGER_PASSWORD` 环境变量。

## 部署步骤

### 1. Supabase 建表
在 Supabase 控制台 → SQL Editor，复制 `sql/setup.sql` 全部内容执行。

执行后插入员工数据（替换成真实信息）：
```sql
INSERT INTO staff (name, pin, team) VALUES
  ('张小明', '1234', 'A组'),
  ('李小红', '5678', 'A组');
```

### 2. 连接 Vercel
1. 在 Vercel 导入 GitHub 仓库 `kaiyan1213/coway-ai-coach`
2. Framework Preset 选 **Other**（无需构建）
3. 在 Project Settings → Environment Variables 添加上方 4 个变量
4. 部署

### 3. Vercel 函数超时
`vercel.json` 中 `coach.js` 设为 30s（需要 **Vercel Pro** 计划）。
Hobby 计划上限 10s，claude-haiku（问答模式）通常 <5s 没问题；
截图分析（claude-sonnet）如果知识库很大可能超时 → 建议升 Pro。

## 安全说明
- 前端不含任何 key，全部走 `/api/` 后端
- 不带 token 请求 `/api/data` 或 `/api/coach` 均返回 401
- Staff 只能读写自己的客户数据（server 端按 `staff_name` 过滤）
- 截图用完即弃，数据库只存 AI 生成的文字总结
