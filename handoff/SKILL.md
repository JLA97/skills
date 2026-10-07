---
name: handoff
disable-model-invocation: true
description: This skill should be used when the user requests to save progress, load prior progress, pause work, create/read a handoff document, continue from a handoff, or says "保存进度", "读取 handoff", "恢复进度", "继续上次", "load handoff", "handoff", "暂停", "checkpoint", "交接". It enables zero-loss context transfer across AI agent sessions by creating or loading a structured handoff document written FOR THE NEXT AI AGENT (not for humans). Use this at session end, when approaching context limits, before task switching, or when resuming from a prior handoff. The handoff preserves executable context - specific file paths, function names, decision rationale, failed approaches, and priority-ordered next steps.
---

# Handoff - AI Agent Context Transfer

## Core Principle

**This is NOT a user summary - it's a technical handoff TO THE NEXT AI AGENT.**

The next agent cannot access this conversation. It only sees your handoff document. Your goal: enable it to continue work immediately without repeating your analysis, mistakes, or wasted effort.

---

## When to Trigger

**User keywords:**
- Save mode: "保存进度" / "save progress" / "create handoff" / "暂停" / "checkpoint" / "交接给..."
- Load mode: "读取 handoff" / "load handoff" / "恢复进度" / "继续上次" / "从 handoff 继续" / "resume from handoff"
- Ambiguous: "handoff" / "交接" / "处理 handoff"

**Proactive triggers:**
- Context approaching limit
- Session ending
- Complex multi-session task
- Before task switching
- User asks to resume previous work and a handoff file is present

---

## Workflow

### Step 0: Determine Mode

Before doing anything, determine whether the request is:

- **Save mode:** Create or update a handoff from the current conversation/work state.
- **Load mode:** Read an existing handoff and continue from it.

Infer the mode when wording is clear.

Ask one concise clarification question only when mode is ambiguous:

> Do you want me to save current progress to a handoff, or load an existing handoff to continue?

Do not ask when the answer is already clear. Examples:

- User says "保存进度" → save mode
- User says "继续上次 handoff" → load mode
- User says "从 260531-handoff.md 继续" → load mode
- User says only "handoff" → ask whether to save or load

If save mode, follow the Save Mode workflow below. If load mode, follow the Load Mode workflow.

---

## Save Mode Workflow

### Step 1: Determine File Location

Generate filename: `./{YYMMDD}-handoff.md` (e.g., `./260314-handoff.md`)

Use current directory unless user specifies otherwise.

### Step 2: Clarify Handoff Routing

Before writing the handoff, determine these three fields:

- **Source agent:** Which agent or system is creating or updating this handoff? Examples: `Codex`, `Claude Code`, `ChatGPT`, `current AI agent`.
- **Target reader:** Which agent or system will consume this handoff? Examples: `Codex`, `Claude Code`, `next AI agent`.
- **Execution type:** What should the target reader do? Examples: `implementation continuation`, `code review`, `debugging`, `architecture review`, `test coverage review`.

If `Target reader` or `Execution type` is not explicit and cannot be confidently inferred from the user's request or current context, ask one concise clarification question covering both fields before creating the file.

Do not ask for `Source agent`; infer it from the current runtime identity when possible, otherwise use `current AI agent`.

Do not ask when the answer is already clear. Examples:

- User says "交给 Codex review" → source agent: current agent; target reader: `Codex`; execution type: `code review`
- User says "让 Claude Code 继续做" → source agent: current agent; target reader: `Claude Code`; execution type: `implementation continuation`
- User says "保存进度，下一轮继续" → source agent: current agent; target reader: `next AI agent`; execution type: `implementation continuation`

### Step 3: Gather Executable Context

Collect SPECIFIC, ACTIONABLE information:

- **Concrete identifiers**: File paths, class names, function names, variable names, API endpoints
- **Decision rationale**: WHY certain approaches were chosen
- **Failed attempts**: What was tried and WHY it didn't work
- **Assumptions made**: What was assumed to be true
- **Verification status**: What has been tested/confirmed

### Step 4: Write Handoff Document

Write to `./{YYMMDD}-handoff.md` using the structure below.

### Step 5: Update Existing Handoff When Continuing a Relay

When updating an existing handoff after completing routed work:

