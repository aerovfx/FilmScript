# Phase 1: Clean Up Dead Modules + Review Merge + Flow Simplification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut modules that produce no value (workflow, resume), merge 6 checkers into 1 review agent, merge Step 2B into Step 4, expect single-chapter Token down 60-70%.

**Architecture:** Pure subtraction refactor. Delete workflow_manager.py and its tests, resume skill and its references. Merge 6 independent checker agents into 1 `reviewer.md`, output new structured issue-list schema. Update webnovel-write SKILL.md flow from 8 steps to 7 steps. Update review_pipeline.py to adapt new schema. Update webnovel.py CLI to remove workflow command.

**Tech Stack:** Python 3.13, pytest, Claude Code plugin (markdown agents/skills)

**Spec:** `docs/superpowers/specs/2026-04-02-harness-v6-design.md`

---

## File Structure

### Files to delete

| File | Reason |
|------|------|
| `scripts/workflow_manager.py` | Claude Code native /resume replaces |
| `scripts/data_modules/tests/test_workflow_manager.py` | module deleted |
| `skills/webnovel-resume/SKILL.md` | same |
| `skills/webnovel-resume/references/workflow-resume.md` | same |
| `agents/consistency-checker.md` | merged into reviewer.md |
| `agents/continuity-checker.md` | merged into reviewer.md |
| `agents/ooc-checker.md` | merged into reviewer.md |
| `agents/high-point-checker.md` | merged into reviewer.md |
| `agents/pacing-checker.md` | merged into reviewer.md |
| `agents/reader-pull-checker.md` | merged into reviewer.md |
| `references/checker-output-schema.md` | replaced by new schema |
| `skills/webnovel-write/references/step-3-review-gate.md` | logic inlined into SKILL.md |
| `skills/webnovel-write/references/step-5-debt-switch.md` | 0.6KB, inline into SKILL.md |
| `skills/webnovel-write/references/workflow-details.md` | already marked deprecated |
| `skills/webnovel-write/references/step-1.5-contract.md` | context-agent will refactor |

### Files to create

| File | Responsibility |
|------|------|
| `agents/reviewer.md` | unified review agent, outputs structured issue list |
| `references/review-schema.md` | new review output schema definition |
| `scripts/data_modules/review_schema.py` | new schema's Python dataclass + validation |
| `scripts/data_modules/tests/test_review_schema.py` | new schema tests |

### Files to modify

| File | What to change |
|------|--------|
| `skills/webnovel-write/SKILL.md` | 7-step new flow, remove workflow records, remove Step 2B, merge review |
| `scripts/review_pipeline.py` | adapt new schema (no overall_score, has blocking_count) |
| `scripts/data_modules/webnovel.py` | remove workflow command routing |
| `scripts/data_modules/index_manager.py` | review_metrics table structure adapt (remove overall_score, add issues_count/blocking_count) |
| `scripts/data_modules/tests/test_webnovel_unified_cli.py` | remove workflow-related tests |
| `scripts/data_modules/tests/test_coverage_boost.py` | remove workflow-related references |

---

## Task 1: Define new review schema

**Files:**
- Create: `scripts/data_modules/review_schema.py`
- Create: `scripts/data_modules/tests/test_review_schema.py`
- Create: `references/review-schema.md`

- [ ] **Step 1: write schema test**

