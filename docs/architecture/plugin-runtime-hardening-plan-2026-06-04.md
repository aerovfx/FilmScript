# Plugin Runtime Hardening Implementation Plan

> Date: 2026-06-04
> Status: draft v1
> Corresponding spec: `docs/architecture/plugin-runtime-hardening-spec-2026-06-04.md`
> Scope: Break the spec into implementable, acceptable, revertible engineering plan, focus on modification scope and impact surface

---

## 1. Goal

This plan advances `webnovel-writer` from "mainly relying on Skill docs to constrain flow" to "key boundaries verifiable by runtime" plugin form.

Core deliverables:

1. `project_phase` / `project-status`: unified project-phase derivation and short-status summary, keep existing `status_reporter.py` macro creative-health report semantics.
2. `/webnovel-doctor`: phase-aware project health check, checks dirs, files, database, RAG, Python deps, Dashboard config, and gives repair suggestions.
3. `artifact_validator`: unified validation of agent artifacts, avoid field drift and schema errors.
4. `write-gate`: batch validation at three natural boundaries pre-write / pre-commit / post-commit.
5. `projection_log`: split commit fact and projection execution log.
6. `projections retry/replay`: rerun after projection failure.
7. Skill / Agent contract strengthening: per official `plugin-dev` converge frontmatter, description, tools, output constraints.
8. Behavior evals and package validator: verify plugin behavior and release-artifact consistency.
9. Optional lightweight hook: SessionStart status hint and PreToolUse dangerous-action fallback hint / block.

---

## 2. Implementation Principles

### 2.1 Observe First, Block Later, Migrate Last

Order must be:

1. First provide read-only diagnostic capability.
2. Then add schema / gate blocking.
3. Finally handle projection log and replay.

This reduces one-shot big-change impact on existing writing flow.

### 2.2 Do Not Break Existing User Projects

All new capabilities default to compat old data:

- Keep existing `.story-system/commits/*.commit.json` structure.
- Keep commit-internal `projection_status` for at least one version cycle.
- `.webnovel/state.json`, `index.db`, `summaries/`, `memory_scratchpad.json` continue as projection / read-model.
- Dashboard first compats old fields, then gradually reads new projection log.

### 2.3 Follow Official `plugin-dev`

All plugin component changes must follow:

```text
C:\Users\lcy\.claude\plugins\marketplaces\claude-plugins-official\plugins\plugin-dev
```

Landing requirements:

- Plugin structure per `plugin-structure`.
- Skill per `skill-development`, keep `SKILL.md` lean, detailed rules go to `references/`.
- Command per `command-development`.
- Agent per `agent-development`.
- Hook per `hook-development`, plugin-level `hooks/hooks.json` uses wrapper format.
- After each plugin-component change, per `plugin-validator` idea validate manifest, skills, agents, hooks, README, LICENSE, path portability.

### 2.4 Each Phase Independently Revertible

Each phase should as much as possible:

- Add more new files than modify old files.
- Old entries can continue working.
- New CLI subcommand failure does not affect old commands.
- Can revert by deleting new entry or disabling hook.

### 2.5 New Entries Uniformly UTF-8

All new CLI / hook / subprocess entries must compat Windows Chinese paths:

- CLI entry calls `enable_windows_utf8_stdio()` or equivalent logic.
- File read/write explicitly `encoding="utf-8"`.
- hook / subprocess uses `python -X utf8` or sets `PYTHONUTF8=1`.
- Does not depend on system default encoding.

---

## 3. Overall Dependency Order

```text
Phase 0 baseline audit
  ↓
Phase 1 project_phase + project-status + doctor
  ↓
Phase 2 artifact_validator
  ↓
Phase 3 write-gate
  ↓
Phase 4 projection_log
  ↓
Phase 5 projection retry/replay
  ↓
Phase 6 skill / agent contract strengthening
  ↓
Phase 7 behavior evals
  ↓
Phase 8 package validator
  ↓
Phase 9 hooks
```

Explanation:

