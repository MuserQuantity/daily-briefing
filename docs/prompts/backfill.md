> 用途：把别处已经写好的历史日报批量整理成本站格式并逐篇上传。一次性任务。
> 使用前把 `<DAILY_API_TOKEN>` 换成真实密钥、`<日报目录>` 换成实际路径。
> 以下全文即提示词，可整份复制。

---

# 任务：批量整理并上传历史日报

把 `<日报目录>` 下所有已写好的日报，逐篇转换成目标格式后，通过 HTTP 接口上传到
https://ai-daily.muserquantity.cn

## 一、上传接口

POST https://ai-daily.muserquantity.cn/api/daily

请求头：
  Authorization: Bearer <DAILY_API_TOKEN>
  Content-Type: application/json

请求体（JSON），frontmatter 由服务端自动拼装，你不用管 YAML 转义：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| date | string | 是 | YYYY-MM-DD，以 UTC+8 为准 |
| content | string | 是 | 正文 Markdown，不含一级标题，见第三节 |
| title | string | 建议 | 主标题，22 字以内最佳 |
| issue | number | 否 | 期号，必须是数字，不能是 "214" |
| editor | string | 否 | 署名 |
| summary | string | 否 | 导语 1–2 句，80 字以内，必须是完整句子 |
| tags | string[] | 否 | 3–5 个，每个 2–6 字 |
| highlights | string[] | 否 | 3–5 条，每条一句话，纯文本不带 Markdown 语法 |

成功返回：
  {"ok":true,"action":"created","date":"2026-07-30",
   "file":"content/daily/2026/07/2026-07-30.md","bytes":4213}
action 为 created（新建）或 updated（覆盖同一天旧内容）。

失败返回 {"ok":false,"error":"...","message":"具体原因"}：

| 状态码 | 含义 | 怎么处理 |
| --- | --- | --- |
| 400 | 日期非法 / 缺 content / 格式问题 | 内容没有落盘，修正后重试 |
| 401 | Key 不对 | 立刻停止并报告，不要重试 |
| 413 | 单篇超过 1 MB | 跳过并报告 |
| 503 | 服务端未开启接口 | 立刻停止并报告 |

同一天重复上传直接覆盖，幂等，所以失败重试是安全的。

查询已上传：GET https://ai-daily.muserquantity.cn/api/daily
（同样带 Authorization）返回 {"ok":true,"today":"...","count":N,"items":[...]}

## 二、字段映射

现有日报由「日报主体」和「参考」两部分组成：

- 日报主体 → content
- 参考 → 转成 sources 块，追加到 content 末尾（见第三节）
- 主体开头的一级标题（# xxx）→ 提取作为 title，并从 content 里删掉
- summary / highlights / tags → 从正文提炼，不要编造原文没有的信息
- date → 见第四节

## 三、正文格式规范

content 用标准 Markdown（支持 GFM 表格、删除线、任务列表），约定：

1. 不要写 `# 一级标题`，正文从 `##` 开始分章
2. 用 3–5 个 `##` 分章，章节内可用 `###` 细分
   （右侧目录由 ##/### 自动生成，至少 2 个标题才显示）

参考资料转成 sources 块，放正文最末尾：

```sources
来源标题一 | https://example.com/a | 官方
来源标题二 | https://example.com/b
```

规则：
- 每行「标题 | 链接 | 备注」，备注可省略
- 分隔符是半角竖线 |，全角 ｜ 无效
- 单元格内不能出现 |（没有转义机制），标题里有就换成 / 或 ，
- 如果某条参考不是「标题+链接」结构，塞不进这个格式，就保留成普通
  Markdown 列表放在 `## 参考资料` 下，不要硬凑

可选排版块（内容合适才用，不要为用而用）：
- ```stat      指标卡：标签 | 数值 | 变化（变化以 - 开头显示红色下降箭头）
- ```quote     大字引言：末行以「— 」开头视为出处
- ```kv        参数表：键 | 值
- ```timeline  时间线：时刻 | 事件 | 说明
- ```compare   对比表：首行表头，单元格 yes/no/na 渲染成图标
- 提示块：> [!TIP] 标题，类型有 NOTE/TIP/IMPORTANT/WARNING/CAUTION

这些块内按纯文本渲染，**粗体**、[链接]() 不生效（提示块除外），
同样受「半角 | 分隔、单元格内不含 |」约束。

完整规范（可选，拉不到不影响执行，上面已含全部必要规则）：
https://raw.githubusercontent.com/MuserQuantity/daily-briefing/main/content/FORMAT.md

## 四、日期怎么定

date 必须是 YYYY-MM-DD，且是真实存在的日历日期（2026-02-30 会被拒绝）。

优先级：
1. 日报文件名里的日期
2. 正文或元信息里明确写出的日期
3. 文件创建/修改时间

如果来源之间冲突、或者都找不到，就跳过这篇并在报告里列出，不要猜。
一天只能有一篇，若多篇指向同一天，停下来报告，让我决定。

## 五、执行步骤

1. 先 GET /api/daily 看站点已有哪些日期
2. 扫描待处理日报，先输出清单：文件 → 推断日期 → 标题，不要直接开传
3. 只上传 1 篇，确认返回 ok，然后打开
   https://ai-daily.muserquantity.cn/d/<日期>
   确认渲染正常（标题、分章、右侧目录、参考来源都对）
4. 确认无误后写一个脚本批量处理剩余的，不要手工一条条 curl
5. 顺序执行，每篇间隔 1 秒；单篇失败记录下来继续，不要中断整批
6. 结束后再 GET /api/daily，核对 count 与预期一致

## 六、最后给我一份报告

- 成功：日期 | 标题 | created/updated
- 失败：文件 | 日期 | 状态码 | 原因
- 跳过：文件 | 跳过原因
- 站点最终期数
