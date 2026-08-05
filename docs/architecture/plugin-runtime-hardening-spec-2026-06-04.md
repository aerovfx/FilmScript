# Plugin Runtime Hardening Spec

> Date: 2026-06-04
> Status: draft v1
> Scope: Based on investigation of excellent Claude Code plugins, systematically converge `webnovel-writer`'s plugin form, runtime reliability, workflow orchestration, doctor self-check, hook state awareness, eval and release governance
> Investigation samples: `anthropics/claude-plugins-official`, `anthropics/skills`, `obra/superpowers`, `SonarSource/sonarqube-agent-plugins`, `appwrite/claude-plugin`, `aws-samples/sample-claude-code-plugins-for-startups`, community multi-plugin marketplace

---

## 1. Background

`webnovel-writer` is no longer an ordinary single Skill, but a complete long-form writing runtime plugin:

- 7 Skill commands handle init / plan / write / review / query / learn / dashboard.
- 4 Agents handle pre-write context, review, fact extraction, reference deconstruction.
- Python CLI and `data_modules` carry Story System, commit, projection, RAG, memory, Dashboard data layer.
- `.story-system/` is the contract and commit main chain, `.webnovel/*` is projection / read-model.

Common experience from excellent Claude Code plugins:

1. `SKILL.md` does routing and flow, not carrying all knowledge.
2. Deterministic actions sink to scripts / runtime / MCP, not constrained by prompt.
3. `commands / skills / agents / hooks / MCP` boundaries are clear.
4. hooks only do lightweight status hints, self-check or wiring, not heavy business.
5. Complex workflow has verifiable inputs, outputs, stop conditions, and acceptance criteria.
6. There is a `doctor / integrate / setup` style environment self-check entry.
7. There are real behavior evals proving the agent follows the protocol.
8. manifest, marketplace, README, version, LICENSE have validation to avoid drift.

The goal of this spec is to turn these experiences into the next-stage architecture transformation route for `webnovel-writer`.

---

## 2. One-Line Goal

Upgrade `webnovel-writer` from "strong Skill package + Python toolchain" to:

> A long-form writing runtime plugin that is self-checkable, verifiable, recoverable, replayable, and release-governed.

---

## 3. Design Principles

### 3.1 Runtime First

Key chains like writing chapters, committing, projection, validation must be guaranteed by runtime, no longer mainly relying on natural-language steps in Skill docs.

### 3.2 Skill as Router

`SKILL.md` keeps:

- when to trigger
- decision tree
- high-level flow
- must-read / on-demand reference routes
- failure-handling boundaries

`SKILL.md` should not carry:

- long command concatenation details
- schema validation logic
- projection repair logic
- large blocks of genre knowledge
- programmatically verifiable rules

### 3.3 Commit Is Fact

`CHAPTER_COMMIT` is post-write fact, should not be mixed with projection execution logs. Fact records and projection execution status must be gradually decoupled.

### 3.4 Hooks Are Advisory Guards

Hooks can carry "auto-triggered lightweight guards", but cannot become hidden business processes.

Allowed:

- SessionStart project status summary
- dependency / config reminders
- doctor entry hint
- dashboard / RAG / Story System health hint
- skill-scoped fixed pre-checks that stay silent when passing
- PreToolUse hard-block on dangerous writes / commit commands

Forbidden:

- auto-write state / commit / memory
- auto-install external dependencies
- auto-modify body text or settings
- inject large blocks of creative methodology
- act as chapter main state machine writing step state
- auto-instrument every step with hooks
- advance writing flow invisibly to the user

### 3.5 Behavior Must Be Tested

Existing Python unit tests continue to be kept, but are insufficient to prove plugin behavior. Skill / agent workflow-level eval must be added.

### 3.6 UTF-8 First

This project reads many Chinese paths and Chinese filenames, new entries must be explicitly UTF-8:

- Python CLI entry calls `enable_windows_utf8_stdio()` or equivalent logic.
- All text read / write explicitly `encoding="utf-8"`.
- hook / subprocess commands prefer `python -X utf8`, or explicitly set `PYTHONUTF8=1`.
- doctor / project-status / write-gate / hook scripts must not depend on system default encoding.

### 3.7 Follow Official `plugin-dev`

Any subsequent addition or modification to this plugin must first follow the official `plugin-dev` plugin guidance:

```text
C:\Users\lcy\.claude\plugins\marketplaces\claude-plugins-official\plugins\plugin-dev
```

Landing constraints:

- Plugin structure follows `plugin-structure`: `.claude-plugin/plugin.json` must be under the plugin root's `.claude-plugin/`; `commands/`, `agents/`, `skills/`, `hooks/` are at the plugin root level.
- All in-plugin paths use `${CLAUDE_PLUGIN_ROOT}`, do not hardcode local absolute paths in manifest / hook / command.
- New Skill follows `skill-development`: `SKILL.md` must have `name`, specific trigger-type `description`, optional `version`; body stays lean, detailed rules go to `references/`, deterministic scripts go to `scripts/`.
- New Command follows `command-development`: use markdown + YAML frontmatter, include clear `description`, declare `argument-hint` and `allowed-tools` when necessary.
- New Agent follows `agent-development`: frontmatter completes `name`, `description`, `model` / `tools` etc.; describe with examples in complex trigger scenarios; check with validate-agent rules after modification.
- New Hook follows `hook-development`: plugin-level `hooks/hooks.json` uses wrapper format, i.e. outer layer contains `description` and `hooks`; command hook uses `${CLAUDE_PLUGIN_ROOT}`; lightweight deterministic checks use command hook, context judgment uses prompt hook.
- After modifying plugin components, must do structure validation per `plugin-validator` idea: manifest, commands, agents, skills, hooks, MCP, README, LICENSE, sensitive info and path portability.

This line has higher priority than any custom landing suggestion in this spec; if conflict, official `plugin-dev` constraint wins.

---

## 4. Non-Goals

Not doing this round:

