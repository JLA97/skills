---
name: claude-weekly-blog
disable-model-invocation: true
description: Analyzes Claude blog posts from claude.com/blog for the current week. Triggers when users ask about "Claude blog this week", "Claude weekly articles", "latest Claude posts", "Claude 本周博客", or want to see what Claude published recently. Filters posts by Beijing time (UTC+8) for the current week (last Sunday to this Saturday), provides 20-30 character summaries in Chinese, and includes original links.
---

# Claude Weekly Blog Analyzer

Fetch and analyze Claude blog posts from https://claude.com/blog for the current week.

## When to use this skill

Use this skill when the user asks about:
- Claude blog posts this week
- Latest Claude articles or updates
- What Claude published recently
- Claude 本周博客 / 这周的博客

## Week definition

**Current week** = Last Sunday 00:00 to this Saturday 23:59 in Beijing time (UTC+8).

Calculate the date range based on today's date before fetching.

## Workflow

1. **Calculate week boundaries and days parameter**
   - Determine today's date
   - Find last Sunday (start of week)
   - Find this Saturday (end of week)
   - Convert to Beijing time (UTC+8)
   - Calculate `days` = days from today back to last Sunday + 1 (to include Sunday)

2. **Fetch articles via TAP adapter**
   - Run: `tap claude articles --limit 20 --days <calculated_days>`
   - This returns all articles in the date range with title, publishedDate, category, summary, and url

3. **Filter by week range**
   - Parse publishedDate from the adapter output
   - Keep only posts published within the current week range (Sunday to Saturday, Beijing time)
   - If no posts match, report "本周暂无新文章发布"

4. **Generate summaries**
   - The adapter already returns a summary (first paragraph, up to 300 chars)
   - Condense each summary to a 20-30 character Chinese version focusing on:
     - Technical details if the post is technical
     - Application scenarios if the post is about use cases
     - Follow the emphasis of the original content
   - Keep summaries concise and informative

5. **Output format**

```
Claude 博客本周文章汇总（北京时间 YYYY-MM-DD 至 YYYY-MM-DD）

[If posts found:]
**1. [Article Title]**
- 发布日期：YYYY年MM月DD日
- 概述：[20-30字中文概述]
- 链接：https://claude.com/blog/[article-slug]

**2. [Article Title]**
...

[If no posts found:]
本周（北京时间 YYYY-MM-DD 至 YYYY-MM-DD）暂无新文章发布。
```

## Important notes

- Always calculate the week range dynamically based on current date
- Use Beijing time (UTC+8) for all date comparisons
- The TAP adapter handles page navigation, DOM extraction, and deduplication internally
- If the adapter returns no articles, do not retry with WebFetch
- Summaries must be in Chinese, 20-30 characters
- Do not show recent articles if none match the current week
- Include the full URL for each article
