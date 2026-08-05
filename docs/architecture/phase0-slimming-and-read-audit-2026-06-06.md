# Phase 0 Audit: Slimming and Read-Method Checklist (2026-06-06)

> Read-only audit + field testing. This file only "records traceable conclusions" and does not modify any skill / agent / reference / test files.
> Purpose: turn the four pruning criteria (§4 of Plan), the §4.2 responsibility table, and §6.2 read-method into an executable checklist for each slimming Phase.
> We do not repeat the Plan, only give "file → read-method / ownership / task" actionable rows.

Working dir (git repo root = worktree): `D:/wk/novel skill/webnovel-writer/.worktrees/context-minimal-flow`
Plugin dir (nested): `webnovel-writer/` subdir under repo root. Paths below are relative to plugin dir.
Line counts are measured (`wc -l`, 2026-06-06, local Bash), not copied from Plan.

## Usage

- **Section A** covers Plan §6.2.1 reference-loading-map "directly Read md" entries; assigns read-method per row; Phase 4 (Tasks #13/#14) changes reads and cleans dead files per this.
- **Section B** covers 8 Skills + 4 Agents; gives keep/compress per §4.2; Phase 1-5 (Tasks #5-#16) slim per this.
- Read-method four classes (criterion 4 + §6.2.2): **full read** / **section read** / **search read** (CSV,单列于 A.3) / **no read** (cleanup candidate).
- Section-read anchors are the **real heading text in the file** (verified via `Grep ^#{1,4} `). Plan used abbreviations (removed 、, shortened titles) that do NOT match exactly; must match real anchors or `Grep ^## 一 ` misses `## 一、`. See A.4.

---

## Section A — Read-Method Audit (per "directly Read md")

Lines = measured. "Task": target large files section-read = #13; dead-file cleanup = #14; others "on-demand / full" follow their consuming Skill's slim Task (Section B); read-method itself no separate Task, but Phase 4 registers loading-map together (#13).

### A.1 Seven target large files (section read → Task #13)

`always` / high-frequency large md, the resident cost every init/plan/write run eats. Anchors verified existing via Grep.

| File | Measured lines | Read method | Section: real stable heading anchor (original) | Task |
|---|---|---|---|---|
| `references/genre-profiles.md` | 696 | section | current genre's single `### 2.x` (`### 2.1`…`### 2.13`, ~44 lines each); add `## 一、Profile 字段说明` on demand. One book uses 1 genre → saves ~90% | #13 |
| `skills/webnovel-init/references/creativity/selling-points.md` | 687 | section | `## 9. 核心卖点定位模板` (skeleton); add `### 1.3 核心卖点黄金公式`, `## 7. 实战检查清单` on demand | #13 |
| `references/reading-power-taxonomy.md` | 361 | section | on demand `## 一、钩子类型` / `## 二、爽点模式` / `## 三、即时满足/微兑现` | #13 |
| `skills/webnovel-plan/references/outlining/chapter-planning.md` | 322 | section | `## 10. 结构化节点规范（CBN/CPNs/CEN）` (L299 to EOF); add `## 7. 章节规划模板` for template | #13 |
| `skills/webnovel-init/references/creativity/creativity-constraints.md` | 327 | section | show score `### 8.1 五维评分` (L262, ~10 lines); creative collection `## 一、创意包 Schema`, `## 六、硬约束驱动创意`, `## 八、评分系统` | #13 |
| `skills/webnovel-write/references/polish-guide.md` | 351 | section | main `## 2. 执行顺序（必须按序）`; Anti-AI vocab separate `## 98:Phase 1 增补：Anti-AI 规范` (also `## 2A. Anti-AI 检测细则`). **Cannot be itemized into CSV (csv/README hard boundary)** | #13 |
| `references/shared/cool-points-guide.md` | 313 | section | needed cool-point dimension section; genre-fit `## 九、题材适配` (L194) per genre | #13 |

> Section-read technique: first `Grep` content matching `^#{1,4} ` to get anchor line, then `Read` offset/limit. Both Claude Code built-in, platform-independent.

### A.2 Other "directly Read md" (full / section / no read)

Criterion: ≤ ~150 lines and need whole understanding → full read; clearly large and only take one section, and Plan marked "on-demand / need X" → section read; currently not directly called → no read.

| File | Measured lines | Read method | Section anchor (if section) | Task |
|---|---|---|---|---|
| **webnovel-init** | | | | |
| `skills/webnovel-init/references/system-data-flow.md` | 43 | full | — | #10 |
| `skills/webnovel-init/references/genre-tropes.md` | 183 | section | current genre section (trope library, per genre) | #10 |
| `skills/webnovel-init/references/worldbuilding/world-rules.md` | 86 | full | — | #10 |
| `skills/webnovel-init/references/worldbuilding/faction-systems.md` | 179 | section (on-demand) | always triggered but long; take subsection per current worldview | #10 |
| `skills/webnovel-init/references/worldbuilding/power-systems.md` | 160 | section (on-demand) | only "power system" items trigger; take subsection | #10 |
| `skills/webnovel-init/references/worldbuilding/character-design.md` | 111 | full | — | #10 |
| `skills/webnovel-init/references/worldbuilding/setting-consistency.md` | 215 | section | always triggered but long; take consistency-check subsection | #10 |
| `skills/webnovel-init/references/creativity/creative-combination.md` | 510 | section | **not 7 targets but 510 lines**: only "need creative combo" triggers, take subsection per current mix axis, forbid full | #10 |
| `skills/webnovel-init/references/creativity/inspiration-collection.md` | 298 | section | only Step1.5 inspiration-ask triggers; take needed collection subsection | #10 |
| `skills/webnovel-init/references/creativity/anti-trope-game.md` | 170 | section (on-demand) | only game genre + "need anti-trope" triggers | #10 |
| `skills/webnovel-init/references/creativity/anti-trope-rules-mystery.md` | 214 | section (on-demand) | only rules-mystery genre triggers | #10 |
| `skills/webnovel-init/references/creativity/anti-trope-urban.md` | 169 | section (on-demand) | only urban genre triggers | #10 |
| `skills/webnovel-init/references/creativity/anti-trope-xianxia.md` | 159 | section (on-demand) | only xianxia genre triggers | #10 |
| **webnovel-plan** | | | | |
| `templates/output/大纲-卷节拍表.md` | 38 | full | — template, apply whole | #11 |
| `templates/output/大纲-卷时间线.md` | 51 | full | — template, apply whole | #11 |
| `references/shared/strand-weave-pattern.md` | 111 | full | — Plan §6.2.2 short file keep full | #11 |
| `references/outlining/plot-signal-vs-spoiler.md` | 53 | full | — | #11 |
| `skills/webnovel-plan/references/outlining/conflict-design.md` | 277 | section | only "need conflict" triggers; take conflict-type subsection | #11 |
| `skills/webnovel-plan/references/outlining/genre-volume-pacing.md` | 84 | full | — short, volume pacing whole | #11 |
| **webnovel-write** | | | | |
| `skills/webnovel-write/references/writing/typesetting.md` | 60 | full | — Step4 always, short | #5 |
| `skills/webnovel-write/references/style-adapter.md` | 71 | full | — Step4 always, short | #5 |
| **webnovel-review** | | | | |
| `references/shared/core-constraints.md` | 111 | full | — always hard rule, whole | #8/#12 |
| `references/review-schema.md` | 59 | full | — schema, whole | #8/#12 |
| `references/review/blocking-override-guidelines.md` | 47 | full | — on-demand, short | #12 |
| **webnovel-query** | | | | |
| `skills/webnovel-query/references/system-data-flow.md` | 343 | section | long, take data-source-priority subsection per query type | #15 |
| `skills/webnovel-query/references/advanced/foreshadowing.md` | 120 | full | — on-demand, foreshadowing query whole | #15 |
| `skills/webnovel-query/references/tag-specification.md` | 154 | full (boundary) | — 154 lines, tag spec whole; if proven only single section used, downgrade to section | #15 |

> `cool-points-guide.md`(313), `strand-weave-pattern.md`(111) both directly Read by plan/review: former in A.1 target section-read; latter full read, shared across Skills same conclusion.

### A.3 Search read (CSV-backed, not in "directly Read md" list, separate)

Plan §6.2.1 CSV line "already done right, not redone this round". Only register here, **no change**; Phase 4 keeps as-is when registering loading-map.

| Data source | Read method | Call | Note |
|---|---|---|---|
| `references/csv/场景写法.csv` | search | `reference_search.py --table 场景写法 --query ... --genre ...` | write Step2 combat/confrontation/bridge; succeeds retired combat-scenes etc md |
| `references/csv/写作技法.csv` | search | `reference_search.py --table 写作技法 --query ...` | write Step2 dialogue/emotion; succeeds dialogue-writing / emotion-psychology |
| `references/csv/题材与调性推理.csv`, `裁决规则.csv` etc 8 tables | search (indirect) | `story-system` internal `_route()` / `_collect_tables()` / `_load_reasoning()` | init/write consume via story-system indirectly, on-demand |

> Existing CSV: `裁决规则 / 场景写法 / 金手指与设定 / 命名规则 / 桥段套路 / 人设与关系 / 爽点与节奏 / 题材与调性推理 / 写作技法` (9 tables) + `genre-canonical.md` + `README.md`.

### A.4 No read (Phase 4 cleanup candidate → Task #14)

loading-map "currently not directly called" + Plan §6.2.3 named writing/* migration candidates. ~1402 lines dead content (measured). Disposal: first verify CSV coverage, if covered delete or leave empty shell pointing to CSV, if not covered first fill CSV then dispose.

| File | Measured lines | Status / CSV successor | Task |
|---|---|---|---|
| `skills/webnovel-write/references/writing/combat-scenes.md` | 229 | combat trigger succeeded by `场景写法.csv`, not directly Read | #14 |
| `skills/webnovel-write/references/writing/dialogue-writing.md` | 231 | dialogue trigger succeeded by `写作技法.csv` | #14 |
| `skills/webnovel-write/references/writing/emotion-psychology.md` | 265 | emotion trigger succeeded by `写作技法.csv` | #14 |
| `skills/webnovel-write/references/writing/scene-description.md` | 263 | Plan §6.2.3 named; not in direct Read list, verify `场景写法.csv` coverage then dispose | #14 |
| `skills/webnovel-write/references/writing/desire-description.md` | 311 | same; verify CSV coverage then dispose | #14 |
| `skills/webnovel-write/references/writing/genre-hook-payoff-library.md` | 85 | Plan §6.2.3 named; not in direct Read list, verify CSV coverage then dispose | #14 |
| `skills/webnovel-write/references/style-variants.md` | 38 | not directly called | #14 |
| `skills/webnovel-review/references/common-mistakes.md` | 96 | not directly called | #14 |
| `skills/webnovel-review/references/pacing-control.md` | 129 | not directly called | #14 |

> `scene-description.md`(263), `desire-description.md`(311), `genre-hook-payoff-library.md`(85) exist and currently not directly Read, included in cleanup per Plan.
> Other existing references with no explicit disposal this round (not directly Read, Plan not named): `skills/webnovel-write/references/anti-ai-guide.md`(74, content merged into polish-guide §98/§2A, suggest #14 verify if dead), `skills/webnovel-init/references/init-collection-schema.md`(74, Plan §6.2.4 specifies init section-read true source, **keep**), `skills/webnovel-init/references/creativity/market-positioning.md`(424, not registered direct Read, suggest #14 verify), `references/shared/naming-and-voice-gaps.md`(63), `skills/webnovel-plan/references/outlining/outline-structure.md`, `plot-frameworks.md` (not registered direct Read, suggest #13/#14 verify consumer).

### A.5 Anchor verification and FLAG

All 7 target anchors verified existing via Grep `^#{1,4} `. Note "Plan abbreviation vs real title" differences (not missing, matching口径, must use right column for section read):

| File | Plan text | Real title (section read must match this) |
|---|---|---|
| genre-profiles | "一、字段说明" | `## 一、Profile 字段说明` |
| reading-power-taxonomy | "## 一 钩子类型 / ## 二 爽点模式 / ## 三 微兑现" | `## 一、钩子类型` / `## 二、爽点模式` / `## 三、即时满足/微兑现` |
| selling-points | "### 1.3" "## 7" "## 9" | `### 1.3 核心卖点黄金公式` / `## 7. 实战检查清单` / `## 9. 核心卖点定位模板` |
| chapter-planning | "## 10 …" "## 7" | `## 10. 结构化节点规范（CBN/CPNs/CEN）` / `## 7. 章节规划模板` |
| creativity-constraints | "### 8.1" "一 Schema / 六 硬约束 / 八 评分" | `### 8.1 五维评分` / `## 一、创意包 Schema (Idea Package)` / `## 六、硬约束驱动创意 (Hard Constraints)` / `## 八、评分系统 (Scoring System)` |
| polish-guide | "## 2 执行顺序" "Anti-AI 词库段" | `## 2. 执行顺序（必须按序）` / `## 98:Phase 1 增补：Anti-AI 规范` (also `## 2A. Anti-AI 检测细则`) |
| cool-points-guide | "## 九 题材适配" | `## 九、题材适配` |

**FLAG: no missing anchors.** Only note: Plan anchors removed Chinese ordinal dot "、" and shortened titles; literal `Grep` would miss-match — Phase 4 section-read and loading-map registration must use right column real titles.

---

## Section B — Per-component ownership (8 Skills + 4 Agents)

Per §4.2 responsibility table. "Layer" marks main agent contract shape (Skill) / subagent (Agent) / runtime boundary. One sentence per cell, cross-reference Plan, no repeat.

| Component | Layer | Keep (one sentence) | Main compress/sink (one sentence) | Task |
|---|---|---|---|---|
| `skills/webnovel-write/SKILL.md`(202) | Skill: main agent contract | three modes + prep chain + three Agent call contracts + three gates/commit/postcommit/backup (§3.4, §8.2), new pre-commit read-only `git diff` (§5.2 B) | context/reviewer/data internal tutorials, data payload schema, long polish tutorial sink to Agent/reference (§8.3) | #5 |
| `agents/context-agent.md`(181) | subagent | five-part writing brief + `memory-contract load-context` + on-demand query + `.story-system` priority + blocker (§9.1) | long examples, over-detailed inference, term explanation delete (§9.1) | #6 |
| `agents/data-agent.md`(120) | subagent (with full artifact schema true source) | three artifacts top/child min fields + forbid write state/projection (§9.2, §4.3); `tools` includes `Write` | each event_type long payload explanation, long JSON example, old field name explanation compress (§9.2) | #7 |
| `agents/reviewer.md`(135) | subagent | five-dim `dimension_results`(write even pass) + evidence/fix_hint + strict JSON, no score (§9.3); no `Write`, return JSON only | delete "chain-of-thought/ReAct" meta-narrative, delete too-long review tutorial (§9.3, §12.2 loosen section-number test) | #8 |
| `agents/deconstruction-agent.md`(296) | subagent | quick/deep/auto route + no file write + no canon + `init_reference_research`/quality/anti-contamination (§9.4, §3.2) | long quality-gate table, super-long schema, deep-stage long explanation compress (§9.4) | #9 |
| `skills/webnovel-init/SKILL.md`(402) | Skill: main agent contract | §3.2 full chain: Step1.5 inspiration ask, deconstruction call boundary, no canon before confirm, root sanitization, idea_bank, patch 总纲, post-init MASTER, verify rollback (§10.1) | collection fields → `init-collection-schema.md` section read, genre list converge, CLI long table shrink, creative/anti-trope/worldview on-demand read (§10.1, §6.2.4) | #10 |
| `skills/webnovel-plan/SKILL.md`(394) | Skill: main agent contract | §3.3 full chain: placeholder-scan, cross-volume state, setting baseline, beat/timeline/volume-outline/batch-chapter outlines, setting writeback, outline writeback JSON, master-outline-sync, update-state, real CHAPTER_GOAL refresh contract (§10.2) | CBN/CPN/CEN details → `chapter-planning.md` §10 section read, long reference table change to stage-triggered, node examples sink (§10.2, §6.2.4) | #11 |
| `skills/webnovel-review/SKILL.md`(170) | Skill: main agent contract | §3.5 full chain: missing contract补 story-system, reviewer call, `review-pipeline --save-metrics`, `update-state --add-review`, blocking user adjudication (§10.3) | reviewer review method / evidence query process not expanded in Skill (§10.3) | #12 |
| `skills/webnovel-query/SKILL.md`(109) | Skill: main agent contract (read-only) | read-only + root protection + data-source priority (`.story-system`→accepted commit→memory-contract→projection) + degradation note (§11.1, §3.6) | default full `load-context` change to narrowest tool per query type (entity-state/relationships/query-rules/open-loop) (§11.1) | #15 |
| `skills/webnovel-learn/SKILL.md`(82) | Skill: main agent contract | root protection + read current chapter num + `project-memory add-pattern` + no hand-write JSON (§11.2) | already minimal, basically nothing to compress; keep (§11.2) | #16 |
| `skills/webnovel-dashboard/SKILL.md`(101) | Skill: main agent contract (read-only) | read-only boundary + `story-runtime/health` + root resolve + dist verify (§11.3) | don't default install deps (prompt command if missing), lightweight pre-start check (§11.3) | #16 |
| `skills/webnovel-doctor/SKILL.md`(70) | Skill: main agent contract (read-only) | `project-status` first + `doctor` stage-aware + no fix/no install/no dashboard (§11.4, §3.6) | frontmatter description change to concise Chinese trigger-type (§11.4) | #16 |

> Runtime layer (`webnovel.py` commands, artifact_validator, write-gate, chapter-commit, projection) holds schema/gate/commit/projection/backup/state advance, not in this round's prompt slim scope; each Skill/Agent only keeps "call shape", validation to runtime (§4.2, §4.5 write-ownership matrix).
> Agent single-file constraint (§4.3): 4 Agents all `agents/*.md` single file, no new `agents/references/*`; their artifact schema as single-file true source (data-agent especially critical).

---

## Size summary (measured)

- 8 Skills total **1530 lines** (write 202 / init 402 / plan 394 / review 170 / query 109 / learn 82 / dashboard 101 / doctor 70); init, plan largest, are §10 main battlefield.
- 4 Agents total **732 lines** (context 181 / data 120 / reviewer 135 / deconstruction 296); deconstruction largest.
- 7 target references total **3057 lines** (after section-read single book resident drops sharply, genre-profiles single genre saves ~90%).
- No-read cleanup candidates total **~1402 lines** (A.4 nine core candidates, dispose after verifying CSV coverage).
- Read-method distribution: target section-read 7; A.2 section-read 11; full-read 15 (incl templates/schema/hard-rules/short files); search-read CSV 3 classes (no change); no-read 9 (+ suggest verify several).