- Not rewriting Story System main-chain semantics.
- Not introducing large-scale new MCP services.
- Not splitting 37 genre templates into 37 independent Skills.
- Not copying Superpowers' high-frequency git commit mechanism.
- Not letting hooks carry writing business.
- Not refactoring Dashboard frontend information architecture this round.
- Not changing existing user project data format unless compatible reading is provided.

---

## 5. Target Architecture

### 5.1 Component Boundaries

```text
commands/ or Slash Skill entry
        ↓
Skill router (flow, reference route, failure boundary)
        ↓
Claude Code Todo (process constraint, managed by host)
        ↓
Runtime Gates (pre-write / pre-commit / post-commit batch validation)
        ↓
Agents (context / draft / review / data extract)
        ↓
Artifact Validator
        ↓
CHAPTER_COMMIT (fact main chain)
        ↓
Projection Engine (state/index/summary/memory/vector)
        ↓
Dashboard / Query / Doctor (read-only consumption)
```

### 5.2 Chapter-Writing Process Management

Do not add independent resume / step mark / workflow state. Claude Code itself already has Todo and session-resume capability; chapter-writing process step constraints go to host Todo management.

Recommended Todo form:

```text
[ ] Pre-write pre-check and contract refresh
[ ] context-agent generates creative brief
[ ] draft body text
[ ] reviewer review
[ ] blocking issue adjudication / targeted fix
[ ] polish and typesetting
[ ] data-agent extracts fact artifacts
[ ] chapter-commit submits fact
[ ] verify projection and backup
```

Runtime does not maintain each step state, only provides three natural-boundary batch gates:

- `prewrite`: pre-write checks project root, placeholders, Story Runtime, chapter contracts.
- `precommit`: pre-commit checks body, review, fulfillment, disambiguation, extraction artifacts.
- `postcommit`: post-commit checks commit, projection, summary, memory, backup.

This adds at most 2-3 deterministic script calls per chapter, no per-step instrumentation.

### 5.3 State-Awareness Model

Project state is in two layers:

| Layer | Owner | Persistence | Use |
|---|---|---|---|
| In-session progress | Claude Code Task / Todo | session-level | constrain this round's writing steps, show what is currently being done |
| Real project state | Story System / commit / projection / artifacts | project-level | new conversation, resume, doctor judge next step |

Do not add independent workflow state. Real project state is derived on-site by runtime:

- `.story-system/commits/*.commit.json` judges latest accepted/rejected chapter.
- `.story-system/MASTER_SETTING.json` and chapter contracts judge next chapter goal.
- `.webnovel/tmp/*` artifacts judge whether already reviewed / fulfilled / extracted.
- `.webnovel/projection_log.jsonl` or compatible field judges whether projection failed.
- draft file and chapter artifact judge whether uncommitted body exists.

Add machine-readable project-status entry, avoid occupying existing `webnovel.py status`. Current `status` already forwards to `status_reporter.py`, semantics is macro creative-health report; this spec needs short-status summary, so use new command:

```bash
webnovel.py project-status --format json
webnovel.py project-status --format summary
```

Example status:

```json
{
  "schema_version": "webnovel-project-status/v1",
  "project": "Spirit Stone Manor",
  "latest_accepted_chapter": 12,
  "target_chapter": 13,
  "phase": "chapter_contract_ready",
  "blocking": [],
  "warnings": ["rag_vector_missing"],
  "next_action": "run /webnovel-write chapter 13"
}
```

`phase` is a derivable state, not a state machine written by hooks. Phase vocabulary must have only one authoritative source, suggest adding `project_phase.py`, consumed jointly by doctor, project-status, write-gate. Recommended minimal set:

- `no_project`
- `unknown`
- `init_scaffolded`
- `init_ready`
- `plan_in_progress`
- `chapter_contract_ready`
- `draft_in_progress`
- `ready_to_commit`
- `chapter_committed`
- `projection_failed`

### 5.4 Boundary Between Hook and State

Hook only reads state, injects short context or blocks dangerous actions:

- `SessionStart`: call `project-status --format summary`, tell Claude where the current project is at after new conversation, resume, clear, compact.
- `PreToolUse`: during `webnovel-write` skill activation, block commit / projection writes that bypass the gate.
- `PostToolUse`: can be used to supplement gate failure reasons to Claude, but cannot prevent already-occurred side effects.

State transitions can only come from explicit runtime commands:

- `write-gate --stage prewrite/precommit/postcommit`
- `chapter-commit`
- `projections retry/replay`
- user explicit adjudication of blocking issue

This ensures process advancement happens in explicit skill / runtime commands, not hooks advancing invisibly.

---

## 6. Phase 1: `webnovel-doctor` Project Health Entry

### 6.1 Goal

Add read-only health-check command as an upper diagnostic entry for existing `preflight`. `preflight` already handles CLI environment, project_root and `story_runtime` summary; `doctor` must reuse or absorb these checks, not create a parallel environment check.

Focus on three types of problems:

1. **File level**: whether directory is standard, key files missing, whether JSON / SQLite / Markdown etc. content meets expectations.
2. **System config level**: whether RAG API / key, Python dependencies, Dashboard build artifacts and other runtime conditions are complete.
3. **Error explanation and repair suggestions**: when missing or abnormal, explain impact scope, and give executable repair command or manual handling suggestion.

`doctor` is not responsible for judging how a specific chapter should be written, nor replaces `write-gate`. It answers:

> Whether this book project and current plugin runtime environment are complete, readable, runnable; if not, where is broken, how to fix.

### 6.2 Entry

CLI:

```bash
python -X utf8 webnovel-writer/scripts/webnovel.py --project-root "<PROJECT_ROOT>" doctor --format json
```

Skill:

```text
/webnovel-doctor
```

Relationship with existing entries:

- `preflight`: kept as quick environment check and compatibility entry.
- `doctor`: covers `preflight`'s quick-check capability, and appends phase-aware file list, SQLite, RAG, Python deps, Dashboard, repair suggestions.
- `project-status`: only outputs short status and next step, does not do deep health check.
- `status`: keeps existing `status_reporter.py` macro creative-health report semantics.

