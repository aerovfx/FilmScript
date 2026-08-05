# Writing-Flow Context-Reduction Refactor Plan

> Date: 2026-06-05
> Status: draft v3
> Scope: refactor prompts and read methods of `skills/`, `agents/`, `references/` to reduce main agent's unnecessary context and token cost
> Core principle: first keep end-to-end flow, then compress prompts; Skill only writes dispatch contract, Agent brings professional flow, Runtime does hard validation
> Cut guideline: all keep/sink/delete decisions derived from §4's four pruning criteria (responsibility, token, noise, read-method), not line-by-line checklist
> v3 changes: ① new §4 pruning criteria; ② §5 undeletable list converges to cross-layer red lines; ③ §6 includes references and read-method optimization (baseline: reference-loading-map); ④ §12 acceptance from text-level assertions to behavior/contract-level; ⑤ host fixed as Claude Code, tool capabilities per official docs + local Claude Code version + plugin registration names
> Tool baseline: this plan host fixed as Claude Code; default use Claude Code built-in tools involved this round (`Read` offset/limit, `Grep`, `Glob`, `Agent`, `Skill`, `AskUserQuestion`, `Write`, `Edit`, `WebSearch`, `WebFetch`) and cross-platform Bash; PowerShell not recommended; subagent/Skill behavior per official docs, then recheck this plugin's registration names

---

## 0. How to read this version

This plan is not to compress all files into some fixed format, nor to keep existing tests green.

What this round really does:

1. First confirm init / plan / write / review / query / learn / dashboard / doctor complete business chain (§3).
2. Converge cross-layer business red lines into behavior assertions (§5, §12).
3. Slim Skill, Agent, references per §4's four pruning criteria, and assign read-method to each read action (§4, §6).
4. Accept via runtime, prompt integrity, behavior eval, package validator; acceptance target is behavior and contract, not prompt copy (§12).

Two positions must run through:

- **Tests are probes, not constraints.** Slimming will turn a batch of text-level assertions (`assert "string" in text`) red; those assertions themselves are noise to clear. If they protect a real red line, rewrite as behavior-level assertion and migrate to producer, not keep nonsense to pass tests.
- **Cannot delete §3's end-to-end flow.** Any formatting, slimming, sinking reference, schema compression, read-method change must not delete §3's business steps. §3 is red-line source, §4 is pruning basis, no conflict.
- **Tool capability per Claude Code, not fabricated nor over-defended.** This plan's execution host fixed as Claude Code; don't replace Claude Code official definition with temporary chat shell, other agent env, or memory's old tool names. Design reads and dispatch using Claude Code built-in tools (`Read` offset/limit, `Grep`, `Glob`, `Agent`, `Skill`, `AskUserQuestion`, `Write`, `Edit`) and Bash by default; don't hardcode dependency on whether host installed `sed`/`jq`. PowerShell not default execution to avoid Windows-only compat issues; only use when explicitly Windows-only fallback, record compat risk. Subagent/Skill known behavior per official docs; recheck this plugin's real registration names, frontmatter match local plugin-dev, whether repo enabled relevant tools.

---

## 1. Background

Current Webnovel Writer is no longer a single-prompt Skill, but a writing plugin with runtime main chain:

- `project-status` judges project short status.
- `doctor` does stage-aware health check.
- `placeholder-scan` catches placeholders and unfilled content.
- `story-system` generates `.story-system/` pre-write contract tree.
- `write-gate` does batch validation at pre-write, pre-commit, post-commit.
- `context-agent` responsible for pre-write context assembly.
- `reviewer` responsible for structured review.
- `review-pipeline` generates report, metrics, persists.
- `data-agent` responsible for extracting commit artifacts.
- `chapter-commit` responsible for post-write fact commit and projection.
- `projections retry` responsible for failed projection re-run.
- `backup` responsible for per-book-project-root backup.

Problem is not missing context, but:

1. Main agent knows too much subagent internal flow.
2. Skill text mixes dispatch, tutorial, schema, examples, failure rules.
3. Some info should be fetched on-demand by tools, but stuffed into main context early.
4. Same context repeated across Skill, Agent, runtime.
5. Long schema and long examples occupy tokens, but execution only needs input, output, acceptance.

This round refactors writing flow from "main agent carries full tutorial" to "main agent dispatches, subagent executes professionally, runtime accepts".

---

## 2. One-line goal

> Main agent passes task not tutorial; subagent brings own tutorial; runtime accepts; flow completeness backed by assertion table.

---

## 3. End-to-End Flow Baseline

This section is the refactor's business baseline. Any later compression must first compare against this section.

### 3.1 Global invariants

All Skill / Agent rewrites must preserve these rules:

- Existing project-type Skills must first resolve real book-project root, not write project files in plugin dir.
- `/webnovel-init` before new project generated cannot use `where` to resolve workspace into old project; must use book-name sanitization to get target dir.
- `.story-system/` is pre-write contract and post-commit main-chain fact source.
- `.webnovel/state.json` is compatible projection / read model, not re-become post-write fact source.
- When calling `story-system`, chapter-level query must come from real chapter goal in detailed outline, forbid passing `{chapter-outline-goal}`, `chapter N outline goal` placeholder text.
- When specific chapter writing / review / contract refresh, must generate or confirm `.story-system/MASTER_SETTING.json`, `.story-system/volumes/`, `.story-system/chapters/`, `.story-system/reviews/`.
- Write-chapter main chain must keep `write-gate --stage prewrite`, `precommit`, `postcommit` three gates.
- Must use `Agent` tool to explicitly call subagent, not let main flow verbally replace `context-agent`, `reviewer`, `data-agent`, `deconstruction-agent` products.
- On failure only re-run failed step, not full rollback.
- Content deterministically validated by runtime: prompt only keeps minimal explanation and blocking boundary.
- Reference only read on-demand; don't add references with no real reuse value just for "nice structure".
- Each file product must have unique writer; prompt must clarify "who writes, who only returns, who only validates". Forbid same product written by both main flow and subagent/runtime, also forbid all only verbally produce with nobody persisting.
- Each chapter before `chapter-commit` must do one `git diff` change-surface validation in project root, confirming visible text / file-path changes only appear in current chapter and files this chapter flow should produce; it's write-ownership sanity check, not replacing `write-gate precommit`, nor proving SQLite / `.webnovel/` internal semantics correct.

### 3.2 `/webnovel-init` full flow

init is not pure collector. Slimming must keep full generation chain:

