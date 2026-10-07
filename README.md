# My Skills

这个仓库保存可被 AI agent 调用的 skills。`SKILL.md` 是给 agent 读取的执行规则；本 `README.md` 是给人类看的索引和使用说明。

原则：

- 不把人类说明写进各个 skill 运行目录，避免干扰 agent 读取 `SKILL.md`。
- 仓库级图片和示意图统一放在 `assets/`。
- `SKILL.md` 保持机器可执行、约束明确；README 只做导航和解释。

## Skill Index

以下索引覆盖仓库中 28 个非隐藏 skill 目录；名称以技能文件的 `name` 为准。本地 `.system/` 被 Git 忽略，不属于本仓库的发布内容。

| Skill | 目录 | 主要用途 | 常见触发 |
|---|---|---|---|
| `agent-cli-design` | [`agent-cli-design/`](agent-cli-design/SKILL.md) | 设计、审计、实现 agent 友好的 CLI | CLI 设计、Click/Cobra/Clap/argparse、MCP vs CLI |
| `aihot` | [`aihot/`](aihot/SKILL.md) | 查询 AI HOT 中文 AI 资讯、精选、热点和日报 | AI 日报、AI HOT、今天 AI 圈有什么 |
| `answer-me-with-html` | [`answer-me-with-html/`](answer-me-with-html/SKILL.md) | 将 Markdown 草稿渲染为单页 HTML 解释器，支持讲解视频 | 讲讲原理、方案对比、没看懂、做个视频 |
| `anthropic-weekly-blog` | [`anthropic-weekly-blog/`](anthropic-weekly-blog/skill.md) | 分析本周 Anthropic Engineering 博客 | Anthropic weekly blog、本周 Anthropic 工程博客 |
| `archify` | [`archify/`](archify/SKILL.md) | 生成可交互、可导出的 HTML/SVG 技术图 | 系统架构、调用时序、数据流、状态机、Mermaid 美化 |
| `bro` | [`bro/`](bro/SKILL.md) | 用无术语的人话简短重述上一条消息 | 显式调用 /bro |
| `claude-weekly-blog` | [`claude-weekly-blog/`](claude-weekly-blog/SKILL.md) | 分析本周 Claude 博客文章 | Claude blog this week、Claude 本周博客 |
| `deep-research` | [`deep-research/`](deep-research/SKILL.md) | 多轮搜索、反思、证据交叉验证的深度研究 | research、调查、综合分析、带引用报告 |
| `design-understanding-check` | [`design-understanding-check/`](design-understanding-check/SKILL.md) | 复杂方案实施前，通过解释与提问帮助使用者理解并接手设计 | 已有复杂方案、理解关键取舍、实施前理解检查 |
| `eli5` | [`eli5/`](eli5/SKILL.md) | 用大图和少量文字解释陌生概念 | /eli5 <主题>、用最简单的图解释 |
| `github-repo-analyzer` | [`github-repo-analyzer/`](github-repo-analyzer/SKILL.md) | 分析 GitHub 仓库功能、技术栈和架构 | 给出 GitHub repo URL 并要求分析 |
| `goal-ready-coach` | [`goal-ready-coach/`](goal-ready-coach/SKILL.md) | 把模糊任务收敛为 Goal Contract，确认后落盘 | Goal Ready、转成 Goal、创建 Goal 前先澄清、小步快跑 |
| `handoff` | [`handoff/`](handoff/SKILL.md) | 保存或加载 agent-to-agent 技术交接文件 | 保存进度、恢复进度、继续上次、load handoff、checkpoint |
| `incremental-development` | [`incremental-development/`](incremental-development/SKILL.md) | 先简化复杂改动，再按可验证行为逐片交付 | 复杂改动、小步实现、跨模块协同、失败恢复 |
| `kami` | [`kami/`](kami/SKILL.md) | 排版专业文档、幻灯片和产品落地页 | PDF 排版、简历、一页纸、PPT、Marp、landing page |
| `linuxdo-newsflash` | [`linuxdo-newsflash/`](linuxdo-newsflash/SKILL.md) | 只读 linux.do 前沿快讯列表，生成标题级日报 | linux.do 快讯、前沿快讯、linuxdo-newsflash |
| `linuxdo-opensource` | [`linuxdo-opensource/`](linuxdo-opensource/SKILL.md) | 筛选 linux.do 开源推广项目 Top 20，记录已展示项目 | 开源推广、linux.do 开源项目、linuxdo-opensource |
| `open-code-review` | [`open-code-review/`](open-code-review/SKILL.md) | 使用 ocr CLI 审查 Git 变更，按请求修复 | 代码审查、PR review、暂存区/工作区 review、分支对比 |
| `openai-weekly-blog` | [`openai-weekly-blog/`](openai-weekly-blog/SKILL.md) | 分析 OpenAI 本周 Research/Engineering 博客 | OpenAI blog this week、OpenAI 本周博客 |
| `pdf` | [`pdf/`](pdf/SKILL.md) | PDF 提取、生成、合并、拆分、表单处理 | PDF 分析、填表、合并、拆分 |
| `reddit-analyzer` | [`reddit-analyzer/`](reddit-analyzer/SKILL.md) | 筛选 Reddit 高质量技术帖子 | 分析 Reddit、AgentsOfAI 帖子 |
| `skill-creator` | [`skill-creator/`](skill-creator/SKILL.md) | 创建、修改、优化、评测 skills | 创建 skill、优化 skill、skill eval |
| `sync-docs-index` | [`sync-docs-index/`](sync-docs-index/SKILL.md) | 同步文档目录索引和摘要，整理单篇文章 | 更新索引、同步文档摘要、整理文章 |
| `tap-adapter-author` | [`tap-adapter-author/`](tap-adapter-author/SKILL.md) | 为新站点或命令编写 TAP adapter | 写 TAP adapter、适配新网站 |
| `typesafe-ai` | [`typesafe-ai/`](typesafe-ai/SKILL.md) | 用 TypeSafe/Jev 的类型化判断构建 AI 功能 | 语义路由、排序、抽取、验证、AI 功能设计 |
| `web-tech-article-analyzer` | [`web-tech-article-analyzer/`](web-tech-article-analyzer/SKILL.md) | 用 7 层框架分析技术文章、URL、博客和帖子 | 分析技术文章、URL、博客、Reddit、X、WeChat |
| `weread-skills` | [`weread-skills/`](weread-skills/SKILL.md) | 查询微信读书书籍、书架、笔记、书评和阅读统计 | 微信读书、搜索书籍、我的书架、划线、阅读统计 |
| `wiki-index-audit` | [`wiki-index-audit/`](wiki-index-audit/SKILL.md) | 审计 Wiki 检索入口、内容冗余和页面边界 | Wiki 健检、检索质量审计、减少重复、合并拆页 |