- `project_phase` / `project-status` / `doctor` can be done first, because they are read-only, lowest risk, and subsequent gates and hooks all depend on unified phase.
- `artifact_validator` should be before `write-gate`, otherwise gate will duplicate schema judgment.
- `projection_log` should be before retry/replay, otherwise failure records unstable.
- hooks go last, because they change Claude Code session experience.

---

## 4. Phase 0: Baseline Audit and Test Freeze

### 4.1 Goal

Before touching code, confirm current functional baseline, avoid not knowing where broken during refactor.

### 4.2 Modification Scope

Prefer not changing runtime code, only add or update docs / test checklist:

- `docs/architecture/plugin-runtime-hardening-plan-2026-06-04.md`
- optionally update `docs/README.md`

### 4.3 Work Items

1. Record current CLI command table.
2. Record existing Skills, Agents, Dashboard API.
3. Run a minimal test set:
   - `test_webnovel_unified_cli.py`
   - `test_story_runtime_health.py`
   - `test_chapter_commit_service.py`
   - `test_event_projection_router.py`
   - `test_rag_adapter.py`
   - `test_dashboard_app.py`
4. Confirm whether current repo already has uncommitted changes, avoid mistakenly overwriting user modifications.

### 4.4 Impact

No user-visible behavior change.

### 4.5 Acceptance

- Record baseline test results.
- Clarify whether current failures are pre-existing issues.

---

## 5. Phase 1: `project_phase` / `project-status` / `webnovel-doctor`

### 5.1 Goal

Add unified phase resolver, short-status entry and read-only project health entry, answer:

- What stage is current project at.
- What files should this stage have.
- Whether dirs, JSON, SQLite, RAG, Python deps, Dashboard config are complete.
- How to repair when missing or abnormal.

Current code already has two related entries, must first clarify relationship:

- `webnovel.py preflight`: already has quick environment check, keep and reuse.
- `webnovel.py status`: already forwarded to `scripts/status_reporter.py`, semantics is macro creative-health report, keep not occupying.

### 5.2 Modification Scope

Add:

- `webnovel-writer/scripts/data_modules/project_phase.py`
- `webnovel-writer/scripts/data_modules/project_status.py`
- `webnovel-writer/scripts/data_modules/doctor.py`
- `webnovel-writer/scripts/data_modules/tests/test_project_phase.py`
- `webnovel-writer/scripts/data_modules/tests/test_project_status.py`
- `webnovel-writer/skills/webnovel-doctor/SKILL.md`
- `webnovel-writer/scripts/data_modules/tests/test_doctor.py`

Modify:

- `webnovel-writer/scripts/data_modules/webnovel.py`
- `docs/guides/commands.md`
- `docs/README.md`

Reusable:

- existing `_build_preflight_report()` in `webnovel.py`
- `story_runtime_health.py`
- `story_runtime_sources.py`
- `config.py`
- `_inspect_vector_db()` / `_build_env_status()` ideas in Dashboard

### 5.3 Specific Work

1. Implement shared `project_phase.py`:
   - single phase vocabulary.
   - does not write state file.
   - doctor / project-status / write-gate share.
2. Implement `project-status`:
   - `webnovel.py project-status --format json|summary`
   - keep existing `webnovel.py status` forwarding, do not change `status_reporter.py` semantics.
   - output latest accepted chapter, target chapter, phase, warnings, next action.
3. Implement `doctor` data model:
   - `DoctorReport`
   - `DoctorCheck`
   - `RepairSuggestion`
   - `ExpectedFiles`
4. Implement phase derivation in `project_phase.py`:
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
5. Implement phase-aware expected files:
   - after init only require skeleton, `state.json`, setting-collection, master-outline, `.env.example`.
   - init phase does not require commit, summary, memory, vectors.
   - plan / write / commit phases gradually raise requirements.
6. Implement file checks:
   - dir existence.
   - JSON readability.
   - key field check.
7. Implement SQLite checks:
   - whether `index.db` can open.
   - whether key tables exist.
   - row count stats.
   - whether `vectors.db` can open, whether has `vectors` table.
8. Implement system config checks:
   - Python version.
   - core package import.
   - RAG env / `.env` config.
   - Dashboard dist / requirements / package.json.
