import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "audit_index.py"
SPEC = importlib.util.spec_from_file_location("audit_index", SCRIPT)
audit_index = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit_index)


def card(title="卡片", source="topic.md", extra=""):
    return f"""## {title}
- 核心判断：需要具体证据。
- 适用场景：检索任务。
- 触发关键词：检索、边界
- 开发时怎么用：先核对入口。
- 常见反例：只看标题。
- 来源文档：[正文]({source})
{extra}
"""


class WikiScanTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.write("关键认知索引.md", "# 索引\n\n" + card())
        self.write("topic.md", "# 正文\n\n## 任务入口\n正文。\n")
        self.write("README.md", "# 导航\n[正文](topic.md#任务入口)\n")

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def scan(self, config=None, baseline=None):
        return audit_index.audit(self.root, self.root / "关键认知索引.md", config or {}, baseline or {})

    def test_clear_scan_still_requires_semantic_review(self):
        report = self.scan()
        self.assertEqual("clear", report["mechanical_status"])
        self.assertEqual("pending", report["semantic_status"])
        self.assertNotIn("healthy", report.values())
        self.assertEqual(1, report["summary"]["card_count"])

    def test_missing_file_and_anchor_are_separate(self):
        self.write("README.md", "# 导航\n[缺页](missing.md)\n[缺章节](topic.md#不存在)\n")
        kinds = {item["kind"] for item in self.scan()["findings"]}
        self.assertEqual({"broken_file", "anchor_review"}, kinds)

    def test_navigation_includes_decoded_anchor_and_line_citation(self):
        self.write("README.md", "# 导航\n[正文](topic.md#%E4%BB%BB%E5%8A%A1%E5%85%A5%E5%8F%A3)\n[行](topic.md:3)\n")
        report = self.scan()
        page = next(page for page in report["pages"] if page["path"] == "topic.md")
        self.assertEqual([], report["findings"])
        self.assertEqual(2, len(page["readme_entries"]))

    def test_fenced_example_is_not_navigation_or_heading(self):
        self.write("README.md", "# 导航\n```md\n## 假标题\n[例子](missing.md)\n```\n")
        report = self.scan()
        self.assertEqual([], report["findings"])
        self.assertIn("topic.md", report["review_candidates"]["without_readme_entry"])
        page = next(page for page in report["pages"] if page["path"] == "README.md")
        self.assertEqual(1, len(page["sections"]))

    def test_language_marker_cannot_close_an_existing_fence(self):
        self.write("README.md", "# 导航\n```\n```java\n[示例](missing.md)\n```\n## 真实章节\n[正文](topic.md)\n")
        report = self.scan()
        self.assertEqual([], report["findings"])
        page = next(page for page in report["pages"] if page["path"] == "README.md")
        self.assertEqual(["导航", "真实章节"], [section["title"] for section in page["sections"]])
        self.assertEqual(1, len(page["links"]))

    def test_length_is_signal_not_content_defect(self):
        self.write("关键认知索引.md", "# 索引\n" + card(extra="很长的正文" * 200))
        report = self.scan({"thresholds": {"card_chars_review": 100}})
        self.assertIn("long_card", {signal["kind"] for signal in report["review_signals"]})
        self.assertEqual([], report["findings"])

    def test_repeated_body_is_candidate_but_summary_repetition_is_ignored(self):
        paragraph = "需要保持完整论证与清晰任务边界。" * 20
        summary = "> 摘要有意重复，用于检索入口。" * 30
        self.write("topic.md", f"# 正文\n\n{summary}\n\n{paragraph}\n")
        self.write("other.md", f"# 其他\n\n{summary}\n\n{paragraph}\n")
        report = self.scan()
        self.assertEqual(1, len(report["review_candidates"]["repeated_paragraphs"]))
        self.assertNotIn("duplicate_page", {item["kind"] for item in report["findings"]})

    def test_shared_source_is_grouped_without_merge_judgment(self):
        self.write("关键认知索引.md", "# 索引\n" + card("卡甲") + "\n" + card("卡乙"))
        report = self.scan()
        group = report["review_candidates"]["shared_sources"][0]
        self.assertEqual({"卡甲", "卡乙"}, set(group["cards"]))
        self.assertEqual([], report["findings"])

    def test_hidden_files_and_symlinks_are_not_scanned(self):
        self.write(".hidden/broken.md", "[坏](missing.md)\n")
        (self.root / "alias.md").symlink_to(self.root / "topic.md")
        paths = {page["path"] for page in self.scan()["pages"]}
        self.assertNotIn(".hidden/broken.md", paths)
        self.assertNotIn("alias.md", paths)

    def test_old_baseline_is_read_only_and_legacy_mode_works(self):
        self.write(".wiki-audit/baseline.json", json.dumps({"card_count": 0, "index_chars": 10}))
        baseline = self.root / ".wiki-audit/baseline.json"
        before = baseline.read_bytes()
        result = subprocess.run([sys.executable, str(SCRIPT), "--root", str(self.root), "--mode", "full"], capture_output=True, text=True)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(1, json.loads(result.stdout)["summary"]["baseline_delta"]["card_count"])
        self.assertEqual(before, baseline.read_bytes())
        rejected = subprocess.run([sys.executable, str(SCRIPT), "--root", str(self.root), "--update-baseline"], capture_output=True)
        self.assertEqual(2, rejected.returncode)
        self.assertEqual(before, baseline.read_bytes())

    def test_missing_key_index_is_input_error(self):
        (self.root / "关键认知索引.md").unlink()
        result = subprocess.run([sys.executable, str(SCRIPT), "--root", str(self.root)], capture_output=True, text=True)
        self.assertEqual(2, result.returncode)
        self.assertIn("error", json.loads(result.stderr))


if __name__ == "__main__":
    unittest.main()