## 按任务查找

| 你想做什么 | 推荐入口 | 选择边界 |
|---|---|---|
| 查询 AI 新闻或技术博客 | [aihot](aihot/SKILL.md)、[Anthropic 周报](anthropic-weekly-blog/skill.md)、[Claude 周报](claude-weekly-blog/SKILL.md)、[OpenAI 周报](openai-weekly-blog/SKILL.md) | AI HOT 查资讯；周报按站点与周范围过滤 |
| 浏览 linux.do 快讯或开源项目 | [linuxdo-newsflash](linuxdo-newsflash/SKILL.md)、[linuxdo-opensource](linuxdo-opensource/SKILL.md) | 前者只读快讯标题；后者筛项目并维护展示账本 |
| 分析文章、仓库或研究问题 | [web-tech-article-analyzer](web-tech-article-analyzer/SKILL.md)、[github-repo-analyzer](github-repo-analyzer/SKILL.md)、[deep-research](deep-research/SKILL.md)、[reddit-analyzer](reddit-analyzer/SKILL.md) | 分别面向文章、代码仓库、多来源研究和社区筛选 |
| 看懂概念或技术流程 | [answer-me-with-html](answer-me-with-html/SKILL.md)、[archify](archify/SKILL.md)、[eli5](eli5/SKILL.md) | 分别侧重单页解释、技术图和零基础图解 |
| 理解并接手已有复杂方案 | [design-understanding-check](design-understanding-check/SKILL.md) | 设计完成后、实施前检查理解；不承担前置设计或开发验证 |
| 排版文档或处理 PDF | [kami](kami/SKILL.md)、[pdf](pdf/SKILL.md) | 前者负责视觉排版；后者负责 PDF 内容与文件操作 |
| 澄清任务、推进复杂开发或交接 | [goal-ready-coach](goal-ready-coach/SKILL.md)、[incremental-development](incremental-development/SKILL.md)、[handoff](handoff/SKILL.md) | 分别负责契约收敛、行为切片与会话恢复 |
| 创建工具、AI 功能或审查代码 | [agent-cli-design](agent-cli-design/SKILL.md)、[tap-adapter-author](tap-adapter-author/SKILL.md)、[typesafe-ai](typesafe-ai/SKILL.md)、[open-code-review](open-code-review/SKILL.md) | 分别面向 CLI、站点 adapter、类型化语义判断和 Git review |
| 维护 skills 或 Markdown Wiki | [skill-creator](skill-creator/SKILL.md)、[sync-docs-index](sync-docs-index/SKILL.md)、[wiki-index-audit](wiki-index-audit/SKILL.md) | 创建/评测技能、同步文档入口、审计检索与页面边界 |
| 查询个人阅读记录 | [weread-skills](weread-skills/SKILL.md) | 使用微信读书 API，需要 `WEREAD_API_KEY` |
| 让上一条回复更好懂 | [bro](bro/SKILL.md) | 显式调用，只重述上一条消息 |

