# Command Reference

## Skill Commands (used in Claude Code)

### `/webnovel-init`

Initialize a novel project, generating the directory structure, settings templates, and state files.

Outputs:

- `.webnovel/state.json` (runtime state)
- `设定集/` (worldview, power system, protagonist card, golden-finger design, antagonist design, etc.)
- `大纲/总纲.md`, `大纲/爽点规划.md`
- `.env.example` (RAG config template)

### `/webnovel-plan [volume number]`

Generate volume-level planning and chapter outlines.

```bash
/webnovel-plan 1
/webnovel-plan 2-3
```

### `/webnovel-write [chapter number]`

Execute the full chapter writing flow (`context-agent` first researches and generates a writing brief → drafts the body per the brief → reviews → polishes → persists data).

```bash
/webnovel-write 1
/webnovel-write 45
```

### `/webnovel-review [range]`

Run multi-dimensional quality review on existing chapters.

```bash
/webnovel-review 1-5
/webnovel-review 45
```

### `/webnovel-query [keyword]`

Query runtime information about characters, foreshadowing, pacing, status, etc.

```bash
/webnovel-query 萧炎
/webnovel-query 伏笔
```

### `/webnovel-learn [content]`

Extract reusable writing patterns from the current session or user input and write them to project memory.

```bash
/webnovel-learn "The crisis hook design in this chapter works well, tension is maxed out"
```

Output: `.webnovel/project_memory.json`

### `/webnovel-dashboard`

Launch a read-only visualization panel to view project status, entity relationships, chapters, and outline content.

```bash
/webnovel-dashboard
```

Notes:

- Read-only by default; does not modify project files
- The frontend build artifacts ship with the plugin; no local `npm build` needed

### `/webnovel-doctor [--chapter N] [--deep]`

Run a read-only health check on the current webnovel project, inspecting phase-expected files, JSON, SQLite, RAG config, Python dependencies, and Dashboard artifacts, and giving impact and fix suggestions.

```bash
/webnovel-doctor
/webnovel-doctor --chapter 12
/webnovel-doctor --deep
```

Notes:

- Does not write to the project, install dependencies, or start services
- First determines the current project phase, so right after init it won't misreport as a terminal-state project

## Unified CLI (command-line usage)

All CLI commands share the entry point `webnovel.py`, with this format:

```bash
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" <subcommand> [args]
```

### Author-Friendly Run Experience

`/webnovel-init`, `/webnovel-plan`, `/webnovel-write`, and `/webnovel-review` all output a unified final report at the end. The report does not dump raw JSON, tracebacks, or long command logs directly; instead it gives a one-line overall status first, then three sections: files produced and completion status, problems and abnormal time spent during the run, and next-step suggestions.

There are four overall statuses:

- **Completed**: Target artifacts and key validations all passed.
- **Partially completed**: Main artifacts are preserved, but there are skipped items, auto-handled items, or items pending confirmation.
- **Needs your input**: The system stopped at a safe point and needs the author to decide creative direction, factual取舍, file overwrite, or blocking issues.
- **Not completed**: Key artifacts were not credibly generated; rerun or investigate per the report's suggestions.

During long flows, only a few progress hints are shown, indicating the current stage and what it will produce. Idempotent operations like auto-replaying projections or re-emitting missing contracts won't interrupt the author but will appear in the final report. When re-running the same main command, the system prioritizes checking credible breakpoints; the first-version resume focuses on `/webnovel-write`, trying to continue from the failure point rather than rewriting already-credibly-completed body, review, commit, or backup.

## Story System Main Chain

Recommended execution order:

1. Generate contracts

```bash
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" story-system "玄幻退婚流" --chapter 12 --persist --emit-runtime-contracts --format both
```

2. Commit chapter

```bash
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" chapter-commit \
  --chapter 12 \
  --review-result ".webnovel/tmp/review_results.json" \
  --fulfillment-result ".webnovel/tmp/fulfillment_result.json" \
  --disambiguation-result ".webnovel/tmp/disambiguation_result.json" \
  --extraction-result ".webnovel/tmp/extraction_result.json"
```

3. Check main-chain health

```bash
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" preflight --format json
```

Here `.story-system/` is the main-chain source of truth, and `.webnovel/*` is the projection/read-model.

### Common Utility Subcommands

