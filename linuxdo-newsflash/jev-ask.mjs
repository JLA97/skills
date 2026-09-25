#!/usr/bin/env node
// jev-ask.mjs — linuxdo-newsflash 的判断层：topics.json → 判断(Jev API / 本地 LLM 文件) → 代码组合 → events.json
// 用法: node jev-ask.mjs topics.json -o events.json [--judge jev|llm|auto] [--model jev-latest] [--batch 40] [--conf 0.6]
import { readFileSync, writeFileSync } from 'node:fs';

// ---------- 参数 ----------
const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['-o', '--model', '--batch', '--conf', '--conf-kind', '--unver', '--judge', '--judge-file', '--llm-task']);
const input = args.find((a, i) => !a.startsWith('-') && !(i > 0 && VALUE_FLAGS.has(args[i - 1])));
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const OUTPUT = flag('-o', 'events.json');
const MODEL = flag('--model', 'jev-latest');
const BATCH = parseInt(flag('--batch', '40'), 10);
const CONF = parseFloat(flag('--conf', '0.6'));
const CONF_KIND = parseFloat(flag('--conf-kind', '0.5')); // 噪声判定置信度低于此值 → 不丢弃，待 LLM 复判
const UNVER = parseFloat(flag('--unver', '0.6'));
const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

// ---------- 判断层策略：--judge jev|llm|auto（优先级：命令行 > 环境变量 LINUXDO_JUDGE > auto：有 key 用 jev，无 key 用 llm） ----------
const JUDGE_RAW = flag('--judge', process.env.LINUXDO_JUDGE || 'auto').toLowerCase();
const JUDGE = JUDGE_RAW === 'jev' || JUDGE_RAW === 'llm' ? JUDGE_RAW
  : process.env.TYPESAFE_API_KEY ? 'jev' : 'llm';
const JUDGE_FILE = flag('--judge-file', 'llm-judgments.json');
const TASK_FILE = flag('--llm-task', 'llm-task.json');

if (!input) { console.error('用法: node jev-ask.mjs <topics.json> -o events.json [--judge jev|llm|auto]'); process.exit(2); }
const KEY = process.env.TYPESAFE_API_KEY;
if (JUDGE === 'jev' && !KEY) { console.error('Jev 模式缺少环境变量 TYPESAFE_API_KEY（console.typesafe.ai/settings/keys 创建）。可改用 --judge llm（零外部 API）。'); process.exit(3); }

// ---------- 数据 ----------
const topics = JSON.parse(readFileSync(input, 'utf8'))
  .filter(t => t && t.id != null && t.title)
  .map(t => ({
    id: Number(t.id),
    title: String(t.title).trim().slice(0, 120),
    created_at: String(t.created_at || ''),
    views: Number(t.views || 0),
    posts_count: Number(t.posts_count || 0),
  }))
  .sort((a, b) => a.created_at.localeCompare(b.created_at)); // 升序：dup 只指向更早的帖子

// ---------- 标题相似度预筛（词面候选，保证 dup 选项覆盖率） ----------
const tokens = title => {
  const norm = title.toLowerCase().replace(/【[^】]*】|\([^)]*\)|\[[^\]]*\]/g, ' ');
  const set = new Set();
  for (const w of norm.match(/[a-z0-9][a-z0-9.+-]{1,}/g) || []) set.add(w);
  const cjk = norm.match(/[\u4e00-\u9fff]/g) || [];
  for (let i = 0; i < cjk.length - 1; i++) set.add(cjk[i] + cjk[i + 1]);
  return set;
};
const TOK = new Map(topics.map(t => [t.id, tokens(t.title)]));
const overlap = (a, b) => {
  const [s, l] = a.size <= b.size ? [a, b] : [b, a];
  let hit = 0; for (const x of s) if (l.has(x)) hit++;
  return hit / Math.sqrt(a.size * b.size || 1);
};
const candidates = id => {
  const i = topics.findIndex(t => t.id === id);
  return topics.slice(0, i)
    .map(t => ({ id: t.id, title: t.title, sim: overlap(TOK.get(id), TOK.get(t.id)) }))
    .filter(c => c.sim > 0.12)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5);
};

