---
name: linuxdo-opensource
description: >-
  分析 linux.do「开源推广」标签列表页（linux.do/tag/2234-tag/2234?order=activity），从尚未展示过的
  开源项目中按"个人兴趣 × 质量 × 互动"组合打分挑选 Top 20。由脚本批量判断
  类别、标题级质量与兴趣匹配度（Jev/本地 LLM 双策略可切换，默认 auto：有 TYPESAFE_API_KEY 用 Jev，
  缺 key 自动切本地 LLM，零外部 API），权重在代码侧可调；账本 ~/.codex/automations/linux-do-open-source/memory.md
  由脚本安全追加（含判断标签，支持跨日统计）。当用户说"开源推广"、"linux.do 开源项目"、
  "linuxdo-opensource"或定时任务要求分析开源推广标签时使用。
metadata:
  author: leo
  version: "1.1"
  category: news
---

# linuxdo-opensource（linux.do 开源推广 · 兴趣驱动日报）

## 核心原则

- **标题级归纳**：只读标签列表页标题与可见元数据（分类/标签/回复/浏览/活动日期），**不进任何帖子详情页**。输出必须标注"标题级归纳"。
- **天然全是项目**：该标签页内容天然均为开源项目，**不需要判断"是不是项目"**；判断维度是类别、质量、与读者兴趣的匹配度。
- **账本唯一键**：linux.do topic ID 是永久唯一键；已展示过的帖子（在 memory.md 的 seen_topics 中）永不复现，标题变化、重新活跃也不豁免。
- **判断与生成分离**：cat/quality/interest 由 `jev-ask-oss.mjs` 判断并组合打分；判断层支持 **Jev / 本地 LLM 双策略**（`--judge` 开关，默认 auto：有 `TYPESAFE_API_KEY` 用 Jev，否则本地 LLM 零外部 API）；LLM 只写标题级简介与总结。
- **账本安全**：脚本只在成功产出展示列表后追加账本（先备份 memory.md.bak）；任何失败路径都不触碰账本。

## Workflow

### STEP 1: 抓取标签列表（Computer Use 优先，Chrome DevTools 兜底）

**优先路径：Computer Use**

1. 检查 `cua_repl` / Computer Use 是否可用；优先绑定用户已登录的 Chrome，读取或打开标签列表 `https://linux.do/tag/2234-tag/2234?order=activity`。
2. 只从列表行的可见内容和只读 DOM/无障碍信息提取 `id/title/views/posts_count`；可从列表行链接读取 topic ID，但不要点击标题或回复链接，不要进入详情页。
3. 保留**列表当前顺序**（activity 序），翻页至扫描上限（**5 页 / 150 帖**）或后续页为空；合并去重（按 id），写入 `topics.json`。
4. Computer Use 不可用、浏览器没有可用登录态，或 UI/DOM 无法可靠读取所需字段/翻页时，改用下面的 Chrome DevTools 兜底路径。不要用搜索引擎、WebFetch 或 curl 拼补。

**兜底路径：Chrome DevTools**

1. `new_page("https://linux.do/tag/2234-tag/2234.json?ascending=false&order=activity")`
2. 用 `evaluate_script` 解析 `data.topic_list.topics`，提取 `id/title/views/posts_count`，保留**列表当前顺序**（activity 序）。
3. 翻页 `&page=1,2,…`，直到满足任一：凑满扫描上限（**5 页 / 150 帖**）或后续页为空。
4. 合并去重（按 id），写入 `topics.json`。

**异常**：任一路径遇到登录墙/验证页 → 提示用户在 Chrome 完成登录/验证后重跑；**禁止**搜索引擎拼凑、禁止开详情页、**禁止修改 seen_topics**。若 Chrome DevTools 兜底也不可用或无法可靠读取列表，说明阻塞并停止。

### STEP 2: 判断层 + 组合打分（jev-ask-oss.mjs，Jev / LLM 双策略）

```bash
node /Users/leo/.agents/skills/linuxdo-opensource/jev-ask-oss.mjs topics.json \
  --memory ~/.codex/automations/linux-do-open-source/memory.md -o result.json
# 可选: --judge jev|llm|auto  --weights 0.5,0.3,0.2  --max 20  --conf-cat 0.5  --no-backup
```

判断层策略（优先级：命令行 `--judge` > 环境变量 `LINUXDO_JUDGE` > 默认 auto）：