```python
# scripts/data_modules/tests/test_review_schema.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Review schema tests"""
import pytest
from data_modules.review_schema import ReviewIssue, ReviewResult, parse_review_output


def test_review_issue_blocking_defaults():
    """critical severity defaults blocking=True"""
    issue = ReviewIssue(
        severity="critical",
        category="continuity",
        location="para 3",
        description="protagonist used lost ability",
    )
    assert issue.blocking is True


def test_review_issue_non_critical_not_blocking():
    """non-critical defaults blocking=False"""
    issue = ReviewIssue(
        severity="high",
        category="setting",
        location="para 7",
        description="timeline contradiction",
    )
    assert issue.blocking is False


def test_review_result_counts():
    """blocking_count auto-computed"""
    result = ReviewResult(
        chapter=10,
        issues=[
            ReviewIssue(severity="critical", category="continuity", location="p1", description="d1"),
            ReviewIssue(severity="high", category="setting", location="p2", description="d2"),
            ReviewIssue(severity="high", category="timeline", location="p3", description="d3", blocking=True),
        ],
        summary="test",
    )
    assert result.blocking_count == 2
    assert result.issues_count == 3
    assert result.has_blocking is True


def test_review_result_no_issues():
    result = ReviewResult(chapter=10, issues=[], summary="no problem")
    assert result.blocking_count == 0
    assert result.has_blocking is False


def test_review_result_to_dict_roundtrip():
    result = ReviewResult(
        chapter=10,
        issues=[
            ReviewIssue(severity="medium", category="ai_flavor", location="p5", description="heavy AI flavor",
                        evidence="'steadied mind' appears 3 times", fix_hint="replace with concrete action description"),
        ],
        summary="1 AI-flavor issue",
    )
    d = result.to_dict()
    assert d["chapter"] == 10
    assert d["blocking_count"] == 0
    assert len(d["issues"]) == 1
    assert d["issues"][0]["category"] == "ai_flavor"
    assert d["issues"][0]["fix_hint"] == "replace with concrete action description"


def test_parse_review_output_from_dict():
    raw = {
        "issues": [
            {"severity": "critical", "category": "continuity", "location": "p1",
             "description": "contradiction", "evidence": "evidence", "fix_hint": "fix"},
        ],
        "summary": "1 critical issue",
    }
    result = parse_review_output(chapter=5, raw=raw)
    assert result.chapter == 5
    assert result.blocking_count == 1


def test_parse_review_output_tolerates_missing_fields():
    raw = {
        "issues": [
            {"severity": "low", "description": "minor issue"},
        ],
        "summary": "minor",
    }
    result = parse_review_output(chapter=1, raw=raw)
    assert result.issues[0].category == "other"
    assert result.issues[0].location == ""


def test_review_result_to_metrics_dict():
    result = ReviewResult(
        chapter=10,
        issues=[
            ReviewIssue(severity="critical", category="continuity", location="p1", description="d1"),
            ReviewIssue(severity="high", category="ai_flavor", location="p2", description="d2"),
        ],
        summary="test",
    )
    metrics = result.to_metrics_dict()
    assert metrics["chapter"] == 10
    assert metrics["issues_count"] == 2
    assert metrics["blocking_count"] == 1
    assert "continuity" in metrics["categories"]
    assert "ai_flavor" in metrics["categories"]
```

- [ ] **Step 2: run test confirm fail**

Run: `cd webnovel-writer/scripts && python -m pytest data_modules/tests/test_review_schema.py -v --no-cov`
Expected: FAIL — `ModuleNotFoundError: No module named 'data_modules.review_schema'`

- [ ] **Step 3: implement review_schema.py**

```python
# scripts/data_modules/review_schema.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Review result schema (v6).

Replaces original checker-output-schema.md scoring system with structured issue list.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

VALID_SEVERITIES = {"critical", "high", "medium", "low"}
VALID_CATEGORIES = {
    "continuity", "setting", "character", "timeline",
    "ai_flavor", "logic", "pacing", "other",
}


@dataclass
class ReviewIssue:
    severity: str
    category: str = "other"
    location: str = ""
    description: str = ""
    evidence: str = ""
    fix_hint: str = ""
    blocking: Optional[bool] = None

    def __post_init__(self):
        if self.severity not in VALID_SEVERITIES:
            self.severity = "medium"
        if self.category not in VALID_CATEGORIES:
            self.category = "other"
        if self.blocking is None:
            self.blocking = self.severity == "critical"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ReviewResult:
    chapter: int
    issues: List[ReviewIssue] = field(default_factory=list)
    summary: str = ""

    @property
    def issues_count(self) -> int:
        return len(self.issues)

    @property
    def blocking_count(self) -> int:
        return sum(1 for i in self.issues if i.blocking)

    @property
    def has_blocking(self) -> bool:
        return self.blocking_count > 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chapter": self.chapter,
            "issues": [i.to_dict() for i in self.issues],
            "issues_count": self.issues_count,
            "blocking_count": self.blocking_count,
            "has_blocking": self.has_blocking,
            "summary": self.summary,
        }

    def to_metrics_dict(self) -> Dict[str, Any]:
        categories = sorted(set(i.category for i in self.issues))
        return {
            "chapter": self.chapter,
            "issues_count": self.issues_count,
            "blocking_count": self.blocking_count,
            "categories": categories,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }


def parse_review_output(chapter: int, raw: Dict[str, Any]) -> ReviewResult:
    issues = []
    for item in raw.get("issues", []):
        if not isinstance(item, dict):
            continue
        issues.append(ReviewIssue(
            severity=str(item.get("severity", "medium")),
            category=str(item.get("category", "other")),
            location=str(item.get("location", "")),
            description=str(item.get("description", "")),
            evidence=str(item.get("evidence", "")),
            fix_hint=str(item.get("fix_hint", "")),
            blocking=item.get("blocking"),
        ))
    return ReviewResult(
        chapter=chapter,
        issues=issues,
        summary=str(raw.get("summary", "")),
    )
```