9. Register in unified CLI:
   - `webnovel.py project-status --format json|summary`
   - `webnovel.py doctor --format json|text`
   - `webnovel.py doctor --chapter N --format json|text`
   - `webnovel.py doctor --deep --format json|text`
10. Add `/webnovel-doctor` Skill:
    - read-only.
    - does not repair.
    - outputs conclusion, impact, suggested command.

### 5.4 Impact

User impact:

- Add a health-check command, does not change old flow.
- Add `project-status` short-status command, does not change existing `status` health report.
- When problem occurs user can see what missing, what impact, how to fix.

Code impact:

- `webnovel.py` adds `project-status` and `doctor` subcommands.
- Add `doctor.py` read-only module.
- Add shared phase resolver.
- Does not modify commit, state, index, summary, memory.

Risk:

- inaccurate phase derivation causes false positives.
- too strict database table list misjudges old project as broken.
- `project-status` confused with existing `status_reporter.py`.

Control:

- when phase uncertain only do low-risk checks.
- init phase missing later artifacts only returns `skip/info`.
- database checks split `required` and `observed`, avoid old-table-missing direct block.
- command name uses `project-status`, keep `status` original semantics.
- doctor quick-check part reuses `_build_preflight_report()`, avoid preflight / doctor two parallel env checks drift.

### 5.5 Acceptance

- Empty dir returns `no_project`, no traceback.
- `webnovel.py status` still runs existing `status_reporter.py`.
- `webnovel.py project-status --format json` returns unified phase.
- `preflight` still runnable, and does not conflict with doctor quick-check result.
- Just-init returns `init_scaffolded` or `init_ready`.
- Just-init missing commit / summary / vectors does not report blocker.
- `index.db` missing key table can show table name, impact, repair suggestion.
- Missing RAG key returns warning, and explains degrade to BM25.
- Default mode no network, no file write, no dependency install, no service start.
- Windows Chinese paths do not fail due to default encoding.

### 5.6 Revert

- Remove CLI `doctor` / `project-status` registration.
- Keep `doctor.py` not called also does not affect existing flow.
- Keep `project_phase.py` not called also does not affect existing flow.
- After deleting `/webnovel-doctor` Skill plugin can still run in original way.

---

## 6. Phase 2: Artifact Validator

### 6.1 Goal

Unified validation of agent artifacts, avoid `review_result`, `fulfillment_result`, `disambiguation_result`, `extraction_result` field drift.

### 6.2 Modification Scope

Add:

- `webnovel-writer/scripts/data_modules/artifact_validator.py`
- `webnovel-writer/scripts/data_modules/tests/test_artifact_validator.py`

May modify:

- `chapter_commit_service.py`
- `chapter_commit.py`
- `chapter_commit_schema.py`

### 6.3 Specific Work

1. Define unified error types:
   - `schema_error`
   - `missing_artifact`
   - `blocking_review`
   - `missed_outline_node`
   - `pending_disambiguation`
   - `projection_failure`
2. Wrap existing Pydantic schema. Authoritative source unified to commit-required models in `chapter_commit_schema.py`:
   - `ReviewResult`
   - `FulfillmentResult`
   - `DisambiguationResult`
   - `ExtractionResult`
3. Clarify same-name / near-name model boundaries:
   - `review_schema.py` is reviewer / review pipeline local model.
   - disambiguation model in `entity_linker.py` is entity-linking local model.
   - artifact_validator only uses commit artifact schema as final submission authority.
4. Provide unified entry:
   - `validate_review_result(path)`
   - `validate_fulfillment_result(path)`
   - `validate_disambiguation_result(path)`
   - `validate_extraction_result(path)`
   - `validate_chapter_commit(path)`
5. Allow compat known old fields, give clear diagnosis when cannot compat.

### 6.4 Impact

User impact:

- Earlier discover agent output errors before commit.
- Errors change from Python traceback to structured explanation.

Code impact:

- `chapter_commit_service` can gradually change to depend on validator.
- Subsequent `write-gate` reuses validator, reduce duplicate validation.

Risk:

