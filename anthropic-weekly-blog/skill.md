---
name: anthropic-weekly-blog
disable-model-invocation: true
description: Analyze Anthropic engineering blog posts from the current week and generate a Chinese weekly technical report. Use when the user asks about "Anthropic weekly blog", "latest Anthropic engineering posts", "分析本周 Anthropic 博客", "本周 Anthropic 工程博客", "Anthropic 本周博客", or wants this week's Anthropic technical articles summarized or analyzed.
---

# Anthropic Weekly Blog

Analyze Anthropic engineering blog posts published during the current week and compile complete per-article analyses into one markdown report.

## Workflow

1. Fetch Anthropic article metadata with `tap anthropic articles`.
2. Calculate the current week range as Sunday 00:00 through today 23:59 in the user's active timezone.
3. Parse each article `date` field in `Mon DD, YYYY` format, such as `Apr 23, 2026`.
4. Filter strictly to articles with dates inside the current week range.
5. If no matching articles exist, output `本周暂无新文章发布` and stop.
6. Analyze each filtered article independently with the `web-tech-article-analyzer` skill, passing the article URL.
7. Create `anthropic-weekly-YYYY-MM-DD.md` in the current working directory.

## Report Format

Use this structure:

```markdown
# Anthropic 工程博客周报 (YYYY-MM-DD)

本周共发布 X 篇文章

---

## Article Title

[Full independent analysis from web-tech-article-analyzer]

---
```

## Requirements

- Treat `date` as the source of truth. Do not infer freshness from page order or featured placement.
- Do not analyze older featured articles when no current-week articles exist.
- Keep each article analysis independent and complete; do not merge separate article analyses into a cross-article summary unless the user explicitly asks for synthesis.
- Save the report in the current working directory unless the user specifies another location.
