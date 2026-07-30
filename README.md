# AI 日报 · Daily Briefing

按日期归档的日报站点。内容是纯 Markdown 文件，**放进目录就能发布**——没有数据库，没有后台，没有构建流水线。

首页展示当前 UTC+8 日期的那一期；当天还没发布时，自动回退到站内最新一期并在顶部提示。

## 它解决什么问题

给自动任务（脚本 / AI）一个稳定的投递口：按天往 `content/daily/` 写一个 `YYYY-MM-DD.md`，站点立刻就能读到。排序、月份归档、上下期导航、右侧目录全部由文件名和正文推导，**不需要改代码，也不需要重启**。

## 技术栈

| | |
| --- | --- |
| 框架 | Next.js 16（App Router、Turbopack） |
| 语言 | TypeScript（strict） |
| 样式 | Tailwind CSS v4 |
| 渲染 | react-markdown + remark-gfm |
| Frontmatter | gray-matter |
| 包管理 | pnpm |

## 本地开发

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

其他命令：

```bash
pnpm build        # 生产构建（会跑类型检查）
pnpm start        # 启动构建产物
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
```

## 写一期日报

日报按**年、月两层归档**，避免几年后一个目录里堆几千个文件：

```
content/daily/
  2026/
    06/2026-06-30.md
    07/2026-07-29.md
       2026-07-30.md
```

布局是严格的——目录层级必须和文件名日期对得上，放错层的文件会被忽略。用推送接口发布时目录会自动创建。

新建 `content/daily/2026/07/2026-07-30.md`：

````markdown
---
title: 推理成本再降一半，端侧模型开始抢占入口
date: '2026-07-30'
issue: 214
editor: 编辑部
summary: 主流推理服务价格集体下调，端侧小模型部署量首次超过云端调用量。
tags:
  - 模型发布
  - 推理成本
highlights:
  - 三家主流厂商在同一周内下调长上下文定价，平均降幅 48%
  - 端侧模型月活设备突破 9 亿台
---

## 今日概览

正文用标准 Markdown 写即可。

```stat
长上下文均价降幅 | 48% | -48%
端侧模型月活设备 | 9.1 亿 | +23%
```
````

刷新页面就能看到，不用重启。

除标准 GFM 外，站点还提供 7 种排版块（`stat` 指标卡、`quote` 大字引言、`kv` 参数表、`compare` 能力对比、`timeline` 时间线、`cards` 导读卡、`sources` 来源列表）和 5 种 GitHub Alert 提示块。

**完整字段说明和语法规范见 [content/FORMAT.md](content/FORMAT.md)**——那份文档就是写给自动任务看的，可以直接塞进 prompt。

现成的提示词放在 [docs/prompts/](docs/prompts/)：

- [daily.md](docs/prompts/daily.md) —— 每日定时生成并发布，含跨期去重规则
- [backfill.md](docs/prompts/backfill.md) —— 把别处写好的历史日报批量转换并上传

两份都用 `<DAILY_API_TOKEN>` 占位，用之前替换成真实密钥。

### 几条硬约束

- 路径为 `content/daily/YYYY/MM/YYYY-MM-DD.md`，月份补零（`07` 而非 `7`）
- 文件名日期以 **UTC+8** 为准，一天一个文件
- frontmatter 里 `date` 要加引号，否则 YAML 会解析成 Date 对象
- 自定义块用**半角** `|` 分隔，单元格内不能再出现 `|`
- 正文不要写 `# 一级标题`，主标题由 frontmatter 的 `title` 提供

## 推送接口

不方便直接写服务器文件系统时，用 HTTP 推送。适合跑在别处的自动任务。

### 配置

只有一个环境变量，写在 `.env` 里（可从 `.env.example` 复制）：

```bash
DAILY_API_TOKEN=$(openssl rand -hex 32)
```

**不设置就等于不开启**：接口一律返回 503，不会出现一个公开可写的端点。

### `POST /api/daily` — 发布

两种请求体都支持，按 `Content-Type` 区分。同一天重复推送直接覆盖，**幂等**，任务重试或修正当天内容都安全。

**结构化 JSON**——服务端负责拼 frontmatter，客户端不用操心 YAML 转义：

```bash
curl -X POST https://你的域名/api/daily \
  -H "Authorization: Bearer $DAILY_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "date": "2026-07-30",
    "title": "推理成本再降一半",
    "issue": 214,
    "editor": "编辑部",
    "summary": "一到两句导语。",
    "tags": ["模型发布", "推理成本"],
    "highlights": ["要点一", "要点二"],
    "content": "## 今日概览\n\n正文用标准 Markdown。"
  }'
```

除 `date` 和 `content` 外都可省略。

**原始 Markdown**——按 [FORMAT.md](content/FORMAT.md) 生成好整篇就直接发，原样落盘：

```bash
curl -X POST https://你的域名/api/daily \
  -H "Authorization: Bearer $DAILY_API_TOKEN" \
  -H 'Content-Type: text/markdown' \
  --data-binary @2026-07-30.md
```