- [ ] **Step 4: run test confirm pass**

Run: `cd webnovel-writer/scripts && python -m pytest data_modules/tests/test_review_schema.py -v --no-cov`
Expected: 8 passed

- [ ] **Step 5: write review-schema.md reference doc**

```markdown
# Review Output Schema (v6)

Unified review agent output format. Replaces original checker-output-schema.md scoring system.

## Core changes

- **No total score**: no longer output overall_score, changed to structured issue list
- **blocking semantics**: replaces original timeline_gate, severity=critical defaults blocking
- **Single agent**: no longer distinguish 6 checkers, unified reviewer agent output

## Issue Schema

| Field | Type | Required | Description |
|------|------|------|------|
| severity | critical/high/medium/low | ✅ | severity |
| category | continuity/setting/character/timeline/ai_flavor/logic/pacing/other | ✅ | issue category |
| location | string | ✅ | location (e.g. "para 3") |
| description | string | ✅ | issue description |
| evidence | string | ❌ | original quote or memory comparison |
| fix_hint | string | ❌ | fix suggestion |
| blocking | bool | ❌ | whether blocking (critical defaults true) |

## Blocking rules

- Any `blocking=true` issue → Step 4 must not start
- `severity=critical` auto `blocking=true`
- Other severity judged by review agent per context

## Metrics precipitation

Each review writes to `index.db.review_metrics`:
- `chapter, issues_count, blocking_count, categories, timestamp`
- For trend observation, not for gate decision
```

- [ ] **Step 6: commit**

```bash
git add scripts/data_modules/review_schema.py scripts/data_modules/tests/test_review_schema.py references/review-schema.md
git commit -m "feat: new review schema (v6) — structured issue list replaces scoring"
```

---

## Task 2: Create unified review agent

**Files:**
- Create: `agents/reviewer.md`

- [ ] **Step 1: write reviewer.md**

```markdown
---
name: reviewer
description: Unified review agent. Checks text's setting consistency, narrative continuity, character consistency, timeline, AI flavor, outputs structured issue list.
tools: Read, Grep, Bash
model: inherit
---

# reviewer (unified review agent)

## Identity and goal

You are chapter reviewer. Your job after reading text: find all verifiable problems, output structured issue list.

You don't score, don't suggest, don't write summary evaluation. You only find problems, give evidence, give fix direction.

## Available tools

- `Read`: read text, setting set, memory data
- `Grep`: search keywords in text
- `Bash`: call memory module to query

```bash
# Query character current state
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" state get-entity --id "{entity_id}"

# Query recent state changes
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" index get-recent-state-changes --limit 20
```

## Chain of thought (ReAct)

For each check dimension:
1. **Read** related data (character state, world rules, last chapter summary)
2. **Compare** text content with data
3. **Judge** whether contradiction/problem exists
4. **Record** problem to list (with evidence and fix_hint)

## Input

- `chapter`: chapter number
- `chapter_file`: text file path
- `project_root`: project root
- `scripts_dir`: script dir

## Check dimensions (in order)

### 1. Setting consistency (category: setting)
- Whether character ability matches current realm
- Whether location description matches worldview
- Whether item/currency use follows established rules

### 2. Timeline (category: timeline)
- Whether this chapter's time connects with last chapter (no rollback or with reason)
- Whether countdown/deadline correctly advances
- Whether character appears in two places simultaneously

### 3. Narrative continuity (category: continuity)
- Whether last chapter's hook responded
- Whether scene transition has transition
- Whether emotion arc continuous (last chapter angry, this chapter suddenly calm no transition)

### 4. Character consistency (category: character)
- Whether dialogue style matches character traits
- Whether behavior matches established personality/motivation
- Character knowledge boundary — whether character used info shouldn't know

### 5. Logic (category: logic)
- Whether causality holds
- Whether character decision has reasonable motive
- Whether battle/conflict result matches established power balance

### 6. AI flavor (category: ai_flavor)
- Whether forbidden words/phrases exist ("steadied mind", "couldn't help but XXX", "mouth slightly raised" etc)
- Whether each paragraph has "cause→process→result→insight" four-part structure
- Whether over-explanation exists (missing show-don't-tell)
- Whether emotion description templated ("eyes flashed a trace of XXX")

## Boundaries and forbidden zones

- **No scoring** — don't output overall_score, don't output pass/fail
- **No evaluating prose quality** — "not written well" is not issue, "contradicts character personality" is
- **No suggesting plot changes** — "should add a twist here" is not issue
- **No repeating outline content** — don't expose unoccurred plot in issue
- **Only report verifiable problems** — must have evidence (original quote or data comparison)

## Checklist

Before finishing review self-check:
- [ ] Each issue has evidence
- [ ] No "feeling" subjective evaluation
- [ ] severity grading reasonable (critical only for certain factual contradiction)
- [ ] category classification correct
- [ ] blocking field only true on critical or confirmed blocking

## Output format

Strictly output in following JSON format (no other text):

```json
{
  "issues": [
    {
      "severity": "critical | high | medium | low",
      "category": "continuity | setting | character | timeline | ai_flavor | logic | pacing | other",
      "location": "para N or concrete quote",
      "description": "problem description",
      "evidence": "original quote vs data record",
      "fix_hint": "fix direction",
      "blocking": true
    }
  ],
  "summary": "N problems: X blocking, Y high-priority"
}
```

## Error handling

- Cannot read character state → skip setting consistency check, mark in summary "cannot verify setting consistency: data read failed"
- Cannot read last chapter summary → skip continuity check's "last chapter hook response" item
- Text empty → output single critical issue: "text empty"
```