Optional subsequent hook:

```text
SessionStart -> print project-status summary; on anomaly hint to run /webnovel-doctor
```

### 6.3 Modes

Default mode must only do local read-only checks:

```bash
webnovel.py doctor --format json
webnovel.py doctor --format text
```

Optional deep mode allows slow checks or external connectivity checks:

```bash
webnovel.py doctor --deep --format json
```

Optional chapter mode checks artifacts related to specified chapter:

```bash
webnovel.py doctor --chapter 13 --format json
```

Default `doctor` forbidden:

- write any file.
- auto-fix.
- auto-install Python / Node dependencies.
- auto-start Dashboard.
- default network test RAG API.

### 6.4 Phase-Aware Expected File List

`doctor` must first judge current project phase, then decide "what files this phase should have". Cannot check all projects with final-state list.

#### 6.4.1 Phase Derivation

Phase is derived on-site by shared `project_phase.py`, writes no state file. doctor, project-status, write-gate must consume same resolver, avoid multiple phase vocabularies:

| phase | Judgment basis | Meaning |
|---|---|---|
| `no_project` | project root invalid, or no `.webnovel/state.json` | not initialized or not bound to book project |
| `unknown` | file state insufficient for stable judgment | only do low-risk checks |
| `init_scaffolded` | has `.webnovel/state.json`, base dirs, setting collection / outline, but no `.story-system/MASTER_SETTING.json` | `webnovel.py init` just ended, Story System not yet generated |
| `init_ready` | has `.webnovel/state.json`, base setting collection, `大纲/总纲.md`, `.story-system/MASTER_SETTING.json` | init done, can enter plan |
| `plan_in_progress` | has MASTER_SETTING, but volume/chapter contracts incomplete | planning, cannot directly write chapter |
| `chapter_contract_ready` | specified chapter has volume / chapter / review contracts | can enter pre-write context and drafting |
| `draft_in_progress` | specified chapter has body draft or `.webnovel/tmp` artifacts | writing or reviewing |
| `ready_to_commit` | review / fulfillment / disambiguation / extraction artifacts all exist | can enter precommit gate |
| `chapter_committed` | specified chapter has commit | chapter committed, check projection |
| `projection_failed` | latest commit has `projection_status.failed:*` | read-model untrustworthy, needs repair |

If phase cannot be determined, return `phase=unknown`, and only do low-risk file readability checks.

#### 6.4.2 Phase Expected List

`doctor` output must include current phase's expected list:

```json
{
  "phase": "init_ready",
  "expected_profile": "after_init",
  "expected_files": {
    "required": [
      ".webnovel/state.json",
      ".webnovel/summaries/",
      "setting-collection/worldview.md",
      "setting-collection/power-system.md",
      "setting-collection/protagonist-card.md",
      "setting-collection/antagonist-design.md",
      "outline/master-outline.md",
      ".env.example",
      ".story-system/MASTER_SETTING.json"
    ],
    "conditional": [
      "setting-collection/protagonist-group.md",
      "setting-collection/heroine-card.md"
    ],
    "not_expected_yet": [
      ".story-system/volumes/volume_001.json",
      ".story-system/chapters/chapter_001.json",
      ".story-system/reviews/chapter_001.review.json",
      ".story-system/commits/chapter_001.commit.json",
      ".webnovel/summaries/chapter_001.md",
      ".webnovel/memory_scratchpad.json"
    ]
  }
}
```

`conditional` files must be judged based on `state.json`. E.g.:

- `protagonist_structure` is multi-protagonist / protagonist-group, then require `setting-collection/protagonist-group.md`.
- `heroine_config` is not no-heroine, then require `setting-collection/heroine-card.md`.
- no-golden-finger project does not require separate `golden-finger-design.md`.

#### 6.4.3 Init-Just-Finished Judgment

When `webnovel.py init` just finished, reasonable expectation is project skeleton complete, but no post-writing artifacts required.

Must exist:

```text
.webnovel/
.webnovel/backups/
.webnovel/archive/
.webnovel/summaries/
.webnovel/state.json
setting-collection/
setting-collection/worldview.md
setting-collection/power-system.md
setting-collection/protagonist-card.md
setting-collection/antagonist-design.md
outline/
outline/master-outline.md
body/
review-reports/
.env.example
```

If `/webnovel-init` already completed Story System initialization, must also exist:

```text
.story-system/
.story-system/MASTER_SETTING.json
.story-system/anti_patterns.json
```

Init phase should not require:

```text
.story-system/volumes/volume_001.json
.story-system/chapters/chapter_001.json
.story-system/reviews/chapter_001.review.json
.story-system/commits/chapter_001.commit.json
.webnovel/summaries/chapter_001.md
.webnovel/memory_scratchpad.json
.webnovel/vectors.db
```

Missing these can only return `skip` or `info`, cannot be warning / blocker.

#### 6.4.4 Plan / Write / Commit Phase List

After planning completes, only then require:

```text
.story-system/volumes/volume_001.json
.story-system/chapters/chapter_001.json
.story-system/reviews/chapter_001.review.json
```

During writing, only then check:

```text
.webnovel/tmp/review_results.json
.webnovel/tmp/fulfillment_result.json
.webnovel/tmp/disambiguation_result.json
.webnovel/tmp/extraction_result.json
```

After commit, only then require:

```text
.story-system/commits/chapter_001.commit.json
.webnovel/summaries/chapter_001.md
.webnovel/index.db
```

RAG vector db is always an enhancement:

```text
.webnovel/vectors.db
```

Missing or empty defaults to only warning, explains will degrade to BM25; only when user explicitly requires semantic retrieval or `--deep --require-rag` can upgrade to blocker.

#### 6.4.5 False-Positive Control

`doctor`'s severity must be based on "current phase + user goal" judgment:

