---
name: linuxdo-newsflash
description: >-
  分析 linux.do「前沿快讯」板块（linux.do/c/news/34）的标题级中文日报。只读板块列表标题与可见元数据，
  不进入帖子详情页。判断层由脚本完成语义去重、清噪、分类与信息完整度打分（Jev/本地 LLM 双策略可切换，
  默认 auto：有 TYPESAFE_API_KEY 用 Jev，缺 key 自动切本地 LLM，零外部 API），LLM 只负责事件概述与趋势分析。
  抓取窗口默认为运行时刻的前一天 00:00（北京时间）至当前时刻，
  也可由用户显式指定日期。当用户说"linux.do 快讯"、"前沿快讯"、"linuxdo-newsflash"，
  或定时任务要求分析 linux.do 前沿快讯板块时使用。
metadata:
  author: leo
  version: "1.1"
  category: news
---

# linuxdo-newsflash（linux.do 前沿快讯 · 标题级日报）

## 核心原则

- **标题级归纳**：只读板块列表页的标题与可见元数据（创建时间/浏览/回复），**绝不进入帖子详情页**，不读楼主正文或回复。所有输出必须标注"标题级归纳"。
- **滚动窗口**：默认窗口 = 北京时间前一天 00:00 → 运行时刻（按 `created_at` 过滤，绝不用 `bumped_at`）。用户显式给定日期时，窗口 = 该日 00:00:00 ~ 23:59:59（北京时间）。
- **判断与生成分离**：去重/清噪/分类/信息完整度由 `jev-ask.mjs` 判断并交代码组合（稳定、可回归）；判断层支持 **Jev / 本地 LLM 双策略**（`--judge` 开关，默认 auto：有 `TYPESAFE_API_KEY` 用 Jev，否则本地 LLM 零外部 API）；中文概述与趋势分析由 LLM 生成。
- **登录态抓取**：linux.do 需要登录态，优先用 **Computer Use** 在已登录浏览器中读取分类列表；只有 Computer Use 不可用或无法可靠读取列表时，才回退到 Chrome DevTools（`new_page` + `evaluate_script`）。两种方式都只读列表页，不打开帖子详情。禁止用 WebFetch；bash curl 禁令**仅针对 linux.do 域名**——`api.typesafe.ai` 由判断脚本访问，是允许且必要的。

## Workflow

### STEP 0: 确定窗口

- 默认（快讯模式）：`WINDOW_START` = 北京时间昨天 00:00:00（`+08:00`），`WINDOW_END` = 当前时刻。
- 用户显式指定日期 `YYYY-MM-DD`：`WINDOW_START` = 当日 00:00:00 `+08:00`，`WINDOW_END` = 当日 23:59:59 `+08:00`。

### STEP 1: 抓取板块列表（Computer Use 优先，Chrome DevTools 兜底）

**优先路径：Computer Use**

1. 检查 `cua_repl` / Computer Use 是否可用；优先绑定用户已登录的 Chrome，读取或打开分类列表 `https://linux.do/c/news/34?order=created`。
2. 只从分类列表的可见行和只读 DOM/无障碍信息提取：主题 `id`、标题、创建时间、浏览量、回复数。可使用列表行链接和行元数据；不要点击主题标题或回复链接，不要进入详情页。
3. 只按列表行的 **Created/创建时间** 过滤和分页，绝不用 Latest/最新回复、相对活跃度或 `bumped_at` 判断窗口边界。读取后将可解析的创建时间统一转成带时区的 ISO 时间，再应用窗口过滤。
4. 若 Computer Use 不可用、浏览器未提供登录态，或列表 UI/DOM 无法可靠提供窗口边界所需的创建时间/元数据，则改走下面的 Chrome DevTools 兜底路径。不要用搜索引擎、WebFetch 或 curl 拼补。

**兜底路径：Chrome DevTools**

1. `new_page("https://linux.do/c/news/34.json")`
2. 用 `evaluate_script` 解析 JSON，从 `data.topic_list.topics` 提取：`id`、`title`、`created_at`、`views`、`posts_count`
3. **翻页**：若本页最旧的 `created_at` 仍 ≥ `WINDOW_START`，继续 `new_page("https://linux.do/c/news/34.json?page=1")`（page=2,3…），直到出现窗口前的帖子

**两种路径共用的收尾步骤**

1. 合并所有页，按 `created_at` ∈ [WINDOW_START, WINDOW_END] 过滤，按 `created_at` 升序排序，按 `id` 去重。
2. 将结果写入 `topics.json`（数组元素：`{id, title, created_at, views, posts_count}`），形如：

```json
[
  { "id": 1684976, "title": "林俊旸发推称将卸任千问负责人", "created_at": "2026-09-18T02:11:00.000Z", "views": 8900, "posts_count": 45 }
]
```

**异常处理**：
- 页面不是 JSON（要求登录/被验证页拦截）→ 提示用户在 Chrome 登录 linux.do 后重跑；**禁止改用搜索引擎拼凑结果**
- 窗口内 0 帖 → 直接输出"北京时间 {WINDOW_START} 至 {WINDOW_END} 暂无前沿快讯"并结束

### STEP 2: 判断层 + 代码组合（jev-ask.mjs，Jev / LLM 双策略）

```bash
node /Users/leo/.agents/skills/linuxdo-newsflash/jev-ask.mjs topics.json -o events.json [--judge jev|llm|auto]
```