日期取自 frontmatter 的 `date`；正文没写 frontmatter 时用 `?date=2026-07-30` 指定。

成功返回：

```json
{ "ok": true, "action": "created", "date": "2026-07-30",
  "file": "content/daily/2026/07/2026-07-30.md", "bytes": 4213 }
```

`action` 为 `created` 或 `updated`，可据此判断是新发还是覆盖。

### `GET /api/daily` — 列出已发布

```bash
curl -H "Authorization: Bearer $DAILY_API_TOKEN" https://你的域名/api/daily
```

返回 `today`（当前 UTC+8 日期）和全部期次的元信息。自动任务可以先查一下，避免重复发。

### 错误码

| 状态码 | 含义 |
| --- | --- |
| `401` | 密钥缺失或不正确 |
| `400` | 日期非法、缺 `content`、frontmatter 的 YAML 写坏了 |
| `413` | 请求体超过 1 MB |
| `415` | `Content-Type` 不是上面两种 |
| `503` | 未配置 `DAILY_API_TOKEN`，接口未开启 |
| `500` + `content_not_writable` | `content/` 目录容器内写不进去，见下方权限说明 |

YAML 写坏时会**在落盘前**拦下并回报具体报错位置，不会留下一个渲染时才炸的文件。

## 部署（Docker Compose）

```bash
cp .env.example .env      # 填入 DAILY_API_TOKEN
sudo chown -R 1001:1001 ./content
docker compose up -d --build
```

站点跑在 `3000` 端口。镜像基于 Next.js standalone 产物，以非 root 用户（uid 1001）运行。

关键点在这行挂载：

```yaml
volumes:
  - ./content:/app/content
```

**`content/` 是挂到宿主机的，不在镜像里冻结。** 无论是推送接口写入，还是直接往 `./content/daily/` 扔文件，下一次请求就能读到——不用重建镜像，不用重启容器，内容也不会随容器重建而丢失。

> 上面那句 `chown` 不能省。容器以 uid 1001 运行，宿主机目录默认不归它所有，漏掉的话推送接口会返回 `content_not_writable`。只读模式（不开推送接口、只手动放文件）可以把挂载改回 `:ro`。

常用操作：

```bash
docker compose logs -f          # 看日志
docker compose up -d --build    # 改了代码后重新部署
docker compose down             # 停止
```

前面通常还要挂一层 Nginx / Caddy 反代来处理 HTTPS——**推送接口带密钥，务必走 HTTPS，不要裸奔在公网 HTTP 上。**

## 目录结构

```
app/
  page.tsx            首页：当日一期，缺则回退最新
  d/[date]/page.tsx   按日期查看往期
  api/daily/route.ts  推送接口：POST 发布 / GET 列表
  icon.svg            站点图标（Next.js 文件约定）
  globals.css         Tailwind v4 主题变量
components/
  site-shell.tsx      三栏布局：归档 / 正文 / 目录
  markdown-renderer.tsx  Markdown 渲染 + 7 种自定义块 + 锚点
  archive-sidebar.tsx 左侧按月归档
  toc.tsx             右侧目录，滚动高亮
  daily-view.tsx      单期页面：头部、要点速览、上下期导航
  site-clock.tsx      顶栏 UTC+8 时钟
lib/
  daily.ts            读取 / 解析 / 排序 content/daily
content/
  FORMAT.md           Markdown 格式规范（不会被渲染）
  daily/YYYY/MM/*.md  日报正文，按年月归档
docs/prompts/         自动任务用的提示词
.env.example          环境变量样例
```

## 一些实现细节

**时区**：全站统一 UTC+8，日期在北京时间零点换期。`lib/daily.ts` 用固定 8 小时偏移计算，不依赖服务器本地时区，所以容器不需要配 `TZ`。

**中文锚点**：中文标题直接做 id 会被浏览器百分号编码，而 `#%E6%A8%A1...` 不是合法 CSS 选择器，跳转会抛 `SyntaxError`。所以标题 id 统一转成 `sec-1n2ik9z` 这种纯 ASCII 形式。写作时照常引用 `#模型与产品` 即可，渲染时自动换算。

**渲染时机**：页面是 `force-dynamic`，每次请求实时读文件，这样新日报无需重建即刻生效。同一次请求内的多次读取由 React `cache()` 去重。

**索引缓存**：`force-dynamic` 意味着每个请求都要拿到全量列表，而读取加解析是 O(期数)——实测 1000 期约 23 ms，还会继续线性增长。所以进程内缓存了解析结果，每次只用 `readdir` + `stat` 算一个签名来判断有没有变化（同规模约 2 ms），签名不变就直接复用。文件一改签名就变，「写入后立刻生效」的行为没有损失。

顺带一提，把日报分到年/月目录**不会**降低这个成本（照样要遍历解析全部文件），它解决的是目录可读性；真正省时间的是上面这层缓存。

**容错**：某个文件 frontmatter 写坏了只会跳过它并在日志里报出来，不会让整站 500。推送接口更进一步，在落盘前就把坏内容挡掉。