| Situation | Phase | Result |
|---|---|---|
| missing commit | `init_ready` | `skip` / `info` |
| missing commit | `ready_to_commit` | `blocker` |
| missing summary | `init_ready` | `skip` / `info` |
| missing summary | `chapter_committed` and projection summary=done | `blocker` |
| missing vectors.db | any default mode | `warning` |
| missing MASTER_SETTING | `init_scaffolded` | `warning`, hint to run story-system persist |
| missing MASTER_SETTING | `plan_in_progress` or later | `blocker` |

### 6.5 File / Data Structure Checks

`doctor` must turn "hard-to-see" project files and database structures into readable reports.

#### 6.5.1 Directory Structure

Check:

- whether project root is valid, and not the plugin directory itself.
- whether `.webnovel/` exists.
- whether `.story-system/` exists.
- whether book-project dirs like `body/`, `outline/`, `setting-collection/` exist.
- whether user project files were mistakenly written into plugin directory.

Judgment:

- project root invalid: `blocker`.
- missing `.webnovel/` or `.story-system/`: `blocker` or `warning`, depending on whether it is a just-init project.
- missing body/outline/setting-collection dirs: `warning`, hint to init or supplement.

#### 6.5.2 Story System Main-Chain Files

Check:

- whether `.story-system/MASTER_SETTING.json` exists, JSON readable, `meta.contract_type` correct.
- whether `volumes/volume_*.json` exists, JSON readable.
- whether `chapters/chapter_*.json` exists, JSON readable.
- whether `reviews/chapter_*.review.json` exists, JSON readable.
- whether `commits/chapter_*.commit.json` exists, JSON readable.
- whether latest commit's `meta.status` is `accepted` / `rejected`.
- whether latest commit's `provenance.write_fact_role` is `chapter_commit`.

Judgment:

- main-chain JSON unreadable: `blocker`.
- already entered writing flow but missing MASTER_SETTING: `blocker`.
- latest commit schema clearly invalid: `blocker`.
- new project with no commit yet: `info` or `warning`, cannot misreport as error.

#### 6.5.3 Projection / Read-model Files

Check:

- whether `.webnovel/state.json` exists, JSON readable, base fields parseable.
- whether `.webnovel/summaries/` exists, latest accepted chapter has summary.
- whether `.webnovel/memory_scratchpad.json` exists, JSON readable, base structure parseable.
- whether latest commit's `projection_status` has `pending` / `failed:*`.

Judgment:

- `state.json` unreadable: `blocker`.
- projection writer failed: `blocker`, because subsequent queries and dashboard may be untrustworthy.
- summary / memory missing: usually `warning`, unless corresponding projection marked done but physical missing.

#### 6.5.4 SQLite Database

Check `.webnovel/index.db`:

- whether file exists.
- whether SQLite can open.
- whether key tables exist.
- whether key table row counts are abnormal.
- whether basic queries can execute.

Suggested first-batch key tables:

```text
entities
relationships
story_events
review_metrics
writing_checklist_scores
override_ledger
```

Check `.webnovel/vectors.db`:

- whether file exists.
- whether SQLite can open.
- whether `vectors` table exists.
- vector row count.
- whether `bm25_index` / `doc_stats` exist.

Database report must explicitly show tables and row counts, e.g.:

```json
{
  "id": "db.index.tables",
  "status": "ok",
  "severity": "info",
  "path": ".webnovel/index.db",
  "tables": {
    "entities": 128,
    "relationships": 42,
    "story_events": 36,
    "review_metrics": 12
  }
}
```

Judgment:

- `index.db` not exist or cannot open: `blocker`.
- `story_events` missing: `warning` or `blocker`, depending on whether accepted commit already exists.
- `vectors.db` missing: `warning`, RAG can degrade to BM25.
- `vectors` row count 0: `warning`.

#### 6.5.5 Reference / CSV Files

Check:

- whether `references/csv/*.csv` exists.
- whether necessary CSV headers meet expectations.
- whether genre alias, genre-and-tone-reasoning, anti-pattern and other core tables are readable.
- whether obvious placeholders remain.

Judgment:

- core CSV unreadable or header missing: `warning`.
- missing that causes story-system unable to generate MASTER_SETTING: `blocker`.

### 6.6 System / Config Checks

#### 6.6.1 Python Dependencies

Check:

- current Python version.
- whether `scripts/requirements.txt` exists.
- whether core packages can import.

First-batch core packages:

```text
pydantic
numpy
requests
fastapi
uvicorn
watchdog
```

Judgment:

- running-CLI-required package missing: `blocker`.
- Dashboard-specific package missing: `warning`, unless user is running dashboard skill.

#### 6.6.2 RAG Config

Default mode checks:

- whether `.env` / env vars can read embedding config.
- whether embed base_url / model configured.
- whether embed api_key exists.
- whether rerank base_url / model / api_key exist.
- whether `vectors.db` exists and has data.
- currently inferred RAG mode: `full` / `embed_only` / `bm25_only`.

`--deep` mode only checks:

- whether embed API truly callable.
- whether rerank API truly callable.
- whether API return dimension compatible with existing vectors.

Judgment:

- missing RAG key: `warning`, must explicitly explain will degrade to BM25.
- API connectivity failed: `warning` or `blocker`, depending on whether user requires semantic retrieval.
- base_url / model clearly empty: `warning`.

#### 6.6.3 Dashboard / Node

Check:

- whether `dashboard/frontend/dist/index.html` exists.
- whether dashboard backend module can import.
- whether `dashboard/requirements.txt` exists.
- whether `dashboard/frontend/package.json` exists.

Default does not check:

- no auto `npm install`.
- no auto-start service.
- no default localhost port check.

Judgment:

- dist missing: `warning`, hint to rebuild.
- FastAPI dependency missing: `warning`.

### 6.7 Output Format

Each check must contain:

- `id`: stable error code, convenient for tests and UI display.
- `status`: `ok` / `fail` / `warn` / `skip`.
- `severity`: `blocker` / `warning` / `info`.
- `path`: related file path, empty if none.
- `expected`: expected state.
- `actual`: actual state.
- `impact`: what impact on user.
- `repair`: repair command or manual repair suggestion.

