#!/usr/bin/env node
// jev-ask-oss.mjs — linuxdo-opensource 判断层：
//   topics.json + memory.md 账本 → 判断(cat/quality/interest，Jev API / 本地 LLM 文件) → 组合打分 → result.json + 账本追加
// 用法: node jev-ask-oss.mjs topics.json --memory ~/.codex/automations/linux-do-open-source/memory.md \
//         -o result.json [--judge jev|llm|auto] [--weights 0.5,0.3,0.2] [--max 20] [--no-backup]
// 不变量：只有成功产出展示列表后才写账本；失败时账本保持原样。
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

// ---------- 参数 ----------
const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['--memory', '-o', '--profile', '--weights', '--max', '--conf-cat', '--judge', '--judge-file', '--llm-task']);
const input = args.find((a, i) => !a.startsWith('-') && !(i > 0 && VALUE_FLAGS.has(args[i - 1])));
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const MEMORY = flag('--memory', join(homedir(), '.codex/automations/linux-do-open-source/memory.md'));
const OUTPUT = flag('-o', 'result.json');
const PROFILE = flag('--profile', join(dirname(new URL(import.meta.url).pathname), 'interest-profile.yaml'));
const [W_INT, W_QUAL, W_ENG] = flag('--weights', '0.5,0.3,0.2').split(',').map(Number);
const MAX = parseInt(flag('--max', '20'), 10);
const CONF_CAT = parseFloat(flag('--conf-cat', '0.5')); // cat 置信度低于此值 → needs_review，由 LLM 复判
const BACKUP = !args.includes('--no-backup');
const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

// ---------- 判断层策略：--judge jev|llm|auto（优先级：命令行 > 环境变量 LINUXDO_JUDGE > auto：有 key 用 jev，无 key 用 llm） ----------
const JUDGE_RAW = flag('--judge', process.env.LINUXDO_JUDGE || 'auto').toLowerCase();
const JUDGE = JUDGE_RAW === 'jev' || JUDGE_RAW === 'llm' ? JUDGE_RAW
  : process.env.TYPESAFE_API_KEY ? 'jev' : 'llm';
const JUDGE_FILE = flag('--judge-file', 'llm-judgments.json');
const TASK_FILE = flag('--llm-task', 'llm-task.json');

if (!input) { console.error('用法: node jev-ask-oss.mjs <topics.json> --memory <memory.md> -o result.json [--judge jev|llm|auto]'); process.exit(2); }
const KEY = process.env.TYPESAFE_API_KEY;
if (JUDGE === 'jev' && !KEY) { console.error('Jev 模式缺少 TYPESAFE_API_KEY（console.typesafe.ai/settings/keys）。可改用 --judge llm（零外部 API）。'); process.exit(3); }

// ---------- 账本解析（只读） ----------
const memText = readFileSync(MEMORY, 'utf8');
const seen = new Map(); // topic_id -> {title,url,first_shown_date}
for (const m of memText.matchAll(/- topic_id:\s*(\d+)\n\s*title:\s*(.*)\n\s*url:\s*(\S+)\n\s*first_shown_date:\s*(\S+)/g))
  seen.set(Number(m[1]), { title: m[2].trim(), url: m[3], first_shown_date: m[4] });

// ---------- 输入与候选池 ----------
const scanned = JSON.parse(readFileSync(input, 'utf8'))
  .filter(t => t && t.id != null && t.title)
  .map(t => ({ id: Number(t.id), title: String(t.title).trim().slice(0, 120), views: Number(t.views || 0), posts_count: Number(t.posts_count || 0) }));
const pool = scanned.filter(t => !seen.has(t.id));
console.error(`[oss] 扫描 ${scanned.length} 帖，账本已有 ${seen.size} 条，未见过候选 ${pool.length} 帖`);

// ---------- 兴趣画像 ----------
const profileText = readFileSync(PROFILE, 'utf8');
const profile = { high: [], medium: [], low: [] };
let cur = null;
for (const line of profileText.split('\n')) {
  const sec = line.match(/^(high|medium|low):\s*$/);
  if (sec) { cur = sec[1]; continue; }
  const item = line.match(/^\s*-\s+(.+)$/);
  if (cur && item) profile[cur].push(item[1].trim());
}