1. Confirm `CLAUDE_PLUGIN_ROOT` and `${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py` available.
2. Before init don't use `where` to resolve old project.
3. Load minimal references: data-flow spec, genre trope library, genre profile; other references on-demand.
4. Before story-core collection, ask inspiration source; reference deconstruction is optional, not default.
5. When user provides reference text path or excerpt, must call `webnovel-writer:deconstruction-agent`, not let init main flow verbally replace.
6. `deconstruction-agent` only returns `init_reference_research`, writes no files, creates no `.story-system`, `.webnovel`, `设定集`, `大纲`, `正文` or canon/read model.
7. Deconstruction result only consumes transferable patterns and differentiation requirements; `quality.passed=false`, `confidence < 0.85` or warnings present, cannot fold into creative-constraint package, only show risk and let user confirm.
8. Step 2-6 only use user-confirmed, already-deformed-to-this-book differentiation expressions.
9. Collect story core, characters, golden finger, worldview, power rules, creative-constraint package.
10. Output init summary draft and wait user explicit confirm.
11. Use book-name sanitization to generate `PROJECT_SLUG` and `PROJECT_ROOT`, show `WORKSPACE_ROOT`, `PROJECT_SLUG`, `PROJECT_ROOT`, confirm then write files.
12. Run `webnovel.py init`.
13. Write `.webnovel/idea_bank.json`, only final-confirmed creative constraints.
14. Patch `大纲/总纲.md`, fill story one-liner, core main/暗线, creative constraints, antagonist layers, cool-point milestones.
15. After init immediately generate MASTER contract:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" \
  story-system "${GENRE}" --genre "${GENRE}" --persist --format json
```

Here don't pass `--chapter`, only generate `MASTER_SETTING.json` and `anti_patterns.json`.

16. Verify `state.json`, core setting set, `大纲/总纲.md`, `idea_bank.json`, `.story-system/MASTER_SETTING.json`.
17. Failure recovery only fills missing fields, re-runs minimal step, not full re-ask.

### 3.3 `/webnovel-plan` full flow

plan is not only generating chapter outlines. Slimming must keep bridge from planning to writing contract:

1. Resolve real project root, run `placeholder-scan`.
2. Read `.webnovel/state.json` init-config snapshot to get genre; later writing true source still `.story-system/`.
3. Read `大纲/总纲.md`, confirm volume name, chapter range, core conflict, volume-end climax, insufficient then block.
4. Cross-volume planning reads recent summary, core character state, core relations, active foreshadowing.
5. Fill setting baseline: worldview, power system, protagonist card, antagonist design; conflict found then block.
6. Select target volume and confirm range.
7. Generate volume beat table, must have mid reversal or clear no-reversal reason, crisis chain at least 3 escalating.
8. Generate volume timeline table, must clarify time system, time span, countdown events.
9. Generate volume outline skeleton, incl volume summary, character and antagonist layers, Strand, cool points, foreshadowing, constraint triggers.
10. Batch generate chapter outlines, default `10 chapters/batch`, complex genre down to `8 chapters/batch`, not over `12 chapters/batch`.
11. Each chapter must include goal, resistance, cost, time anchor, in-chapter span, time diff from prev chapter, countdown, cool point, Strand, antagonist layer, viewpoint / protagonist, key entities, this-chapter change, chapter-end open questions, hook.
12. Structured nodes must keep: `CBN`, `CPNs`, `CEN`, `must-cover nodes`, `this-chapter forbidden zone`.
13. New settings only incrementally write back existing setting set.
14. Verify beat table, timeline, detailed outline, time fields, countdown, BLOCKER, node continuity.
15. Generate explicit structured writeback file `大纲/第{volume_id}卷-总纲写回.json`.
16. Call `master-outline-sync`, only update V+1 volume anchors and explicit foreshadowing / open loop, not infer from free text.
17. Call `update-state -- --volume-planned ... --chapters-range ...`.
18. When this planning landed on specific chapters, must refresh Story System runtime contract with real chapter outline goal:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" \
  story-system "${CHAPTER_GOAL}" --genre "${GENRE}" --chapter {chapter_num} \
  --persist --emit-runtime-contracts --format both
```

Before entering write-chapter don't keep current-chapter related entities' `[待...]`, `temp name`, `{placeholder}`.

### 3.4 `/webnovel-write` full flow

write is this round's most important acceptance target. Slimming must keep:

#### Prep

1. Set `WORKSPACE_ROOT`, `SCRIPTS_DIR`, `SKILL_ROOT`.
2. Run `preflight`.
3. Use `where` to resolve real `PROJECT_ROOT`.
4. Run `placeholder-scan`.
5. Parse real `CHAPTER_GOAL` from detailed outline.
6. Read genre from `.webnovel/state.json` init-config snapshot.
7. Refresh chapter-level Story System runtime contract:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" \
  story-system "${CHAPTER_GOAL}" --genre "${GENRE}" --chapter {chapter_num} \
  --persist --emit-runtime-contracts --format both
```

8. Run prewrite gate:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" \
  write-gate --chapter {chapter_num} --stage prewrite --format json
```

prewrite essentials: `MASTER_SETTING.json`, `volume_{NNN}.json`, `chapter_{NNN}.json`, `chapter_{NNN}.review.json`.

#### Step 1: Writing task brief

Must call `webnovel-writer:context-agent`.

Input only necessary params: chapter number, project root, script dir, storage path / state compatible read path, output requirement.

Output must be a five-part writing brief independently supporting drafting. Insufficient context returns blocker, don't let main flow self-fill.

#### Step 2: Draft text

Only draft per task brief. Don't reload long core constraints or anti-AI guide.

With structured nodes, expand around `CBN -> CPNs -> CEN`. Text must have no placeholders.

#### Step 3: Review

Default and `--fast` must call `webnovel-writer:reviewer`, `--minimal` can skip.

Default write ownership: reviewer only returns strict JSON; main flow responsible for writing return value to `${PROJECT_ROOT}/.webnovel/tmp/review_results.json`. If later change to reviewer direct persist, must add `Write` to reviewer frontmatter, and delete main-flow write action, the two cannot coexist.

`review_results.json` persisted, must call:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" review-pipeline \
  --chapter {chapter_num} \
  --review-results "${PROJECT_ROOT}/.webnovel/tmp/review_results.json" \
  --metrics-out "${PROJECT_ROOT}/.webnovel/tmp/review_metrics.json" \
  --report-file "审查报告/第{chapter_num}章审查报告.md" \
  --save-metrics