## Skills

### agent-cli-design

**用途：** 设计和构建 agent 友好的 CLI，覆盖审计、设计和实现三种模式。

**适合场景：**

- 评估现有 CLI 是否适合 AI agent 使用。
- 设计命令树、结构化输出、退出码、dry-run、幂等行为和错误信息。
- 为 Click、Cobra、Clap、argparse 等 CLI 框架做改造建议。

**示例：**

```text
帮我审计这个 CLI 是否适合 agent 使用。
设计一个支持 json 输出和 dry-run 的命令结构。
```

### aihot

**用途：** 通过 AI HOT 的匿名只读 API 获取中文 AI 资讯、日报、当前热点和精选条目。

**注意：** 不需要 API Key 或 MCP server；新闻必须基于当前 API 数据，不能凭训练记忆回答。

**适合场景：**

- 查询今天或最近的 AI 新闻。
- 了解大模型、产品、论文、行业动态。
- 生成中文 AI 简报。

**示例：**

```text
今天 AI 圈有什么？
看一下 AI HOT 精选。
最近 OpenAI/Anthropic/Google 发布了什么？
```

### answer-me-with-html

**用途：** 将简短的扩展 Markdown 草稿渲染为单页 HTML 解释器。Agent 写内容，内置 CLI 负责布局、主题、图形坐标和深浅色模式。

**适合场景：**

- 解释多概念关系、调用链、状态转换或方案取舍。
- 把诊断、计划或技术说明变成可浏览的面板页面。
- 用户明确要求时，生成带旁白或字幕的讲解视频。

**示例：**

```text
讲讲这个协议的原理，做成一页 HTML。
对比这三个方案，展示各自的边界。
把这个流程做个讲解视频。
```

**注意：** 页面渲染需要 Node.js 20+，使用 `scripts/am.mjs`，无需安装依赖。视频文件导出另有环境要求；清理缓存需先预览并确认。

### anthropic-weekly-blog

**用途：** 获取并分析本周 Anthropic Engineering 博客，生成中文技术报告。

**适合场景：**

- 汇总 Anthropic 本周工程文章。
- 分析每篇文章的技术价值和实现细节。

**示例：**

```text
分析本周 Anthropic 工程博客。
Anthropic weekly blog 有什么新文章？
```

### archify

**用途：** 生成独立 HTML 技术图，内嵌 SVG，支持交互探索、深浅色主题、可选轨迹动画和多格式导出。

**适合场景：**