- `jev`：调 `api.typesafe.ai`（需 `TYPESAFE_API_KEY`）
- `llm`：**零外部 API**。阶段 1：脚本完成账本比对后生成 `llm-task.json`（未见过候选 + 兴趣画像 + rubric + schema）并退出，**不写账本**；agent 按 schema 填写 `llm-judgments.json`（与 Jev 同 schema）；阶段 2：原命令重跑，脚本校验 `task_hash` 后打分并追加账本
- `auto`（默认）：有 `TYPESAFE_API_KEY` → jev；没有 → llm。要长期停用 Jev 可 `export LINUXDO_JUDGE=llm`

脚本完成：账本比对（未见过=候选池）→ 判断（Jev 扇出 / 读取 llm-judgments.json，每帖 3 问）→ 组合打分 → Top 20 → **追加账本**（含 cat/quality/interest 字段）+ 更新头部元数据。账本安全不变量在两种策略下一致：只有成功产出展示列表后才写账本，失败路径（含 llm 阶段 1）不触碰账本。

| 问题 | 原语 | 说明 |
|---|---|---|
| `cat` | Choice | agent_ai_tool / model_access / dev_plugin / self_hosted / client_app / script_wf / non_tech。**confidence < 0.5（--conf-cat）→ 标记 needs_review，由 LLM 复判；账本记录原始 cat 与 cat_confidence 供审计** |
| `quality` | Score 0~2 | 标题级完成度信号（玩具 → 定位明确 → 完成度信号强）。**代理指标，非代码质量** |
| `interest` | Score 0~2 | 对照 `interest-profile.yaml`（high/medium/low），画像可直接编辑，改后下次生效 |

组合公式（代码所有，参数可调，判断结果可复用）：
```
priority = 0.5×(interest/2) + 0.3×(quality/2) + 0.2×log10(1+互动)/归一
⭐强烈推荐 = interest ≥ 1.5 且 quality ≥ 1.0
```

llm 模式下 confidence 为 agent 自评：分类拿不准给 < `--conf-cat`，标记 needs_review 交由 STEP 3 复判（账本仍记录原始判断与 cat_confidence）。

### STEP 3: LLM 生成简报（唯一生成环节）

读取 `result.json`，按以下结构输出，直接发到对话/任务结果，**除账本外不创建文件**：

**复判规则**：`needs_review: true` 的条目（cat 置信度不足，多为新词/孤名词标题）由 LLM 依据分类学重新判类，表格采用复判后的分类，并在表下注明"N 条经 LLM 复判"；账本保留判断层的原始 cat 与 cat_confidence 不变。

```markdown
# linux.do 开源推广 · 新项目日报（标题级归纳）
抓取时间：{now}（北京时间）｜扫描 {stats.scanned} 帖｜新项目 {stats.shown} 个（⭐{stats.starred}）｜判断层 {judge}
类别分布：{stats_by_cat 汇总}

| # | 项目/标题 | 标题级简介 | 分类 | ⭐ | 回复/浏览 | 链接 |
|---|---|---|---|---|---|---|
| 1 | … | 1 句客观简介 | agent_ai_tool | ⭐ | 45/8900 | [原帖](…) |

## 📝 总结
- 主要技术方向 / Agent-AI 占比（用 stats_by_cat 计数，不目测）
- 高互动项目点评
- 提醒：标题推断非已核验事实
```

**无新项目时**：只输出"今日没有发现尚未展示的新开源项目（扫描范围：{页数}页/{stats.scanned} 帖）"。账本头部仍会更新 last_run/last_scanned_count（脚本已处理，无新增条目）。

## Important Notes

- ✅ 按 topic ID 比对账本，不看标题
- ✅ 不足 20 不强凑，不为凑数开详情页
- ✅ 简介只基于标题，保留"标题级归纳"标注，不写成已核验事实
- ✅ 账本只记实际展示的帖子；历史记录永不清理/覆盖
- ✅ 类别统计由代码计数，LLM 不得目测编数
- ❌ 不进详情页、不读正文/回复
- ❌ 不用 WebFetch/curl 访问 linux.do（登录态限制；api.typesafe.ai 由脚本访问不受限）
- ❌ 失败时不改 seen_topics

## Troubleshooting

- **Jev 失败**：脚本重试 3 次；仍失败退出且不写账本 → 改用 `--judge llm` 重跑（两阶段本地判断）
- **llm-judgments.json 的 task_hash 不匹配**：候选集已变化，按新生成的 `llm-task.json` 重新填写；阶段 1 永不写账本，重跑无副作用
- **账本损坏**：从 memory.md.bak 恢复（每次运行自动备份）
- **验证墙**：同 newsflash——等用户完成登录，不猜测、不搜索替代