```json
{
  "ok": false,
  "project_root": "...",
  "mode": "default",
  "phase": "chapter_committed",
  "expected_profile": "after_commit",
  "blocking_count": 1,
  "warning_count": 2,
  "expected_files": {
    "required": [".webnovel/state.json", ".story-system/commits/chapter_001.commit.json"],
    "not_expected_yet": []
  },
  "checks": [
    {
      "id": "db.index.missing_table",
      "status": "fail",
      "severity": "blocker",
      "path": ".webnovel/index.db",
      "expected": "table story_events exists",
      "actual": "table missing",
      "impact": "cannot confirm whether accepted commit's event chain completed projection",
      "repair": {
        "command": "webnovel.py projections replay --from 1 --to latest --writers index",
        "manual": "if replay not yet implemented, first re-run recent chapter's chapter-commit or restore index.db from backup"
      }
    }
  ],
  "recommended_actions": [
    {
      "command": "webnovel.py rag stats",
      "reason": "vectors.db missing; semantic retrieval will fall back to BM25",
      "severity": "warning"
    }
  ]
}
```

### 6.8 Error-Code Naming

Error codes divided by domain:

```text
project.root.invalid
project.phase.unknown
project.expected_file.missing
project.structure.missing_dir
story.master.missing
story.commit.invalid_json
story.commit.invalid_status
projection.status.failed
projection.file.missing
db.index.unreadable
db.index.missing_table
db.vector.empty
rag.embed.key_missing
rag.embed.api_unreachable
python.import_missing
dashboard.dist_missing
reference.csv.invalid_header
artifact.schema_error
```

### 6.9 File Landing

- `webnovel-writer/scripts/data_modules/doctor.py`
- `webnovel-writer/scripts/data_modules/project_phase.py`
- `webnovel-writer/scripts/data_modules/project_status.py`
- `webnovel-writer/scripts/data_modules/webnovel.py`
- `webnovel-writer/skills/webnovel-doctor/SKILL.md`
- `webnovel-writer/scripts/data_modules/tests/test_doctor.py`
- `webnovel-writer/scripts/data_modules/tests/test_project_phase.py`
- `webnovel-writer/scripts/data_modules/tests/test_project_status.py`
- `docs/guides/commands.md`

### 6.10 Acceptance

- Empty project returns `ok=false`, but writes no file.
- Just-init can identify `phase=init_scaffolded` or `phase=init_ready`, and return that phase's `expected_files`.
- Just-init missing commit / summary / memory / vectors.db must not return blocker.
- Just-init missing `state.json`, `setting-collection/worldview.md`, `outline/master-outline.md` must return blocker or warning, with repair command.
- `MASTER_SETTING.json` missing in `init_scaffolded` phase is warning, in plan/write phase is blocker.
- Normal project returns `ok=true`, and shows `index.db` / `vectors.db` key tables and row counts.
- Missing `state.json` returns `project.structure` or `projection.file` class blocker.
- `index.db` missing key table returns stable error code, impact explanation and repair suggestion.
- `vectors.db` missing or empty returns warning, explicitly explains RAG will degrade to BM25.
- Missing RAG key returns warning, does not block normal writing.
- Python required package missing returns blocker, hints to install `scripts/requirements.txt`.
- Dashboard dist missing returns warning, hints build command.
- Latest commit projection failed returns actionable command.
- Default mode no network, no dependency install, no service start, no file write.
- `--deep` mode can do RAG API ping, but must be explicitly marked as deep check.
- `preflight` still runnable; its result does not conflict with doctor's quick-check part.
- All Chinese paths and Chinese file reads use UTF-8 on Windows, do not fail due to default GBK.

---

## 7. Phase 2: Chapter Runtime Gates

### 7.1 Goal

Do not rebuild a workflow/resume system. Sink the most error-prone key boundaries in `/webnovel-write` into batch-validation gates, process order constrained by Claude Code Todo.

In implementation order, Runtime Gates must depend on Artifact Validator's unified error semantics; this section describes gate design, does not mean starting before validator.

### 7.2 New Modules

Suggest adding gate shell, but `prewrite` must wrap or migrate existing `PrewriteValidator`, not rewrite a set of placeholder and contract-judgment logic:

```text
webnovel-writer/scripts/data_modules/write_gates/
  __init__.py
  prewrite.py
  precommit.py
  postcommit.py
```

Existing reuse points:

- `webnovel-writer/scripts/data_modules/prewrite_validator.py`
- `webnovel-writer/scripts/data_modules/tests/test_prewrite_validator.py`

### 7.3 Gate Design

Do not write `.workflow.json`, do not maintain step state. Each gate computes result on-site based on existing project files and artifacts.

Unified output:

```json
{
  "schema_version": "write-gate/v1",
  "chapter": 12,
  "stage": "precommit",
  "ok": false,
  "blocking": [
    {
      "type": "pending_disambiguation",
      "detail": "disambiguation_result.pending is not empty"
    }
  ],
  "warnings": [],
  "artifacts": {
    "review_result": ".webnovel/tmp/review_results.json",
    "fulfillment_result": ".webnovel/tmp/fulfillment_result.json",
    "disambiguation_result": ".webnovel/tmp/disambiguation_result.json",
    "extraction_result": ".webnovel/tmp/extraction_result.json"
  }
}
```

### 7.4 Gate Responsibilities

Runtime gate is responsible for:

- validating necessary files exist.
- validating JSON schema.
- prewrite stage reuses `PrewriteValidator`.
- judging blocking issue.
- judging whether to allow entering next natural stage.
- outputting clear failure reason and suggested command.

Runtime gate is not responsible for:

- replacing LLM drafting body.
- replacing Agent review.
- auto-deciding user adjudication.
- recording each step progress.
- replacing Claude Code Todo / session-resume capability.

### 7.5 CLI Subcommands

```bash
webnovel.py write-gate --chapter N --stage prewrite --format json
webnovel.py write-gate --chapter N --stage precommit --format json
webnovel.py write-gate --chapter N --stage postcommit --format json
```