```

Write-chapter main chain calls reviewer only one round. `blocking=true` problems must point-fix, or enter polish / commit only after user adjudication. Non-blocking issues to polish.

#### Step 4: Polish

Only change expression, not facts.

Can keep existing reference loads, but don't let main Skill carry long tutorial:

- `references/polish-guide.md`
- `references/writing/typesetting.md`
- `references/style-adapter.md`

Order: fix non-blocking issues -> style adapt -> typeset -> Anti-AI final check.

`anti_ai_force_check=fail` doesn't enter commit. `--minimal` only typeset.

#### Step 5: Commit

Must call `webnovel-writer:data-agent` to generate three artifacts:

- `.webnovel/tmp/fulfillment_result.json`
- `.webnovel/tmp/disambiguation_result.json`
- `.webnovel/tmp/extraction_result.json`

data-agent is the only writer of three tmp artifacts. Main flow only checks file existence and schema, doesn't rewrite, doesn't fill artifact; if artifact unqualified, point-require data-agent re-run corresponding product.

data-agent doesn't directly write state / index / summaries / memory / vectors, nor directly write projection.

Then run precommit gate:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" \
  write-gate --chapter {chapter_num} --stage precommit --format json
```

`write-gate precommit` passed, run pre-commit `git diff` final validation, confirm write scope correct:

```bash
if git -C "${PROJECT_ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "${PROJECT_ROOT}" diff --name-status -- .
  git -C "${PROJECT_ROOT}" diff --check -- .
fi
```

Validation rules:

- `diff --name-status` must not show plugin dir, other book projects, other chapter text, or hand-written state files not belonging to this chapter flow.
- `git diff` only checks git-visible file paths and text diffs; if `.webnovel/` ignored by `.gitignore`, or `index.db` / `vectors.db` are binary databases, `git diff` can't see their table/row changes.
- Before `chapter-commit` no projection-exclusive writes like summaries / memory / vectors; these only produced by `chapter-commit` or `projections retry`. This rule can't be proven by `git diff` alone, must combine runtime gate / read-model query.
- If project root not git worktree, explicitly record "skip git diff validation", don't skip `write-gate precommit` for this.
- Forbid `git add` / `git commit` here; this step read-only.

Database / read-model semantics separately via read-only validation:

- After `review-pipeline --save-metrics`, use runtime output and read-only query to confirm `review_metrics` written to target chapter; don't use `git diff` to judge SQLite content.
- After `chapter-commit`, use `write-gate postcommit`'s `projection_status` to verify state / index / summary / memory / vector all `done` or `skipped`.
- When need query SQLite, prefer existing runtime query command; runtime has no command then can use Python `sqlite3` read-only query, but don't turn query script into write path.

Then run `chapter-commit`:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" chapter-commit \
  --chapter {chapter_num} \
  --review-result "${PROJECT_ROOT}/.webnovel/tmp/review_results.json" \
  --fulfillment-result "${PROJECT_ROOT}/.webnovel/tmp/fulfillment_result.json" \
  --disambiguation-result "${PROJECT_ROOT}/.webnovel/tmp/disambiguation_result.json" \
  --extraction-result "${PROJECT_ROOT}/.webnovel/tmp/extraction_result.json"
```

Auto-judge: `blocking_count > 0`, `missed_nodes` non-empty or `pending` non-empty -> rejected, else accepted.

#### Step 6: Post-commit validation and backup

Must run postcommit gate:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" \
  write-gate --chapter {chapter_num} --stage postcommit --format json
```

projection_status five items `state/index/summary/memory/vector` must all `done` or `skipped`.

Projection failure only re-run:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" \
  projections retry --chapter {chapter_num} --format json
```

Final backup must use resolved `PROJECT_ROOT`:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" backup \
  --chapter {chapter_num} \
  --chapter-title "{title}"
```

Forbid bare `git add .` from workspace parent dir.

### 3.5 `/webnovel-review` full flow

Standalone review Skill can be more complete than write-chapter Step 3, but cannot fake reviewer result:

1. Resolve real project root.
2. If target chapter lacks runtime contract, first refresh `story-system --emit-runtime-contracts` with real `CHAPTER_GOAL`.
3. Read necessary references: core constraints, review schema; others per issue need.
4. Load `.webnovel/state.json` compatible projection and chapter-to-review text.
5. Call `webnovel-writer:reviewer` return strict JSON, main flow writes to `.webnovel/tmp/review_results.json`.
6. Call `review-pipeline --save-metrics` generate report and metrics, write to `review_metrics`.
7. Call `update-state -- --add-review ...` write compatible review record.
8. When `blocking=true`, ask user immediate fix or later handling.

### 3.6 Query, Learn, Dashboard, Doctor full flow

`webnovel-query`:

- Read-only.
- First resolve project root.
- First identify query type, then use narrowest tool.
- Data source priority fixed: `.story-system` pre-write contract -> latest accepted `CHAPTER_COMMIT` -> `memory-contract` -> `.webnovel/state.json` / `index.db` fallback.
- Time-series query prefer `knowledge query-entity-state` / `knowledge query-relationships`.
- Degrade to legacy fallback must state clearly.

`webnovel-learn`:

- Resolve project root.
- Read state for current chapter number, fail can use `source_chapter: null`.
- Must call `project-memory add-pattern`, don't hand-write JSON.

`webnovel-dashboard`:

- Read-only.
- Resolve dashboard module and project root.
- When frontend dist missing hint, don't write project files.
- Dashboard must expose Story Runtime main-chain status, e.g. `/api/story-runtime/health`.

`webnovel-doctor`:

- Read-only diagnosis, no fix, no dependency install, no dashboard launch.
- First `project-status --format summary`, then `doctor --format text`.
- Missing items explained per runtime-derived stage, don't misjudge init project as multi-chapter-written project.

---

## 4. Pruning Criteria and Responsibility Boundaries

This section is the outline for all later Phases. Every "keep / sink / delete / how to read" decision derives from these four criteria, not enumerating "must keep" per Phase.

### 4.1 Four pruning criteria

**Criterion 1 · Responsibility (who produces, who consumes, info belongs there)**

- Main agent is dispatcher, only keeps **contract shape**: which subagent to call, what products, product flow to which runtime command, what counts as blocker.
- Field-level details belong to producer: artifact field names produced by data-agent, validated by runtime validator, belong to `data-agent.md` and runtime, not main Skill.
- One piece of info should have one true source; appearing second place is duplication, delete to only producer.

