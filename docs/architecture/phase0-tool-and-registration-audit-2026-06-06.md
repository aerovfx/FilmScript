# Phase 0 Audit: Tool Capabilities and Plugin Registration Names (2026-06-06)

> Read-only audit. This file only "records evidence" and does not modify any skill / agent / plugin.json / test files.
> Purpose: provide a trustworthy runtime baseline for `context-minimal-writing-flow-plan`, verifying the assumed
> `webnovel-writer:<agent>` registration names, agent/skill frontmatter, and the official tool behaviors the plan depends on.

Working dir (git repo root = worktree): `D:/wk/novel skill/webnovel-writer/.worktrees/context-minimal-flow`
Plugin dir (nested): `webnovel-writer/` subdir under repo root.

---

## 1. Claude Code Version and Environment

| Item | Value | Evidence |
|------|-------|----------|
| Host | Claude Code (fixed, this plugin's only target host) | — |
| `claude --version` | `2.1.161 (Claude Code)` | Bash direct execution success (not "subagent unavailable") |
| Platform | Windows (win32), PowerShell + Bash both available | Environment note |
| This audit executor | subagent (Task 1); local `claude --version` returns normally | — |

Conclusion: version/environment confirmed, no downgrade record.

---

## 2. Plugin Registration (real names)

### 2.1 plugin.json

File: `webnovel-writer/.claude-plugin/plugin.json` (18 lines total).

```json
{
  "name": "webnovel-writer",
  "version": "6.1.0",
  "description": "Long-form webnovel creation system (skills + agents + data chain + RAG)",
  "author": { "name": "lingfengQAQ" },
  "homepage": "https://github.com/lingfengQAQ/webnovel-writer",
  "repository": "https://github.com/lingfengQAQ/webnovel-writer",
  "license": "GPL-3.0",
  "keywords": ["webnovel", "claude-code", "skills", "agents", "rag"]
}
```

- Plugin name (namespace prefix source): **`webnovel-writer`**.
- Manifest has **no** explicit `agents` / `skills` / `commands` path arrays.
  → Therefore agents and skills **all use convention-based auto-discovery**:
  - Official `plugin-structure/SKILL.md:11` — "automatic component discovery";
  - Same file lines 28-32: `agents/` (`.md` files) and `skills/` (subdirs, each with `SKILL.md`).
  - Official `skill-development/SKILL.md:271-273` — "Claude Code automatically discovers skills: Scans `skills/` directory; Finds subdirectories containing `SKILL.md`".

### 2.2 Real on-disk agent names (4)

Each agent is a single `.md` file; frontmatter `name:` matches filename (minus `.md`):

| File | frontmatter `name:` (line 2) | Match? |
|------|-------------------------------|--------|
| `webnovel-writer/agents/context-agent.md` | `context-agent` | ✅ |
| `webnovel-writer/agents/data-agent.md` | `data-agent` | ✅ |
| `webnovel-writer/agents/deconstruction-agent.md` | `deconstruction-agent` | ✅ |
| `webnovel-writer/agents/reviewer.md` | `reviewer` | ✅ |

Also `webnovel-writer/agents/evals/` (contains `evals.json` + `files/`) — not an agent definition, it's an eval fixture; auto-discovery won't treat it as agent (not top-level `.md`). No `agents/references/` dir.

### 2.3 Real on-disk skill names (8)

Each skill is a subdir with `SKILL.md`; frontmatter `name:` (all line 2) matches dir name:

| Dir | frontmatter `name:` | Match? |
|-----|---------------------|--------|
| `skills/webnovel-write/` | `webnovel-write` | ✅ |
| `skills/webnovel-init/` | `webnovel-init` | ✅ |
| `skills/webnovel-plan/` | `webnovel-plan` | ✅ |
| `skills/webnovel-review/` | `webnovel-review` | ✅ |
| `skills/webnovel-query/` | `webnovel-query` | ✅ |
| `skills/webnovel-learn/` | `webnovel-learn` | ✅ |
| `skills/webnovel-dashboard/` | `webnovel-dashboard` | ✅ |
| `skills/webnovel-doctor/` | `webnovel-doctor` | ✅ |

(Path prefix `webnovel-writer/` omitted.)

### 2.4 Registration name ↔ Plan reference name review (critical)

Plan `docs/architecture/context-minimal-writing-flow-plan-2026-06-05.md` references 4 agents as `webnovel-writer:<agent>` in multiple places, e.g.:

- L181 `必须调用 webnovel-writer:context-agent`
- L195 `... webnovel-writer:reviewer`
- L228 `... webnovel-writer:data-agent`
- L97 `... webnovel-writer:deconstruction-agent`
- L463/L698/L713/L728 `Use the Agent tool to run webnovel-writer:context-agent` etc
- L430 plan's own warning: "plugin scoped agent's real registration name must be reviewed in Phase 0" (this section).

Review conclusion:

- **on-disk agent name = `context-agent` / `data-agent` / `deconstruction-agent` / `reviewer`**,
  exactly matches the part after the colon in the plan, **no wrong names**.
- On prefix: official `agent-development/SKILL.md:281-285` "Namespacing" original text:
  - "Agents are namespaced automatically: Single plugin: `agent-name`; With subdirectories: `plugin:subdir:agent-name`".
  - i.e. official docs write the "single plugin, no subdir" agent identifier as **bare `agent-name`**, reserving the prefixed form for "subdir" scenarios (`plugin:subdir:agent`).
  - Command-side corroboration: `command-development` and `plugin-features-reference.md:30` show plugin components labeled `(plugin:plugin-name)` in `/help`, indicating "plugin:component" is the actual visible qualifier in marketplace scenarios.
  - ⚠️ **Minor risk (naming form, not wrong name)**: official agent-development docs give the "single plugin no subdir" paradigm as bare `agent-name`, and do NOT list `plugin:agent` (no subdir) as canonical. The plan uniformly uses `webnovel-writer:context-agent` — **prefixed, no subdir** — which is reasonable and more explicit (disambiguates when multiple plugins coexist), but official docs **do not write this form as the single-plugin standard paradigm**.
  - Suggestion: when Phase 1 actually wires it, use **runtime test** (can `Agent`/Task tool resolve `webnovel-writer:context-agent` to that agent?) as the source of truth; if bare `context-agent` resolves and prefixed fails, fix the plan to bare name. This audit cannot run the Agent tool inside a subagent to finalize, so mark as "pending runtime verification".

---

## 3. Agent frontmatter Audit (4)

Transcribe frontmatter item by item (line numbers per file; all 4 agents' frontmatter blocks are lines 1-7):

| agent | name | description (excerpt) | model | color | tools |
|-------|------|----------------------|-------|-------|-------|
| context-agent | `context-agent` | pre-writing research, outputs writing brief. | `inherit` | `blue` | `Read, Grep, Bash` |
| data-agent | `data-agent` | extract facts from text, generate commit artifacts. | `inherit` | `green` | `Read, Write, Bash` |
| deconstruction-agent | `deconstruction-agent` | /webnovel-init's reference-book deconstruction subagent... | `inherit` | `purple` | `Read, Grep, Bash` |
| reviewer | `reviewer` | unified review agent. Checks per dimension... | `inherit` | `yellow` | `Read, Grep, Bash` |

Against agent-development rules:

- **Single `.md` file**: ✅ all satisfied.
- **Required fields name/description/model/color**: ✅ all 4 complete.
  - `model: inherit` matches official recommendation (`agent-development/SKILL.md:100,105`).
  - `color` values: `blue/green/purple/yellow`. ⚠️ official `agent-development/SKILL.md:111` lists legal colors as
    `blue, cyan, green, yellow, magenta, red`, **does NOT list `purple`**. `deconstruction-agent`'s
    `color: purple` is outside the official enum (should be `magenta`). Minor spec deviation, no functional/registration impact (color is UI-only).
- **`tools` minimal set**: ✅ all are 3-tool small sets (least privilege, matches `SKILL.md:134`).
- **FLAG: do `tools` contain `Agent` or `AskUserQuestion`?** → ❌ **none do**.
  All 4 agents' tools are only `{Read, Grep/Write, Bash}` combinations, **none** has `Agent`/`AskUserQuestion`/`Task`.
  → Consistent with plan "subagent must not use `Agent`/`AskUserQuestion`", **no violation**.
- **FLAG: missing required frontmatter fields?** → none. All 4 agents complete.
- **FLAG: depends on external `agents/references/*` as hidden manual?** → none. `agents/references/` dir does not exist;
  4 agents' body does not reference `agents/references/...`. (Note: body heavily references `${SCRIPTS_DIR}/webnovel.py` subcommands,
  that's runtime script calls, not "hidden manual files".)
- **`skills:` frontmatter field?** → all 4 agents **have no** `skills:` field (Grep `^(name|skills):` only hits `name:`). i.e. currently no agent preloads Skill content.

---

## 4. Skill frontmatter Audit (8)

Transcribe item by item (`name`/`allowed-tools` line numbers below; all skill `name:` at line 2):

| skill | name | description trigger-type | allowed-tools |
|-------|------|------------------------|---------------|
| webnovel-write | `webnovel-write` | produces publishable chapter, full context→draft→review→polish→commit→backup. | `Read Write Edit Grep Bash Agent AskUserQuestion` |
| webnovel-init | `webnovel-init` | deep-init webnovel project. Staged interactive collection... | `Read Write Edit Grep Bash Agent AskUserQuestion WebSearch WebFetch` |
| webnovel-plan | `webnovel-plan` | generate volume outline, timeline and chapter outlines from master outline... | `Read Write Edit Bash AskUserQuestion` |
| webnovel-review | `webnovel-review` | use review Agent to assess chapter quality... | `Read Grep Write Edit Bash Agent AskUserQuestion` |
| webnovel-query | `webnovel-query` | query project settings, characters, power system, factions, foreshadowing... | `Read Grep Bash` |
| webnovel-learn | `webnovel-learn` | extract successful patterns from current session into project_memory.json | `Read Bash` |
| webnovel-dashboard | `webnovel-dashboard` | launch read-only novel management dashboard... | `Bash Read` |
| webnovel-doctor | `webnovel-doctor` | This skill should be used when the user asks to "/webnovel-doctor", "check project environment"... | `Read Bash` |

Against skill-development rules:

- **Dir + SKILL.md structure**: ✅ all 8 dirs contain `SKILL.md` (each `test -f` passed).
- **frontmatter has `name` + trigger-type `description`**: ✅ all have `name` + `description`.
  - Official only mandates `name` + `description` (`skill-development/SKILL.md:33-34`).
  - Trigger phrasing: 7 use Chinese action/scenario trigger phrases (plan preference), `webnovel-doctor` uses English official paradigm
    "This skill should be used when..." with Chinese trigger words embedded — both satisfy "specific trigger" requirement.
  - `webnovel-doctor` also has `version: 0.1.0` (extra field, harmless).
- **`allowed-tools` exists and its value**: ✅ **all 8 skills declare `allowed-tools`** (values above).
  - 4 orchestration skills (write/init/plan/review) `allowed-tools` include **`Agent`** (write/init/review)
    and **`AskUserQuestion`** (write/init/plan/review) — this is the **top-level skill / command layer** used to "pre-approve"
    dispatching subagents and asking the user, **not** subagent `tools`. Consistent with plan role division (orchestration in skill layer, execution in agent layer).
  - Read-only skills (query/learn/dashboard/doctor) `allowed-tools` converge to `Read/Bash(/Grep)`, no `Agent`/`AskUserQuestion`.

> Note: official `skill-development/SKILL.md` **never mentions** `allowed-tools` field name (only mandates `name`+`description`).
> Therefore "allowed-tools is pre-approval not restriction" semantics **cannot be directly proven from local official skill docs**, see §5.

---

## 5. Plan-dependent Official Tool Behavior Conclusions (runtime baseline)

Cross-check sources (actual paths used):
**`C:/Users/lcy/.claude/plugins/marketplaces/claude-plugins-official/plugins/plugin-dev/skills/`**
(primary path exists; fallback `.tmp/plugin-dev-official/...` **does not exist**, not used).
Three skills checked: `agent-development/`, `skill-development/`, `plugin-structure/` (incl `references/`, `examples/`).

Per-conclusion and local provability:

| # | Plan-dependent conclusion | Provable from local official docs? | Evidence / note |
|---|---------------------------|---------------------|-----------------|
| (a) | **subagent cannot spawn another subagent** | ❌ not found | Grep `spawn / another (sub)?agent / nested / recursi` in plugin-dev tree only hits MCP process "spawn", **no subagent nesting ban clause**. → **"plan asserts, local unproven"**. (Compatible corroboration: `command-development/SKILL.md:720` "Claude uses **Task tool** to launch agent" — launching agent is upper/command-layer action; official gives no example of subagent itself calling Task again, but "no example" ≠ "explicit ban".) |
| (b) | **`Agent` / `AskUserQuestion` not as subagent `tools`** | ⚠️ partial (indirect) | Official agent `tools` docs (`agent-development/SKILL.md:122-140`) "common tool set" are all `Read/Write/Grep/Glob/Bash`, **never** lists `Agent`/`AskUserQuestion` in agent `tools`. `AskUserQuestion` appears only in **command/skill layer** `allowed-tools` (`plugin-dev/commands/create-plugin.md:12`, `plugin-settings/examples/create-settings-command.md:3`), not in any agent frontmatter. → Official **convention supports** this conclusion, but **no explicit "ban" clause**. Marked "official convention supports, no explicit ban". Our 4 agents实测 also none has `Agent`/`AskUserQuestion` (§3). |
| (c) | **`tools` / `disallowedTools` control subagent tool boundary** | ⚠️ half | `tools` controls boundary: ✅ explicit — `agent-development/SKILL.md:124` "Restrict agent to specific tools", `:132` "If omitted, agent has access to all tools", `:134` least-privilege. `disallowedTools`: ❌ Grep in plugin-dev tree **no hits**. → `tools` part "locally proven"; `disallowedTools` part "plan asserts, local unproven". |
| (d) | **agent `skills:` frontmatter preloads entire Skill content into subagent** | ❌ not found | Official agent frontmatter docs only list `name/description/model/color/tools` (`SKILL.md:122` region + `:340-342` table), **no `skills:` field** explanation; tree Grep `skills:` (agent context) no hits. → **"plan asserts, local unproven"**. Current repo also no agent uses this field (§3), so even if true it's "future-only" capability. |
| (e) | **Skill `allowed-tools` is pre-approval not restriction** | ❌ not found | `skill-development/SKILL.md` **no** `allowed-tools` anywhere; official only uses `allowed-tools` in **command** frontmatter (`command-development` / `plugin-settings` examples). Its "pre-approval/non-restriction" semantics has **no direct definition** in local official docs. → **"plan asserts, local unproven"**. (Note: empirically skill/command `allowed-tools` behavior is indeed pre-approval, but this audit per requirement does not fabricate citations from memory, judges only by local docs as "unproven".) |

Supplemental proven registration/dispatch facts (support plan wiring):

- Auto-discovery: agents scan `agents/*.md`, skills scan `skills/*/SKILL.md` (`plugin-structure/SKILL.md:11,28-32`; `skill-development/SKILL.md:271-273`). ✅
- Agent namespace: single plugin bare `agent-name`, with subdir `plugin:subdir:agent-name` (`agent-development/SKILL.md:283-285`). ✅
- Upper layer uses **Task tool** to launch agent (`command-development/SKILL.md:720`). ✅

---

## 6. Conclusion / Risk List

### Consistent with plan assumptions (no blocker)

1. 4 agents' on-disk names (`context-agent` / `data-agent` / `deconstruction-agent` / `reviewer`) exactly match the part after colon in plan's `webnovel-writer:<agent>` references — no wrong names, no missing.
2. 8 skill dir names match their `name:`; structure compliant (dir + SKILL.md, name + trigger-type description).
3. **No agent's `tools` contains `Agent` / `AskUserQuestion` / `Task`** → plan's "subagent holds no dispatch tools" red line is **naturally satisfied** in current state, no fix needed first.
4. No agent missing required frontmatter fields; no agent depends on `agents/references/*` hidden manual (dir doesn't exist).
5. No agent uses `skills:` preload field (so (d) even if true won't conflict with current state).
6. All 8 skills explicitly declare `allowed-tools`, and orchestration/read-only split matches plan role division.

### Risks that could shake plan assumptions (need follow-up / runtime test)

- **R1 (naming form, pending runtime verification)**: official agent-development docs write "single plugin no subdir" agent's canonical identifier as **bare `agent-name`**, not `plugin:agent` (no subdir) as standard paradigm. Plan uniformly uses `webnovel-writer:context-agent` prefixed form. **Name itself is correct**, but whether the prefixed form can be resolved by Agent/Task tools needs **Phase 1 runtime test**; if only bare name resolves, revert plan to bare name. This audit (inside subagent) cannot run Agent tool to finalize.
- **R2 (tool behavior, local unproven — see §5)**: plan depends on (a) subagent cannot open another subagent, (d) agent `skills:` preloads entire Skill, (e) skill `allowed-tools` is pre-approval — these three **have no source** in local official plugin-dev docs; (c)'s `disallowedTools`, (b)'s "explicit ban" also **no source**. These should be treated as **"plan asserts, local unproven"**: designing per plan is fine, but any key change "using `skills:` preload to replace large reference text" or "relying on subagent chain dispatch" must be **runtime-tested with small samples** during implementation, not solely based on official docs.
- **R3 (minor spec deviation, no blocker)**: `deconstruction-agent`'s `color: purple` is outside official legal color enum (`blue/cyan/green/yellow/magenta/red`). UI-only, no functional impact; if strict compliance needed, change to `magenta`. This audit is read-only, no modification.

### One-line overview

Registration names and frontmatter status **highly consistent with plan, no wrong names, no `Agent`/`AskUserQuestion` violations**; the only things to nail during implementation are **R1's `webnovel-writer:<agent>` prefix-form runtime test** and **R2's few "locally unproven" tool behaviors backed by runtime tests**.