// ---------- 问题构造（每帖 5 问，独立判断，同批并行） ----------
const KIND = {
  news_event: '报道一个具体事实/事件：发布、开源、融资、人事变动、政策、研究进展',
  community_dyn: '额度重置、服务故障、促销等对社区用户有即时影响的动态',
  board_meta: '板块说明、规则帖、站务公告',
  digest: '日报、播客、榜单汇编等二次汇总内容',
  help_request: '求助、求推荐、提问',
  meme: '玩梗、水贴、无事实信息的闲聊',
};
const CAT = {
  ai_tech: 'AI 模型、AI 产品、开源项目、开发者工具、科技公司技术动态',
  biz_policy_society: '商业（收入/融资/收购）、政策法规、社会事件',
  na: '不是新闻事件（社区动态或噪声）',
};
const INFO = [
  '模糊或玩梗，缺少主体或事实',
  '有基本事实：主体+动作',
  '完整具体：主体+动作+具体数据/版本号/人名/结果',
];

function buildRequest(batch, batchAll) {
  const questions = {};
  batch.forEach((t, i) => {
    const q = `t${t.id}`;
    questions[`${q}_kind`] = {
      type: 'choice',
      instructions: `Judged from its title alone, what kind of topic is \`topics[${i}]\`?`,
      criteria: KIND,
    };
    questions[`${q}_cat`] = {
      type: 'choice',
      instructions: `If \`topics[${i}]\` reports a news event, which bucket does it belong to?`,
      criteria: CAT,
    };
    const cand = candidates(t.id);
    questions[`${q}_dup`] = {
      type: 'choice',
      instructions: `Does the title of \`topics[${i}]\` describe the SAME specific occurrence as one of the candidate topics? Related-but-different events (e.g. same company, different facts) must pick "none".`,
      criteria: {
        none: 'No candidate reports the same event',
        ...Object.fromEntries(cand.map(c => [String(c.id), `Topic ${c.id}, title: ${c.title}`])),
      },
    };
    questions[`${q}_info`] = {
      type: 'score',
      instructions: `How complete and specific is the information in the title of \`topics[${i}]\` alone?`,
      criteria: INFO,
    };
    questions[`${q}_unver`] = {
      type: 'noul',
      instructions: `The title of \`topics[${i}]\` presents an unconfirmed claim (rumor, leak, "爆料", "消息称", "疑似", anonymous sources) rather than an established fact.`,
      criteria: { true: '含爆料/传闻/未经核实的表述', false: '已确认或可核实的事实陈述' },
    };
  });
  return {
    state: {
      note: 'linux.do 前沿快讯板块主题列表（仅标题与元数据，标题级判断）',
      topics: batch.map(t => ({ id: t.id, title: t.title, views: t.views, posts_count: t.posts_count })),
    },
    model: MODEL,
    questions,
  };
}

// ---------- API 调用（重试 3 次） ----------
async function ask(payload) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 60000);
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return await res.json();
      const body = await res.text();
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      throw new Error(`FATAL HTTP ${res.status}: ${body.slice(0, 300)}`);
    } catch (e) {
      if (String(e.message).startsWith('FATAL') || attempt === 2) throw e;
      await new Promise(r => setTimeout(r, 1200 * 2 ** attempt + Math.random() * 500));
    }
  }
}

// ---------- 执行（jev：API 批量；llm：本地判断文件，零外部 API） ----------
const answers = {};
const usage = JUDGE === 'jev' ? { input_tokens: 0, output_tokens: 0 } : null;
const taskHash = s => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(16); };
const HASH = taskHash(topics.map(t => t.id).join(','));