// ---------- Jev 问题构造 ----------
const CAT = {
  agent_ai_tool: 'AI Agent、LLM 应用与工作流工具',
  model_access: '模型接入/中转/号池/API 方案',
  dev_plugin: '开发者工具、IDE/编辑器/浏览器插件',
  self_hosted: '自托管服务、Web 面板、homelab',
  client_app: '面向普通用户的桌面/移动/Web 应用（非 AI 为主）',
  script_wf: '脚本、自动化、工作流、Skill',
  non_tech: '非技术/生活类项目',
};
const QUAL = [
  '玩具/凑数：vibe coding 一晚产物、无明确功能边界、标题只有情绪或梗',
  '定位明确的小工具：说清了做什么、给谁用',
  '完成度信号强：具体版本号、多平台、架构/文档表述、生产可用等具体性证据',
];
const INT = [
  '与我无关：不属于画像中任何方向',
  '沾边：画像 medium 方向，或 high 方向但形态不合',
  '正中关注点：画像 high 方向，我会想立刻点开看',
];

function buildPayload() {
  const questions = {};
  pool.forEach((t, i) => {
    const q = `t${t.id}`;
    questions[`${q}_cat`] = { type: 'choice', instructions: `Which category does the open-source project in \`topics[${i}].title\` belong to?`, criteria: CAT };
    questions[`${q}_qual`] = { type: 'score', instructions: `Judged from the title alone, how much substance/completion signal does the project in \`topics[${i}].title\` convey?`, criteria: QUAL };
    questions[`${q}_int`] = { type: 'score', instructions: `Given the reader's \`interest_profile\`, how well does the project in \`topics[${i}].title\` match what this reader cares about?`, criteria: INT };
  });
  return {
    state: {
      note: 'linux.do 开源推广标签页主题（仅标题与元数据）。标签页内容天然均为开源项目，无需判断是否为项目。',
      interest_profile: profile,
      topics: pool.map(t => ({ id: t.id, title: t.title, views: t.views, posts_count: t.posts_count })),
    },
    model: 'jev-latest',
    questions,
  };
}

// ---------- API 调用（重试 3 次） ----------
async function ask(payload) {
  for (let a = 0; a < 3; a++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 60000);
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
      clearTimeout(timer);
      if (res.ok) return await res.json();
      const body = await res.text();
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      throw new Error(`FATAL ${res.status}: ${body.slice(0, 200)}`);
    } catch (e) {
      if (String(e.message).startsWith('FATAL') || a === 2) throw e;
      await new Promise(r => setTimeout(r, 1200 * 2 ** a));
    }
  }
}

// ---------- 判断 + 组合打分（jev：API；llm：本地判断文件，零外部 API） ----------
const taskHash = s => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(16); };
const HASH = taskHash(pool.map(t => t.id).join(','));
let res;
if (pool.length === 0) {
  console.error('[oss] 未见过候选为 0，跳过判断，直接产出空列表并更新账本头部');
  res = { answers: {}, usage: null };
} else if (JUDGE === 'llm') {
  // 两阶段：阶段1 生成 llm-task.json 后退出（不写账本）；阶段2 读取同 schema 的 llm-judgments.json，打分与账本路径与 jev 完全一致
  let doc = null;
  try { doc = JSON.parse(readFileSync(JUDGE_FILE, 'utf8')); } catch { /* 无判断文件 → 阶段1 */ }
  if (doc && doc.task_hash === HASH && doc.answers) {
    res = { answers: doc.answers, usage: null };
    console.error(`[oss] LLM 判断模式·阶段2：读取 ${JUDGE_FILE}（${Object.keys(doc.answers).length} 项，task_hash ✓）`);
  } else {
    if (doc) console.error(`[oss] ⚠️ ${JUDGE_FILE} 的 task_hash 与当前候选集不匹配或缺 answers，重新生成任务`);
    const task = {
      task_hash: HASH,
      judge: 'llm',
      note: 'agent 作为判断层：为每个未见过的 topic 生成与 Jev 同 schema 的答案，写入 llm-judgments.json 后用原命令重跑。判断只基于标题（标题级归纳），尽量完整作答。',
      interest_profile: profile,
      rubrics: { cat: CAT, quality: QUAL, interest: INT },
      thresholds: { cat_conf_min: CONF_CAT },
      answer_schema: {
        per_topic: [
          `t{id}_cat → {choice: ${Object.keys(CAT).join('|')}|other, confidence: 0~1}`,
          `t{id}_qual → {score: 0~2}`,
          `t{id}_int → {score: 0~2}（对照 interest_profile 判断匹配度）`,
        ],
        honesty_rule: `confidence 为自评置信度：分类拿不准给 < ${CONF_CAT}，将标记 needs_review 交由 LLM 复判`,
      },
      example: { answers: { t0_cat: { choice: 'agent_ai_tool', confidence: 0.8 }, t0_qual: { score: 1.5 }, t0_int: { score: 2 } } },
      topics: pool,
    };
    writeFileSync(TASK_FILE, JSON.stringify(task, null, 2));
    console.error(`[oss] LLM 判断模式·阶段1：任务已写入 ${TASK_FILE}（未见过候选 ${pool.length} 帖）。\n[oss] → agent 按 answer_schema 填写 ${JUDGE_FILE}（顶层须含 "task_hash": "${HASH}" 与 "answers"），随后用原命令重跑。`);
    process.exit(0);
  }
} else {
  res = await ask(buildPayload());
}
const A = res.answers || {};
const maxEng = Math.max(...pool.map(t => t.views + t.posts_count), 1);
const judged = pool.map(t => {
  const cat = A[`t${t.id}_cat`], qual = A[`t${t.id}_qual`], int = A[`t${t.id}_int`];
  const cc = cat?.confidence ?? 1;
  const q = qual?.score ?? 0, it = int?.score ?? 0;
  const eng = Math.log10(1 + t.views + t.posts_count) / Math.log10(1 + maxEng);
  return {
    id: t.id, title: t.title, url: `https://linux.do/t/topic/${t.id}`,
    views: t.views, posts_count: t.posts_count,
    cat: cat?.choice || 'other',
    cat_confidence: Number(cc.toFixed(2)),
    needs_review: cc < CONF_CAT,
    quality: Number(q.toFixed(2)), interest: Number(it.toFixed(2)),
    priority: Number((W_INT * (it / 2) + W_QUAL * (q / 2) + W_ENG * eng).toFixed(3)),
    star: it >= 1.5 && q >= 1.0,
  };
}).sort((x, y) => y.priority - x.priority);