- too strict schema may block old artifacts.
- wrong same-name model selection creates new schema drift.

Control:

- first version compats old fields or warning.
- only errors clearly affecting commit correctness are blocker.
- fix authoritative source as `chapter_commit_schema.py` in code comments and tests.

### 6.5 Acceptance

- Missing artifact returns `missing_artifact`.
- JSON outer wrapper error returns `schema_error`.
- `disambiguation.pending` non-empty returns blocker.
- reviewer blocking issue returns blocker.
- `ReviewResult` / `DisambiguationResult` same-name models not mixed.

### 6.6 Revert

- `chapter_commit_service` keeps old validation path.
- If validator has error, can first only use for doctor / gate report, not block commit.

---

## 7. Phase 3: Runtime Gates

### 7.1 Goal

Add chapter-writing key-boundary validation:

- `prewrite`
- `precommit`
- `postcommit`

### 7.2 Modification Scope

Add:

- `webnovel-writer/scripts/data_modules/write_gates/__init__.py`
- `webnovel-writer/scripts/data_modules/write_gates/prewrite.py`
- `webnovel-writer/scripts/data_modules/write_gates/precommit.py`
- `webnovel-writer/scripts/data_modules/write_gates/postcommit.py`
- `webnovel-writer/scripts/data_modules/tests/test_write_gates.py`

Modify:

- `webnovel-writer/scripts/data_modules/webnovel.py`
- `webnovel-writer/skills/webnovel-write/SKILL.md`
- `docs/guides/commands.md`

Reuse:

- `webnovel-writer/scripts/data_modules/prewrite_validator.py`
- `webnovel-writer/scripts/data_modules/tests/test_prewrite_validator.py`

### 7.3 Specific Work

1. Register CLI:
   - `webnovel.py write-gate --chapter N --stage prewrite --format json`
   - `webnovel.py write-gate --chapter N --stage precommit --format json`
   - `webnovel.py write-gate --chapter N --stage postcommit --format json`
2. `prewrite` check must wrap `PrewriteValidator`:
   - project root.
   - whether phase allows writing.
   - whether Story System contract complete.
   - placeholder blocker.
3. `precommit` check:
   - body file.
   - review / fulfillment / disambiguation / extraction artifacts.
   - artifact validator.
   - blocking issue.
4. `postcommit` check:
   - commit file.
   - `projection_status`.
   - summary / index / memory / backup basic existence.
5. Update `/webnovel-write`:
   - use Claude Code Todo for process.
   - only call gate at natural boundaries.

### 7.4 Impact

User impact:

- Chapter-writing flow adds 2-3 deterministic checks.
- Pre-commit errors clearer.

Code impact:

- `/webnovel-write` execution instructions will change.
- `webnovel.py` adds subcommand.
- Existing `PrewriteValidator` becomes prewrite gate's underlying implementation, avoid two-logic drift.

Risk:

- gate too strict interrupts writing experience.
- gate too loose cannot improve reliability.
- if rewrite prewrite logic, will drift from existing `PrewriteValidator`.

Control:

- first version only blocks clearly untrustworthy states.
- warning does not block.
- all gate outputs repair suggestion.
- prewrite does not rewrite, first adapt existing validator output.

### 7.5 Acceptance

- Missing review artifact → `precommit.ok=false`.
- blocking review → `precommit.ok=false`.
- disambiguation pending → `precommit.ok=false`.
- projection failed → `postcommit.ok=false`.
- init phase calling `prewrite` can give clear next-step suggestion.
- Existing `test_prewrite_validator.py` continues to pass.

### 7.6 Revert

- `/webnovel-write` can temporarily return to old flow.
- CLI subcommand kept but not called by Skill.

---

## 8. Phase 4: Projection Log

### 8.1 Goal

Split commit fact and projection execution status, reduce the confusion of commit file simultaneously carrying fact and execution log.

Before starting must first confirm current pain points:

- Whether projection failed after unable to locate writer.
- Whether commit-internal `projection_status` inconsistent with actual read-model.
- Whether Dashboard / doctor really needs cross-writer execution history.