- [ ] **Step 2: commit**

```bash
git add agents/reviewer.md
git commit -m "feat: unified review agent reviewer.md — merge 6 checkers into 1"
```

---

## Task 3: Delete workflow module and resume skill

**Files:**
- Delete: `scripts/workflow_manager.py`
- Delete: `scripts/data_modules/tests/test_workflow_manager.py`
- Delete: `skills/webnovel-resume/SKILL.md`
- Delete: `skills/webnovel-resume/references/workflow-resume.md`
- Modify: `scripts/data_modules/webnovel.py`
- Modify: `scripts/data_modules/tests/test_coverage_boost.py`

- [ ] **Step 1: remove workflow command routing from webnovel.py**

In `scripts/data_modules/webnovel.py` delete workflow-related parser and routing:

Delete parser definition:
```python
# delete these two lines
p_workflow = sub.add_parser("workflow", help="forward to workflow_manager.py")
p_workflow.add_argument("args", nargs=argparse.REMAINDER)
```

Delete routing branch:
```python
# delete these two lines
if tool == "workflow":
    raise SystemExit(_run_script("workflow_manager.py", [*forward_args, *rest]))
```

- [ ] **Step 2: remove workflow-related tests from test_coverage_boost.py**

Delete `test_webnovel_passthrough_workflow_script` test function.

- [ ] **Step 3: delete workflow_manager.py and tests**

```bash
git rm scripts/workflow_manager.py
git rm scripts/data_modules/tests/test_workflow_manager.py
```

- [ ] **Step 4: delete resume skill**

```bash
git rm skills/webnovel-resume/SKILL.md
git rm skills/webnovel-resume/references/workflow-resume.md
rmdir skills/webnovel-resume/references 2>/dev/null || true
rmdir skills/webnovel-resume 2>/dev/null || true
```

- [ ] **Step 5: run tests confirm no breakage**

