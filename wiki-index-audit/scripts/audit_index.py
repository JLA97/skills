#!/usr/bin/env python3
"""Scan Markdown Wiki navigation and page boundaries; semantic review stays pending."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote


HEAD = re.compile(r"^\s{0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$")
LINK = re.compile(r"(?<!!)\[([^\]]+)\]\(([^)]+)\)")
FIELD = re.compile(r"^-\s*(核心判断|适用场景|触发关键词|开发时怎么用|常见反例|来源文档)\s*[：:]\s*(.*)$")
REQUIRED = ("核心判断", "适用场景", "触发关键词", "开发时怎么用", "常见反例", "来源文档")


def load_json(path):
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"JSON root must be an object: {path}")
    return data


def digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def slug(title):
    title = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", title).lower()
    title = re.sub(r"[^\w\-\s]", "", title, flags=re.UNICODE)
    return re.sub(r"\s", "-", title)


def visible_lines(text):
    """Ignore headings and links in fenced code; preserve original line numbers."""
    fence = None
    for number, line in enumerate(text.splitlines(), 1):
        match = re.match(r"^\s{0,3}(`{3,}|~{3,})(.*)$", line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence) and not match.group(2).strip():
                fence = None
            continue
        if fence is None:
            yield number, line


def page_record(path, root, text, kind):
    sections, links = [], []
    slug_counts = defaultdict(int)
    visible = list(visible_lines(text))
    for line, content in visible:
        match = HEAD.match(content)
        if match:
            title = match.group(2)
            base = slug(title)
            ordinal = slug_counts[base]
            slug_counts[base] += 1
            sections.append({"title": title, "level": len(match.group(1)), "line": line,
                             "anchor": base + (f"-{ordinal}" if ordinal else "")})
        for label, target in LINK.findall(content):
            links.append({"line": line, "label": label, "target": target.strip()})
    lines = text.splitlines()
    for pos, section in enumerate(sections):
        end = next((s["line"] - 1 for s in sections[pos + 1:] if s["level"] <= section["level"]), len(lines))
        section["end_line"] = end
        section["chars"] = len("\n".join(lines[section["line"] - 1:end]))
    summary = "\n".join(content for _, content in visible if content.lstrip().startswith(">"))[:1500]
    return {"path": str(path.relative_to(root)), "kind": kind, "chars": len(text),
            "sha256": digest(text), "title": sections[0]["title"] if sections else path.stem,
            "summary": summary, "sections": sections, "links": links,
            "readme_entries": [], "card_entries": []}


def link_check(owner, target, root, texts, page_by_path):
    raw = target.strip("<>")
    line_citation = "://" not in raw and re.match(r"^[^#]+\.md:\d+(?:#.*)?$", raw)
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", raw) and not line_citation:
        return {"status": "external_unverified"}
    target_path, _, anchor = raw.partition("#")
    # Workspace citation links can include a line suffix, e.g. page.md:42.
    target_path = re.sub(r"(?<=\.md):\d+$", "", unquote(target_path))
    absolute = (owner.parent / target_path).resolve() if target_path else owner.resolve()
    try:
        relative = str(absolute.relative_to(root))
    except ValueError:
        return {"status": "outside_wiki_exists" if absolute.exists() else "broken_file", "resolved": str(absolute)}
    if not absolute.is_file():
        return {"status": "broken_file", "resolved": relative}
    result = {"status": "ok", "resolved": relative}
    if anchor and relative in page_by_path:
        fragment = unquote(anchor)
        headings = {s["anchor"] for s in page_by_path[relative]["sections"]}
        explicit = set(re.findall(r'(?:id|name)=["\']([^"\']+)["\']', texts[relative]))
        if fragment not in headings | explicit:
            result["status"] = "anchor_review"
    return result


def read_cards(index, texts, root, config):
    relative = str(index.relative_to(root))
    text = texts.get(relative, "")
    lines = text.splitlines()
    preamble = config.get("preamble_headings", ["使用方式"])
    starts = [(line, HEAD.match(content).group(2)) for line, content in visible_lines(text)
              if HEAD.match(content) and len(HEAD.match(content).group(1)) == 2
              and HEAD.match(content).group(2) not in preamble]
    cards = []
    for pos, (start, title) in enumerate(starts):
        end = starts[pos + 1][0] - 1 if pos + 1 < len(starts) else len(lines)
        fields = {}
        for _, content in visible_lines("\n".join(lines[start:end])):
            match = FIELD.match(content.strip())
            if match:
                fields[match.group(1)] = match.group(2)
        keywords = [x.strip(" `。") for x in re.split(r"[、,，；;]", fields.get("触发关键词", "")) if x.strip(" `。")]
        cards.append({"title": title, "start_line": start, "end_line": end,
                      "chars": len("\n".join(lines[start - 1:end])), "fields": fields, "keywords": keywords,
                      "source_links": [{"target": target} for _, target in LINK.findall(fields.get("来源文档", ""))]})
    return cards


def repeated_paragraphs(texts, pages):
    occurrences = defaultdict(list)
    for page in pages:
        if page["kind"] != "topic":
            continue
        text = texts[page["path"]]
        # Summary blocks and code are intentionally excluded: navigation repetition is useful.
        visible = dict(visible_lines(text))
        for match in re.finditer(r"\S[\s\S]*?(?=\n\s*\n|\Z)", text):
            line = text.count("\n", 0, match.start()) + 1
            block = match.group().strip()
            block_lines = block.splitlines()
            if len(block) < 180 or any(line + offset not in visible for offset in range(len(block_lines))):
                continue
            if any(content.lstrip().startswith((">", "#", "|", "![")) for content in block_lines):
                continue
            normalized = re.sub(r"\s+", "", block)
            occurrences[digest(normalized)].append({"path": page["path"], "line": line, "excerpt": block[:240]})
    return [items for items in occurrences.values() if len({item["path"] for item in items}) > 1]


def audit(root, index, config, baseline):
    root, index = root.resolve(), index.resolve()
    if not root.is_dir() or not index.is_file():
        raise ValueError(f"Wiki directory or key index missing: {root}, {index}")
    index.relative_to(root)
    paths = sorted(path for path in root.rglob("*.md") if path.is_file()
                   and not any(part.startswith(".") for part in path.relative_to(root).parts)
                   and not path.is_symlink())
    texts, pages = {}, []
    for path in paths:
        text = path.read_text(encoding="utf-8")
        relative = str(path.relative_to(root))
        texts[relative] = text
        kind = "navigation" if path.name == "README.md" else "index" if path == index else "contract" if path.name in ("AGENTS.md", "CLAUDE.md") else "topic"
        pages.append(page_record(path, root, text, kind))
    page_by_path = {page["path"]: page for page in pages}
    findings = []
    for page in pages:
        for link in page["links"]:
            link.update(link_check(root / page["path"], link["target"], root, texts, page_by_path))
            target = page_by_path.get(link.get("resolved"))
            if target and page["kind"] == "navigation" and link["status"] in ("ok", "anchor_review"):
                target["readme_entries"].append({"path": page["path"], "line": link["line"], "label": link["label"], "target": link["target"]})
            if link["status"] in ("broken_file", "anchor_review"):
                findings.append({"kind": link["status"], "path": page["path"], **link})
    cards = read_cards(index, texts, root, config)
    signals = []
    source_groups = defaultdict(list)
    thresholds = config.get("thresholds", {})
    seen_titles = set()
    for card in cards:
        missing = [field for field in REQUIRED if not card["fields"].get(field)]
        if missing:
            findings.append({"kind": "missing_fields", "card": card["title"], "line": card["start_line"], "fields": missing})
        if card["title"] in seen_titles:
            findings.append({"kind": "duplicate_title", "card": card["title"], "line": card["start_line"]})
        seen_titles.add(card["title"])
        if card["chars"] > int(thresholds.get("card_chars_review", 1200)):
            signals.append({"kind": "long_card", "card": card["title"], "chars": card["chars"]})
        if len(card["keywords"]) > int(thresholds.get("keyword_count_review", 20)):
            signals.append({"kind": "many_keywords", "card": card["title"], "count": len(card["keywords"])})
        for link in card["source_links"]:
            link.update(link_check(index, link["target"], root, texts, page_by_path))
            resolved = link.get("resolved")
            if resolved in page_by_path:
                page_by_path[resolved]["card_entries"].append({"title": card["title"], "line": card["start_line"]})
                source_groups[resolved].append(card["title"])
    duplicate_candidates = []
    for pos, left in enumerate(cards):
        for right in cards[pos + 1:]:
            a, b = {k.casefold() for k in left["keywords"]}, {k.casefold() for k in right["keywords"]}
            score = len(a & b) / len(a | b) if a | b else 0
            if score >= float(thresholds.get("keyword_jaccard_review", .35)):
                duplicate_candidates.append({"left": left["title"], "right": right["title"], "keyword_jaccard": round(score, 3)})
    topics = [page for page in pages if page["kind"] == "topic"]
    count, chars = len(cards), len(texts[str(index.relative_to(root))])
    prior_cards, prior_chars = baseline.get("card_count"), baseline.get("index_chars")
    delta = {"card_count": count - prior_cards if isinstance(prior_cards, int) else None,
             "index_chars": chars - prior_chars if isinstance(prior_chars, int) else None,
             "growth_percent": round((chars - prior_chars) / prior_chars * 100, 2) if isinstance(prior_chars, int) and prior_chars > 0 else None}
    return {"schema_version": 2, "generated_at": datetime.now(timezone.utc).isoformat(),
            "root": str(root), "index": str(index), "mechanical_status": "issues_found" if findings else "clear",
            "semantic_status": "pending", "summary": {"page_count": len(pages), "topic_count": len(topics),
                "readme_count": sum(p["kind"] == "navigation" for p in pages), "card_count": count,
                "index_chars": chars, "link_count": sum(len(p["links"]) for p in pages),
                "mechanical_finding_count": len(findings), "baseline_delta": delta},
            "findings": findings, "review_signals": signals, "duplicate_candidates": duplicate_candidates,
            "review_candidates": {"without_readme_entry": [p["path"] for p in topics if not p["readme_entries"]],
                "largest_pages": [{"path": p["path"], "chars": p["chars"], "section_count": len(p["sections"]),
                    "largest_sections": sorted((s for s in p["sections"] if s["level"] > 1), key=lambda s: -s["chars"])[:5]}
                    for p in sorted(topics, key=lambda p: -p["chars"])[:8]],
                "shared_sources": [{"path": path, "cards": sorted(set(titles))} for path, titles in source_groups.items() if len(set(titles)) > 1],
                "repeated_paragraphs": repeated_paragraphs(texts, pages)},
            "pages": pages, "cards": cards,
            "limitations": ["候选不等于冗余或拆页结论；需要阅读正文复核", "内部锚点按 GitHub 常用规则估算，anchor_review 需在实际渲染环境确认",
                "仅检查行内 Markdown 链接，外部链接、参考式链接和纯文本路径未验证", "实际查询效果需真实查询证据；机械扫描不能证明检索性能"]}


def render_markdown(report):
    lines = ["# Wiki 结构扫描", "", f"- 机械结果：{report['mechanical_status']}", "- 语义复核：pending",
             f"- 扫描范围：{report['summary']['page_count']} 页 / {report['summary']['card_count']} 张卡", "", "## 机械问题"]
    lines += [f"- {item}" for item in report["findings"]] or ["- 无"]
    lines += ["", "## 正文复核候选", json.dumps(report["review_candidates"], ensure_ascii=False, indent=2),
              "", "## 限制"] + [f"- {item}" for item in report["limitations"]]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("--index", default="关键认知索引.md")
    parser.add_argument("--config", default=".wiki-audit/config.json")
    parser.add_argument("--baseline", default=".wiki-audit/baseline.json")
    parser.add_argument("--mode", choices=("audit", "quick", "full"), default="audit", help=argparse.SUPPRESS)
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    try:
        report = audit(root, root / args.index, load_json(root / args.config), load_json(root / args.baseline))
        output = json.dumps(report, ensure_ascii=False, indent=2) + "\n" if args.format == "json" else render_markdown(report)
        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
        else:
            print(output, end="")
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
