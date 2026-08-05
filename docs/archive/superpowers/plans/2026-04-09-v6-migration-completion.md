# v6 Migration Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete remaining v6 migration work — clean up legacy code, land chapter-status model, fix spec/implementation inconsistencies, verify via exit criteria.

**Architecture:** Three parallel work streams: (A) legacy code deletion and cleanup, (B) chapter-status model addition, (C) spec/reference fix. A and C have no dependency and can parallelize; B is new feature needing independent dev/test.

**Tech Stack:** Python 3.13, pytest, SQLite (state.json + index.db), Claude Code plugin (markdown skills/agents)

**Spec:** `docs/superpowers/specs/2026-04-02-harness-v6-design.md` (v6)

**Prerequisites:** Phase 1's "create new modules" part done (reviewer.md, review_schema.py, review_pipeline.py all exist and pass tests). Phase 3 (memory_contract) and Phase 4 (context-agent research mode) done.

---

## Current Gap Summary

| Category | Residue | File |
|------|--------|------|
| Old checker functions | `_normalize_checker_issue`, `_build_timeline_gate`, `_aggregate_checker_results`, `ReviewAggregateResult` | `index_manager.py:208-232, 678-808` |
| Old checker CLI | `aggregate-review-results`, `materialize-review-metrics` | `index_manager.py:963-969, 1318-1327` |
| Old checker script | whole file 570 lines | `golden_three_checker.py` |
| Old checker tests | `test_aggregate_checker_results_cli` (L1428-1551), `test_aggregate_checker_results_blocks_...` (L1553-1596) | `test_data_modules.py` |
| Old checker tests | `test_index_aggregate_review_results_forwards_...` (L173) | `test_webnovel_unified_cli.py:173-218` |
| Old checker reference | `continuity-checker` in known checker list | `test_prompt_integrity.py:247` |
| workflow residue | comment reference + test whitelist | `webnovel.py:94`, `test_prompt_integrity.py:221` |
| Step 2B residue | responsibility boundary description | `polish-guide.md:13-17` |
| legacy reference | `continuity-checker` mapping table | `reading-power-taxonomy.md:343-348` |
| legacy consumption | `overall_score` for low-score alert | `context_manager.py:310-318` |
| Missing feature | chapter-status model | none (need add to `state_manager.py`) |
| spec inconsistency | "v0 interface not yet implemented" but actually implemented | spec 4.5 |

---

## File Structure

### Files to delete

| File | Reason |
|------|------|
| `scripts/golden_three_checker.py` | old checker pattern, 570 lines, replaced by reviewer |

### Files to modify

| File | What to change |
|------|--------|
| `scripts/data_modules/index_manager.py` | delete `ReviewAggregateResult`, old checker functions, old CLI commands |
| `scripts/data_modules/context_manager.py` | `overall_score` low-score judgment changed to severity_counts |
| `scripts/data_modules/tests/test_data_modules.py` | delete old checker aggregate tests (~170 lines) |
| `scripts/data_modules/tests/test_webnovel_unified_cli.py` | delete old aggregate-review-results forward test |
| `scripts/data_modules/tests/test_prompt_integrity.py` | clean checker whitelist, workflow_manager whitelist |
| `scripts/data_modules/webnovel.py` | clean workflow_manager comment |
| `scripts/data_modules/state_manager.py` | add chapter_status management |
| `skills/webnovel-write/references/polish-guide.md` | delete Step 2B boundary paragraph |
| `references/reading-power-taxonomy.md` | update checker mapping table |
| `docs/superpowers/specs/2026-04-02-harness-v6-design.md` | fix spec/implementation inconsistency |

### Files to create

| File | Responsibility |
|------|------|
| `scripts/data_modules/tests/test_chapter_status.py` | chapter-status model tests |

---

## Task 1: Delete old checker aggregate functions and CLI

**Files:**
- Modify: `scripts/data_modules/index_manager.py`
- Modify: `scripts/data_modules/tests/test_data_modules.py`
- Modify: `scripts/data_modules/tests/test_webnovel_unified_cli.py`

- [ ] **Step 1: delete ReviewAggregateResult dataclass from index_manager.py**

Delete `ReviewAggregateResult` dataclass (L208-232) and its `to_review_metrics` method in `index_manager.py`. Keep `ReviewMetrics` dataclass (still used by `save-review-metrics` CLI).