- 系统架构、基础设施、网络与安全拓扑。
- 工作流、API 调用时序、数据管道和生命周期/状态机。
- 将 Mermaid flowchart、sequenceDiagram 或 stateDiagram 美化为可浏览图形。

**示例：**

```text
根据这个仓库的实际代码画出请求生命周期。
把这段 Mermaid 时序图转成可交互 HTML。
```

**注意：** 需要反映真实实现时先查仓库证据；支持 PNG/JPEG/WebP/SVG/WebM 导出。

### bro

**用途：** 把上一条消息用无术语的人话重新表达，保持简短。

**适合场景：**

- 上一条说明太专业，想快速听懂重点。
- 不需要额外研究、制图或扩展解释，只需重述。

**示例：**

```text
/bro
```

**注意：** 设置了 `disable-model-invocation: true`，用于显式调用，不应自动触发。

### claude-weekly-blog

**用途：** 分析当前周 Claude 官网博客文章，并按北京时间过滤。

**适合场景：**

- 查看 Claude 本周发布内容。
- 生成 20-30 字中文摘要和原文链接。

**示例：**

```text
Claude 本周博客有哪些？
latest Claude posts
```

### deep-research

**用途：** 执行多轮研究：拆解问题、搜索、评估证据、发现缺口、处理矛盾并生成带引用报告。

**适合场景：**

- 需要多来源交叉验证的研究。
- 需要覆盖时效性、矛盾、深度、视角的综合分析。

**示例：**

```text
对这个主题做 deep research，给出证据和引用。
调查这个技术方向的主要方案、争议和最新进展。
```

### design-understanding-check

**用途：** 在复杂方案设计完成后、实施前，解释目的、机制与取舍，通过场景问题帮助使用者理解并接手维护。

**适合场景：** 核心机制相互依赖、存在重要取舍或维护负担，且误解会影响判断或维护。

**示例：**

```text
方案已经设计好了，先帮助我理解关键设计，再开始实施。
```

**注意：** 默认暂停实施，允许明确跳过；依据实际回答检查理解，不按题数判定。与 `incremental-development` 独立共存，不自动绑定调用。

### eli5

**用途：** 像面对完全不了解主题的人一样解释概念，用大图和少量文字生成 HTML 图解。

**适合场景：**

- 零基础理解陌生概念。
- 需要非常简单的图片解释，而不是术语密集的文章。

**示例：**

```text
/eli5 TCP 三次握手
用最简单的图解释什么是缓存。
```

### github-repo-analyzer

**用途：** 分析 GitHub 仓库的功能、技术栈、架构和亮点。

**适合场景：**

- 用户提供 GitHub 仓库 URL 并要求理解项目。
- 需要从 README、仓库元数据、官方文档综合生成中文报告。

**示例：**

```text
分析这个 GitHub 仓库：https://github.com/example/project
总结这个 repo 的技术栈和核心功能。
```

### goal-ready-coach

**用途：** 把尚不明确、需要小步推进的任务收敛为一个可交给 Agent 自主执行并客观验收的 Goal Contract，并在使用者显式确认后输出最终契约、落盘存档。

它维护一份 Readiness Ledger，从已有对话和安全、只读的调查中提取信息，不为 Agent 能自行查证的事实打扰用户。每轮只推进一个影响最大的阻塞项，按 `结果 → 验收 → 范围 → 决策权 → 上下文 → 停止条件` 的优先级排序。六项门槛全部 `READY` 才进入 `GOAL READY`，再输出自包含的 Goal Contract，等待使用者明确确认后将最终契约存入当前工作目录的 `goal-contracts/`。

![双队列 AI 任务工作流](assets/dual-queue-goal-workflow.svg)

上图说明：探索队列在 `goal-ready-coach` 驱动下逐项消除不确定性，通过 Readiness Gate 后转入 Goal 交付队列；两个队列的并行度都由人的容量（判定容量、验收容量）决定。SVG 源文件：`assets/dual-queue-goal-workflow.svg`

**适合场景：**

- 需求还没想清楚、想把任务问清楚再开始。
- 模糊输入（如"优化一下""做得更好"）需要收敛为可验收目标。
- 创建 Goal 前需要先把剩余不确定性压到 Agent 授权范围内。

