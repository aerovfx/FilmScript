# 2026-06-10 Full-Project Audit Fix Plan

> **Status (2026-06-11 truncated):** This plan is truncated and closed with v7 strangling convergence (`docs/architecture/story-repo-spec-2026-06-10.md`).
> - **Done and kept**: Phase 0 all (Task 1-6, text-data safety) + Task 7 — this is the foundation v6 user data and v7 migrator read.
> - **Voided**: Task 8-24 (Phase 1 data chain), Task 26-27, Task 29-34 — target modules (SQLite projection, event log, v6 prompts, dashboard, CLI boilerplate) wholly deleted in v7, no longer repaired.
> - **Exception kept as independent candidate**: Task 25 (embed default egress, privacy issue, must fix if v6 branch re-releases maintenance version), Task 28 (CI hardening, repo-level, v7 reuses, can do standalone anytime).
> - Branch `fix/audit-2026-06-10` merged into master with Phase 0 + Task 7, as v6's last batch of data-safety maintenance.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all high/medium-severity issues found in 2026-06-10 deep audit: data-loss paths, data-chain inconsistency, skill-flow deadlock, privacy egress default and guard bypass.

**Architecture:** Four phases by harm priority (P0 data safety → P1 data chain & flow → P2 security privacy → P3 quality hygiene). Each phase independently deliverable, all-green before next phase. Fix节奏: "write probe test to reproduce first → fix → verify"; outdated text-level assertions rewritten per "tests are probes not constraints" principle.

**Tech Stack:** Python 3.10+ / pytest (Windows set `PYTHONUTF8=1`) / SQLite / FastAPI.

**Audit report source:** This plan corresponds to 2026-06-10 session's six-dimension audit conclusions (data chain, prompts, code quality, dashboard+hooks, data safety+CI, repo hygiene+residual modules).

**Run tests:** `python -m pytest` (root pytest.ini configured testpaths and cov-fail-under=90).

---

## Phase 0 — P0 Data Safety (text is non-regenerable data)

### Task 1: backup_manager backup failure must not report success

**Files:**
- Modify: `webnovel-writer/scripts/backup_manager.py:150-166, 228-254`
- Test: `webnovel-writer/scripts/tests/test_backup_manager.py`