### 7.6 Skill Changes

`webnovel-write/SKILL.md` changes to:

1. Use Claude Code Todo to build this-chapter process checklist.
2. Call `write-gate --stage prewrite`, only write after passing.
3. Call context-agent.
4. Draft body.
5. Call reviewer.
6. blocking issue recorded by Todo and adjudicated / targeted fix.
7. After polish call data-agent.
8. Call `write-gate --stage precommit`, only commit after passing.
9. Call chapter-commit.
10. Call `write-gate --stage postcommit`, only announce complete after passing.

### 7.7 Acceptance

- Missing `review_results.json` does not allow entering commit.
- reviewer has blocking issue → `precommit.ok=false`.
- disambiguation pending non-empty → `precommit.ok=false`.
- projection failed → `postcommit.ok=false`.
- gate call count controlled at 2-3 per chapter, no per-step mark.

---

## 8. Phase 3: Artifact Validator

### 8.1 Goal

Unified validation of all agent artifacts, avoid field-name drift, wrong outer wrapper, missing required fields.

### 8.2 Validation Targets

- `review_results.json`
- `fulfillment_result.json`
- `disambiguation_result.json`
- `extraction_result.json`
- `chapter_XXX.commit.json`
- `projection_status`

Authoritative schema source:

- `review_results.json`, `fulfillment_result.json`, `disambiguation_result.json`, `extraction_result.json` default to commit-required Pydantic models in `chapter_commit_schema.py`.
- Same-name / near-name models in `review_schema.py` and `entity_linker.py` are only upstream-tool local models, not final authority for commit artifact.
- If need to compat upstream local-model output, must explicitly normalize in `artifact_validator.py`, and mark compat source in output.

### 8.3 Output Error Classification

```text
schema_error
missing_artifact
blocking_review
missed_outline_node
pending_disambiguation
commit_rejected
projection_failure
unsafe_project_root
placeholder_blocker
```

### 8.4 File Landing

- `webnovel-writer/scripts/data_modules/artifact_validator.py`
- `webnovel-writer/scripts/data_modules/tests/test_artifact_validator.py`
- `webnovel-writer/scripts/data_modules/write_gates/precommit.py`

### 8.5 Acceptance

- `extraction_result.json` wrapped as `{"extraction": ...}` returns schema_error.
- `state_deltas` using old field name can compat or give clear diagnosis.
- `disambiguation_result.pending` non-empty blocks commit.
- `fulfillment_result.missed_nodes` non-empty blocks accepted commit.
- `ReviewResult` / `DisambiguationResult` same-name models no longer drift separately, validator explicitly uses commit artifact schema as authority.

---

## 9. Phase 4: Commit Immutability and Projection Log Externalization

### 9.1 Current Problem

Current `ChapterCommitService` will:

1. build commit.
2. persist commit.
3. apply projections.
4. write `projection_status` back to commit.

This makes commit carry both "fact record" and "projection execution log" responsibilities.

### 9.2 Goal

Split fact and projection execution status:

```text
.story-system/commits/chapter_012.commit.json     # immutable fact
.webnovel/projection_log.jsonl                    # projection execution log
index.db.projection_runs                           # queryable projection status
```

### 9.3 Migration Strategy

Phase 4 does not force immediate deletion of commit-internal `projection_status`, uses dual-write transition:

1. Keep commit-internal projection_status for Dashboard compat.
2. Add projection log.
3. Dashboard / doctor prefer reading projection log.
4. Later version marks commit-internal projection_status deprecated.

### 9.4 Projection Run Schema

```json
{
  "run_id": "ch012-20260604T102233",
  "chapter": 12,
  "commit_path": ".story-system/commits/chapter_012.commit.json",
  "commit_hash": "sha256:...",
  "writer": "memory",
  "status": "done",
  "started_at": "...",
  "finished_at": "...",
  "error": "",
  "retry_of": ""
}
```

### 9.5 File Landing

- `webnovel-writer/scripts/data_modules/projection_log.py`
- `webnovel-writer/scripts/data_modules/chapter_commit_service.py`
- `webnovel-writer/scripts/data_modules/tests/test_projection_log.py`
- `webnovel-writer/dashboard/app.py`
- `webnovel-writer/scripts/data_modules/story_runtime_health.py`

### 9.6 Acceptance

- Each writer has projection log after execution.
- Single writer failed does not affect other writer records.
- doctor can point out failed writer and suggested rerun command.
- commit file hash traceable in projection log.

---

## 10. Phase 5: Projection Replay / Retry

### 10.1 Goal

When projection fails can only rerun failed writer, especially external dependencies like vector / RAG.

### 10.2 CLI

```bash
webnovel.py projections status --chapter N
webnovel.py projections retry --chapter N --writer vector
webnovel.py projections retry-failed --chapter N
webnovel.py projections replay --from 1 --to 20 --writers state,index,summary
```

### 10.3 Constraints

- replay can only read accepted commit.
- rejected commit only allows state writer to update status.
- writer must be idempotent.
- retry must not modify commit fact content.

### 10.4 File Landing

- `webnovel-writer/scripts/data_modules/projection_runner.py`
- `webnovel-writer/scripts/data_modules/event_projection_router.py`
- projection writer idempotency tests

### 10.5 Acceptance

- After deleting `summaries/chapter_012.md`, retry summary can recover.
- vector API key missing → vector failed, other writers done.
- After configuring key, retry vector only supplements vector.
- After replay 1-5, state/index/summary consistent with commit chain.

---

## 11. Phase 6: Skill / Agent Contract Strengthening

### 11.1 Skill Frontmatter

7 existing Skills' `description` should upgrade from single-sentence explanation to recall rules:

- when to use.
- typical trigger words.
- not-applicable scenarios.
- whether side effects.

Example:

```yaml
description: Use when the user wants to draft, continue, rewrite, or commit a numbered webnovel chapter. Runs the full context -> draft -> review -> polish -> fact extraction -> chapter commit workflow. Do not use for pure status queries, project initialization, or dashboard-only requests.
```