if (JUDGE === 'llm') {
  // 两阶段：阶段1 生成 llm-task.json 后退出；阶段2 读取同 schema 的 llm-judgments.json，代码组合与 jev 完全一致
  let doc = null;
  try { doc = JSON.parse(readFileSync(JUDGE_FILE, 'utf8')); } catch { /* 无判断文件 → 阶段1 */ }
  if (doc && doc.task_hash === HASH && doc.answers) {
    Object.assign(answers, doc.answers);
    console.error(`[jev-ask] LLM 判断模式·阶段2：读取 ${JUDGE_FILE}（${Object.keys(doc.answers).length} 项，task_hash ✓）`);
  } else {
    if (doc) console.error(`[jev-ask] ⚠️ ${JUDGE_FILE} 的 task_hash 与当前主题集不匹配或缺 answers，重新生成任务`);
    const task = {
      task_hash: HASH,
      judge: 'llm',
      note: 'agent 作为判断层：为每个 topic 生成与 Jev 同 schema 的答案，写入 llm-judgments.json 后用原命令重跑。判断只基于标题（标题级归纳），尽量完整作答。',
      rubrics: { kind: KIND, cat: CAT, info: INFO, unver: { true: '含爆料/传闻/未经核实的表述', false: '已确认或可核实的事实陈述' } },
      thresholds: { dup_conf_min: CONF, kind_conf_min: CONF_KIND, unver_min: UNVER },
      answer_schema: {
        per_topic: [
          `t{id}_kind  → {choice: news_event|community_dyn|board_meta|digest|help_request|meme, confidence: 0~1}`,
          `t{id}_cat   → {choice: ai_tech|biz_policy_society|na, confidence: 0~1}（仅 kind=news_event 时需要）`,
          `t{id}_dup   → {choice: none|<候选topic_id>, confidence: 0~1}（同一具体事件才合并；仅 dup_candidates 非空时作答，可省略视为 none）`,
          `t{id}_info  → {score: 0~2}`,
          `t{id}_unver → {noul: 0~1}`,
        ],
        honesty_rule: `confidence 为自评置信度：不确定的噪声判定给 < ${CONF_KIND}（保留待复判），不确定的 dup 合并给 < ${CONF}（不合并）`,
      },
      example: { answers: { t0_kind: { choice: 'news_event', confidence: 0.85 }, t0_cat: { choice: 'ai_tech', confidence: 0.7 }, t0_dup: { choice: 'none', confidence: 0.9 }, t0_info: { score: 2 }, t0_unver: { noul: 0.1 } } },
      topics: topics.map(t => ({ ...t, dup_candidates: candidates(t.id).map(c => ({ id: c.id, title: c.title })) })),
    };
    writeFileSync(TASK_FILE, JSON.stringify(task, null, 2));
    console.error(`[jev-ask] LLM 判断模式·阶段1：任务已写入 ${TASK_FILE}（${topics.length} 帖）。\n[jev-ask] → agent 按 answer_schema 填写 ${JUDGE_FILE}（顶层须含 "task_hash": "${HASH}" 与 "answers"），随后用原命令重跑。`);
    process.exit(0);
  }
} else {
  for (let i = 0; i < topics.length; i += BATCH) {
    const batch = topics.slice(i, i + BATCH);
    const res = await ask(buildRequest(batch, topics));
    Object.assign(answers, res.answers || {});
    usage.input_tokens += res.usage?.input_tokens || 0;
    usage.output_tokens += res.usage?.output_tokens || 0;
    console.error(`[jev-ask] 批次 ${i / BATCH + 1}: ${batch.length} 帖 ✓ (累计 tokens: ${usage.input_tokens}in/${usage.output_tokens}out)`);
  }
}

// ---------- 代码组合：清噪 → 去重分组 → 分桶 → 排序 ----------
const NOISE = new Set(['board_meta', 'digest', 'help_request', 'meme']);
const A = id => ({
  kind: answers[`t${id}_kind`],
  cat: answers[`t${id}_cat`],
  dup: answers[`t${id}_dup`],
  info: answers[`t${id}_info`],
  unver: answers[`t${id}_unver`],
});
const byId = new Map(topics.map(t => [t.id, t]));
const stats = { raw: topics.length, events: 0, noise_dropped: 0, merged_away: 0, low_conf_dup_unmerged: 0, missing_answers: 0, low_conf_kind_kept: 0 };

// 破坏性动作门控：判为噪声但置信度不足 → 不丢弃，标记待复判
const needsReview = new Set();
const isNoise = id => {
  const k = A(id).kind;
  if (!NOISE.has(k?.choice || '')) return false;
  if ((k?.confidence ?? 1) >= CONF_KIND) return true;
  needsReview.add(id);
  return false;
};