**示例：**

```text
把这个需求转成 Goal。
任务还没想清楚，帮我用小步快跑问清楚。
优化一下后台查询性能，帮我变成 Goal。
```

**注意：** 澄清期间只做只读调查和无副作用验证，不会提前实现 Goal。确认契约后只负责输出与落盘，不调用 Goal 管理工具；创建或执行 Goal 时可直接引用契约文件。

### handoff

**用途：** 保存或加载给 AI agent 使用的技术交接文件，让 agent 之间通过文件接力。

`handoff` skill 用于让 source agent 和 target agent 通过文件持续接力，而不是让用户做人肉中间层。它现在有两个模式：Save Mode 用于创建或更新 handoff，Load Mode 用于读取已有 handoff 并继续执行。

![Handoff Agent Relay](assets/handoff-agent-relay-infographic.png)

HTML 源文件：`assets/handoff-agent-relay-infographic.html`

**适合场景：**

- 保存进度、暂停、切换任务、上下文接近上限。
- 读取已有 handoff、恢复进度、继续上次任务。
- 让 Claude Code 和 Codex 等不同 agent 异步协作。
- 将 review findings、实现状态、失败尝试、验证命令沉淀为可执行上下文。

**关键机制：**

- 先判断是 `Save Mode` 还是 `Load Mode`；只有用户意图模糊时才询问。
- Save Mode 会明确 `Source agent`、`Target reader` 和 `Execution type`。
- Load Mode 会先定位 handoff 文件，再读取 `## 0. Handoff Routing` 和 `Next Agent's First Action`。
- handoff 文件自带 `How to read this handoff` 和 `Next Agent's First Action`。
- 继续接力时保留事实和决策，只更新 routing、progress、pending tasks 和 next action。
- 多个 handoff 文件存在时，只有最近修改文件能安全匹配用户意图才自动选择，否则询问文件路径。

**示例：**

Save Mode:

```text
请生成 handoff。
目标读者：Codex
执行类型：code review
重点 review 当前 diff 的 bug、回归风险和缺失测试。
```

Load Mode:

```text
从 260531-handoff.md 继续。
```

### incremental-development

**用途：** 先减少不必要的新概念和运行负担，再把确实复杂的改动拆成可独立验证的行为切片。

**适合场景：**

- 多个关联行为难以一次验收，或涉及跨模块协同。
- 新增状态、取消、重试、失败恢复或持久化机制。
- 用户明确要求小步实现、避免过度设计，并保留恢复入口。

**示例：**

```text
这个任务涉及创建、取消和重启恢复，先简化方案，再分片实现和验证。
不要先铺完整框架，先交付一个能独立验收的行为。
```

**注意：** 简单改动不强行拆分，纯概念讲解不启用；关键验证失败或受阻时，不推进依赖它的工作，不把未验证说成已通过。

### kami

**用途：** 排版专业文档和产品落地页，采用暖纸色、墨蓝强调色和衬线字体层级。

**适合场景：**

- 简历、作品集、一页纸、白皮书和信件。
- 幻灯片、Marp/Markdown slides 和 PDF 排版。
- 产品官网与 landing page。

**示例：**

```text
把这份简历排版成专业 PDF。
用这些要点做一页产品落地页。
把这篇文章整理成 Marp 幻灯片。
```

### linuxdo-newsflash

**用途：** 分析 linux.do「前沿快讯」板块列表，输出标题级中文日报。

**适合场景：**

- 查看前沿快讯的事件概述与趋势。
- 默认抓取北京时间前一天 00:00 至运行时刻，也可显式指定日期。
- 用脚本完成语义去重、清噪、分类和信息完整度评分。

**示例：**

```text
分析 linux.do 前沿快讯。
生成 2026-09-28 的 linux.do 快讯日报。
```

**注意：** 只读取列表标题与可见元数据，不进入帖子详情页。判断层默认 `auto`：有 `TYPESAFE_API_KEY` 使用 Jev，否则使用本地 LLM；本地策略不调用外部模型 API。

### linuxdo-opensource