### 11.2 Agent Frontmatter

All agents complete:

- `name`
- `description`
- `tools`
- `model` optional
- `output_schema`
- `failure_statuses`

### 11.3 Agent Division Adjustment

Current:

- `context-agent`
- `reviewer`
- `data-agent`
- `deconstruction-agent`

Suggest adding or splitting:

- `continuity-reviewer`: setting / timeline / character state / foreshadowing compliance.
- `style-reviewer`: style / AI smell / sentence repetition / typesetting.
- `reader-pull-reviewer`: satisfying moments / hooks / micro-payoff / reader retention.

Short-term can not add files yet, but split dimensions in `reviewer` output schema; mid-term split agent.

### 11.4 Acceptance

- prompt integrity test confirms all Skills have sufficiently long description.
- agent output schema can be validated by artifact validator.
- data-agent doc still explicitly states "does not directly write state/index/summaries/memory".

---

## 12. Phase 7: Behavior Evals

### 12.1 Goal

Learn Superpowers' headless behavior-test idea, add "whether plugin follows protocol" verification layer.

### 12.2 Eval Types

New:

```text
evals/
  skill-triggering/
  workflow-behavior/
  agent-output-schema/
  continuity-conflict/
  memory-commit/
```

### 12.3 First-Batch Cases

| Eval | Goal |
|---|---|
| init_project_safety | does not generate project in plugin dir, does not pollute canon |
| plan_outputs_executable_chapter_tasks | chapter outline contains target emotion, character change, foreshadowing, forbidden-writes |
| write_blocks_on_review_blocking_issue | blocking issue does not enter commit |
| data_agent_never_writes_projection | data-agent only produces artifacts |
| commit_drives_projection | after accepted commit, projection writer triggered |
| query_falls_back_explicitly | when main chain missing, query explicitly states fallback |
| dashboard_readonly | Dashboard API provides no write interface |

### 12.4 Runner

First do lightweight runner:

```bash
python webnovel-writer/scripts/run_behavior_evals.py --case write_blocks_on_review_blocking_issue
```

If local has no Claude Code CLI, eval can skip transcript test, only run artifact fixture test.

### 12.5 Acceptance

- Each Skill has at least 1 eval.
- `webnovel-write` covers at least success chain and blocking chain.
- eval outputs JSON report, contains pass/fail/reason/artifacts.

---

## 13. Phase 8: Manifest / Marketplace / Release Governance

### 13.1 Goal

Prevent plugin metadata, README, marketplace, version from drifting.

### 13.2 Validation Script

New:

```bash
python webnovel-writer/scripts/validate_plugin_package.py
```

Check:

- root `.claude-plugin/marketplace.json` exists.
- plugin `.claude-plugin/plugin.json` exists.
- marketplace version consistent with plugin.json version.
- README / existing CI used version location consistent with plugin.json; must not add a set of README version rules conflicting with existing Plugin Version Check.
- each `skills/*/SKILL.md` has frontmatter.
- each `agents/*.md` has frontmatter.
- LICENSE exists.
- Dashboard dist exists.
- `scripts/requirements.txt` and root `requirements.txt` parseable.
- docs command table consistent with actual Skill names.

### 13.3 Optional Manifest Enhancement

If Claude Code manifest supports, can add:

- `commands`
- `agents`
- `hooks`
- `mcpServers`
- user config schema
- screenshots / assets

If current host does not need explicit declaration, keep default dir discovery, avoid over-config.

### 13.4 Acceptance

- clean clone then validate passes.
- modifying version anywhere causes validate fail.
- deleting one Skill frontmatter causes validate fail.
- version check reuses or aligns existing CI rules, does not fight README version table / badge check.

---

## 14. Phase 9: Lightweight SessionStart Hook (optional)

### 14.1 Goal

Add optional hook, hint project status at session start, resume, clear, compact. This hook is state observer, not state machine.

### 14.2 Output

```text
Webnovel Writer initialized.
  project: Spirit Stone Manor
  story runtime: mainline ready, latest chapter 12 accepted
  projections: 4 done, 1 failed(vector)
  rag: BM25 fallback; EMBED_API_KEY missing
  next: run /webnovel-doctor for details
```

### 14.3 Constraints

- read-only.
- no dependency install.
- no file write.
- output no more than 8 lines.
- normal state only outputs summary, not full JSON.
- on failure gives one next-step command, does not expand long diagnosis.
- can be disabled via env var:

```text
WEBNOVEL_DISABLE_SESSION_HOOK=1
```

### 14.4 File Landing

- `webnovel-writer/hooks/hooks.json`
- `webnovel-writer/hooks/session_start.py`
- `webnovel-writer/.claude-plugin/plugin.json` or default hook discovery path
- `docs/operations/operations.md`

### 14.5 Acceptance

- no project root → no error, only hint unbound project.
- has project root → call `project-status --format summary` or doctor summary.
- disable env set → no output.
- after resume can refresh latest chapter / projection status.
- output no more than 1000 chars.

### 14.6 Skill-scoped Pre-check Hook (optional)

For high-risk skills like `/webnovel-write`, can hang lightweight hook in skill frontmatter:

- `PreToolUse(Bash)`: for directly running `chapter_commit.py`, `webnovel.py chapter-commit` or projection write commands, best-effort hint / fallback block. Bash string parse cannot be sole reliable guarantee, real strong guarantee must be in runtime gate and commit entry.
- `PreToolUse(Write|Edit)`: if target path is `.story-system/` commit, `.webnovel/state.json`, `index.db`, `memory_scratchpad.json` and other projection products, require going through runtime command.
- hook must be silent when passing; only return short reason when blocking.

Not recommended to put all fixed pre-checks into hooks. Suggest layering:

| Pre-check type | Where |
|---|---|
| New-session status summary | plugin-level `SessionStart` hook |
| Whether can start writing this chapter | `write-gate --stage prewrite` |
| Whether can commit this chapter | `write-gate --stage precommit` |
| Whether can announce complete | `write-gate --stage postcommit` |
| Forbid bypassing runtime writing main chain | skill-scoped `PreToolUse` hook |
| Complex repair suggestion | `/webnovel-doctor` skill |