// 并查集
const parent = new Map();
const find = x => { let r = x; while (parent.get(r) !== r) r = parent.get(r); let c = x; while (parent.get(c) !== c) { const n = parent.get(c); parent.set(c, r); c = n; } return r; };
const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
for (const t of topics) if (!isNoise(t.id)) parent.set(t.id, t.id);
stats.low_conf_kind_kept = needsReview.size;

for (const t of topics) {
  const a = A(t.id);
  const kind = a.kind?.choice;
  if (!kind) stats.missing_answers++;
  if (isNoise(t.id)) continue; // 确判噪声：不参与去重；低置信噪声已保留，正常参与
  const d = a.dup;
  if (d && d.choice !== 'none' && byId.has(Number(d.choice))) {
    if ((d.confidence ?? 0) >= CONF) union(t.id, Number(d.choice));
    else stats.low_conf_dup_unmerged++;
  }
}
// 分组
const groups = new Map();
for (const id of parent.keys()) {
  const r = find(id);
  if (!groups.has(r)) groups.set(r, []);
  groups.get(r).push(id);
}

const better = (x, y) => { // 代表帖排序键：(info, views, posts_count)
  const k = id => [A(id).info?.score ?? 0, byId.get(id).views, byId.get(id).posts_count];
  const [a, b] = [k(x), k(y)];
  return a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
};

const SECTIONS = { ai_tech: [], biz_policy_society: [], community_dyn: [], other: [] };
const NAMES = { ai_tech: 'AI 与科技', biz_policy_society: '商业/政策/社会', community_dyn: '社区即时动态', other: '其他新闻' };
for (const members of groups.values()) {
  const rep = members.reduce((m, id) => better(id, m) ? id : m);
  const a = A(rep);
  const kind = a.kind?.choice || 'news_event';
  let sec = 'other';
  if (kind === 'community_dyn') sec = 'community_dyn';
  else if (a.cat?.choice === 'ai_tech') sec = 'ai_tech';
  else if (a.cat?.choice === 'biz_policy_society') sec = 'biz_policy_society';
  SECTIONS[sec].push({
    id: rep,
    title: byId.get(rep).title,
    created_at: byId.get(rep).created_at,
    views: byId.get(rep).views,
    posts_count: byId.get(rep).posts_count,
    info_score: Number((a.info?.score ?? 0).toFixed(2)),
    unverified: (a.unver?.noul ?? 0) >= UNVER,
    needs_review: needsReview.has(rep),
    group_size: members.length,
    links: members.map(id => `https://linux.do/t/topic/${id}`),
    group_titles: members.map(id => byId.get(id).title),
  });
  stats.merged_away += members.length - 1;
}
for (const key of Object.keys(SECTIONS))
  SECTIONS[key].sort((x, y) => y.info_score - x.info_score || y.views - x.views);
stats.events = Object.values(SECTIONS).reduce((n, s) => n + s.length, 0);
stats.noise_dropped = topics.length - parent.size; // 低置信噪声帖在 parent 内，天然不计入清噪

const result = { judge: JUDGE, model: JUDGE === 'jev' ? MODEL : 'llm-agent', usage, stats, sections: SECTIONS };
writeFileSync(OUTPUT, JSON.stringify(result, null, 2));

console.error(`\n[jev-ask] 判断层=${JUDGE}${JUDGE === 'jev' ? ` (${MODEL})` : ' (本地 LLM，零外部 API)'}｜原始 ${stats.raw} → 事件 ${stats.events}（清噪 ${stats.noise_dropped}，合并 ${stats.merged_away}，低置信未合并 ${stats.low_conf_dup_unmerged}，低置信噪声保留待复判 ${stats.low_conf_kind_kept}）`);
for (const [k, v] of Object.entries(SECTIONS))
  if (v.length) console.error(`[jev-ask] ${NAMES[k]}: ${v.length} 条 → ${v.map(e => e.title.slice(0, 24)).slice(0, 3).join(' / ')}${v.length > 3 ? ' …' : ''}`);
console.error(`[jev-ask] 已写入 ${OUTPUT}`);