Run: `cd "D:\wk\novel skill\webnovel-writer" && python -m pytest --no-cov --tb=short`
Expected: all pass (count will reduce, because deleted test_workflow_manager.py's 10 tests)

- [ ] **Step 6: commit**

```bash
git add -A
git commit -m "refactor: remove workflow_manager + resume skill, replaced by Claude Code /resume"
```

---

## Task 4: Delete 6 old checker agents and old schema

**Files:**
- Delete: `agents/consistency-checker.md`
- Delete: `agents/continuity-checker.md`
- Delete: `agents/ooc-checker.md`
- Delete: `agents/high-point-checker.md`
- Delete: `agents/pacing-checker.md`
- Delete: `agents/reader-pull-checker.md`
- Delete: `references/checker-output-schema.md`
- Delete: `skills/webnovel-write/references/step-3-review-gate.md`

- [ ] **Step 1: delete old checker agents**

```bash
git rm agents/consistency-checker.md
git rm agents/continuity-checker.md
git rm agents/ooc-checker.md
git rm agents/high-point-checker.md
git rm agents/pacing-checker.md
git rm agents/reader-pull-checker.md
```

- [ ] **Step 2: delete old schema and review gate**

```bash
git rm references/checker-output-schema.md
git rm skills/webnovel-write/references/step-3-review-gate.md
```

- [ ] **Step 3: commit**

```bash
git add -A
git commit -m "refactor: remove 6 old checker agents and old schema, replaced by reviewer.md"
```

---

## Task 5: Update review_pipeline.py to adapt new schema

**Files:**
- Modify: `scripts/review_pipeline.py`
- Modify: `scripts/data_modules/tests/test_webnovel_unified_cli.py`

- [ ] **Step 1: write test — review_pipeline adapts new schema**

In `test_webnovel_unified_cli.py` modify `test_review_pipeline_builds_artifacts`, change old checker multi-result format to new single reviewer output:

```python
def test_review_pipeline_builds_artifacts_v6(tmp_path):
    _ensure_scripts_on_path()
    import review_pipeline as review_pipeline_module

    project_root = (tmp_path / "book").resolve()
    (project_root / ".webnovel").mkdir(parents=True, exist_ok=True)
    (project_root / ".webnovel" / "state.json").write_text("{}", encoding="utf-8")

    review_results_path = tmp_path / "review_results.json"
    review_results_path.write_text(
        json.dumps(
            {
                "issues": [
                    {
                        "severity": "critical",
                        "category": "timeline",
                        "location": "para 2",
                        "description": "timeline rollback",
                        "evidence": "last chapter late night, this chapter suddenly noon",
                        "fix_hint": "add time transition",
                        "blocking": True,
                    },
                    {
                        "severity": "medium",
                        "category": "ai_flavor",
                        "location": "para 5",
                        "description": "'steadied mind' appears 2 times",
                        "fix_hint": "replace with concrete action",
                    },
                ],
                "summary": "1 blocking, 1 medium",
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    payload = review_pipeline_module.build_review_artifacts(
        project_root=project_root,
        chapter=20,
        review_results_path=review_results_path,
        report_file="",
    )

    assert payload["review_result"]["blocking_count"] == 1
    assert payload["review_result"]["has_blocking"] is True
    assert payload["review_result"]["issues_count"] == 2
    assert payload["metrics"]["issues_count"] == 2
    assert payload["metrics"]["blocking_count"] == 1
```

- [ ] **Step 2: run test confirm fail**

Run: `cd webnovel-writer/scripts && python -m pytest data_modules/tests/test_webnovel_unified_cli.py::test_review_pipeline_builds_artifacts_v6 -v --no-cov`
Expected: FAIL (review_pipeline still old logic)

- [ ] **Step 3: rewrite review_pipeline.py**

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Step 3 review result processing.

Read reviewer agent's raw output JSON, parse to ReviewResult,
generate metrics for index.db precipitation.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional


def _ensure_scripts_path() -> None:
    scripts_dir = Path(__file__).resolve().parent
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))


_ensure_scripts_path()

from data_modules.review_schema import ReviewResult, parse_review_output