## 15. Recommended Implementation Order

1. `project_phase` + `project-status` + `webnovel-doctor`: first build unified phase derivation, short status and read-only self-check foundation.
2. `Artifact Validator`: unified error semantics.
3. `Runtime Gates`: use pre-write / pre-commit / post-commit batch validation to constrain key boundaries, where prewrite reuses `PrewriteValidator`.
4. `Projection Log`: decouple fact and projection log.
5. `Projection Retry / Replay`: add recovery capability.
6. `Skill / Agent Contract Strengthening`: reduce prompt drift.
7. `Behavior Evals`: prove plugin protocol effective.
8. `Plugin Package Validator`: release governance.
9. Optional `SessionStart Hook`: read-only status hint.
10. Optional `Skill-scoped PreToolUse Hook`: block dangerous writes bypassing runtime.

---

## 16. Acceptance Summary Table

| Capability | Acceptance Criteria |
|---|---|
| Doctor | can read-only report dir/file/database integrity, RAG/Python/Dashboard config, and give repair suggestions |
| Project Status | can derive current chapter phase from main chain and artifacts, does not occupy existing `status_reporter.py` semantics, does not write workflow state |
| Runtime Gates | `/webnovel-write` has batch validation at three natural boundaries pre-write / pre-commit / post-commit |
| Validator | agent artifact schema drift can be uniformly diagnosed |
| Commit | commit fact and projection log separable and traceable |
| Replay | vector/summary etc. projection failure can be retried individually |
| Skills | 7 Skill descriptions sufficient for routing, long knowledge loaded on demand |
| Agents | agent has tool scope, output schema, failure status |
| Evals | each Skill at least 1 behavior eval |
| Package | manifest / marketplace / README / version validatable |
| Hook | if enabled, SessionStart read-only short output, PreToolUse only blocks dangerous actions |

---

## 17. Risks

### 17.1 Over-Engineering

Risk: to learn excellent plugins, split current system too finely.
Control: first do doctor / validator / runtime gates three high-yield modules, no rush to split 37 genre Skills.

### 17.2 Hook Side Effects

Risk: hook auto-execution makes user distrust plugin.
Control: SessionStart hook read-only, PreToolUse hook only blocks dangerous actions; all repairs and advancement must be explicitly triggered by skill / runtime.

### 17.3 Hook State-Machine Drift

Risk: if hook writes state itself, may produce three sources of truth with commit / projection / Todo.
Control: state derived on-site by shared `project_phase` / `project-status`; hook does not write state; process advancement only triggered by explicit skill / runtime command.

### 17.4 Commit Migration Breaks Dashboard

Risk: after projection_status externalized, Dashboard cannot read status.
Control: dual-write first, Dashboard prefers new projection log, old field kept one version cycle.

### 17.5 Eval Cost High

Risk: headless Claude behavior eval slow and expensive.
Control: split fast fixture eval and slow transcript eval; CI default only runs fast.

### 17.6 Skill Trigger Change

Risk: after description lengthened, trigger behavior changes.
Control: add skill-triggering eval, verify before release.

---

## 18. Invariants

No matter how refactored, must keep:

1. `.story-system/` is main-chain source of truth.
2. accepted `CHAPTER_COMMIT` is post-write fact entry.
3. `.webnovel/state.json`, `index.db`, `summaries/`, `memory_scratchpad.json` are projection / read-model.
4. `data-agent` does not directly write projection.
5. Dashboard default read-only.
6. RAG key missing must degrade to BM25.
7. User project files cannot be written to plugin dir.
8. hook is not project state source of truth.
9. `webnovel.py status` continues to keep macro creative-health report semantics, short status uses `project-status`.

---

## 19. First Batch Startable Tasks

1. Add `project_phase.py`, unify doctor / project-status / gates phase derivation.
2. Add `project_status.py`, register `project-status` subcommand, keep existing `status` forwarding to `status_reporter.py`.
3. Add `doctor.py`, reuse existing `preflight` / `build_story_runtime_health()`.
4. Register `doctor` subcommand in unified CLI.
5. Add `/webnovel-doctor` Skill.
6. Add `artifact_validator.py`, first wrap commit artifact Pydantic schema in `chapter_commit_schema.py`.
7. Add validator test fixtures for `webnovel-write`'s four agent artifacts.
8. Add `write_gates/prewrite.py`, `write_gates/precommit.py`, `write_gates/postcommit.py`, where prewrite wraps `PrewriteValidator`.
9. Modify `webnovel-write/SKILL.md`, start referencing `write-gate --stage prewrite/precommit/postcommit`, process management still uses Claude Code Todo.
10. First audit 5 projection writers' idempotency, then add `projection_log.py`.
11. Add description to 7 Skills.
12. Add `validate_plugin_package.py`, first align existing version CI, then validate frontmatter / LICENSE / dist.
13. Add optional SessionStart hook, only inject project-status summary.
14. Add optional skill-scoped PreToolUse hook, as best-effort fallback hint / block.

---

## 20. Final Judgment

`webnovel-writer`'s current biggest shortcoming is not insufficient knowledge base, nor insufficient genre templates, but:

> Part of the key flow still relies on Skill docs and Agents following the protocol.

The core of this spec is to gradually turn these protocols into runtime-verifiable mechanisms:

- doctor is responsible for knowing whether project files, database and system config are complete and usable;
- project-status is responsible for knowing where the project is at via unified phase resolver;
- runtime gates are responsible for knowing whether key boundaries can continue;
- validator is responsible for knowing whether artifacts are trustworthy;
- projection log is responsible for knowing whether read-model is synced;
- eval is responsible for proving agent really follows protocol;
- package validator is responsible for release artifacts not drifting.

Only by doing these will `webnovel-writer` truly gain the engineering stability of an excellent Claude Code plugin.
