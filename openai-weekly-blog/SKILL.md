---
name: openai-weekly-blog
disable-model-invocation: true
description: Analyzes OpenAI's weekly blog posts via TAP CLI. Triggers when users ask about "OpenAI blog this week", "OpenAI weekly articles", "latest OpenAI Research/Engineering posts", "OpenAI 本周博客", or provide a date like "20260314" to filter that week's articles. Filters for Research and Engineering categories only, provides 20-30 character summaries in Chinese.
---

# OpenAI Weekly Blog Analyzer

Fetch and analyze OpenAI's blog posts for a user-specified week, focusing on Research and Engineering articles.

## What this skill does

1. Asks the user for a date in `YYYYMMDD` format if not already provided (e.g. `20260314`)
2. Treats the input date as the **end date** of the week; the start date is the Sunday of the same week
3. Runs `tap openai engineering` with the computed date range to fetch articles
4. Generates a 20-30 character Chinese summary for each article
5. If no articles found, simply informs the user — no historical fallback

## How to calculate the week range

Given user input `20260314`:
- End date = 2026-03-14
- Find the day-of-week for that date (Saturday = 6)
- Start date = end date minus dayOfWeek days → 2026-03-08 (Sunday)
- Filter range: 2026-03-08 00:00:00 to 2026-03-14 23:59:59

## Implementation

Calculate weekStart and weekEnd from user input, then run:

```
tap openai articles --category "Research,Engineering" --startDate YYYY-MM-DD --endDate YYYY-MM-DD --format json
```

The command outputs JSON: `{ meta, schema, items: [...] }`.

Each `items` entry has: `title`, `publishDate`, `url`, `summary`, `category`.

Then generate a 20-30 character Chinese summary for each article and format the results.

## Output format

```
找到（3月8日-3月14日）OpenAI 的 X 篇 Research/Engineering 文章：

**1. [Article Title]**
   - 分类: Research
   - 发布时间: 2026年3月12日
   - 概述: [20-30 字中文摘要]
   - 链接: https://...
```

If no articles found:

```
（3月8日-3月14日）没有找到 OpenAI 的 Research/Engineering 文章。
```