**用途：** 从 linux.do「开源推广」标签列表筛选尚未展示过的项目，按个人兴趣、质量与互动组合评分，输出 Top 20。

**适合场景：**

- 发现符合个人兴趣的开源项目。
- 日常或定时筛选，避免重复推荐已展示项目。
- 通过脚本调整评分权重并保留跨日判断记录。

**示例：**

```text
筛选 linux.do 开源推广里最值得看的 20 个项目。
今天有哪些还没推荐过的 linux.do 开源项目？
```

**注意：** 判断层支持 Jev/本地 LLM 双策略。展示账本由脚本安全追加到 `~/.codex/automations/linux-do-open-source/memory.md`，不是纯只读操作。

### open-code-review

**用途：** 使用 alibaba/open-code-review 的 `ocr` CLI 审查 Git 变更，输出行级 review 意见。

**适合场景：**

- 审查暂存区、工作区、指定提交、PR 或分支差异。
- 按规则检查 bug、安全、性能和代码质量问题。
- 用户要求时，基于 review 结果应用修复。

**示例：**

```text
review 当前未提交改动，重点找 bug 和回归风险。
对比这两个分支，审查代码质量。
```

**注意：** 需先安装 `ocr`（如 `npm install -g @alibaba-group/open-code-review`）并配置受支持的 LLM provider；修复不是默认行为。

### openai-weekly-blog

**用途：** 分析 OpenAI 当前周 Research 和 Engineering 博客文章。

**适合场景：**

- 查看 OpenAI 本周技术文章。
- 按指定日期定位某一周。

**示例：**

```text
OpenAI 本周博客有哪些？
OpenAI weekly articles 20260314
```

### pdf

**用途：** PDF 文档处理工具集，包括提取文本和表格、创建 PDF、合并拆分、处理表单。

**适合场景：**

- 分析或生成 PDF。
- 填写 PDF 表单。
- 批量处理 PDF 文档。

**示例：**

```text
提取这个 PDF 的表格。
帮我填写这个 PDF 表单。
把这些 PDF 合并成一个文件。
```

### reddit-analyzer

**用途：** 分析 Reddit subreddit，筛选高质量技术帖子。

**适合场景：**

- 从 AgentsOfAI 等 subreddit 中筛选有价值内容。
- 按互动指标和内容质量排序 Top 10。

**示例：**

```text
分析 Reddit AgentsOfAI 的高质量帖子。
筛选这个 subreddit 里最值得看的技术讨论。
```

### skill-creator

**用途：** 创建、修改、优化和评测 skills。

**适合场景：**

- 从零创建一个新 skill。
- 优化已有 skill 的触发描述和工作流。
- 运行 eval 或 benchmark 检查 skill 表现。

**示例：**

```text
帮我创建一个用于分析技术播客的 skill。
优化这个 skill 的 description，让它更容易正确触发。
```

### sync-docs-index

**用途：** 同步文档目录索引和摘要，或整理单篇文章。

**适合场景：**

- 文档目录新增或更新后，同步 README 索引。
- 给文章加摘要、任务入口、概念索引和交叉引用。
- 将修订章节合并回正文。

**示例：**

```text
帮我同步一下文档摘要。
新增了文章，需要更新目录索引。
整理这篇文章，把修订整合进去。
```

### tap-adapter-author

**用途：** 从侦察、pipeline 设计、安装到验证，完整编写 TAP adapter。

**适合场景：**

- 为新网站或新命令写 TAP 适配器。
- 需要浏览器侦察、登录状态、网络结构分析。

**示例：**

```text
帮我给这个网站写一个 TAP adapter。
把这个页面的数据做成 tap <site> <command>。
```

### typesafe-ai

**用途：** 用 TypeSafe 的 System One 模型（包括 Jev）提供类型化判断与概率，让代码组合语义能力，而不是依赖长文本生成后再解析。

**适合场景：**

- 语义路由、候选排序、字段抽取、证据验证。
- 将多个窄判断组合为评分、筛选或升级处理流程。
- 设计 AI 功能，或替换不稳定的 prompt-and-parse 步骤。

**示例：**