def build_review_artifacts(
    project_root: Path,
    chapter: int,
    review_results_path: Path,
    report_file: str = "",
) -> Dict[str, Any]:
    raw = json.loads(review_results_path.read_text(encoding="utf-8"))
    result = parse_review_output(chapter=chapter, raw=raw)
    metrics = result.to_metrics_dict()
    if report_file:
        metrics["report_file"] = report_file

    return {
        "chapter": chapter,
        "review_result": result.to_dict(),
        "metrics": metrics,
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Review pipeline v6")
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--chapter", type=int, required=True)
    parser.add_argument("--review-results", required=True)
    parser.add_argument("--metrics-out", default="")
    parser.add_argument("--report-file", default="")

    args = parser.parse_args()
    project_root = Path(args.project_root)
    review_results_path = Path(args.review_results)

    payload = build_review_artifacts(
        project_root=project_root,
        chapter=args.chapter,
        review_results_path=review_results_path,
        report_file=args.report_file,
    )

    if args.metrics_out:
        out_path = Path(args.metrics_out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(payload["metrics"], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: run test confirm pass**

Run: `cd webnovel-writer/scripts && python -m pytest data_modules/tests/test_webnovel_unified_cli.py -v --no-cov`
Expected: all pass

- [ ] **Step 5: commit**

```bash
git add scripts/review_pipeline.py scripts/data_modules/tests/test_webnovel_unified_cli.py
git commit -m "refactor: review_pipeline adapts v6 schema — no scoring, structured issue list"
```

---

## Task 6: Update webnovel-write SKILL.md (new 7-step flow)

**Files:**
- Modify: `skills/webnovel-write/SKILL.md`
- Delete: `skills/webnovel-write/references/step-5-debt-switch.md`
- Delete: `skills/webnovel-write/references/workflow-details.md`
- Delete: `skills/webnovel-write/references/step-1.5-contract.md`

- [ ] **Step 1: delete deprecated reference files**

```bash
git rm skills/webnovel-write/references/step-5-debt-switch.md
git rm skills/webnovel-write/references/workflow-details.md
git rm skills/webnovel-write/references/step-1.5-contract.md
```

- [ ] **Step 2: rewrite SKILL.md**

Full rewrite `skills/webnovel-write/SKILL.md`, core changes:

1. **Flow from 8 steps to 7 steps**:
```
Step 0.5 precheck → Step 1 context gather → Step 2 draft → Step 3 review → Step 4 polish+style+anti-AI → Step 5 data writeback → Step 6 Git
```

2. **Remove all workflow record commands** (delete `workflow start-step` / `complete-step` before/after each step)

3. **Step 2B merged into Step 4**: Step 4 responsibility becomes "polish + style adapt + anti-AI fix"

4. **Step 3 changed to single reviewer agent**:
```
Use Task to call reviewer agent (no longer call 6 independent checkers)
Output: review_results.json (new schema)
Generate metrics via review_pipeline
Block when blocking issue exists
```

5. **Step 4 adds anti-AI responsibility**:
```
- Consume Step 3's issue list, fix one by one
- Execute style adapt (original Step 2B's work)
- anti-AI final gate: recheck after fix, confirm no blocking residue
```

6. **Mode definition update**:
```
standard: Step 0.5 → 1 → 2 → 3 → 4 → 5 → 6
--fast: Step 0.5 → 1 → 2 → 3(light) → 4 → 5 → 6
--minimal: Step 0.5 → 1 → 2 → 4(only formatting) → 5 → 6
```

7. **References update**: remove references to deleted files, add `review-schema.md` reference

- [ ] **Step 3: commit**

```bash
git add -A
git commit -m "refactor: webnovel-write SKILL.md v6 — 7-step flow, single reviewer, merged style adapt"
```

---

## Task 7: Clean old review_pipeline tests and run full regression

**Files:**
- Modify: `scripts/data_modules/tests/test_webnovel_unified_cli.py`

- [ ] **Step 1: remove incompatible assertions from old review_pipeline tests**

Update `test_review_pipeline_builds_artifacts` and `test_review_pipeline_main_creates_output_directories` to adapt new schema. Old tests depend on removed fields like `overall_score`, `timeline_gate`.

If Task 5's new tests already cover, directly delete old-version tests.

- [ ] **Step 2: full regression test**

Run: `cd "D:\wk\novel skill\webnovel-writer" && python -m pytest --tb=short`
Expected: all pass, coverage ≥ 90%

- [ ] **Step 3: if fail fix then commit**

```bash
git add -A
git commit -m "test: clean old review tests, full regression pass"
```

---

## Task 8: Final verification

- [ ] **Step 1: confirm deletion completeness**

```bash
# These files should not exist
test ! -f webnovel-writer/scripts/workflow_manager.py
test ! -f webnovel-writer/skills/webnovel-resume/SKILL.md
test ! -f webnovel-writer/agents/consistency-checker.md
test ! -f webnovel-writer/agents/continuity-checker.md
test ! -f webnovel-writer/agents/ooc-checker.md
test ! -f webnovel-writer/agents/high-point-checker.md
test ! -f webnovel-writer/agents/pacing-checker.md
test ! -f webnovel-writer/agents/reader-pull-checker.md
test ! -f webnovel-writer/references/checker-output-schema.md

# These files should exist
test -f webnovel-writer/agents/reviewer.md
test -f webnovel-writer/references/review-schema.md
test -f webnovel-writer/scripts/data_modules/review_schema.py
```

- [ ] **Step 2: full test + coverage**

Run: `cd "D:\wk\novel skill\webnovel-writer" && python -m pytest`
Expected: all pass, coverage ≥ 90%

- [ ] **Step 3: confirm agents/ dir only has 3 agents left**

```bash
ls webnovel-writer/agents/
# Expected: context-agent.md  data-agent.md  reviewer.md
```

- [ ] **Step 4: final commit (if miss fix)**

```bash
git add -A
git commit -m "chore: Phase 1 complete — cleanup verification pass"
```