```python
# Delete following code block (~25 lines):
@dataclass
class ReviewAggregateResult:
    """Step 3 review aggregate result"""
    chapter: int
    start_chapter: int
    end_chapter: int
    selected_checkers: List[str] = field(default_factory=list)
    checkers: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    issues: List[Dict[str, Any]] = field(default_factory=list)
    overall_score: float = 0.0
    severity_counts: Dict[str, int] = field(default_factory=dict)
    timeline_gate: Dict[str, Any] = field(default_factory=dict)
    # ... and all its methods
```

- [ ] **Step 2: delete old checker functions from index_manager.py**

Delete following 3 functions (L678-808):

```python
# Delete these 3 functions:
def _normalize_checker_issue(issue: object) -> dict: ...
def _build_timeline_gate(issues: ...) -> Dict[str, Any]: ...
def _aggregate_checker_results(chapter: int, raw_data: object) -> dict: ...
```

- [ ] **Step 3: delete old CLI command registration from index_manager.py**

Delete `aggregate-review-results` and `materialize-review-metrics` parser registration (L963-969):

```python
# Delete:
review_aggregate_parser = subparsers.add_parser("aggregate-review-results")
review_aggregate_parser.add_argument("--chapter", ...)
review_aggregate_parser.add_argument("--data", ...)

review_materialize_parser = subparsers.add_parser("materialize-review-metrics")
review_materialize_parser.add_argument("--chapter", ...)
review_materialize_parser.add_argument("--data", ...)
```

Delete corresponding CLI handling branch (L1318-1327):

```python
# Delete:
elif args.command == "aggregate-review-results":
    ...
elif args.command == "materialize-review-metrics":
    ...
```

- [ ] **Step 4: delete old checker tests**

From `test_data_modules.py` delete following test functions (L1428-1596, ~170 lines):

```python
# Delete these 2 test functions:
def test_aggregate_checker_results_cli(temp_project, monkeypatch, capsys): ...
def test_aggregate_checker_results_blocks_overall_pass_for_high_timeline_issue(temp_project, monkeypatch, capsys): ...
```

From `test_webnovel_unified_cli.py` delete old aggregate forward test (L173-218):

```python
# Delete:
def test_index_aggregate_review_results_forwards_with_resolved_project_root(monkeypatch, tmp_path): ...
```

- [ ] **Step 5: run tests confirm no breakage**

Run: `cd "D:/wk/novel skill/webnovel-writer" && python -m pytest webnovel-writer/scripts -x --tb=short --no-cov`
Expected: all pass

- [ ] **Step 6: commit**

```bash
cd "D:/wk/novel skill/webnovel-writer"
git add webnovel-writer/scripts/data_modules/index_manager.py webnovel-writer/scripts/data_modules/tests/test_data_modules.py webnovel-writer/scripts/data_modules/tests/test_webnovel_unified_cli.py
git commit -m "$(cat <<'EOF'
refactor: remove old checker aggregate functions and CLI

Delete ReviewAggregateResult, _aggregate_checker_results,
git commit -m "$(cat <<'EOF'
refactor: clean legacy references — workflow_manager comment, Step 2B boundary, old checker mapping
EOF
)"
```

---

## Task 4: context_manager.py overall_score consumption migration

**Files:**
- Modify: `scripts/data_modules/context_manager.py`

- [ ] **Step 1: check overall_score consumption point**

`context_manager.py:310-318` uses `overall_score < 75` for low-score alert. Change to use `severity_counts` or `notes` field:

```python
# Old logic (L310-318):
for row in review_trend.get("recent_ranges", []):
    score = row.get("overall_score")
    if isinstance(score, (int, float)) and float(score) < 75:
        low_score_ranges.append({
            "start_chapter": row.get("start_chapter"),
            "end_chapter": row.get("end_chapter"),
            "overall_score": score,
        })

# New logic:
for row in review_trend.get("recent_ranges", []):
    score = row.get("overall_score")
    notes = row.get("notes", "")
    has_issues = "blocking=" in notes and "blocking=0" not in notes
    is_low_score = isinstance(score, (int, float)) and float(score) < 75
    if is_low_score or has_issues:
        low_score_ranges.append({
            "start_chapter": row.get("start_chapter"),
            "end_chapter": row.get("end_chapter"),
            "overall_score": score if isinstance(score, (int, float)) else 0.0,
            "notes": notes,
        })
```

- [ ] **Step 2: run related tests**

Run: `cd "D:/wk/novel skill/webnovel-writer" && python -m pytest webnovel-writer/scripts/data_modules/tests/test_context_manager.py -x --tb=short --no-cov`
Expected: pass

- [ ] **Step 3: commit**

```bash
cd "D:/wk/novel skill/webnovel-writer"
git add webnovel-writer/scripts/data_modules/context_manager.py
git commit -m "refactor: context_manager low-score alert compatible with v6 severity_counts"
```