If no real pain point, this phase can be deferred, only keep doctor's diagnosis of existing `projection_status`.

### 8.2 Modification Scope

Add:

- `webnovel-writer/scripts/data_modules/projection_log.py`
- `webnovel-writer/scripts/data_modules/tests/test_projection_log.py`

Modify:

- `chapter_commit_service.py`
- `event_projection_router.py`
- `story_runtime_health.py`
- `doctor.py`
- `dashboard/app.py`

### 8.3 Specific Work

1. Add JSONL projection log:
   - `.webnovel/projection_log.jsonl`
2. Define run schema:
   - `run_id`
   - `chapter`
   - `commit_path`
   - `commit_hash`
   - `writer`
   - `status`
   - `started_at`
   - `finished_at`
   - `error`
3. `chapter_commit_service.apply_projections()` each writer writes one log.
4. Keep commit-internal `projection_status` dual-write.
5. doctor prefers reading projection log, falls back to commit-internal field when missing.
6. Dashboard first compats read, no big refactor.

### 8.4 Impact

User impact:

- When projection fails can see which writer failed.
- Does not change chapter-commit command.

Data impact:

- Add `.webnovel/projection_log.jsonl`.
- Commit file structure temporarily does not delete fields.

Risk:

- Dual-write inconsistency.
- Dashboard read logic slightly more complex.
- New projection log forms second execution-status source.

Control:

- projection log write failure should not affect commit main flow, but must warning.
- doctor reports dual-write inconsistency.
- Keep one clear decision point: construct only after confirming benefit > dual-write complexity.

### 8.5 Acceptance

- Each writer has projection log.
- Single writer failed does not affect other writer records.
- doctor can point out failed writer.
- commit-internal `projection_status` still exists.

### 8.6 Revert

- Dashboard and doctor fall back to commit-internal `projection_status`.
- Deleting projection log does not affect commit read.

---

## 9. Phase 5: Projection Retry / Replay

### 9.1 Goal

After projection failure can rerun by writer, especially vector / summary / memory.

This phase has highest risk, must first complete writer idempotency audit and tests.

### 9.2 Modification Scope

Add:

- `webnovel-writer/scripts/data_modules/projection_runner.py`
- `webnovel-writer/scripts/data_modules/tests/test_projection_runner.py`

Modify:

- `event_projection_router.py`
- `webnovel.py`
- projection writer tests

### 9.3 Specific Work

1. Add CLI:
   - `webnovel.py projections status --chapter N`
   - `webnovel.py projections retry --chapter N --writer vector`
   - `webnovel.py projections retry-failed --chapter N`
   - `webnovel.py projections replay --from 1 --to 20 --writers state,index,summary`
2. First audit 5 writers' idempotency:
   - `state`
   - `index`
   - `summary`
   - `memory`
   - `vector`
3. Complete writer idempotency tests, especially focus on:
   - word-count duplicate accumulation.
   - relationship / event duplicate insertion.
   - memory duplicate sedimentation.
   - vector chunk duplicate.
4. runner only reads accepted commit.
5. retry does not modify commit fact content.
6. retry result writes projection log, and compats update old `projection_status`.

### 9.4 Impact

User impact:

- After external dependency failure no need to rewrite whole chapter.
- Can separately supplement vector / summary.

Data impact:

- projection read-model may be rebuilt.
- Need to ensure idempotency, avoid duplicate accumulating word count or duplicate relationships.

Risk:

- Insufficient idempotency causes duplicate data.
- replay command once wrong, impact scope larger than single-chapter commit.

Control:

- First separately add idempotency tests for state/index/summary/memory/vector writers.
- replay default requires explicit chapter range.
- Default does not provide whole-book unbounded replay.

### 9.5 Acceptance

- After deleting summary, retry summary can recover.
- Repeated replay same chapter does not duplicate accumulating state / index / memory / vector data.
- vector key missing → vector failed, other writers done.
- After configuring key, retry vector only supplements vector.
- After replay, state/index/summary consistent with commit chain.

### 9.6 Revert

- Hide or take offline projections CLI.
- Continue using old chapter-commit flow.

---