- [x] **Step 1: write failure test**: in tmp git repo deliberately not configure `user.name/user.email` (`git config --local --unset` or `-c user.useConfigOnly=true`), call `backup()`, assert returns failure and output contains "backup failed", no `ch{N}` tag produced.
- [x] **Step 2: run confirm current state is fake success** (currently prints ✅ and tags on old HEAD).
- [x] **Step 3: fix `_run_git_command`**: `check=False` branch changed to return `(result.returncode == 0, stdout, stderr)`; caller judges by real exit code. "nothing to commit" changed to judge from stdout/stderr text (current `:233`'s `if not success and "nothing to commit"` is always-false dead code, delete and rewrite together):

```python
def _run_git_command(self, args, check=True):
    result = subprocess.run(
        ["git", *args], cwd=self.project_root,
        capture_output=True, text=True, encoding="utf-8",
    )
    ok = result.returncode == 0
    if check and not ok:
        raise BackupError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return ok, result.stdout, result.stderr
```

- [x] **Step 4: `backup()` abort on commit failure**: no tag, return non-zero, output contains fix guidance (prompt run `git config user.name/user.email`); "nothing to commit" treated as success but prompt "no change this chapter".
- [x] **Step 5: run all backup tests pass then commit** `fix: backup reports real git failures and aborts tagging`.

### Task 2: rollback changed to forward-roll recovery, remove detached HEAD and hardcoded master

**Files:**
- Modify: `webnovel-writer/scripts/backup_manager.py:294-307`
- Test: `webnovel-writer/scripts/tests/test_backup_manager.py`

- [x] **Step 1: write test**: build tmp repo (default branch named `main`), tag two ch, rollback to ch1 then assert: (a) still on original branch (`git symbolic-ref HEAD` succeeds and is main); (b) workspace content equals ch1; (c) `git log` has one extra "rollback" commit (history not lost).
- [x] **Step 2: implement forward-roll rollback**:

```python
def rollback(self, chapter: int) -> bool:
    tag = f"ch{chapter}"
    ok, _, _ = self._run_git_command(["rev-parse", "--verify", tag], check=False)
    if not ok:
        print(f"❌ backup point {tag} does not exist"); return False
    ok, _, err = self._run_git_command(["checkout", tag, "--", "."], check=False)
    if not ok:
        print(f"❌ rollback failed: {err}"); return False
    self._run_git_command(["add", "-A"], check=False)
    ok, _, err = self._run_git_command(
        ["commit", "-m", f"rollback: restore to {tag} backup point"], check=False)
    # workspace same as tag then commit reports nothing to commit, treated as success
    return True
```

- [x] **Step 3: delete all `checkout master` hardcoding**; anywhere needing branch name use `git symbolic-ref --short HEAD` probe.
- [x] **Step 4: tests pass then commit** `fix: rollback is forward-only, never detaches HEAD`.

### Task 3: degraded backup without Git must cover text, or prominently state none

**Files:**
- Modify: `webnovel-writer/scripts/backup_manager.py:175-195`
- Test: `webnovel-writer/scripts/tests/test_backup_manager.py`

- [x] **Step 1: write test**: simulate git unavailable (monkeypatch `_git_available` to False), project contains `正文/第0001章-x.md`, call `backup()` then assert backup dir has that text file copy.
- [x] **Step 2: implement**: degraded path `shutil.copytree/copy2` `正文/`, `大纲/`, `设定集/`, `.webnovel/state.json` all into `.webnovel/backups/snapshot_ch{N}_{ts}/`; output clearly lists what backed up. Keep count-based rolling cleanup (max 10 snapshots).
- [x] **Step 3: commit** `fix: degraded backup covers manuscript files`.

### Task 4: init re-run must not silently overwrite corrupted state.json

**Files:**
- Modify: `webnovel-writer/scripts/init_project.py:294-300,366`
- Test: `webnovel-writer/scripts/data_modules/tests/test_init_project_pruning.py`

- [x] **Step 1: write test**: put illegal JSON state.json in project, re-run init, assert (a) generated `state.corrupt_*.json` copy with content equal original corrupted text; (b) output contains warning.
- [x] **Step 2: implement**: on catch `json.JSONDecodeError` first `shutil.copy2(state_path, state_path.with_name(f"state.corrupt_{ts}.json"))` then rebuild, print "⚠️ original state.json corrupted, saved as ... for manual recovery".
- [x] **Step 3: commit** `fix: preserve corrupt state.json before rebuilding`.

### Task 5: migration script with error not prune, writeback atomic

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/migrate_state_to_sqlite.py:235-258`
- Test: `webnovel-writer/scripts/data_modules/tests/test_migrate_state_to_sqlite.py`

- [x] **Step 1: write test**: construct one entity that fails migration (e.g. illegal type triggers `stats["errors"] += 1`), run migration, assert `entities_v3` field still in state.json, CLI exit code non-zero.
- [x] **Step 2: implement**: `if stats["errors"]: skip step 5 prune, output "migration errors exist, kept original field"`; step 5's bare `open('w')+json.dump` changed to `security_utils.atomic_write_json(state_path, state, use_lock=True)`.
- [x] **Step 3: commit** `fix: migration never prunes state on partial failure`.

### Task 6: archive_manager atomic write + restore order reversed

**Files:**
- Modify: `webnovel-writer/scripts/archive_manager.py:125-128, 494-508`
- Test: `webnovel-writer/scripts/data_modules/tests/test_archive_manager.py`

- [x] **Step 1: `save_archive` use `atomic_write_json`** (archive is only copy after data moved out of state).
- [x] **Step 2: `restore_character` order reversed**: first restore SQLite, after confirm success then delete that character from archive JSON; SQLite failure archive stays original and returns error. Write test: monkeypatch SQLite restore throws, assert archive file not modified.
- [x] **Step 3: commit** `fix: archive writes atomic, restore is delete-last`.

---

## Phase 1 — P1 Data Chain Consistency and Flow Deadlock

### Task 7: SQLite sync failure must be visible

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/state_manager.py:393-416, 450-451, 606-609`
- Test: `webnovel-writer/scripts/data_modules/tests/test_state_manager_extra.py`

- [x] `_sync_to_sqlite` failure: `save_state` return value carries `sqlite_sync_ok=False`; `process-chapter` CLI per this `emit_error` (exit code non-zero), error info prompts run `webnovel.py projections retry --chapter N` to compensate. Test: monkeypatch `_sync_pending_patches_to_sqlite` throws, assert CLI exit non-zero and stdout JSON contains compensation guidance.
- [x] commit `fix: surface sqlite sync failures in process-chapter`.

### Task 8: get_state_changes / get_relationships go SQLite fallback

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/state_manager.py:972-977, 1005-1013`
- Test: `webnovel-writer/scripts/data_modules/tests/test_state_manager_extra.py`

- [ ] Like `get_entity`'s SQLite-first pattern: first query `self._sql_state_manager.get_entity_state_changes / get_recent_relationships`, no result then fallback memory. Test: use a new StateManager instance (simulate cross-process) to read previously saved state_changes, assert non-empty.
- [ ] Sync change `record_state_change` (:953-966) to only append `_pending_state_changes`, delete append to `self._state["state_changes"]`.
- [ ] commit `fix: state change reads hit sqlite, not stale memory`.

### Task 9: event mirror delete-then-insert per chapter

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/event_log_store.py:109-146`
- Test: `webnovel-writer/scripts/data_modules/tests/test_event_log_store.py`

- [ ] Test: same chapter first write events A, then整体覆盖 write events B (different event_id), assert `story_events` table only B left. Implement: `_write_sqlite_mirror` in same transaction `DELETE FROM story_events WHERE chapter = ?` then INSERT (JSON file is this chapter's fact source).
- [ ] commit `fix: event mirror mirrors, not accumulates`.

### Task 10: projection writer reuse chapter_status monotonic state machine

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/state_projection_writer.py:59-65, 95`
- Test: `webnovel-writer/scripts/data_modules/tests/test_projection_writers.py`

- [ ] Extract `StateManager.set_chapter_status`'s rank comparison logic into module-level function `should_transition(old, new) -> bool` (same file or schemas.py), two places share. Test: first project accepted commit then replay history rejected commit, assert status still `chapter_committed`.
- [ ] commit `fix: projection respects chapter status monotonicity`.

### Task 11: total_words unified to projection recompute

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/state_manager.py:280-285`
- Test: rewrite existing assertions involving `update_progress` incremental (probe principle)

- [ ] `update_progress` no longer accumulate `total_words`, only update `current_chapter/last_updated`; word count always by `StateProjectionWriter` full recompute. grep whole repo `total_words` write points confirm only projection left.
- [ ] commit `fix: single source of truth for total_words`.

### Task 12: add_entity alias into pending transaction

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/state_manager.py:839-854`
- Test: `webnovel-writer/scripts/data_modules/tests/test_state_manager_extra.py`

- [ ] Alias write changed to append `_pending_alias_entries`, uniformly land in `_sync_pending_patches_to_sqlite`. Test: after `add_entity` not call `save_state` directly query SQLite, assert alias not yet landed; after `save_state` assert landed.
- [ ] commit `fix: alias writes go through pending patch transaction`.

### Task 13: SQLite connection unified WAL + busy_timeout + batch transaction

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/index_manager.py:626-634` (`_get_conn`)
- Test: existing tests regression

- [ ] `_get_conn` execute `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=8000`. Projection path merge "one commit per method" into single connection single transaction (`IndexProjectionWriter.apply` holds one connection passed to each write method).
- [ ] commit `perf: WAL + single transaction per projection`.

### Task 14: projection_log locked append + compact

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/projection_log.py:101-119`
- Test: `webnovel-writer/scripts/data_modules/tests/test_projection_log.py`

- [ ] Before append hold `FileLock(path + ".lock")`; add `compact_projection_log(project_root, keep_per_chapter=3)` function and hook to `webnovel.py projections compact` subcommand. Test: write 5 same-chapter runs then compact, assert only 3 left and latest.
- [ ] commit `fix: projection log locked appends + compact command`.

### Task 15: legacy commit path add guardrail

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/memory_contract_adapter.py:71-120, 147-156`
- Test: `webnovel-writer/scripts/data_modules/tests/test_memory_contract_adapter.py`

- [ ] `_commit_chapter_legacy` entry check: when chapter already has accepted commit file refuse and error "this chapter already went Story System main chain, forbid legacy double-write". docstring mark deprecated.
- [ ] `chapter_commit_service.py:182-188`: amend proposal persistence moved after projection success (or write with `projection_run_id`, projection-failed run's proposal not in pending list before `projections retry` success). Test: when projection all fail assert override_ledger no new pending proposal.
- [ ] commit `fix: legacy commit path refuses to double-write mainline chapters`.

### Task 16: clean dangerous dead code

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/state_manager.py:708-711`

- [ ] Delete `_save_state` (no caller in whole repo, bypasses pending-merge semantics). grep confirm no reference then commit `chore: remove dangerous dead _save_state`.

### Task 17: write SKILL blocking deadlock release

**Files:**
- Modify: `webnovel-writer/skills/webnovel-write/SKILL.md` (L162 Step 3, L245, L327-331)
- Test: `webnovel-writer/scripts/data_modules/tests/test_prompt_integrity.py` (if related assertion linkage change)

- [ ] Step 3 changed to: after blocking point-fix **must re-run review-pipeline regenerate review_results.json** (clear fixed items), then enter Step 4; and add "author adjudication keeps current version" exit: reference `references/review/blocking-override-guidelines.md`, write use override ledger command record then commit can pass with `--override-ref`. Both paths must be self-consistent with `chapter_commit_service.py:45`'s `rejected = bool(review.blocking_count)` judgment (override path need confirm service supports, if not add override_ref exemption logic in service — first read `chapter_commit_service.py` and `override_ledger_service.py` confirm existing mechanism before writing).
- [ ] commit `fix(skill): unblock the blocking-fix path in write flow`.

### Task 18: wrong commands in prompts fix

**Files:**
- Modify: `webnovel-writer/skills/webnovel-query/SKILL.md:78`, `webnovel-writer/agents/reviewer.md:30`

- [ ] `memory-contract query-rules --chapter {n}` → `--domain {domain}` (compare `memory_cli.py:90` real arg); reviewer.md's `index get-state-changes --limit 20` add required `--entity "{entity_id}"`. Each executed locally once to verify no argparse error.
- [ ] commit `fix(skill): correct CLI invocations in query skill and reviewer agent`.

### Task 19: unified entry and chapter_commit param alignment

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/webnovel.py:554-559` or `webnovel-writer/scripts/chapter_commit.py:23-26`
- Test: `webnovel-writer/scripts/data_modules/tests/test_webnovel_unified_cli.py`

- [ ] Unified to required (recommended, force contract): `webnovel.py` side four params add `required=True`, missing param error at unified entry layer, info author-facing. Test: missing `--review-result` call, assert error info contains param name and example.
- [ ] commit `fix: align chapter-commit arg contract between entrypoints`.

### Task 20: fix genre-profiles dead link (genre profile revive)

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/config.py` (add `references_dir` resolution), `webnovel-writer/scripts/data_modules/context_manager.py:337-338`, `webnovel-writer/scripts/data_modules/memory_contract_adapter.py:245`
- Test: `webnovel-writer/scripts/data_modules/tests/test_context_manager.py`

- [ ] config add resolution order: `{project_root}/.claude/references/` (user override) → `{plugin_root}/references/` (default, deduced by `Path(__file__).resolve().parents[2] / "references"`). Two read points use `config.references_dir / "genre-profiles.md"`.
- [ ] Test transform: keep existing hand-made `.claude/references` tests (verify override priority), add "no project-level file then fallback plugin dir" test.
- [ ] commit `fix: genre profiles resolve to plugin references by default`.

### Task 21: story_system_engine base_context empty bug

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/story_system_engine.py:125, 412-423`
- Test: `webnovel-writer/scripts/data_modules/tests/test_story_system_engine.py`

- [ ] `_apply_reasoning`'s early-return branch also set `_priority_rank` for each row: base_context source row set 0, dynamic row set 1 (keep base priority), ensure `build()`'s `< 999` filter no longer误杀. Test: run `build()` with genre having no reasoning-rule rows, assert `master_setting.base_context` non-empty.
- [ ] commit `fix: base_context survives the no-reasoning path`.

### Task 22: extract_chapter_context payload dedupe

**Files:**
- Modify: `webnovel-writer/scripts/extract_chapter_context.py:321-354`
- Test: `webnovel-writer/scripts/data_modules/tests/test_extract_chapter_context.py`

- [ ] Top-level `outline`/`previous_summaries`/`state_summary` vs `core.*` choose one: keep `core.*` (ContextManager already sorted), delete top-level fields; consumer (which keys context-agent.md references first grep confirm) sync update. Test assert outline text appears only once in payload.
- [ ] commit `fix: dedupe chapter context payload`.

### Task 23: foreshadowing urgency scale unify

**Files:**
- Modify: `webnovel-writer/skills/webnovel-query/references/advanced/foreshadowing.md`

- [ ] Formula changed to 0-100 scale: `urgency = min(100, (chapters passed / target chapter) × tier weight × 33.3)` or directly align with `urgency_utils`'s high/medium/low≈100/60/20 threshold table; delete contradictory "core 50-300 chapter" "core >50 chapters unrecycled = Critical" row, change to "exceeds this foreshadowing's own target chapter count = Critical". Example values recompute.
- [ ] commit `fix(ref): foreshadowing urgency uses runtime 0-100 scale`.

### Task 24: misc correctness fixes batch

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/rag_adapter.py:1477, 615-649`, `api_client.py` (9 prints), `knowledge_query.py:17,46`, `webnovel.py:127, 583`, `update_state.py:344-351,609-611`, `config.py:30-48,60`, `context_manager.py:790-829`
- Test: respective test files

- [ ] rag_adapter `index-chapter` use `adapter.config.project_root` instead undefined `config`; `vector_search` row unpack `chapter` rename `row_chapter`.
- [ ] api_client all `[WARN]/[ERR]/[WARMUP]` change to `file=sys.stderr`.
- [ ] knowledge_query connection前 `is_file()` check, missing output friendly error with fix suggestion.
- [ ] `webnovel.py` `int(e.code or 0)` for non-int code print then return 1; `knowledge` subparsers add `required=True`.
- [ ] update_state `update_strand_tracker` failure accumulate and exit non-zero.
- [ ] config `.env` value `strip().strip("\"'")`; `_load_dotenv` move from module import to `from_project_root` explicit call.
- [ ] context_manager CLI failure path `sys.exit(1)`.
- [ ] Each fix first add probe test in corresponding test file. After done commit `fix: batch correctness fixes from audit`.

---

## Phase 2 — P2 Security and Privacy

### Task 25: embed egress needs explicit config

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/api_client.py` (embed/rerank call entry), `vector_projection_writer.py:236-246`
- Test: `webnovel-writer/scripts/data_modules/tests/test_vector_projection_writer.py`
- Docs: `webnovel-writer/README.md`, `docs/guides/rag-and-config.md`

- [ ] `EMBED_API_KEY` empty then vector projection directly return `{"status": "skipped", "reason": "no_api_key"}`, no HTTP request. Test: key empty + monkeypatch aiohttp assert zero request.
- [ ] Docs add "data egress explanation" subsection: clearly write default endpoint, sent content (summary/scene/event text), how to close.
- [ ] commit `fix: no network egress without explicit api key`.

### Task 26: write-guard hook hardening

**Files:**
- Modify: `webnovel-writer/hooks/guard_runtime_write.py:61-67, 101-110`
- Test: `webnovel-writer/scripts/tests/test_hooks.py`

- [ ] Regex fix: `\b(>|out-file|...)` handle `>` separately (`(?:^|\s)>{1,2}(?:\s|$)|(?:\b(out-file|set-content|add-content|copy-item|move-item|cp|mv|rm|tee|sed|python|python3)\b)`); test cases cover `echo x > .webnovel/state.json`, `mv a .webnovel/state.json`, `tee .webnovel/index.db`.
- [ ] `_deny`'s JSON decision output change to stdout (exit code 2 kept), `systemMessage` can be parsed by host.
- [ ] commit `fix(hooks): close redirect/unix-command bypass in write guard`.

### Task 27: dashboard minimal protection

**Files:**
- Modify: `webnovel-writer/dashboard/app.py`, `server.py`
- Test: `webnovel-writer/scripts/tests/test_dashboard_security.py`

- [ ] Add `TrustedHostMiddleware(allowed_hosts=["localhost", "127.0.0.1"])` (prevent DNS rebinding); `--host` non-loopback address print prominent warning "whole project will be network-visible"; support `WEBNOVEL_DASHBOARD_TOKEN` env var, when set all `/api/*` verify `Authorization: ***` (wrong token 401, missing host header 400).
- [ ] By the way fix `app.py:175` `_inspect_vector_db` connection leak (wrap `closing()`).
- [ ] commit `fix(dashboard): trusted host + optional token auth`.

### Task 28: CI hardening

**Files:**
- Modify: `.github/workflows/plugin-version.yml`, `.github/workflows/plugin-release.yml:43-51, 108`

- [ ] plugin-version.yml top add `permissions: contents: read`.
- [ ] release's `workflow_dispatch` version input add `[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || exit 1` pre-check; `softprops/action-gh-release@v2` pin to specific commit SHA; `git ls-remote` distinguish query failure (exit non-zero and not "not found") from tag not exist.
- [ ] Note: don't touch README version table related checks (CI hard constraint). Commit `ci: least privilege + input validation + pinned action`.

### Task 29: first-run experience

**Files:**
- Modify: `webnovel-writer/skills/webnovel-init/SKILL.md` (Step 0 precheck), `webnovel-writer/hooks/hooks.json`
- Test: manual verify

- [ ] init SKILL's Step 0 add one line instruction: first run `python -X utf8 "{plugin_root}/scripts/webnovel.py" doctor --format json`, when blocker exists (missing pydantic/aiohttp etc) show author one-click install command `python -m pip install -r "{plugin_root}/scripts/requirements.txt"` and wait complete before continue (doctor already has `python.import.*` check, no new code needed).
- [ ] hooks.json keep `python`, but `session_start.py` when `webnovel.py` call fails (FileNotFoundError/non-zero exit) output one line "⚠️ Python env abnormal, run /webnovel-doctor check" — guard hook's fail-open risk reflected in doctor report (add check: `shutil.which("python")` probe).
- [ ] commit `feat: dependency preflight in init + doctor python check`.

---

## Phase 3 — P3 Quality and Hygiene (can parallel Phase 2)

### Task 30: prompt repeat sink

**Files:**
- Create: `webnovel-writer/references/shared/author-report-contract.md`
- Modify: `webnovel-writer/skills/{webnovel-init,webnovel-plan,webnovel-write,webnovel-review}/SKILL.md`, `webnovel-writer/scripts/data_modules/tests/test_prompt_integrity.py`, `webnovel-writer/references/index/reference-loading-map.md`

- [ ] "Author-friendly process hint and recovery contract" + "final report contract" two sections (4 skills repeat ~60-70 lines) extract to shared file, each SKILL keeps one reference line + stage-diff param. SubagentRun JSON template same only kept once in shared file. `test_prompt_integrity.py`'s text assertion per probe principle changed to assert reference line exists. loading-map register new file. SKILL change follows "only write instruction" principle — no explanatory comments.
- [ ] commit `refactor(skill): hoist author report contract to shared reference`.

### Task 31: prompt stale content cleanup

**Files:**
- Modify: `webnovel-writer/templates/genres/*.md` (34 XML entity segments + 30 Pack numbers), `webnovel-writer/references/index/reference-loading-map.md`, `webnovel-writer/references/genre-profiles.md`, `webnovel-writer/references/shared/core-constraints.md:6-7`, `webnovel-writer/references/review-schema.md:3`, `webnovel-writer/references/review/blocking-override-guidelines.md:3,8,39`, `webnovel-writer/skills/webnovel-write/references/style-adapter.md:9`, `webnovel-writer/skills/webnovel-write/references/anti-ai-guide.md`

- [ ] Batch delete genre template `<entity .../>` extension segments and dangling Pack number lines (scripted sed/python patch then spot-check 3 files).
- [ ] loading-map recheck step numbers against 8 SKILL; genre-profiles add segment for missing genre or write fallback rule in §2 head (hit fail → use shuangwen base segment); §3 delete Checkers/`project.genre` old refs.
- [ ] anti-ai-guide three-way conflict adjudication: keep file, head "load timing" changed to "polish stage on-demand", merge overlapping entries with polish-guide, register into loading-map non-direct-call table.
- [ ] Each file head step number fix (core-constraints/review-schema/blocking-override/style-adapter).
- [ ] commit `docs(ref): purge stale protocol fragments and fix loading map drift`.

### Task 32: CLI boilerplate extract

**Files:**
- Create: `webnovel-writer/scripts/data_modules/cli_runtime.py`
- Modify: `entity_linker.py`, `index_manager.py`, `rag_adapter.py`, `state_manager.py`, `sql_state_manager.py`, `style_sampler.py` each `main()`, `webnovel.py:306-381`

- [ ] Provide `resolve_config(args) -> DataModulesConfig` (encapsulate normalize_global_project_root + resolve_project_root + from_project_root) and `run_cli(fn)` decorator (unified emit_success/emit_error + exit code). Six entries migrate; `webnovel.py`'s run-ledger/run-log duplicate段 changed to forward. Existing CLI tests full regression.
- [ ] commit `refactor: extract cli_runtime, dedupe six entrypoints`.

### Task 33: performance fix

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/rag_adapter.py:583-650, 721-758`, `webnovel-writer/scripts/status_reporter.py:370-460`

- [ ] vector direct path reuse hybrid's `vector_full_scan_max_vectors` pre-filter; bm25 hit chunk change to `WHERE chunk_id IN (...)` one fetch; status_reporter开头 one-time `SELECT * FROM entities/chapters` build dict, delete loop inner single query. Use existing tests regression + thousand-chapter sim data manual compare time (optional).
- [ ] commit `perf: kill N+1 queries in rag and status reporter`.

### Task 34: repo and test hygiene

**Files:**
- Modify: `webnovel-writer/scripts/data_modules/tests/test_story_system_engine.py` (or its fixture), `sitecustomize.py`, `.github/workflows/plugin-version.yml`, root `requirements.txt` three copies, `webnovel-writer/scripts/update_state.py:159-178`, `webnovel-writer/scripts/data_modules/summary_projection_writer.py:20`

- [ ] Find test writing `.tmp_story_system_engine/case_*` to repo root, change to pytest `tmp_path`; delete 231 residual dirs in root.
- [ ] `sitecustomize.py`: move out of repo (or rename `sitecustomize.py.example` + README note), avoid affecting distributed users.
- [ ] CI add dist sync check step: after `npm ci && npm run build` `git diff --exit-code webnovel-writer/dashboard/frontend/dist` (or compare build hash), prevent frontend source and dist drift.
- [ ] requirements key deps add upper bound (`fastapi>=0.110,<1`, `pydantic>=2,<3` etc); confirm dashboard's httpx only test-use, if so move to test deps.
- [ ] update_state backup files count-based rolling cleanup (keep latest 20); summary projection write change to tmp+replace.
- [ ] commit `chore: test/repo hygiene batch`.

---

## Acceptance Checklist (overall)

- [ ] `python -m pytest` (PYTHONUTF8=1) all green, coverage ≥90% not regress
- [ ] Manual smoke: new tmp project run init → write one chapter → review → chapter-commit → projections retry → dashboard launch
- [ ] `git grep -n "checkout master"` under scripts zero hit
- [ ] No key env run once chapter-commit, packet capture/log confirm zero egress request
- [ ] README version table not modified (CI hard constraint)