---

## Task 5: Chapter-status model landing

**Files:**
- Modify: `scripts/data_modules/state_manager.py`
- Create: `scripts/data_modules/tests/test_chapter_status.py`

- [ ] **Step 1: write test**

```python
# scripts/data_modules/tests/test_chapter_status.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Chapter-status model tests"""
import json
import pytest
from pathlib import Path


@pytest.fixture
def state_project(tmp_path):
    webnovel_dir = tmp_path / ".webnovel"
    webnovel_dir.mkdir()
    state_file = webnovel_dir / "state.json"
    state_file.write_text(json.dumps({
        "progress": {"current_chapter": 5}
    }), encoding="utf-8")
    return tmp_path


def _make_manager(project_root):
    import sys
    scripts_dir = str(Path(__file__).resolve().parent.parent.parent)
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    from data_modules.config import DataModulesConfig
    from data_modules.state_manager import StateManager
    config = DataModulesConfig(
        project_root=project_root,
        webnovel_dir=project_root / ".webnovel",
    )
    return StateManager(config)


def test_get_chapter_status_default(state_project):
    sm = _make_manager(state_project)
    sm._load_state()
    status = sm.get_chapter_status(5)
    assert status is None  # never set


def test_set_chapter_status_drafted(state_project):
    sm = _make_manager(state_project)
    sm._load_state()
    sm.set_chapter_status(5, "chapter_drafted")
    status = sm.get_chapter_status(5)
    assert status == "chapter_drafted"


def test_set_chapter_status_monotonic(state_project):
    sm = _make_manager(state_project)
    sm._load_state()
    sm.set_chapter_status(5, "chapter_reviewed")
    # cannot roll back to drafted
    with pytest.raises(ValueError, match="cannot roll back"):
        sm.set_chapter_status(5, "chapter_drafted")


def test_set_chapter_status_progression(state_project):
    sm = _make_manager(state_project)
    sm._load_state()
    sm.set_chapter_status(5, "chapter_drafted")
    sm.set_chapter_status(5, "chapter_reviewed")
    sm.set_chapter_status(5, "chapter_committed")
    assert sm.get_chapter_status(5) == "chapter_committed"


def test_chapter_status_persists(state_project):
    sm = _make_manager(state_project)
    sm._load_state()
    sm.set_chapter_status(3, "chapter_drafted")
    sm._save_state()

    # reload
    sm2 = _make_manager(state_project)
    sm2._load_state()
    assert sm2.get_chapter_status(3) == "chapter_drafted"
```

- [ ] **Step 2: run test confirm fail**

Run: `cd "D:/wk/novel skill/webnovel-writer/webnovel-writer/scripts" && python -m pytest data_modules/tests/test_chapter_status.py -v --no-cov`
Expected: FAIL — `AttributeError: 'StateManager' object has no attribute 'get_chapter_status'`

- [ ] **Step 3: implement chapter_status in state_manager.py**

Add following methods to `StateManager` class:

```python
CHAPTER_STATUS_ORDER = ["chapter_drafted", "chapter_reviewed", "chapter_committed"]

def get_chapter_status(self, chapter: int) -> Optional[str]:
    """Query chapter status."""
    statuses = self._state.get("progress", {}).get("chapter_status", {})
    return statuses.get(str(chapter))

def set_chapter_status(self, chapter: int, status: str) -> None:
    """Set chapter status (monotonic advance, no rollback)."""
    if status not in self.CHAPTER_STATUS_ORDER:
        raise ValueError(f"invalid status: {status}, valid: {self.CHAPTER_STATUS_ORDER}")

    current = self.get_chapter_status(chapter)
    if current is not None:
        current_idx = self.CHAPTER_STATUS_ORDER.index(current)
        new_idx = self.CHAPTER_STATUS_ORDER.index(status)
        if new_idx < current_idx:
            raise ValueError(
                f"chapter {chapter} status cannot roll back: {current} -> {status}"
            )
        if new_idx == current_idx:
            return  # idempotent

    progress = self._state.setdefault("progress", {})
    chapter_status = progress.setdefault("chapter_status", {})
    chapter_status[str(chapter)] = status
    self._save_state()
```

- [ ] **Step 4: run test confirm pass**

Run: `cd "D:/wk/novel skill/webnovel-writer/webnovel-writer/scripts" && python -m pytest data_modules/tests/test_chapter_status.py -v --no-cov`
Expected: 5 passed

- [ ] **Step 5: add CLI subcommands**

In `state_manager.py` CLI part add `get-chapter-status` and `set-chapter-status` subcommands:

```python
# parser registration
status_get_parser = subparsers.add_parser("get-chapter-status")
status_get_parser.add_argument("--chapter", type=int, required=True)

status_set_parser = subparsers.add_parser("set-chapter-status")
status_set_parser.add_argument("--chapter", type=int, required=True)
status_set_parser.add_argument("--status", required=True,
    choices=["chapter_drafted", "chapter_reviewed", "chapter_committed"])
```

```python
# command handling
elif args.command == "get-chapter-status":
    manager._load_state()
    status = manager.get_chapter_status(args.chapter)
    emit_success({"chapter": args.chapter, "status": status},
                 message="chapter_status")

elif args.command == "set-chapter-status":
    manager._load_state()
    manager.set_chapter_status(args.chapter, args.status)
    emit_success({"chapter": args.chapter, "status": args.status},
                 message="chapter_status_set")
```

- [ ] **Step 6: commit**

```bash
cd "D:/wk/novel skill/webnovel-writer"
git add webnovel-writer/scripts/data_modules/state_manager.py webnovel-writer/scripts/data_modules/tests/test_chapter_status.py
git commit -m "$(cat <<'EOF'
feat: chapter-status model — chapter_drafted/reviewed/committed

Monotonic state machine, supports CLI query and set.
Used for v6 Write flow sufficiency gate.
EOF
)"
```

---

## Task 6: Fix spec/implementation inconsistency

**Files:**
- Modify: `docs/superpowers/specs/2026-04-02-harness-v6-design.md`

- [ ] **Step 1: fix memory contract v0 description**

Change in section 4.5:

```
**v0 (target interface, for Phase 1/2A prompt refactoring object-oriented programming):**

> Note: v0 interface not yet implemented, current implementation uses `webnovel.py` CLI subcommands (e.g. `state get-entity`, `index get-recent-state-changes`) as substitute. Phase 3 will converge these CLIs into following unified contract.
```

To:

```
**v0 (implemented, currently frozen):**

> v0 interface already implemented via `memory_contract.py` (Protocol + types) and `memory_contract_adapter.py` (adapter), CLI entry is `webnovel.py memory-contract` subcommand. context-agent already using.
```

- [ ] **Step 2: update Phase table status**

In implementation path table, add "completed" note to Phase 3 and Phase 4 status columns:

```markdown
| Phase 3 | Memory module interface contract design | none | **✅ Completed** |
| Phase 4 | Context-agent research mode refactor | Phase 3 (contract) | **✅ Completed** |
```

- [ ] **Step 3: update version number**

```
> Status: draft v7 (v6 + implementation alignment fix)
```

- [ ] **Step 4: commit**

```bash
cd "D:/wk/novel skill/webnovel-writer"
git add docs/superpowers/specs/2026-04-02-harness-v6-design.md
git commit -m "docs: spec v7 — fix memory contract status, Phase 3/4 marked completed"
```

---

## Task 7: Full regression verification + exit criteria check

**Files:** no new files

- [ ] **Step 1: full test**

Run: `cd "D:/wk/novel skill/webnovel-writer" && python -m pytest webnovel-writer/scripts --tb=short`
Expected: all pass

- [ ] **Step 2: exit criteria one-by-one verification**

```bash
cd "D:/wk/novel skill/webnovel-writer"

# Criterion 1: no old checker runtime reference
echo "--- Criterion 1: old checker reference ---"
grep -rn "continuity-checker\|setting-checker\|ooc-checker\|high-point-checker\|pacing-checker\|reader-pull-checker" \
  webnovel-writer/skills/ webnovel-writer/agents/ webnovel-writer/scripts/*.py \
  --include="*.md" --include="*.py" || echo "PASS: no old checker reference"

# Criterion 2: review path unique
echo "--- Criterion 2: review path ---"
grep -l "reviewer" webnovel-writer/skills/webnovel-write/SKILL.md webnovel-writer/skills/webnovel-review/SKILL.md && echo "PASS: all via reviewer"

# Criterion 3: workflow_manager removed
echo "--- Criterion 3: workflow_manager ---"
test ! -f webnovel-writer/scripts/workflow_manager.py && echo "PASS: file deleted" || echo "FAIL: file still exists"

# Criterion 4: legacy terms (runtime path)
echo "--- Criterion 4: legacy terms ---"
grep -rn "timeline_gate\|_aggregate_checker\|_normalize_checker\|_build_timeline_gate" \
  webnovel-writer/scripts/ --include="*.py" | grep -v "test_" | grep -v "__pycache__" || echo "PASS: no runtime legacy"

# Criterion 6: chapter-status model
echo "--- Criterion 6: chapter-status CLI ---"
cd webnovel-writer/scripts && python -X utf8 data_modules/state_manager.py --help 2>&1 | grep -q "get-chapter-status" && echo "PASS: CLI registered" || echo "FAIL: CLI not registered"
```