| Subcommand | Description |
|--------|------|
| `where` | Print the currently resolved project root |
| `preflight` | Validate CLI environment, script paths, and project root availability |
| `project-status` | Output machine-readable short status (phase, target chapter, next step), without occupying the legacy `status` |
| `doctor` | Phase-aware project health check (directories, files, DB, RAG, deps, Dashboard) |
| `write-gate` | Chapter natural-boundary validation (`prewrite` / `precommit` / `postcommit`) |
| `projections` | Re-run or replay projections from existing commits |
| `user-report` | Render the author-friendly final report, output as text/json |
| `run-ledger` | Record write-step status, or generate `/webnovel-write` resume suggestions |
| `run-log` | Write desensitized run log `.webnovel/logs/run_last.log` |
| `use <path>` | Bind the book project used by the current workspace |

Examples:

```bash
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" user-report --stage write --chapter 12 --format text
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" run-ledger write-resume --chapter 12 --format text
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" run-log --event write_failed --payload-json "{\"chapter\":12,\"reason\":\"projection timeout\"}"
```

### Data Module Subcommands

| Subcommand | Description |
|--------|------|
| `index` | Index management (`process-chapter`, `stats`, etc.) |
| `state` | State management |
| `rag` | RAG vector index (`index-chapter`, `stats`, etc.) |
| `entity` | Entity linking |
| `context` | Context management |
| `style` | Style sampling |
| `migrate` | state.json → SQLite migration |

### Operations Subcommands

| Subcommand | Description |
|--------|------|
| `status` | Macro creative-health report (`--focus all` / `--focus urgency`), still forwarded to `status_reporter.py` |
| `update-state` | Manually update state |
| `backup` | Backup management |
| `archive` | Archive management |
| `extract-context` | Extract chapter context (`--chapter N --format json`) |

### Long-Term Memory Subcommands

| Subcommand | Description |
|--------|------|
| `memory stats` | View total count, category statistics |
| `memory query` | Filter queries by category/subject/status |
| `memory dump` | Export full scratchpad content |
| `memory conflicts` | View active conflicts on the same primary key |
| `memory bootstrap` | Backfill initial long-term memory from index.db and summaries |
| `memory update` | Manual mapping write for specified chapter results |

Examples:

```bash
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" memory stats
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" memory query --category character_state --subject xiaoyan
```

### Story System Subcommands

| Subcommand | Description |
|--------|------|
| `story-system "<genre>" --persist` | Write contract seeds (`MASTER_SETTING.json`, etc.) |
| `story-system "<genre>" --emit-runtime-contracts --chapter N` | Generate runtime contracts + pre-write validation |
| `chapter-commit --chapter N` | Commit chapter (can attach review/fulfillment/disambiguation/extraction results) |
| `write-gate --chapter N --stage prewrite` | Pre-write check of project phase, Story System contracts, and placeholders |
| `write-gate --chapter N --stage precommit` | Pre-commit check of body and four commit artifacts |
| `write-gate --chapter N --stage postcommit` | Post-commit check of commit and projection status |
| `projections retry --chapter N` | Re-run single-chapter projection from existing commit |
| `projections replay --from-chapter A --to-chapter B` | Replay projections over a chapter range |
| `user-report --stage write --chapter N` | Summarize this write's artifacts, issues, and next-step suggestions |
| `run-ledger record-write-step --chapter N` | Record status, I/O, issues, and time of key write steps |
| `run-ledger write-resume --chapter N` | Output resume suggestions from credible breakpoints, without auto-overwriting files |
| `run-log --event <name>` | Write desensitized log for unrecoverable-fault investigation |
| `story-events --chapter N` | Query events for a specified chapter |
| `story-events --health` | Event-chain health check |
| `memory-contract` | Memory contract management |
| `review-pipeline --chapter N --review-results <file>` | Review pipeline |

Examples:

```bash
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" story-system "玄幻退婚流" --persist
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" chapter-commit --chapter 12 --review-result .webnovel/tmp/review.json
python -X utf8 "<CLAUDE_PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" story-events --health
```

Artifacts:

- `story-system --persist` → `.story-system/MASTER_SETTING.json`
- `--emit-runtime-contracts` → `volumes/*.json` and `reviews/*.review.json`
- `chapter-commit` → `commits/*.commit.json`
- `story-events` → reads `events/*.events.json` or `index.db.story_events`