**Criterion 2 · Token (measure main agent's resident input, not file line count)**

- Optimization target is "context token main agent actually loads writing one chapter", not how long file is.
- Content only needed when some subagent / some step executes, never into main agent resident context.
- Short file full read fine, don't slim for slimming; bullseye is "always full-read big files" (see §6).

**Criterion 3 · Noise (keep only instruction and red lines, delete meta-narrative and nagging)**

| Noise type | Example | Handling |
|---|---|---|
| Duplication | schema fields written in both Skill / Agent | delete one, keep producer |
| Meta-narrative (teach how to think) | reviewer's "chain-of-thought (ReAct): read→compare→judge" | delete, doesn't change output |
| Over-negative stacking | chain of "don't... forbid..." | distinguish red line from nagging: keep red line, delete nagging |
| Wrong target | main agent gets details only subagent uses | migrate per criterion 1 |
| Structure padding | empty sections forced for paragraph template | delete, loosen corresponding structure tests |

**Criterion 4 · Read-method (full read what should be full, on-demand what should be partial)**

Each "read file" action must label read-method, don't default full `cat`:

- **Full read**: short file, and must understand wholly (schema, iron rules, methodology overview).
- **Section read**: when only need some section, use built-in `Grep` content output to locate heading anchor line, then `Read` offset/limit to take segment — both Claude Code built-in, platform-independent, don't bet host installed `sed`/`jq`; prompt already points to section name give anchor directly.
- **Search read**: structured data (CSV / JSON) prefer this project's runtime tools (`reference_search.py`, `knowledge query-*`, dedicated schema/validator); runtime has no corresponding command need temp field-take prefer Bash, never default `cat` whole table; PowerShell only Windows-only fallback.
- **No read**: content already migrated or no longer consumed, clean (see §6).

### 4.2 Responsibility boundary

| Layer | Keep what | Don't do what |
|---|---|---|
| Skill | project-root protection, dispatch order, runtime commands, Agent input contract shape, success criteria, failure recovery | don't tell subagent internal tutorial, don't copy long schema, don't swallow runtime gate |
| Agent | professional flow, minimal necessary rules, output contract, boundary | don't depend `agents/references/*`, don't write main-chain projection, don't commit for runtime |
| Runtime | schema, gate, commit, projection, backup, state advance | don't bear LLM writing judgment |
| Skill references | long examples, detailed collection fields, chapter-node details, polish checklist | not subagent's hidden manual; not indiscriminately full-loaded |

### 4.3 Agent single-file constraint

This project by default doesn't add `agents/references/*`, avoid splitting subagent's manual into invisible fragments. Agent's needed professional rules (incl full schema of its products) must be compressed and kept in single file — this is criterion 1 "field details belong to producer" landing.

Claude Code official capability allows subagent to preload Skills via `skills` field; if `Skill` tool stays in subagent available tool set, subagent can also call un-preloaded project / user / plugin Skills at runtime. But this round doesn't take this as default:

- Preloading Skill injects full Skill content into subagent context, may cancel this round's context-reduction gain.
- `skills` is preloaded context; `tools: Skill` is allow runtime call Skill, two are not same.
- Subagent cannot spawn other subagents; multi-agent chain must be dispatched by main flow.
- `Agent` and `AskUserQuestion` cannot be designed as subagent available tools; need user adjudication return to main flow.
- If future really need subagent use some Skill, must record in Phase 0: via `skills` preload, or via `tools: Skill` runtime call; why can't inline into Agent; how much context added; still below token budget.

### 4.4 Claude Code tool-call best practices

This section constrains later `SKILL.md` / `agents/*.md` tool writing. Principle: frontmatter write official tool names and permission rules; body use natural language to assign tool tasks; don't fake unstable internal function API in prompt.

#### 4.4.1 frontmatter writing

Skill's `allowed-tools` is pre-approval rule, not tool restriction. Unlisted tools still callable, just continue under permission settings.

```yaml
allowed-tools: Read, Grep, Glob, Bash, Agent, AskUserQuestion
```

When need narrow permission, use official permission rule format, and first confirm real registration name:

```yaml
allowed-tools: Read, Grep, Glob, Bash(python -X utf8 *), Agent
```

Don't write guessed rules before verifying, e.g. `Agent(webnovel-writer:context-agent)`. Plugin-scoped agent's real registration name must be reviewed in Phase 0.

Agent's `tools` is allowlist; when omitted inherits main session tools, not suitable as production agent default. Production agent lists minimal tool set per responsibility, not one fixed template:

```yaml
# read-only research, or only return JSON, main flow persists review
tools: Read, Grep, Glob, Bash

# need persist tmp JSON artifact or reviewer raw JSON
tools: Read, Grep, Bash, Write
```

If agent wants preload Skill, use `skills:` field; don't write `Skill` as "preload reference" into `tools`. Only when really need subagent call other Skills at runtime, keep `Skill` in `tools`, and record reason:

```yaml
skills:
  - api-conventions
```

#### 4.4.2 body Agent-call writing

Don't write as pseudo-function:

```text
Agent(
  subagent_type: "...",
  prompt: "..."
)
```

Recommend as task instruction:

```text
Use the Agent tool to run `webnovel-writer:context-agent`.

Task:
- chapter={chapter_num}
- project_root=${PROJECT_ROOT}
- scripts_dir=${SCRIPTS_DIR}
- Return a five-part writing brief.
- If context insufficient, return blocker.
```

This keeps "must use Agent tool" red line, but doesn't hardcode Claude Code internal tool-call schema into Skill text.

#### 4.4.3 tool usage table

| Tool | Default use | Best practice |
|---|---|---|
| `Read` | read file body | pass absolute path; long file prefer offset/limit section read; first `Grep` locate anchor; don't let main flow full-read big reference |
| `Grep` | search text and locate heading anchor | use content output for file path and line; use glob/type narrow; don't treat `Grep -n` as tool API |
| `Glob` | find files | use narrow pattern; too many results continue narrow; don't use shell enumerate replace simple file discovery |
| `Bash` | run cross-platform shell commands and runtime scripts | each call independent process, env vars don't persist across calls; a group of commands depending same env var in same call, or re-parse each time; prefer call `webnovel.py` etc runtime, don't use temp script replace existing command |
| `PowerShell` | Windows-only fallback | not default flow; don't actively write `shell: powershell` in plugin Skill / hook; only when Bash / built-in tools can't satisfy and task clearly Windows-only, record compat risk |
| `Agent` | call subagent | main flow dispatch subagent; body use "Use the Agent tool to run ... / Task ..."; subagent only returns final result, main flow can't depend on its intermediate tool output |
| `Skill` | call reusable Skill | main session call on-demand; subagent preload uses `skills`, runtime call needs `tools: Skill`; avoid abusing preload to let subagent see long reference; `allowed-tools` `Skill(...)` is permission rule, not body call template |
| `AskUserQuestion` | user adjudication and key divergence confirm | only when blocking, plot adjudication, init confirm etc need user choice; don't put into subagent design |
| `Write` / `Edit` | LLM directly write file | prefer runtime write structured state and projection; really need LLM write markdown, first clarify target file and minimal modify scope; if prompt requires subagent save tmp JSON, frontmatter must give `Write`, else change to "subagent returns JSON, main flow writes" |
| `WebSearch` / `WebFetch` | external info retrieval | only when user asks market trend, platform wind, or time-sensitive material; first search then fetch confirm source; don't write unconfirmed external info into canon |

### 4.5 Write-ownership matrix

This round's slimming can't just say "produce some file", must clarify unique writer. Default matrix below; later change any Skill / Agent must sync check this table.

| Product / path | Unique writer | Other layer responsibility |
|---|---|---|
| New project dir, base `.webnovel/`, setting-set skeleton | `webnovel.py init` | init Skill only collects, confirms, calls runtime |
| `.webnovel/idea_bank.json`, `大纲/总纲.md` init patch | init main flow | deconstruction-agent doesn't write canon; runtime only validates |
| `.story-system/MASTER_SETTING.json`, volume / chapter runtime contracts | `story-system --persist` | Skill / Agent don't hand-write contract JSON |
| `正文/第{chapter}章-*.md` | write main flow Step 2 / Step 4 | context-agent only returns brief; reviewer/data-agent don't fix text |
| `.webnovel/tmp/review_results.json` | default write/review main flow writes reviewer-returned JSON | reviewer only returns strict JSON; if changed to reviewer writes, must give `Write` and delete main-flow write |

---

## 5. Undeletable Red Lines and Sinkable Content

This section no longer enumerates field-level "must keep" line by line. Field, example, collection-detail stay/delete goes to §4 criteria; this section only nails two things: sinkable object scope, and **cross-layer red lines never deletable**.

### 5.1 Sinkable / compressible / change-to-on-demand-read (examples, not exhaustive, cut per §4)

- subagent internal query flow and inference explanation.
- reviewer dimension explanation, meta-narrative (ReAct) and long examples.
- data artifact full payload details (migrate to data-agent single file, not repeat in main Skill).
- init detailed collection fields, genre list, anti-trope library.
- plan's CBN / CPN / CEN detailed rules and examples.
- polish long checklist.
- §6's listed `always` full-read big references (change to section read / search read / itemize).

### 5.2 Cross-layer red lines never deletable (exhaustive, guarded by §12 behavior tests)

These are cross-Skill / Agent / Runtime business red lines, no slimming may delete, and must have corresponding behavior / contract-level assertions (§12). Split by "can turn green before Phase 0 slim" into two types:

**A. Guard current state (behavior already implemented, Phase 0 add / strengthen assertion then green)**

- Project-root protection, init dir sanitization, no canon before user confirm.
- `placeholder-scan` appears at plan / write key nodes.
- Real `CHAPTER_GOAL` parse, forbid placeholder query.
- `story-system --persist --emit-runtime-contracts` chapter-level refresh.
- `write-gate` prewrite / precommit / postcommit three gates, order unchangeable.
- Must use `Agent` tool explicitly call subagent, not main flow verbal replace.
- reviewer raw JSON via `review-pipeline --save-metrics` persisted.
- data-agent produces three artifacts; artifact fields guarded by runtime validator, not main Skill copy.
- `chapter-commit` is only fact-commit entry, drives projection.
- postcommit projection five-item validation; failure only `projections retry`, don't roll back writing steps.
- `backup --project-root "${PROJECT_ROOT}"`, forbid bare `git add .`.
- plan's beat table, timeline, chapter-node, setting writeback, structured outline writeback, state update.

**B. This round's new contracts (currently no implementation and assertion, turn green after corresponding Phase lands; Phase 0 only writes assertion and marks pending)**

- Write-ownership matrix must hold: reviewer result, data artifacts, review metrics, commit/projection/read-model each have unique writer, no duplicate write, no missed write; agent `tools` and persist responsibility consistent (reviewer no `Write` only returns JSON, data-agent `Write` writes three artifacts). (4.5 introduced; green after Phase 1-3 align prompt / frontmatter)
- Each chapter before `chapter-commit` must run read-only `git diff` change-surface validation; must not show plugin dir, other chapters, other book projects, or unauthorized state-file changes; database internal changes separately via runtime / SQLite read-only query. (write Skill currently no this step; green after Phase 1 adds)

> Field-level items (like `planned_nodes` specific field names) **not in this list** — they go to producer agent and runtime schema per criterion 1, guarded by §12 contract tests, no longer as main Skill copy red lines.

---

## 6. Modification Scope

### 6.1 Key files

| Type | File |
|---|---|
| Write Skill | `webnovel-writer/skills/webnovel-write/SKILL.md` |
| Pre-write Agent | `webnovel-writer/agents/context-agent.md` |
| Data Agent | `webnovel-writer/agents/data-agent.md` |
| Review Agent | `webnovel-writer/agents/reviewer.md` |
| Deconstruction Agent | `webnovel-writer/agents/deconstruction-agent.md` |
| Init Skill | `webnovel-writer/skills/webnovel-init/SKILL.md` |
| Plan Skill | `webnovel-writer/skills/webnovel-plan/SKILL.md` |
| Review Skill | `webnovel-writer/skills/webnovel-review/SKILL.md` |
| Query Skill | `webnovel-writer/skills/webnovel-query/SKILL.md` |
| Lightweight Skills | `webnovel-learn`, `webnovel-dashboard`, `webnovel-doctor` |

### 6.2 references and read-method optimization

references are this round's underestimated token surface: top-level `references/` plus each Skill's `references/` total 60+ files. Optimization not by adding, but three things — use existing loading map as baseline, assign read-method to each read action, clean migrated dead files.

#### 6.2.1 Baseline: reference-loading-map

`references/index/reference-loading-map.md` already registered each Skill each step's actual reference consumption, and distinguished three types:

- **Directly Read md** (whole-file load) — problem concentrates here.
- `reference_search.py` search CSV (return entries per `--table --query --genre`) — already "read by field" model.
- `story-system` indirectly consume CSV — already on-demand.

CSV line already done right, this round **doesn't redo search layer**; only treat "directly Read md full load", and register read-method into loading-map, upgrading from "which files to read" to "how to read these files".

#### 6.2.2 token bullseye: `always` full-read big md (lines measured, read-method verified structure)

Following are "directly Read and always / high-frequency" big files, the resident cost every init/plan/write run eats. Line counts measured by line-by-line script, "which section" verified per file heading structure, directly doable:

| File | Lines | Who full-reads | Read which section (not whole) |
|---|---|---|---|
| `references/genre-profiles.md` | 696 | init + plan double always | current genre's single `### 2.x` section (13 genres ~44 lines each, add "一、字段说明" if needed); one book uses 1 genre → saves ~90% |
| `skills/webnovel-init/references/creativity/selling-points.md` | 687 | init Step5 always | "## 9 核心卖点定位模板" as skeleton, add "### 1.3 黄金公式", "## 7 实战检查清单" on demand |
| `references/reading-power-taxonomy.md` | 361 | plan Step7 | on-demand analysis type section: "## 一 钩子类型" / "## 二 爽点模式" / "## 三 微兑现" |
| `skills/webnovel-plan/references/outlining/chapter-planning.md` | 322 | plan Step7 | end "## 10 结构化节点规范（CBN/CPNs/CEN）" (+ "## 7 章节规划模板" for template) |
| `skills/webnovel-init/references/creativity/creativity-constraints.md` | 327 | init Step5 always | show score only take "### 8.1 五维评分" (~10 lines); creative collection read "一 Schema / 六 硬约束 / 八 评分" |
| `skills/webnovel-write/references/polish-guide.md` | 351 | write Step4 always | per "## 2 执行顺序", "Phase 1 增补：Anti-AI 规范" vocab section separate; **cannot itemize into CSV (csv/README hard boundary)** |
| `references/shared/cool-points-guide.md` | 313 | plan / review trigger | needed cool-point dimension section; genre-fit take "## 九 题材适配" per genre |

Short files (like `references/shared/strand-weave-pattern.md` 111 lines) keep full read, don't touch.

> Section-read standard technique: first use built-in `Grep` content output matching `^#{2,4} ` to get heading anchor line, then `Read` offset/limit to take target section. Anchors above (incl "8.1 五维评分", "结构化节点规范") verified real-existing, directly locatable.
> Note: an earlier shell-pipe line count was systematically small; this table re-measured by line-by-line script; other references use measured value when entering docs.

#### 6.2.3 Clean dead references (verify CSV coverage before disposal)

`reference-gap-register.md` recorded `skills/webnovel-write/references/writing/*.md → CSV` migration partially done: loading-map's "currently not directly called" confirmed `combat-scenes`, `dialogue-writing`, `emotion-psychology`, `scene-description`, `desire-description`, `genre-hook-payoff-library` etc no longer directly Read (CSV bears trigger), but files still there, ~1400 lines dead content total. Disposal steps:

1. For each candidate md, first verify `场景写法.csv` / `写作技法.csv` truly covers its content — don't blind-delete.
2. Covered: delete, or keep as empty shell pointing to CSV.
3. Not covered: first manually fill gap entries into CSV (per `csv/README.md` manual migration rule), then dispose md.

#### 6.2.4 Fix outdated "new candidate"

v2 §6.2 column candidates disconnected from current state, re-judge per current:

| v2 candidate | Current state | Disposal |
|---|---|---|
| `blocking-override-guidelines.md` | exists and landed (gap-register 2026-04-16) | delete candidate, change to "use existing" |
| `chapter-node-rules.md` | duplicates existing `skills/webnovel-plan/references/outlining/chapter-planning.md` "结构化节点规范" | don't create new, section-read that section |
| `init-flow.md` | duplicates existing `skills/webnovel-init/references/init-collection-schema.md` | don't create new, use and change to section-read |
| `subagent-contracts.md` | conflicts with criterion 1 (contract shape in main Skill, schema in producer agent) | don't create new |
| `polish-checklist.md` | can be short checklist summary of `polish-guide.md` | this round default don't create; if really need generate, only Skill-internal short list or section-read index, don't migrate to CSV |

Principle unchanged: don't force new reference for "three-part structure"; prioritize changing read-method and cleaning dead files, not adding files.

---

## 7. Phase 0: Baseline Statistics, Read Audit, Red-line Tests

### 7.1 Goal

First confirm which text to keep / sink / delete / change read-method, and turn cross-layer red lines into behavior tests first, forming green baseline before slimming.

### 7.2 To do

1. Count 8 Skills, 4 Agents, references size; references directly use reference-loading-map + line table (see §6), don't reinvent.
2. Per file label ownership per §4 criteria: main agent (contract shape) / subagent / runtime / sunk references / changed read-method / §3 red line.
3. **Token baseline (directional reference, not hard exam)**: optionally estimate webnovel-write main chain one default write-chapter "main agent actually loaded context" (main Skill + inline content + full-read reference) approximate token, only for slimming direction, not pass/fail threshold.
4. **Read audit**: against loading-map "directly Read md", label full / section / search / no-read per row (§6.2.2 bullseye first).
5. **Add red-line tests before slimming (distinguish §5.2 A / B)**: A type (guard current state) currently only text-level or no assertion, add as behavior / contract-level assertion (§12) and turn green before change; B type (this round's new contracts: write-ownership matrix, agent `tools` and persist responsibility consistency, pre-commit `git diff` read-only validation) currently no implementation, Phase 0 only write assertion and explicitly mark pending (pytest `xfail` / `skip`, or eval mark pending), turn formal after corresponding Phase lands, don't require Phase 0 pass.
6. **Tool capability confirm (solidify official conclusion + recheck this plugin)**: record Claude Code version, official docs URL / date, Claude Code current session tool summary, plugin actually registered agent / skill names. Built-in tools (`Read` offset/limit, `Grep`, `Glob`, `Agent`, `Skill`, `AskUserQuestion`, `Write`, `Edit`) and Bash per official behavior; PowerShell not enter default flow, only record whether available, whether PowerShell tool enabled, and Windows-only fallback boundary; solidify official conclusions: subagent can't spawn subagent, `Agent` / `AskUserQuestion` not designed as subagent tools, `tools` / `disallowedTools` control subagent tool boundary, `skills` field can preload full Skill, Skill's `allowed-tools` is pre-approval not restriction; recheck this plugin's actual registration names, frontmatter, `allowed-tools` match local plugin-dev.
7. Run baseline validation:

```bash
python -m pytest webnovel-writer/scripts/data_modules/tests/test_prompt_integrity.py -q --no-cov
python -X utf8 webnovel-writer/scripts/run_behavior_evals.py --format json
python -X utf8 webnovel-writer/scripts/validate_plugin_package.py --format json
```

### 7.3 Acceptance

- Get each Skill / Agent / reference "keep / sink / delete / read-method" list, **persisted as traceable file**, not just verbal conclusion.
- (Optional) token baseline as directional reference recorded; token not hard exam metric, missing value doesn't block acceptance.
- All §5.2 red lines have behavior / contract-level assertion: A type (guard current state) all pass; B type (this round's new contracts) assertion written and marked pending, don't require Phase 0 pass.
- Write-ownership matrix persisted as traceable file; its forced assertion belongs to §5.2 B, Phase 0 write pending, turn green after corresponding Phase lands via prompt integrity / behavior eval.
- Current validation commands pass.

---

## 8. Phase 1: Slim `webnovel-write`

### 8.1 Goal

Turn write Skill from "detailed tutorial" to "dispatch contract", but keep full write-chapter main chain.

### 8.2 Must keep

- Modes: default / `--fast` / `--minimal`.
- Prep: `preflight`, `where`, `placeholder-scan`, real `CHAPTER_GOAL`, `story-system` contract refresh, `write-gate prewrite`.
- Three Agent calls: `context-agent`, `reviewer`, `data-agent`.
- Draft only eats five-part writing brief.
- reviewer raw JSON + `review-pipeline --save-metrics`.
- blocking issue only point-fix or user adjudication, don't fake pass.
- Polish order and anti-AI final check.
- data-agent three artifacts.
- `write-gate precommit`.
- `chapter-commit`.
- `write-gate postcommit`.
- `projections retry`.
- `backup --project-root "${PROJECT_ROOT}"`.
- Success criteria and failure recovery.

### 8.3 Compressible

- context-agent how to query context.
- reviewer how to review per dimension.
- data-agent full payload schema.
- Long polish tutorial and big examples.

### 8.4 Agent call target form

context-agent:

```text
Use the Agent tool to run `webnovel-writer:context-agent`.

Task:
- chapter={chapter_num}
- project_root=${PROJECT_ROOT}
- scripts_dir=${SCRIPTS_DIR}
- storage_path=${PROJECT_ROOT}/.webnovel
- state_file=${PROJECT_ROOT}/.webnovel/state.json（projection/read-model, compatible read only）
- First research, then output five-part writing brief in order: this chapter's hard constraints -> CBN/CPNs/CEN -> this chapter's forbidden zone -> style guidance -> dynamic_context supplementary reference.
- Return blocker when context insufficient.
```

reviewer:

```text
Use the Agent tool to run `webnovel-writer:reviewer`.

Task:
- chapter={chapter_num}
- chapter_file=${CHAPTER_FILE}
- project_root=${PROJECT_ROOT}
- scripts_dir=${SCRIPTS_DIR}
- Return strict raw JSON only; don't write files.
- Main flow writes returned JSON to ${PROJECT_ROOT}/.webnovel/tmp/review_results.json.
- No score, no verbal summary.
```

data-agent:

```text
Use the Agent tool to run `webnovel-writer:data-agent`.

Task:
- chapter={chapter_num}
- chapter_file=${CHAPTER_FILE}
- project_root=${PROJECT_ROOT}
- scripts_dir=${SCRIPTS_DIR}
- output_dir=${PROJECT_ROOT}/.webnovel/tmp
- Generate fulfillment_result.json, disambiguation_result.json, extraction_result.json.
- Don't directly write state/index/summaries/memory/vectors/projection.
```

Persist responsibility must align with agent frontmatter: this plan defaults reviewer no `Write`, only returns JSON, main flow writes `review_results.json`; data-agent granted `Write`, directly writes three artifacts. If future adjust, must simultaneously change template, frontmatter, prompt integrity, guarantee single product single writer.

### 8.5 Risk control

- `write-gate precommit` and `artifact_validator` backstop schema.
- behavior eval checks three gates, three artifact types, pre-commit git diff change-surface validation, chapter-commit, postcommit, backup.
- prompt integrity checks forbid bare `git add .`, forbid main flow verbal replace subagent, write-ownership matrix and agent `tools` aligned.

---

## 9. Phase 2: Slim 4 Agents

### 9.1 `context-agent`

Goal: become context compressor, output stable `chapter_task_brief`.

Must keep:

- `memory-contract load-context`.
- `query-entity`, `query-rules`, `get-timeline` on-demand query.
- load-context already-included content not re-query.
- `.story-system/` contract priority, `state.json` compatible read only.
- `chapter_directive.goal` / chapter outline real goal priority, `dynamic_context` only writing-method reference.
- Five-part brief: opening commission, this chapter's story, this chapter's characters, how to write smoother, where to end.
- Red-line validation and context-insufficient blocker.

Can delete or compress:

- Long examples.
- Over-detailed inference explanation.
- Unnecessary term explanation.

### 9.2 `data-agent`

Goal: only fact extraction and artifact generation.

Must keep:

- Read text, entity index and aliases.
- Three artifact file names.
- `fulfillment_result.json` top `planned_nodes`, `covered_nodes`, `missed_nodes`, `extra_nodes`.
- `disambiguation_result.json` top `pending`.
- `extraction_result.json` top `accepted_events`, `state_deltas`, `entity_deltas`, `entities_appeared`, `scenes`, `summary_text`.
- `accepted_events` child min fields: `event_id`, `chapter`, `event_type`, `subject`, `payload`.
- `state_deltas` field naming: `field`, `old`, `new`.
- `entity_deltas` field naming: `entity_type`.
- Forbid directly write state / index / summaries / memory / vectors / projection.

Can delete or compress:

- Each event_type full payload long explanation.
- Long JSON examples.
- Compatible old field name detailed explanation.

### 9.3 `reviewer`

Goal: only verifiable fact review.

Must keep:

- Five dimensions: setting, timeline, continuity, character, logic.
- Each dimension gives `dimension_results`, write `pass` even no problem.
- Each issue has evidence and fix_hint.
- No score, no style comment, no suggest new plot, no expose unoccurred outline.
- Output strict JSON.

Must delete or rewrite:

- "Chain-of-thought / ReAct" expressions.
- Too-long review tutorial.

### 9.4 `deconstruction-agent`

Goal: deconstruct reference book's transferable patterns, don't pollute new book canon.

Must keep:

- quick / deep / auto route.
- Only book name/platform no text, don't fabricate golden-three-chapters, characters, settings, plot from memory.
- Write no files.
- Generate no new book canon.
- Output `init_reference_research` JSON.
- `quality`, `resume_state`, `do_not_copy`, `canon_contamination_warnings`.
- Quick mode, deep mode, plot points, quality gate, abstract transformation rules.

Can compress:

- Long quality-gate table.
- Super-long schema details.
- Deep deconstruction staged long explanation.

---

## 10. Phase 3: Slim init / plan / review Skills

### 10.1 `webnovel-init`

Skill can be shorter, but must keep §3.2 full chain.

Compress direction:

- Detailed collection fields keep in existing `skills/webnovel-init/references/init-collection-schema.md`, section-read it; don't create init-flow.md (see 6.2.4).
- Genre list only keep canonical set and few examples.
- CLI param long table can shrink to "params from collection object", but keep executing init fact.
- Creative-constraint details, anti-trope library, worldview design guide on-demand read.

Undeletable:

- Step 1.5 inspiration source ask.
- deconstruction-agent call boundary.
- No canon before user confirm.
- Project root sanitization and confirm.
- `idea_bank.json`.
- Patch 总纲.
- Post-init MASTER_SETTING generation.
- Verify and minimal rollback.

### 10.2 `webnovel-plan`

Skill can be shorter, but must keep §3.3 full chain.

Compress direction:

- CBN / CPN / CEN details keep in existing `skills/webnovel-plan/references/outlining/chapter-planning.md` "结构化节点规范", section-read it; don't create chapter-node-rules.md (see 6.2.4).
- Long reference table can change to "stage-triggered read".
- Structured node examples sink.

Undeletable:

- placeholder-scan.
- Cross-volume state read.
- Setting baseline fill.
- Volume beat table.
- Volume timeline.
- Volume outline.
- Batch chapter outlines.
- Setting writeback.
- Explicit `大纲/第{volume_id}卷-总纲写回.json`.
- `master-outline-sync`.
- `update-state`.
- Real `CHAPTER_GOAL` refresh Story System contract.

### 10.3 `webnovel-review`

Skill can be shorter, but must keep §3.5 full chain.

Compress direction:

- reviewer review method to reviewer.
- Evidence query process not expanded in Skill.

Undeletable:

- Contract missing then补 `story-system`.
- reviewer Agent call.
- `review-pipeline --save-metrics`.
- `update-state --add-review`.
- blocking user adjudication.

---

## 11. Phase 4: Slim Lightweight Skills

### 11.1 `webnovel-query`

Goal: query first classify, then narrowest tool.

Keep:

- Read-only.
- Project-root protection.
- `.story-system` -> latest accepted commit -> memory-contract -> projection fallback priority.
- Degradation note.

Optimize:

- Don't default full `memory-contract load-context`; call narrowest tool per query type.
- Character state use `knowledge query-entity-state`.
- Relations use `knowledge query-relationships`.
- Rules use `memory-contract query-rules`.
- Foreshadowing use open-loop query.

### 11.2 `webnovel-learn`

Goal: stay minimal.

Keep:

- Project-root protection.
- Read current chapter number.
- `project-memory add-pattern`.
- No hand-write JSON.

### 11.3 `webnovel-dashboard`

Goal: stay read-only dashboard.

Keep:

- Read-only boundary.
- `story-runtime/health`.
- Project-root resolve.
- Frontend dist verify.

Adjustable:

- Don't default install deps; prompt command when missing.
- Lightweight pre-start check available.

### 11.4 `webnovel-doctor`

Goal: stay read-only diagnosis.

Keep:

- `project-status` first.
- `doctor` stage-aware check.
- No fix, no install, no dashboard launch.

Adjustable:

- frontmatter description change to concise Chinese trigger-type description.

---

## 12. Phase 5: Tests and Behavior Validation

### 12.1 Modify files

- `webnovel-writer/scripts/data_modules/tests/test_prompt_integrity.py`
- `webnovel-writer/evals/fixtures/behavior/fast.json`
- Add behavior / contract-level assertions; delete or migrate outdated text-level assertions (see 12.2).

### 12.2 Acceptance principle: behavior / contract-level, not anchored to copy

General principle: assert "did it right", not "is some string in copy". `fast.json`'s `commit_projection_runtime` (really run commit → projection and assert status) is model; `assert "string" in text` is form to gradually retire.

#### Must-guard behaviors (guard with behavior / contract assertion, not anchor specific wording)

- Write-chapter main chain: three gates (prewrite / precommit / postcommit) land in order; reviewer one round; blocking only point-fix or user adjudication; data-agent three artifacts; after `write-gate precommit`, before `chapter-commit` run read-only `git diff` change-surface validation; database / `.webnovel/` read-model table-level semantics confirmed by runtime / SQLite read-only query; `chapter-commit` commit and drive projection; postcommit five-item projection all done/skipped; failure only `projections retry`; `backup --project-root`.
- Artifact contract: three artifact fields validated by runtime schema (`chapter_commit_schema` / `story_event_schema` / `schemas`); **add precommit negative case** — missing `missed_nodes` / `pending` / key fields must intercept. This replaces "main Skill copy must show field name" check.
- 8 Skills discoverable, frontmatter legal, description triggerable, Chinese priority.
- 4 Agents single-file, frontmatter has `name`/`description`/`model`/`color`, `tools` minimal set and matches persist responsibility, don't depend `agents/references/*`.
- Agent boundary: data-agent doesn't directly write projection; reviewer only outputs structured JSON and covers 5 dims; context-agent outputs five-part brief, uses `load-context`; deconstruction-agent writes no files, produces `init_reference_research`, prevents canon pollution, keeps Step 1.5 and confirm gate.
- Write-ownership: `review_results.json`, three data artifacts, review metrics/report, state/index/summaries/memory/vector each have unique writer; prompt can't simultaneously require two layers write same file, nor only require "generate" without stating persist party; for SQLite / binary read-model, acceptance sees runtime query result, not `git diff` content.
- plan keeps `.story-system/` main chain and beat/timeline/chapter-node/outline-writeback/state-update; query / dashboard / doctor read-only don't write project files.

#### Existing assertions to delete / migrate / loosen

| Existing assertion | Problem | Disposal |
|---|---|---|
| `test_webnovel_write_data_agent_prompt_requires_extraction_schema` | verbatim requires main Skill write schema field name, conflicts criterion 1 | **delete**; field guarantee migrates to data-agent single file + precommit negative case |
| `test_data_agent_is_described_as_extraction_only...` field-name list | checks data-agent.md contains field name (text-level) | keep and strengthen as data-agent single-file schema contract validation |
| `test_agent_template_structure` (requires 1-8 consecutive numbered sections) | forces structure; deleting reviewer's ReAct section mis-hits | **loosen**: after deleting ReAct renumber or lower section count requirement, don't leave empty sections to pass test |
| each `assert "string" in SKILL.md` copy-anchor item | anchors copy, blocks slimming | change to behavior / contract assertion, or migrate to producer |

### 12.3 Validation commands

Docs and prompt layer:

```bash
python -m pytest webnovel-writer/scripts/data_modules/tests/test_prompt_integrity.py -q --no-cov
python -X utf8 webnovel-writer/scripts/run_behavior_evals.py --format json
python -X utf8 webnovel-writer/scripts/validate_plugin_package.py --format json
```