## 10. Phase 6: Skill / Agent Contract Strengthening

### 10.1 Goal

Per official `plugin-dev` strengthen Skill / Agent trigger, tool scope, output contract.

### 10.2 Modification Scope

Modify:

- `webnovel-writer/skills/*/SKILL.md`
- `webnovel-writer/agents/*.md`
- `webnovel-writer/scripts/data_modules/tests/test_prompt_integrity.py`

Optionally add:

- `webnovel-writer/agents/continuity-reviewer.md`
- `webnovel-writer/agents/style-reviewer.md`
- `webnovel-writer/agents/reader-pull-reviewer.md`

### 10.3 Specific Work

1. Skill frontmatter:
   - Strengthen `description`, write clear trigger scenario and non-applicable scenario.
   - Keep `SKILL.md` lean.
   - Large rules move to `references/`.
2. Agent frontmatter:
   - Add `name`.
   - Add specific `description`.
   - Clarify `tools`.
   - Add `model` when needed.
3. Agent output contract:
   - reviewer output dimensions fixed.
   - data-agent clearly only produces artifacts, does not write projection.
   - context-agent clarifies context priority.
4. Use plugin-dev's validate-agent rules for manual or script validation.

### 10.4 Impact

User impact:

- Claude Code triggering skills and agents more stable.
- Mis-trigger and missed-trigger reduced.

Code impact:

- Mainly prompt / markdown files.
- May affect Claude Code selection behavior.

Risk:

- description change causes trigger-habit change.

Control:

- Change one group test one group.
- Add prompt integrity tests.
- Keep command names unchanged.

### 10.5 Acceptance

- 7 Skills all have clear trigger-type description.
- 4 existing Agent frontmatter meet plugin-dev requirements.
- prompt integrity tests pass.
- data-agent doc still clearly does not write state/index/summary/memory.

### 10.6 Revert

- Single Skill / Agent can independently rollback frontmatter.
- Does not affect Python runtime.

---

## 11. Phase 7: Behavior Evals

### 11.1 Goal

Verify plugin at real behavior level whether follows protocol, not only validate Python functions.

### 11.2 Modification Scope

Add:

- `webnovel-writer/evals/`
- `webnovel-writer/scripts/run_behavior_evals.py`
- `webnovel-writer/evals/fixtures/`

Modify:

- CI / local test docs.
- `docs/operations/operations.md`

### 11.3 Specific Work

1. Build eval classification:
   - skill triggering
   - workflow behavior
   - agent output schema
   - continuity conflict
   - memory commit
2. First-batch cases:
   - init does not pollute plugin dir.
   - write blocks on blocking issue before commit.
   - data-agent does not write projection.
   - commit drives projection.
   - dashboard read-only.
3. Runner outputs JSON report.
4. Distinguish fast fixture eval and slow transcript eval.

### 11.4 Impact

User impact:

- No direct usage change.
- Higher reliability before release.

Code impact:

- Add test assets.
- CI time may increase.

Risk:

- transcript eval costly, slow.

Control:

- Default only run fast.
- slow only before release or manual run.

### 11.5 Acceptance

- Each Skill at least one eval.
- `/webnovel-write` covers success chain and blocking chain.
- eval report has pass/fail/reason/artifacts.

### 11.6 Revert

- eval can be temporarily skipped when not in default flow.
- Does not affect runtime.

---

## 12. Phase 8: Package Validator

### 12.1 Goal

Prevent manifest, marketplace, README, version, frontmatter drift.

### 12.2 Modification Scope

Add:

- `webnovel-writer/scripts/validate_plugin_package.py`
- `webnovel-writer/scripts/tests/test_validate_plugin_package.py`

Modify:

- `docs/operations/plugin-release.md`
- `docs/guides/commands.md`

### 12.3 Specific Work

1. Check `.claude-plugin/plugin.json`:
   - name kebab-case.
   - version semver.
   - description non-empty.
2. Check marketplace file.
3. Reuse or align existing Plugin Version Check:
   - marketplace version.
   - plugin.json version.
   - README existing version location / version table.
   - Do not add a set of README badge rules conflicting with existing CI.