- Preserve durable facts, decisions, review findings, failed approaches, verification results, file inventory, and git status.
- Update source agent, routing, current progress, pending tasks, recommended first steps, and next agent actions as needed.
- Do not overwrite the handoff as a fresh summary unless the user explicitly asks to start over.
- If changing `Source agent`, `Target reader`, or `Execution type`, explicitly record why the handoff is being rerouted or updated.
- Treat the handoff as shared working memory plus the next execution protocol.

### Step 6: Confirm

Tell user: "Handoff saved to `{filename}` - next agent can continue from here."

---

## Load Mode Workflow

### Step 1: Locate Handoff File

Determine the handoff file location before reading.

Do not ask when:

- The user provided a specific file path and it exists.
- Exactly one `*-handoff.md` exists in the current directory.
- Multiple handoff files exist but the most recently modified one clearly matches the user's request.

Ask one concise clarification question when:

- No handoff file is found in the current directory and the user did not provide a path.
- Multiple plausible handoff files exist and recency alone is not enough to choose safely.
- The user provided a path but it does not exist.

Default selection logic:

1. Use the handoff file specified by the user when present and valid.
2. Otherwise, check for `*-handoff.md` files in the current directory.
3. If exactly one exists, use it.
4. If multiple exist, select the most recently modified file only when it clearly matches the user's request or there is no conflicting task/date context.
5. If no safe selection can be made, ask for the handoff file path.

### Step 2: Read Routing First

Read `## 0. Handoff Routing` before summarizing or acting.

Extract:

- **Source agent**
- **Target reader**
- **Execution type**
- **Reroute reason**

If the current agent clearly does not match `Target reader`, tell the user before continuing and ask whether to proceed anyway. If the target is `next AI agent`, `current AI agent`, or otherwise compatible, continue.

### Step 3: Restore Executable Context

Read and internalize these sections before taking action:

- `## 1. Current Task Objective`
- `## 2. Current Progress`
- `## 3. Critical Context`
- `## 5. Failed Approaches (DO NOT RETRY)`
- `## 6. Pending Tasks (Priority Order)`
- `## 7. Recommended First Steps`
- `## 8. Risks & Pitfalls`
- `## 12. Next Agent's First Action`

Treat the handoff as the task entrypoint. Do not broaden the task beyond the objective, routing, and pending tasks unless the user explicitly redirects.

### Step 4: Briefly Confirm Loaded State

Tell the user only the minimum useful context:

```text
Loaded handoff: {brief objective}
Source: {source_agent}
Target: {target_reader}
Execution: {execution_type}
Starting from: {next_agent_first_action}
```

### Step 5: Continue Work

Start with `## 12. Next Agent's First Action` unless it is stale or unsafe.

If it is stale or unsafe:

- Explain the mismatch briefly.
- Re-verify current state using `## 7. Recommended First Steps`.
- Continue with the highest-priority pending task that still applies.

---

## Handoff Document Structure

```markdown
# AI Agent Handoff - {YYMMDD}

> **Goal:** Enable immediate continuation without repeating analysis or mistakes

---

## 0. Handoff Routing

**Source agent:** [Codex / Claude Code / ChatGPT / current AI agent / other agent or system]

**Target reader:** [Codex / Claude Code / next AI agent / other agent or system]

**Execution type:** [implementation continuation / code review / debugging / architecture review / test coverage review / other]

**How to read this handoff:**
1. Treat this file as the task entrypoint.
2. Start with `## 0. Handoff Routing` to understand your role and execution type.
3. Execute the "Next Agent's First Action" section before broad exploration.
4. Use `## 3. Critical Context`, `## 4. Key Findings`, and `## 8. Risks & Pitfalls` as supporting context.
5. Do not broaden the task beyond the routing and objective sections.

**Expected behavior from target reader:**
- [Specific instruction 1, e.g. "Review only the current diff and report bugs by severity"]
- [Specific instruction 2, e.g. "Do not rewrite unrelated files"]

**Out of scope for target reader:**
- [Boundary 1]
- [Boundary 2]

**Reroute reason:** [If this handoff was updated from a previous source agent, target reader, or execution type, explain why the route changed; otherwise "initial handoff"]

## 1. Current Task Objective

**What problem are we solving:**
[Specific problem description]

**Expected output:**
[Concrete deliverables with acceptance criteria]

**Completion criteria:**
[How to know when done]

---

## 2. Current Progress

**Completed:**
- [Specific action taken] - resulted in [concrete outcome]
- [Another completed item] - file: `path/to/file.ts:123`

