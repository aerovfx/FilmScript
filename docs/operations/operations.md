# Project Structure and Operations

## Directory Layers

## Operations Framing

- `.story-system/`: main-chain source of truth
- accepted `CHAPTER_COMMIT`: the only post-write fact entry point
- `.webnovel/state.json`, `index.db`, `summaries/`, `memory_scratchpad.json`: projection / read-model
- `references/genre-profiles.md`: fallback-only
- `preflight` and the dashboard's `story_runtime` / `story-runtime/health` are the first observation points

The system involves 4 layers of directories; understand their differences before use:

| Layer | Description | Example |
|------|------|------|
| `WORKSPACE_ROOT` | Claude Code workspace root | `D:\wk\novels` |
| `.claude/` | Workspace-level config and project pointer | `D:\wk\novels\.claude\` |
| `PROJECT_ROOT` | A book's project root (created by `/webnovel-init`) | `D:\wk\novels\凡人资本论` |
| `CLAUDE_PLUGIN_ROOT` | Plugin cache directory (outside the project, managed by Marketplace install) | auto-managed |

### Workspace Directory

```text
workspace-root/
├── .claude/
│   ├── .webnovel-current-project   # points to the current book project root
│   └── settings.json
├── NovelA/                          # PROJECT_ROOT
├── NovelB/
└── ...
```

A workspace can contain multiple books, switched via the `.webnovel-current-project` pointer.

### Book Project Directory (PROJECT_ROOT)

```text
project-root/
├── .webnovel/            # runtime data
│   ├── state.json        # project status
│   ├── index.db          # SQLite index (entities/relations/chapter data)
│   ├── vectors.db        # vector index
│   ├── projection_log.jsonl # projection execution log
│   ├── summaries/        # chapter summaries
│   ├── backups/          # auto backups
│   └── archive/          # archives
├── .story-system/        # Story System data
│   ├── MASTER_SETTING.json
│   ├── chapters/
│   ├── volumes/
│   ├── reviews/
│   ├── commits/
│   └── events/
├── 正文/                  # chapter body
├── 大纲/                  # master outline and volume outlines
├── 设定集/                # worldview, characters, power system
└── 审查报告/              # review output
```

### Plugin Directory

The plugin is installed in the Claude plugin cache directory, outside the book project. At runtime it is referenced via `CLAUDE_PLUGIN_ROOT`:

```text
${CLAUDE_PLUGIN_ROOT}/
├── skills/       # 8 Skill command definitions
├── agents/       # 4 Agent definitions
├── scripts/      # Python scripts and data modules
├── hooks/        # Claude Code session hooks
├── references/   # reference docs (genre profiles, reader-retention taxonomy, etc.)
├── templates/    # init templates
├── genres/       # fine-tuned genre configs
└── dashboard/    # visualization panel frontend
```

### User-Level Global Mapping

When the workspace pointer is unavailable, the system looks up the workspace → project mapping from the user-level registry:

```text
${CLAUDE_HOME:-~/.claude}/webnovel-writer/workspaces.json
```

## Common Operations Commands

### Environment Preflight

```bash
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${WORKSPACE_ROOT}" preflight
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${WORKSPACE_ROOT}" project-status --format summary
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${WORKSPACE_ROOT}" doctor --format text
```

`preflight` is a quick check, `project-status` gives short status and next step, `doctor` is a phase-aware health check.

Checks: plugin script path / project root resolvability / Skill directory existence / phase-expected files / JSON / SQLite / RAG config / Python deps / Dashboard artifacts.

If `story_runtime.mainline_ready=false`, the current project is still on legacy fallback or the commit main chain is incomplete.

### Write Gates

```bash
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${PROJECT_ROOT}" write-gate --chapter 12 --stage prewrite --format text
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${PROJECT_ROOT}" write-gate --chapter 12 --stage precommit --format text
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${PROJECT_ROOT}" write-gate --chapter 12 --stage postcommit --format text
```

- `prewrite`: check project phase, runtime contract, placeholders, and pre-write required files.
- `precommit`: check body and the four commit artifacts (review / fulfillment / disambiguation / extraction).
- `postcommit`: check commit and projection status.

### Index Rebuild

```bash
python "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" index process-chapter --chapter 1
python "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" index stats
```

### Health Report

```bash
python "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" status -- --focus all
python "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" status -- --focus urgency
```

`status` retains the macro creative-health report semantics; use `project-status` for machine-readable short status.

### Vector Rebuild

```bash
python "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" rag index-chapter --chapter 1
python "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" rag stats
```

### Projection Replay

```bash
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${PROJECT_ROOT}" projections retry --chapter 12 --format text
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${PROJECT_ROOT}" projections replay --from-chapter 1 --to-chapter 12 --format text
```

Projection replay only reads facts from existing `.story-system/commits/*.commit.json` and regenerates the read-model (`.webnovel/state.json`, `index.db`, `summaries/`, `memory_scratchpad.json`, `vectors.db`, etc.). Each run appends to `.webnovel/projection_log.jsonl`.

### Author-Friendly Report and Recovery

The main Skill's final report uniformly uses four overall statuses: Completed, Partially completed, Needs your input, Not completed. The report only gives the author the conclusions, artifacts, issues, and next-step suggestions they need; internal JSON, tracebacks, and long command logs are not shown directly.

Exceptions are handled in three classes:

- **Auto-handled**: idempotent, retryable problems that don't touch author content, e.g. projection retry succeeded, missing runtime contract regenerated. The flow continues by default, but the final report must state what was handled.
- **Needs confirmation**: problems that affect creative direction, factual取舍, whether to overwrite files, or resume boundaries, e.g. body manually edited, chapter outline updated later than body, chapter rewritten after already accepted. The system should give 2-3 bounded options.
- **Must handle**: blocking review problems, missing key artifacts, rejected commits, projection replay still failing, etc. The system stops at a safe point and the report states completed content, the blocker, and recovery suggestions.

`/webnovel-write` records write breakpoints, used to judge credible completions on rerun:

```bash
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${PROJECT_ROOT}" run-ledger write-resume --chapter 12 --format text
```

Breakpoint suggestions only judge and hint; they don't auto-overwrite files. Anything involving author-edited body, whether to keep old body, or whether to redo an accepted commit must be asked first.

Unrecoverable faults prompt to check:

```text
.webnovel/logs/run_last.log
```

This log preserves desensitized technical details of the most recent run for troubleshooting. When writing the log, common sensitive fields and values are masked, including `api_key`, `secret`, `token`, `authorization`, `password`, `passwd`, `credential`, and inline key snippets of the form `KEY=value`. The log may still contain file paths and error context, so a manual scan is recommended before filing an issue.

### Testing

```bash
pwsh "${CLAUDE_PLUGIN_ROOT}/scripts/run_tests.ps1" -Mode smoke
pwsh "${CLAUDE_PLUGIN_ROOT}/scripts/run_tests.ps1" -Mode full
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/run_behavior_evals.py" --format text
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/validate_plugin_package.py" --format text
```

`run_behavior_evals.py` is a quick behavioral-contract check; `validate_plugin_package.py` checks manifest, Skill / Agent frontmatter, hooks wrapper, README version, and path portability per plugin-dev thinking.

### Hook Toggles

The plugin-level hooks are very light by default:

- `SessionStart`: only runs `project-status --format summary`, writes no files, starts no services.
- `PreToolUse`: a fallback block on dangerous commands that directly write main-chain / read-model files or bypass the runtime.

To temporarily disable, set environment variables:

```bash
WEBNOVEL_DISABLE_SESSION_STATUS_HOOK=1
WEBNOVEL_DISABLE_RUNTIME_GUARD_HOOK=1
```

## Story System Operations

### Health Check

```bash
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" --project-root "${PROJECT_ROOT}" story-events --health
```

Return fields: `sqlite_rows` / `event_files` / `ok`

Focus areas:

- Whether `.story-system/commits/chapter_XXX.commit.json` exists and is accepted
- Whether `projection_status` is all `done` / `skipped`
- Whether `.story-system/events/` is readable
- Whether the `story_events` table in `index.db` is queryable
- Whether `override_contracts` can count `amend_proposal`

### Backup

When doing Story System-related backups, back up at least the following:

```text
.story-system/
.webnovel/index.db
```

For chapter-level rollback, it is recommended to back up `.webnovel/summaries/` together.