const shown = judged.slice(0, MAX);
const byCat = {};
for (const s of shown) byCat[s.cat] = (byCat[s.cat] || 0) + 1;
const result = {
  judge: JUDGE,
  usage: res.usage,
  stats: { scanned: scanned.length, in_ledger: seen.size, unseen_candidates: pool.length, shown: shown.length, starred: shown.filter(s => s.star).length, needs_review: shown.filter(s => s.needs_review).length },
  stats_by_cat: byCat,
  items: shown,
};
writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
console.error(`[oss] 判断层=${JUDGE}${JUDGE === 'jev' ? '' : ' (本地 LLM，零外部 API)'}｜展示 ${shown.length} 条（⭐${result.stats.starred}）｜类别分布: ${Object.entries(byCat).map(([k, v]) => `${k}:${v}`).join(' ')}`);
const nr = shown.filter(s => s.needs_review);
if (nr.length) console.error(`[oss] ⚠️ cat 置信度 < ${CONF_CAT} 待 LLM 复判 ${nr.length} 条: ${nr.map(s => s.id).join(', ')}`);
console.error(`[oss] ${JUDGE === 'jev' ? `tokens: ${res.usage?.input_tokens}in/${res.usage?.output_tokens}out｜` : ''}已写入 ${OUTPUT}`);

// ---------- 账本追加（仅在成功产出展示列表后） ----------
if (BACKUP) copyFileSync(MEMORY, MEMORY + '.bak');
const now = new Date(Date.now() + 8 * 3600e3).toISOString().replace('T', ' ').slice(0, 19) + '+08:00';
const today = now.slice(0, 10);
const headerRe = /^(last_run|last_scanned_count|last_new_count|last_status|last_note):.*$/gm;
let updated = memText;
const fields = {
  last_run: now,
  last_scanned_count: String(scanned.length),
  last_new_count: String(shown.length),
  last_status: 'success',
  last_note: `"${now.slice(0, 16)} scanned ${scanned.length} activity-ordered tag-list topics, judged ${pool.length} unseen candidates with ${JUDGE === 'jev' ? 'Jev' : 'LLM-agent (no API)'} (cat/quality/interest), showed top ${shown.length} by composite priority; title-level only."`,
};
updated = updated.replace(headerRe, m => {
  const key = m.slice(0, m.indexOf(':'));
  return key in fields ? `${key}: ${fields[key]}` : m;
});
const append = shown.map(s =>
  `- topic_id: ${s.id}\n  title: "${s.title.replace(/"/g, "'")}"\n  url: "${s.url}"\n  first_shown_date: ${today}\n  cat: ${s.cat}\n  cat_confidence: ${s.cat_confidence}\n  quality: ${s.quality}\n  interest: ${s.interest}`
).join('\n');
writeFileSync(MEMORY, updated.trimEnd() + '\n' + append + '\n');
console.error(`[oss] 账本已更新：追加 ${shown.length} 条${BACKUP ? '（备份 → memory.md.bak）' : ''}`);