- [ ] **Step 3: if fail items, fix then commit**

```bash
cd "D:/wk/novel skill/webnovel-writer"
git add -A
git commit -m "chore: v6 migration exit criteria verification pass"
```


**Files:**
- Delete: `scripts/golden_three_checker.py`

- [ ] **Step 1: confirm no runtime dependency**

Run: `cd "D:/wk/novel skill/webnovel-writer" && grep -r "golden_three" webnovel-writer/ --include="*.py" --include="*.md" | grep -v golden_three_checker.py`
Expected: no hit (or only in test_prompt_integrity whitelist)

- [ ] **Step 2: delete file**

```bash
cd "D:/wk/novel skill/webnovel-writer"
git rm webnovel-writer/scripts/golden_three_checker.py
```

- [ ] **Step 3: run tests**

Run: `cd "D:/wk/novel skill/webnovel-writer" && python -m pytest webnovel-writer/scripts -x --tb=short --no-cov`
Expected: all pass

- [ ] **Step 4: commit**

```bash
git commit -m "refactor: delete golden_three_checker.py (570 lines), replaced by reviewer"
```

---

## Task 3: Clean scattered legacy references

**Files:**
- Modify: `scripts/data_modules/webnovel.py`
- Modify: `scripts/data_modules/tests/test_prompt_integrity.py`
- Modify: `skills/webnovel-write/references/polish-guide.md`
- Modify: `references/reading-power-taxonomy.md`

- [ ] **Step 1: clean webnovel.py workflow_manager comment**

`webnovel.py:94` changed to no longer mention workflow_manager:

```python
# Old:
#     Purpose: compatible with scripts without main() (e.g. workflow_manager.py).
# New:
#     Purpose: compatible with scripts without main().
```

- [ ] **Step 2: clean test_prompt_integrity.py**

From `KNOWN_DELETED_FILES` list (L215-223) add `golden_three_checker.py` (if needed), and remove `continuity-checker` etc old checker names from any checker whitelist (L247).

Confirm context of `continuity-checker` reference at L247; if it's a "should not appear in prompt" check, keep; if it's an "allow" whitelist, remove.

- [ ] **Step 3: clean polish-guide.md Step 2B paragraph**

Delete Step 2B responsibility boundary description at `polish-guide.md:13-17`:

```markdown
# Delete following content:
Boundary with Step 2B:
- Step 2B: style translation (expression layer)
- Step 4: problem fix (quality layer), incl review problem fix, Anti-AI final check, poison-point avoidance

If Step 2B already executed, this step doesn't repeat full sentence rewrite, only does "necessary modifications".
```

Replace with:

```markdown
Responsibility definition:
- Step 4 also responsible for style adapt (eliminate template voice, explanatory voice, mechanical voice) and problem fix
- Incl review problem fix, Anti-AI final check, poison-point avoidance
```

- [ ] **Step 4: clean reading-power-taxonomy.md checker mapping table**

Update old checker mapping table at `reading-power-taxonomy.md:343-349`:

```markdown
# Old:
| Existing Checker | Taxonomy Used |
|------------------|----------------|
| `reader-pull-checker` | hook type, hook strength, Hard-002 |
| `high-point-checker` | climax pattern, micro-payoff |
| `pacing-checker` | Hard-003 (pacing disaster) |
| `continuity-checker` | Hard-001 (readability baseline) |

# New:
| Review dimension (reviewer) | Taxonomy Used |
|-----------------------------|----------------|
| continuity | Hard-001 (readability baseline), Hard-002 (structural integrity) |
| pacing | Hard-003 (pacing disaster), climax pattern, micro-payoff |
| ai_flavor | hook type, hook strength |
```

- [ ] **Step 5: run tests**

Run: `cd "D:/wk/novel skill/webnovel-writer" && python -m pytest webnovel-writer/scripts -x --tb=short --no-cov`
Expected: all pass

- [ ] **Step 6: commit**

```bash
cd "D:/wk/novel skill/webnovel-writer"
git add webnovel-writer/scripts/data_modules/webnovel.py webnovel-writer/scripts/data_modules/tests/test_prompt_integrity.py webnovel-writer/skills/webnovel-write/references/polish-guide.md webnovel-writer/references/reading-power-taxonomy.md
git commit -m "$(cat <<'EOF'
refactor: clean legacy references — workflow_manager comment, Step 2B boundary, old checker mapping
EOF
)"
```