4. Check skills frontmatter.
5. Check agents frontmatter.
6. Check hooks schema.
7. Check LICENSE.
8. Check Dashboard dist.
9. Check no hardcoded local absolute path.

### 12.4 Impact

User impact:

- Release package more stable.

Code impact:

- Add pre-release validation script.

Risk:

- Validation rules too strict affect dev stage.
- Version check inconsistent with existing CI, causes local pass but CI fail, or vice versa.

Control:

- Distinguish `--strict` and default mode.
- Default only blocks obvious errors.
- First read existing CI / release docs, then implement version check.

### 12.5 Acceptance

- Clean clone validation passes.
- Version drift anywhere fails.
- Version drift rule consistent with existing CI.
- Deleting Skill frontmatter fails.
- hooks path not using `${CLAUDE_PLUGIN_ROOT}` warns or fails.

### 12.6 Revert

- Release flow temporarily does not call validator.
- Does not affect plugin running.

---

## 13. Phase 9: Hooks

### 13.1 Goal

Based on Phase 1's `project-status` provide lightweight status summary, and best-effort hint / block for most dangerous runtime-bypass writes.

### 13.2 Modification Scope

Add:

- `webnovel-writer/hooks/hooks.json`
- `webnovel-writer/hooks/session_start.py`
- `webnovel-writer/hooks/scripts/guard-runtime-write.py`

Modify:

- `webnovel-writer/scripts/data_modules/webnovel.py`
- `webnovel-writer/.claude-plugin/plugin.json`, only modify when need explicit declare hook path.
- `docs/operations/operations.md`

### 13.3 Specific Work

1. `SessionStart` hook:
   - Only outputs short summary.
   - Does not write file.
   - Does not run full doctor.
   - Calls `webnovel.py project-status --format summary`.
   - Can disable via env.
2. `PreToolUse` hook:
   - Blocks direct write to `.story-system/commits`.
   - Blocks direct write to `.webnovel/state.json`, `index.db`, `memory_scratchpad.json`.
   - Best-effort detect dangerous commit / projection commands bypassing gate in Bash.
   - Does not treat Bash string parsing as sole hard guarantee.
3. Per plugin-dev hook-development validate:
   - `hooks/hooks.json` uses wrapper format.
   - hook command uses `${CLAUDE_PLUGIN_ROOT}`.
   - hook script validates stdin JSON.

### 13.4 Impact

User impact:

- New conversation can see short status.
- Direct change to main chain / projection files will be blocked or require explicit runtime.

Code impact:

- Add hooks dir.
- Claude Code session start has one more lightweight command.

Risk:

- hook output too long affects context.
- hook mis-blocks developer debugging.
- Bash command variants too many, hook cannot reliably identify all bypass ways.

Control:

- Output limited to 8 lines / 1000 chars.
- Provide disable env.
- First only block most dangerous paths.
- Real reliability still guaranteed by runtime gate and commit entry.

### 13.5 Acceptance

- No project root → no error.
- Has project root → outputs latest chapter / phase / next action.
- Disable env set → no output.
- Direct write to commit file blocked.
- Legal runtime command not blocked.
- `webnovel.py status` still keeps macro creative-health report semantics.

### 13.6 Revert

- Delete or disable `hooks/hooks.json`.
- Keep `project-status` CLI does not affect old flow.

---

## 14. Cross-Impact Analysis

### 14.1 Project Health Entry Ownership

| Entry | Current/target responsibility | Output | Deep check? | Writes file? |
|---|---|---|---|---|
| `preflight` | Quick env check, keep compat | text/json | No | No |
| `project-status` | Machine-readable short status, phase, next step | summary/json | No | No |
| `doctor` | File/database/config health and repair suggestions | text/json | Default no, `--deep` optional | No |
| `status` / `status_reporter.py` | Macro creative-health report, e.g. characters, foreshadowing, satisfying moments, relationship graph | markdown/text | Yes, leans creative analysis | Current may output report file, semantics kept |
| `build_story_runtime_health()` | Internal main-chain readiness helper | dict | No | No |

Principle:

- Do not cram all problems into one command.
- Do not change existing `status` semantics.
- doctor reuses preflight and story runtime health, does not duplicate logic.

### 14.2 Impact on User Commands

New commands:

- `/webnovel-doctor`
- `webnovel.py doctor`
- `webnovel.py write-gate`
- `webnovel.py projections`
- `webnovel.py project-status`

Existing commands kept:

- `/webnovel-init`
- `/webnovel-plan`
- `/webnovel-write`
- `/webnovel-review`
- `/webnovel-query`
- `/webnovel-dashboard`
- `/webnovel-learn`

Existing `webnovel.py status` keeps forwarding to `status_reporter.py`.

### 14.3 Impact on Project Data

New files:

- `.webnovel/projection_log.jsonl`
- May add `.webnovel/tmp/*` validation convention.

Not changing:

- `.story-system/` main-chain source-of-truth status.
- accepted commit is post-write fact entry.
- `.webnovel/*` is projection / read-model.

### 14.4 Impact on Dashboard

Short-term:

- Dashboard keeps read-only.
- Continues to compat commit-internal `projection_status`.

Mid-term:

- Dashboard can display projection log.
- System page can display doctor / project-status summary.

Risk:

- Dashboard frontend bundle may need rebuild.

### 14.5 Impact on RAG

Default:

- Missing key degrades to BM25.
- `vectors.db` missing only warning.

Deep check:

- Only then tests API connectivity.

### 14.6 Impact on Testing

New test volume is large, needs layering:

- unit test: doctor / validator / gates / projection log.
- integration test: chapter commit + projection.
- behavior test: skill / agent protocol.
- release test: package validator.

---

## 15. Suggested PR Splits

### PR 1: Phase Resolver + Project Status + Doctor

Includes:

- shared `project_phase`.
- `project-status` CLI.
- doctor runtime.
- doctor CLI.
- `/webnovel-doctor` Skill.
- doctor tests.
- preflight quick-check reuse relationship.

Excludes:

- write-gate.
- projection log.
- hooks.

### PR 2: Validator + Gates

Includes:

- artifact validator.
- write-gates.
- prewrite gate wraps existing `PrewriteValidator`.
- `/webnovel-write` update.
- gate tests.

### PR 3: Projection Writer Idempotency Audit

Includes:

- state / index / summary / memory / vector writer idempotency tests.
- replay risk assessment.

### PR 4: Projection Log

Includes:

- projection log.
- chapter commit dual-write.
- doctor / dashboard compat read.

### PR 5: Projection Retry / Replay

Includes:

- projection runner.
- projections CLI.
- writer idempotency tests.

### PR 6: Skill / Agent Contract

Includes:

- skill frontmatter.
- agent frontmatter.
- prompt integrity tests.

### PR 7: Evals + Package Validator

Includes:

- behavior eval runner.
- validate plugin package.
- release docs.

### PR 8: Hooks

Includes:

- SessionStart hook.
- PreToolUse guard.
- plugin-dev hook validation.

---

## 16. Overall Acceptance

After completion should satisfy:

1. User can run `/webnovel-doctor` to understand whether project files, database, config are normal.
2. `project-status` can give short status, and does not occupy existing `status_reporter.py`.
3. Just-init will not misreport due to missing commit / summary / vectors.
4. Chapter-writing only adds gate checks at three natural boundaries.
5. agent artifact schema errors can be uniformly reported.
6. projection failure can locate writer, and can rerun.
7. commit fact and projection execution log distinguishable.
8. Skill / Agent / Hook structure conforms to official `plugin-dev`.
9. Before release can validate plugin package consistency.

---

## 17. Minimal First Version

If want to land a high-yield version ASAP, suggest only doing the first four:

1. `doctor`
2. `project-status` / `project_phase`
3. `artifact_validator`
4. `write-gate`

These four can first solve the most core problems:

- User knows where project is broken.
- runtime and short status share same phase.
- runtime knows whether agent artifacts are trustworthy.
- chapter-writing key boundaries no longer only constrained by docs.

Projection log, retry/replay, hooks and evals can continue after foundation is stable.