```text
用 TypeSafe 给这些候选项目打分，并让代码控制权重。
把这个 LLM 分类步骤改成类型化判断。
```

**注意：** 开始集成前读取实时官方文档与相关 cookbook。类型化接口不保证事实正确，概率阈值需在目标数据和业务后果上验证；凭据应保留在服务端。

### web-tech-article-analyzer

**用途：** 使用 7 层框架分析 Web 技术文章、URL、博客和帖子。

**适合场景：**

- 单篇技术文章深度分析。
- 批量 RSS、Reddit、X/Twitter、WeChat、arxiv、GitHub、技术博客分析。
- 中文输出，保留英文技术术语。

**示例：**

```text
分析这篇技术文章：https://example.com/article
用 7 层框架拆解这组文章。
```

### weread-skills

**用途：** 通过微信读书 Agent API Gateway 查询书籍、个人书架、笔记划线、书评、阅读统计和推荐。

**适合场景：**

- 搜索书籍，查看详情、目录与阅读进度。
- 查看个人笔记、热门划线和公开点评。
- 了解阅读时长与偏好，发现推荐好书。

**示例：**

```text
看看我的微信读书书架。
导出我在《三体》里的划线。
我这个月读了多久？
```

**注意：** 需要环境变量 `WEREAD_API_KEY`。调用前先读对应能力文档，每个请求上报 `skill_version`；遇到升级提示必须先暂停操作并完成升级。

### wiki-index-audit

**用途：** 审计 Markdown Wiki 的检索入口、内容冗余和页面边界，连着检查 README 路由、`关键认知索引.md` 和专题正文。

它与 `sync-docs-index` 分工：后者执行摘要、标题和路由同步；本 Skill 判断入口与页面边界是否合理。字数、关键词重合与跳转次数只产生候选，不能单独证明需要合并或拆页。

**适合场景：**

- 定期或大规模新增、重构后进行 Wiki 健检。
- 排查检索入口失效、重复维护、边界模糊与跨页面矛盾。
- 评估过度拆分或内容拥挤，先考虑路由、标题和引用等最小改动。

**关键机制：**

- 先运行机械扫描，再按主题连读导航、卡片和正文进行语义复核。
- 报告区分全库机械扫描、导航浏览与实际正文复核范围，不能用部分阅读宣称全库健康。
- `--mode quick/full` 只兼容旧命令，均执行同一扫描；退出码 0 表示扫描成功，不代表 Wiki 健康。
- 默认只报告，临时输出放 `/tmp`。用户确认具体变更集后才修复，并复跑扫描、重读受影响主题。
- 有真实查询案例时重走检索路径；没有时明确说明实际查询效果未验证，不构造固定召回测试。

**示例：**

```text
帮我审计 Wiki 的检索入口和页面边界。
检查这些页面是否重复维护同一流程，给出最小变更集。
评估这篇文章是否需要拆页，先只报告。
```

**注意：** Automation 同样停在报告阶段。基线仅作规模参考，刷新基线不能代表语义问题已解决。

## Repository Layout

```text
.
├── README.md
├── assets/
│   ├── dual-queue-goal-workflow.svg
│   ├── handoff-agent-relay-infographic.html
│   └── handoff-agent-relay-infographic.png
├── handoff/
│   └── SKILL.md
├── archify/
│   └── SKILL.md
└── ...
```

## Maintenance Notes

- 新增、删除或重命名 skill 后，同步 `Skill Index`、`Skills` 和相关任务入口，检查链接是否仍有效。
- Skill 名称取自 `SKILL.md` 的 `name`，目录名可能不同；`.system/` 和 `.env` 被 Git 忽略，不要纳入提交。
- 外部 CLI、网络权限和 API Key 等前置条件以各 skill 的执行规则为准；不要在仓库中保存密钥。
- 需要展示图示时，将图片或 HTML 源放在 `assets/`，再从 README 引用。
- 不要为了人类说明去改写 `SKILL.md`；`SKILL.md` 应保持 agent 可执行规则。
- 如果某个 skill 有复杂示意图，优先在 README 中嵌入截图，并把源文件放入 `assets/`。
