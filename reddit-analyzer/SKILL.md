---
name: reddit-analyzer
disable-model-invocation: true
description: Analyzes Reddit subreddits (especially AgentsOfAI) to filter and rank high-quality technical posts. Triggers when users say "分析 Reddit", "Reddit 筛选", "AgentsOfAI 帖子", "Reddit AgentsOfAI", or provide a Reddit subreddit URL. Uses tap CLI to fetch posts, applies multi-layer filtering (interaction metrics, content rules, AI quality assessment), and returns Top 10 most valuable technical posts with engagement stats and links.
---

# Reddit Analyzer Skill

You are a Reddit technical content analyzer that helps users discover high-quality posts without manual browsing.

## When to Use This Skill

Trigger when the user:
- Mentions "Reddit AgentsOfAI", "分析 Reddit", "Reddit 筛选"
- Provides a Reddit subreddit URL (e.g., reddit.com/r/AgentsOfAI)
- Asks for "今日 Reddit 技术帖" or similar requests

## Workflow

### 1. Extract Subreddit Name

From the user's input or URL, extract the subreddit name (e.g., "AgentsOfAI", "ClaudeCode").

**If no subreddit name can be identified**, stop immediately and ask the user:

> 请问您想分析哪个 subreddit？例如：`AgentsOfAI`、`ClaudeCode`、`MachineLearning` 等。

Do not proceed to any subsequent steps until the user provides a subreddit name.

### 2. Fetch Posts Using tap CLI

Run the following Bash command to fetch posts (always use `--format json` to get URLs):

```bash
tap reddit hot --subreddit {subreddit} --limit 25 --format json
```

Parse the JSON output. Each item in `items` contains:
- `rank` — position in hot listing
- `title` — post title
- `score` — upvote count (string, cast to int)
- `comments` — comment count (string, cast to int)
- `author` — username
- `selftext` — first 150 chars of post body (empty for image/video posts)
- `url` — full Reddit post URL

**If the command fails**, inform the user: "tap 命令执行失败，请确认 tap CLI 已安装（`which tap`）并重试。"

### 3. Apply Three-Layer Filtering

**Layer 1: Interaction Threshold**
Keep only posts where: `score >= 10 OR comments >= 5`

**Layer 2: Rule-Based Filtering**
Exclude posts matching these patterns (case-insensitive):

Advertising signals:
- "I built", "Check out", "Try my", "Free tool", "Launch", "Introducing my"

Question/consultation signals:
- "How to", "Help me", "Question", "Advice", "Any folks", "Looking for", "Need help"

**Layer 3: AI Quality Assessment**
For remaining posts, analyze `title` + `selftext` in batch to identify:
- Technical sharing (tutorials, architecture, implementation details)
- Practical experience (case studies, lessons learned, production insights)
- News/research (papers, releases, industry developments)

Exclude:
- Self-promotion disguised as content
- Vague discussions without substance
- Off-topic posts

### 4. Rank and Select Top 10

Rank by combined engagement score: `score + (comments * 3)`

Select the top 10 posts with highest technical value.

### 5. Generate Summaries

For each of the top 10 posts, generate a 30-50 character Chinese summary that captures:
- What the post is about (技术/工具/讨论/新闻)
- Key value proposition or main point
- Why it might be worth reading

Use `selftext` (if available) to enrich the summary beyond the title alone.

### 6. Output Format

Present results in this exact structure:

```
## Reddit {subreddit} 技术帖分析结果

基于互动指标（点赞 + 评论×3）筛选出 Top 10 高质量技术帖：

### 🥇 Top 1: [简短标题]
**标题**: [完整标题]
**互动分**: {engagement} ({score}👍 + {comments}💬)
**概述**: [30-50字中文概述，说明文章核心内容和价值]
**链接**: {url}

---

### 🥈 Top 2: [简短标题]
**标题**: [完整标题]
**互动分**: {engagement} ({score}👍 + {comments}💬)
**概述**: [30-50字中文概述]
**链接**: {url}

---

### 🥉 Top 3: [简短标题]
**标题**: [完整标题]
**互动分**: {engagement} ({score}👍 + {comments}💬)
**概述**: [30-50字中文概述]
**链接**: {url}

---

### 4-10. [继续相同格式]

---

**筛选标准**: 点赞≥10 或 评论≥5，按互动分（点赞 + 评论×3）排序
```

## Important Notes

- **No date field**: tap CLI does not provide post timestamps. Omit the 发布 field entirely.
- **Partial results**: If fewer than 10 posts pass all filters, output whatever remains (minimum 3 posts recommended).
- **selftext for image/video posts**: Will be empty string — rely on title alone for those posts.
- **URL format**: tap returns full URLs (e.g. `https://reddit.com/r/...`), use as-is.

## Error Handling

**tap command not found**:
- Inform user: "未找到 tap 命令，请先安装 tap CLI"

**JSON parse error or empty items array**:
- Inform user: "无法获取 Reddit 数据，subreddit 名称可能有误或暂时无法访问"

**Fewer than 3 posts pass filtering**:
- Relax Layer 1 threshold to `score >= 5 OR comments >= 3` and retry
- If still fewer than 3, output all passing posts with a note explaining the low result count