**In progress:**
- [Current work item] - status: [percentage or milestone]
- Files being modified: `path/to/file1.ts`, `path/to/file2.ts`

---

## 3. Critical Context

**User requirements:**
- [Explicit requirement 1]
- [Explicit requirement 2]

**Key constraints:**
- [Technical constraint] - reason: [why it matters]
- [Business constraint] - impact: [what it affects]

**Important decisions made:**
- **Decision:** [What was decided]
  - **Rationale:** [Why this approach]
  - **Alternatives considered:** [What else was evaluated]
  - **Trade-offs:** [What we're giving up]

**Relay history:**
- [Timestamp/source agent] [Execution type] → [Result or conclusion]
- [Timestamp/source agent] Rerouted to [target reader] for [execution type] because [reason]

**Assumptions:**
- [Assumption 1] - needs verification: [yes/no]
- [Assumption 2] - confirmed by: [evidence]

---

## 4. Key Findings

**Technical discoveries:**
- [Finding 1] - location: `file.ts:line_number`
- [Pattern observed] - affects: [what components]

**Root causes identified:**
- [Problem] → [Root cause] → [Evidence: file/log/test]

**Critical insights:**
- [Insight that changes approach]
- [Non-obvious relationship between components]

---

## 5. Failed Approaches (DO NOT RETRY)

**Approach 1: [Description]**
- **Why tried:** [Reasoning]
- **Why failed:** [Specific error or limitation]
- **Evidence:** [Error message, test result, file: `path:line`]
- **Lesson:** [What this teaches us]

**Approach 2: [Description]**
- **Why tried:** [Reasoning]
- **Why failed:** [Specific reason]
- **Don't waste time on:** [What to avoid]

---

## 6. Pending Tasks (Priority Order)

**Priority 1 (URGENT):**
- [ ] [Specific task] - blocks: [what depends on this]
  - Files: `path/to/file.ts`
  - Function: `functionName()`
  - Expected change: [what needs to happen]

**Priority 2 (HIGH):**
- [ ] [Next task] - depends on: [prerequisite]
  - Location: `path/to/file.ts:line_range`

**Priority 3 (MEDIUM):**
- [ ] [Lower priority task]

---

## 7. Recommended First Steps

**Step 1: Verify current state**
```bash
# Commands to run
git status
git log -1 --oneline
```

**Step 2: Check these files first**
- `path/to/critical/file.ts` - contains: [what to look for]
- `path/to/another/file.ts:123-145` - focus on: [specific section]

**Step 3: Run this to validate**
```bash
# Validation command
npm test path/to/test.spec.ts
```

**Step 4: Start here**
- Open: `path/to/file.ts`
- Locate: `function targetFunction()`
- Modify: [specific change needed]
- Reason: [why this is the right starting point]

---

## 8. Risks & Pitfalls

**Easy to misunderstand:**
- [Concept X] - actually means: [correct interpretation]
- [File Y] - looks like [A] but is actually [B]

**Already verified (don't re-check):**
- ✓ [Thing 1] - confirmed in: `file.ts:line`
- ✓ [Thing 2] - test: `test.spec.ts` passes

**Watch out for:**
- [Gotcha 1] - symptom: [how it manifests] - solution: [how to handle]
- [Edge case] - occurs when: [condition] - handle by: [approach]

**Don't go down these paths:**
- ❌ [Approach X] - already tried, failed because: [reason]
- ❌ [Direction Y] - looks promising but: [why it won't work]

---

## 9. File Inventory

**Modified files:**
- `path/to/file1.ts` - changes: [what was changed] - status: [committed/uncommitted]
- `path/to/file2.ts` - changes: [what was changed] - status: [committed/uncommitted]

**New files created:**
- `path/to/new/file.ts` - purpose: [why it exists]

**Files to review:**
- `path/to/important/file.ts` - contains: [relevant info]

---

## 10. Git Status

**Branch:** `branch-name`
**Latest commit:** `abc123def` - message: "commit message"
**Uncommitted changes:** [yes/no]
**Unpushed commits:** [yes/no]

---

## 11. Environment & Dependencies

**Runtime:**
- Node version: [version]
- Package manager: [npm/yarn/pnpm]

**Key dependencies:**
- [package-name@version] - used for: [purpose]

**Environment variables needed:**
- `VAR_NAME` - purpose: [what it controls]

---

## 12. Next Agent's First Action

**Immediate next step:**

1. Read file: `path/to/file.ts:line_range`
2. Verify assumption: [what to check]
3. If [condition], then [action A], else [action B]
4. Expected outcome: [what should happen]

**Why start here:**
[Explanation of why this is the optimal starting point based on current state]

---

## Session Metadata

- **Created:** {YYYY-MM-DD HH:MM}
- **Source agent:** [agent or system creating this handoff]
- **Context tokens used:** [approximate]
- **Session duration:** [time spent]
- **Handoff reason:** [why session ended]
```

---

## Writing Guidelines

**Be specific, not generic:**
- ❌ "Fix the authentication bug"
- ✅ "Fix JWT token expiration in `src/auth/middleware.ts:45` - tokens expire after 1 hour instead of 24 hours"

**Include evidence:**
- ❌ "The API is slow"
- ✅ "GET /api/users takes 3.2s (measured via `curl -w '%{time_total}'`) - caused by N+1 query in `UserController.ts:89`"

**Document WHY, not just WHAT:**
- ❌ "Used Redis for caching"
- ✅ "Used Redis for caching because in-memory cache doesn't persist across container restarts (requirement from user: 'cache must survive deployments')"

**Mark verification status:**
- ✓ Confirmed: [evidence]
- ⚠️ Assumed: [needs verification]
- ❌ Disproven: [evidence]

---

## Anti-Patterns (Avoid These)

❌ **Vague descriptions:** "The code needs improvement"
✅ **Specific:** "Function `processData()` in `utils.ts:234` has O(n²) complexity - refactor to use Map for O(n)"

❌ **Missing context:** "Changed the config"
✅ **Full context:** "Changed `timeout` in `config/api.ts:12` from 5000ms to 30000ms because external API (user requirement: 'must support slow 3rd party API') takes 15-20s to respond"

❌ **No rationale:** "Decided to use PostgreSQL"
✅ **With rationale:** "Decided to use PostgreSQL over MongoDB because user needs ACID transactions for payment processing (explicit requirement: 'payments must be atomic')"

---

## Session Startup: Loading Previous Handoff

When starting a new session and the user asks to resume, continue, restore progress, or load a handoff, treat it as Load Mode:

1. Check for `*-handoff.md` files in current directory
2. If found, read the most recent one
3. Display brief loaded-state summary to user:

```
Found handoff from {date}:

Task: {brief objective}
Source agent: {source_agent}
Target reader: {target_reader}
Execution type: {execution_type}
Progress: {completion percentage}
Next step: {priority 1 task}
```

4. Continue from the handoff without asking if the user's load intent is clear and the current agent is compatible with the target reader.
5. Ask one concise question only if the handoff file choice is ambiguous, the target reader does not match the current agent, or the handoff appears stale/unsafe.
6. Start with "Next Agent's First Action"; fall back to "Recommended First Steps" when the first action is stale or unsafe.

---

## Tips for Maximum Effectiveness

1. **Assume zero context** - next agent sees ONLY your handoff
2. **Prioritize executable info** - file paths > abstract concepts
3. **Document the "why"** - decisions without rationale are useless
4. **Mark dead ends** - save next agent from repeating failures
5. **Be brutally specific** - "line 45" not "somewhere in the file"
6. **Include commands** - exact bash/npm commands to run
7. **Update incrementally** - refresh handoff after major progress
8. **Delete when done** - remove handoff after task completion

---

## Example: Good vs Bad Handoff

**❌ Bad (vague, no context):**
```
Working on user authentication. Made some progress.
Need to fix the login bug. Check the auth files.
```

**✅ Good (specific, executable):**
```
Task: Implement JWT refresh token rotation (user requirement: "tokens must auto-refresh")

Progress:
- ✓ Added refreshToken field to User model (`models/User.ts:23`)
- ✓ Created POST /auth/refresh endpoint (`routes/auth.ts:67`)
- ⚠️ In progress: Token rotation logic in `middleware/auth.ts:89-120`

Failed approach:
- Tried storing refresh tokens in Redis - failed because Redis instance
  resets on deploy (confirmed with DevOps). Don't retry this.

Next step:
1. Open `middleware/auth.ts:89`
2. Replace Redis call with database query: `User.findOne({refreshToken})`
3. Test with: `npm test -- auth.refresh.spec.ts`
4. Expected: Test "should rotate refresh token" passes

Why start here: Token rotation is blocking login flow (Priority 1).
Database approach confirmed working in staging environment.
```
