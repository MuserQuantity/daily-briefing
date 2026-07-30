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

新建 `content/daily/2026-07-30.md`：

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

### 几条硬约束

- 文件名日期以 **UTC+8** 为准，一天一个文件
- frontmatter 里 `date` 要加引号，否则 YAML 会解析成 Date 对象
- 自定义块用**半角** `|` 分隔，单元格内不能再出现 `|`
- 正文不要写 `# 一级标题`，主标题由 frontmatter 的 `title` 提供

## 部署（Docker Compose）

```bash
docker compose up -d --build
```

站点跑在 `3000` 端口。镜像基于 Next.js standalone 产物，以非 root 用户运行。

关键点在 `docker-compose.yml` 里这行挂载：

```yaml
volumes:
  - ./content:/app/content:ro
```

**`content/` 是挂进去的，不在镜像里冻结。** 自动任务往宿主机的 `./content/daily/` 写文件，下一次请求就会读到新内容——不用重新构建镜像，不用重启容器。

常用操作：

```bash
docker compose logs -f          # 看日志
docker compose up -d --build    # 改了代码后重新部署
docker compose down             # 停止
```

前面通常还要挂一层 Nginx / Caddy 反代来处理 HTTPS。

## 目录结构

```
app/
  page.tsx            首页：当日一期，缺则回退最新
  d/[date]/page.tsx   按日期查看往期
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
  daily/*.md          日报正文
```

## 一些实现细节

**时区**：全站统一 UTC+8，日期在北京时间零点换期。`lib/daily.ts` 用固定 8 小时偏移计算，不依赖服务器本地时区，所以容器不需要配 `TZ`。

**中文锚点**：中文标题直接做 id 会被浏览器百分号编码，而 `#%E6%A8%A1...` 不是合法 CSS 选择器，跳转会抛 `SyntaxError`。所以标题 id 统一转成 `sec-1n2ik9z` 这种纯 ASCII 形式。写作时照常引用 `#模型与产品` 即可，渲染时自动换算。

**渲染时机**：页面是 `force-dynamic`，每次请求实时读文件，这样新日报无需重建即刻生效。同一次请求内的多次读取由 React `cache()` 去重，只扫一次目录。