判断层策略（优先级：命令行 `--judge` > 环境变量 `LINUXDO_JUDGE` > 默认 auto），两条策略下**代码组合完全相同**（去重/清噪/分桶/排序都在脚本里）：

- `jev`：调 `api.typesafe.ai`（需 `TYPESAFE_API_KEY`），一次扇出为每帖批量判断
- `llm`：**零外部 API**。阶段 1：脚本生成 `llm-task.json`（rubric + dup 候选组 + answer schema）后退出；agent 按 schema 填写 `llm-judgments.json`（与 Jev 同 schema；confidence 为自评，拿不准就给低值让 needs_review 兜底）；阶段 2：原命令重跑，脚本校验 `task_hash` 后读取判断文件
- `auto`（默认）：有 `TYPESAFE_API_KEY` → jev；没有 → llm。要长期停用 Jev 可 `export LINUXDO_JUDGE=llm`

每帖判断 5 件事，两种策略共用同一套 rubric：

| 问题 | 原语 | 用途 |
|---|---|---|
| `kind` | Choice | news_event / community_dyn（社区即时动态）/ board_meta / digest / help_request / meme（后四类为噪声，丢弃）。**噪声判定需 confidence ≥ 0.5（--conf-kind），低置信不丢弃、标 needs_review 待 LLM 复判** |
| `cat` | Choice | news_event 时：ai_tech / biz_policy_society |
| `dup` | Choice | 从代码预筛的 ≤5 个更早相似标题中选"同一事件"，置信度 < 0.6 不合并 |
| `info` | Score | 标题信息完整度（0~2），组内选代表帖的排序键 |
| `unver` | Noul | 是否爆料/传闻/未确认表述（≥0.6 记为未确认） |

输出 `events.json`：`{judge, model, usage, stats, sections: {ai_tech[], biz_policy_society[], community_dyn[], other[]}}`，每事件含代表帖、同组链接、info 分、unverified 标记（`judge` 字段标明本次判断层策略）。

**失败兜底**：jev 模式重试后仍失败 → 改用 `--judge llm` 重跑即可；不存在 agent 裸判的路径，简报按 `judge` 字段注明判断层。

### STEP 3: LLM 生成简报（唯一由 LLM 承担的部分）

读取 `events.json`，**只做生成与复判，不重做判断**：

1. 每事件 1-2 句客观概述：只基于标题与元数据，保留人名/机构/数字，不添加标题外信息
2. `unverified: true` 的事件必须保留不确定性措辞（"爆料""消息称""疑似"）
3. `needs_review: true` 的事件（低置信噪声判定，多为新词/孤名词标题）由 LLM 复判：确认为噪声的从简报移除并在末尾注明，误判的归入正确分类
4. 5-8 条趋势分析：主线、重复热点、社区关注点、潜在风险；不把帖子当已核验事实
5. 按模板输出，直接发到对话/任务结果，**不创建报告文件**

### 输出模板

```markdown
# linux.do 前沿快讯 · 标题级简报
抓取窗口：{WINDOW_START} ~ {WINDOW_END}（北京时间）｜原始主题 {stats.raw} → 事件 {stats.events}（清噪 {stats.noise_dropped}，合并 {stats.merged_away}）｜判断层 {judge}

## 🤖 AI 与科技（N 条）
**{代表标题}** `{HH:MM CST}` | 浏览 {views} | 回复 {posts_count}{⭐未确认?}
> {1-2 句标题级客观概述}
> 🔗 [原帖](https://linux.do/t/topic/{id}){同组其他链接}

## 💼 商业/政策/社会（N 条）
（同上格式）

## ⚡ 社区即时动态（N 条）
（同上格式）

## 📈 趋势观察（5-8 条）
- …
```

时间显示北京时间：`new Date(created_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'})`，格式 `HH:MM CST`。

## Important Notes

- ✅ 只按 `created_at` 过滤与排序，绝不用 `bumped_at`
- ✅ 去重规则："同一具体事件"才合并；**关联但事实不同的事件严禁合并**（已固化进 dup 的 rubric）
- ✅ 未确认内容保留不确定性措辞（由 `unverified` 标记驱动）
- ✅ 同组多个原帖链接附在事件下
- ✅ 中间文件（topics.json/events.json，llm 模式另有 llm-task.json/llm-judgments.json）放在工作目录，简报本身不落盘
- ❌ 不进帖子详情页、不读正文
- ❌ 不用 WebFetch / 不用 curl 访问 linux.do（登录态限制）
- ❌ 无窗口内容时不展示其他日期凑数
- ❌ 趋势分析不引入窗口外的信息

## Troubleshooting

- **Jev 调用失败/超时**：脚本自动重试 3 次；仍失败 → 改用 `--judge llm` 重跑（两阶段本地判断），简报按 `judge` 字段注明判断层
- **llm-judgments.json 的 task_hash 不匹配**：主题集已变化，按新生成的 `llm-task.json` 重新填写后重跑
- **浏览器被登录墙拦截**：截图确认后提示用户登录，不猜测、不搜索替代
- **Computer Use 不能可靠提取创建时间或页面元数据**：使用 Chrome DevTools 的分类 JSON 列表兜底；若该工具也不可用或被权限策略拦截，说明具体阻塞并停止，不用替代来源猜补。
- **事件数异常少**：检查 topics.json 的窗口过滤与翻页是否漏页（每页约 30 帖）；llm 模式下还需确认 llm-judgments.json 是否漏答（漏答计入 stats.missing_answers）
