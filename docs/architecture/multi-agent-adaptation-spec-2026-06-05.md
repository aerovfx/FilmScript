# Webnovel Writer Multi-Host and Multi-Agent Adaptation Spec

> Date: 2026-06-05
> Status: draft v2
> Baseline: current plugin form on `master`, `.claude-plugin/plugin.json` and marketplace version are `6.1.0`
> Source: Rewritten based on PR #110 review conclusions, fixing outdated 7 Skill / hooks / doctor / runtime status descriptions
> Positioning: Evolve Webnovel Writer into a verifiable, generatable, degradable multi-host writing plugin without breaking Claude Code's existing experience

## 1. Background

PR #110's direction is right: Webnovel Writer should not be forever bound to Claude Code's expression style. It already has a complete writing runtime, Story System, RAG, Dashboard, Agent division, and release validation, so multi-host adaptation can be considered next.

But PR #110's original spec used an old baseline:

- Listed only 7 Skills, missing `/webnovel-doctor`.
- Described hooks as "not yet forming bootstrap", but the current trunk already has `hooks/hooks.json`, `session_start.py` and `guard_runtime_write.py`.
- Did not include `project-status`, `doctor`, `write-gate`, `projections retry/replay`, `.webnovel/projection_log.jsonl` in the final form.
- Placed new docs in `docs/superpowers/specs/`, but current `superpowers` is already archived to `docs/archive/superpowers/`.

Therefore, this spec redefines the multi-host adaptation plan based on the current `v6.1.0` runtime as baseline.

## 2. Current Real Baseline

### 2.1 Claude Code Plugin Structure

The current plugin root is `webnovel-writer/`, conforming to official `plugin-dev` requirements for Claude Code plugin structure:

```text
webnovel-writer/
├── .claude-plugin/
│   └── plugin.json
├── agents/
│   ├── context-agent.md
│   ├── data-agent.md
│   ├── deconstruction-agent.md
│   └── reviewer.md
├── skills/
│   ├── webnovel-init/
│   ├── webnovel-plan/
│   ├── webnovel-write/
│   ├── webnovel-review/
│   ├── webnovel-query/
│   ├── webnovel-learn/
│   ├── webnovel-dashboard/
│   └── webnovel-doctor/
├── hooks/
│   ├── hooks.json
│   ├── session_start.py
│   └── guard_runtime_write.py
├── scripts/
├── references/
├── templates/
├── genres/
└── dashboard/
```

### 2.2 Current 8 Skills

| Skill | Current Responsibility | Status in Multi-Host Adaptation |
|---|---|---|
| `/webnovel-init` | Initialize new book project | Keep as project-creation entry |
| `/webnovel-plan` | Plan volume outlines, chapter outlines, runtime contracts | Keep as planning entry |
| `/webnovel-write` | Chapter-writing main chain, calls gate, agent, commit, projection | Highest-priority main flow in multi-host adaptation |
| `/webnovel-review` | Review chapter scope | Keep as independently callable quality entry |
| `/webnovel-query` | Read-only query of project status, settings, memory | Keep as cross-host read-only query entry |
| `/webnovel-learn` | Append project-experience memory | Keep as controlled-write entry |
| `/webnovel-dashboard` | Launch read-only Dashboard | Keep Claude Code main path, other hosts can degrade to CLI hints |
| `/webnovel-doctor` | Phase-aware health check of dirs, files, DB, RAG, deps | Must be included in all hosts' post-install self-check path |

### 2.3 Current 4 Agents

| Current File | Current Responsibility | Target Canonical Name |
|---|---|---|
| `context-agent.md` | Pre-write context and brief assembly | `webnovel-context-agent` |
| `reviewer.md` | Multi-dimension review and blocking issue output | `webnovel-reviewer` |
| `data-agent.md` | Extract commit artifacts, does not directly write projection | `webnovel-data-agent` |
| `deconstruction-agent.md` | Deconstruct reference books and structured learning | `webnovel-deconstruction-agent` |

Current file names cannot be directly deleted or renamed, because existing Skill text and user habits may still reference the old names. The target canonical name must be introduced via compatible migration.

### 2.4 Current Runtime CLI

All deterministic actions are already unified through `scripts/webnovel.py`. Multi-host adaptation must reuse these runtime commands, not rewrite a set of business logic per host.

Key commands:

| Command | Role |
|---|---|
| `preflight` | Quick environment and project-root check |
| `project-status` | Machine-readable short status, phase, next step |
| `doctor` | Phase-aware project health check and repair suggestions |
| `write-gate` | Pre-write, pre-commit, post-commit checks at three natural boundaries |
| `story-system` | Story System contracts and runtime data |
| `chapter-commit` | Chapter fact commit, drives projection |
| `projections retry/replay` | Re-run or replay projections based on existing commit |
| `status` | Old macro creative-health report, keep original semantics |

### 2.5 Current Hooks

Current Claude Code plugin-level hooks already exist:

- `SessionStart`: only runs `project-status --format summary`, gives new session a short status.
- `PreToolUse`: best-effort blocks direct writes to dangerous paths like `.story-system/commits/`, `.webnovel/state.json`, `index.db`, `vectors.db`, `memory_scratchpad.json`, `projection_log.jsonl`.

Hooks are lightweight guards, not business state machines.

### 2.6 Current Validation Capabilities

Two types of basic validation already exist:

- `scripts/validate_plugin_package.py`: checks manifest, Skill / Agent frontmatter, hooks wrapper, README version, path portability per official `plugin-dev`.
- `scripts/run_behavior_evals.py` + `evals/fixtures/behavior/fast.json`: checks key behavior contracts of 8 Skills, Agent boundaries, commit/projection, Dashboard read-only semantics.

Multi-host adaptation must extend these two types of validation, not create a separate unrelated check set.

## 3. Goals

### 3.1 One-Line Goal

Upgrade Webnovel Writer from "Claude Code single-host plugin" to:

> A long-form writing plugin that uses the existing Python runtime and Story System as the sole business core, generating lightweight adapters for multiple hosts.

### 3.2 Specific Goals

1. Keep Claude Code's current install, Skill, Agent, hook, and CLI experience.
2. Let hosts like Codex, Cursor, Gemini CLI, OpenCode, GitHub Copilot CLI consume the same writing capability through adapters.
3. All hosts reuse `scripts/webnovel.py` and `data_modules`, do not duplicate Story System, commit, projection, doctor, gate logic.
4. Each host's support status must be verifiable, with manifest validation, smoke tests, and behavior evals.
5. When a host does not support subagent or hook, have a clear degradation mode, do not pretend to have called non-existent capabilities.
6. All new plugin components continue to meet official `plugin-dev` structure, frontmatter, hooks, path, and validation requirements.

## 4. Non-Goals

This spec does not do these:

- Does not rewrite Story System main chain.
- Does not break the existing 8 Skills.
- Does not change `webnovel.py status` old health-report semantics.
- Does not redesign `doctor`, `project-status`, `write-gate`, `projection_log` into another parallel system.
- Does not turn hooks into hidden business processes.
- Does not auto-start Docker, Dashboard, RAG services or external dependencies.
- Does not re-activate `docs/superpowers/` as active docs area; active architecture spec goes to `docs/architecture/`.
- Does not promise external host capabilities not verified by official docs and local validation.

## 5. Design Principles

### 5.1 Runtime Is the Sole Business Source of Truth

Skill, Agent, hook, adapter are only entry or scheduling layers. Actions that can truly modify project facts must enter runtime:

```text
Skill / host command
    ↓
webnovel.py
    ↓
data_modules
    ↓
.story-system commit
    ↓
projection read-models
```

Any host adapter cannot directly write `.story-system/commits/` or `.webnovel/*` read-model.

### 5.2 Claude Code Is the First Supported Host

Claude Code's current experience must remain stable:

- `.claude-plugin/plugin.json` stays at official location.
- `skills/`, `agents/`, `hooks/` stay at plugin root level.
- Claude hooks continue to use `${CLAUDE_PLUGIN_ROOT}`, conforming to official `plugin-dev`.
- `/webnovel-*` Skill names remain valid.

### 5.3 Adapter As Thin As Possible

Each host adapter only handles:

- manifest / metadata
- tool name mapping
- agent frontmatter conversion
- command exposure method
- hook capability degradation
- smoke/eval launch method

Adapter does not handle:

- rewriting writing flow
- explaining Story System
- validating chapter artifacts
- executing projection
- maintaining project state itself

### 5.4 Do Not Trust Handwritten Matrices

External host capabilities change fast. The spec does not write "what a host supports now" as unverifiable verbal facts.

Each host adapter must have its own `support.md` or equivalent record, containing:

- official doc links
- verification date
- supported manifest fields
- supported skill / command / agent / hook / MCP capabilities
- degradation rules for unsupported capabilities
- smoke test command corresponding to this repo

### 5.5 UTF-8 First

All new scripts and adapter generators must be explicitly UTF-8:

- Python file header keeps UTF-8.
- Text read/write uses `encoding="utf-8"`.
- Windows subprocess prefers `python -X utf8`.
- Does not depend on system default GBK encoding.

### 5.6 Progressive Migration

Multi-host adaptation must be introduced step by step:

1. First lock current state and validation.
2. Then add adapter directory and generator.
3. Then migrate Agent canonical names and Skill text.
4. Finally connect cross-host smoke/eval.

Cannot rename Agents or heavily change Skills all at once, to avoid breaking existing Claude Code users.

## 6. Target Architecture

### 6.1 Target Structure

Final structure suggested as follows:

```text
webnovel-writer/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── webnovel-init/
│   ├── webnovel-plan/
│   ├── webnovel-write/
│   ├── webnovel-review/
│   ├── webnovel-query/
│   ├── webnovel-learn/
│   ├── webnovel-dashboard/
│   ├── webnovel-doctor/
│   └── using-webnovel-writer/        # optional, cross-host usage guide and tool mapping
├── agents/
│   ├── context-agent.md              # old-name compat
│   ├── reviewer.md                   # old-name compat
│   ├── data-agent.md                 # old-name compat
│   ├── deconstruction-agent.md       # old-name compat
│   └── aliases.json                  # optional, declares old-name to canonical-name mapping
├── hooks/
│   ├── hooks.json                    # Claude Code source hook
│   ├── session_start.py
│   └── guard_runtime_write.py
├── adapters/
│   ├── README.md
│   ├── registry.json                 # host adapter registry
│   ├── claude/
│   ├── codex/
│   ├── cursor/
│   ├── gemini/
│   ├── opencode/
│   └── copilot/
├── scripts/
│   ├── webnovel.py
│   ├── validate_plugin_package.py
│   ├── run_behavior_evals.py
│   └── generate_host_artifacts.py    # new, generates non-Claude adapter artifacts
├── evals/
│   └── fixtures/
├── references/
├── templates/
├── genres/
└── dashboard/
```

Explanation:

- `adapters/` is adapter source and templates, not generated artifacts.
- `dist/` for generated host packages, not committed by default.
- Only small, stable, must-be-directly-discovered-by-host manifests can be committed; must pass drift check before commit.

### 6.2 Business Source and Generated Artifacts

| Type | Path | Is Fact Source | Committed |
|---|---|---|---:|
| Claude plugin manifest | `.claude-plugin/plugin.json` | Yes | Yes |
| Skill source file | `skills/*/SKILL.md` | Yes | Yes |
| Agent source file | `agents/*.md` | Yes | Yes |
| Claude hook source file | `hooks/hooks.json`, `hooks/*.py` | Yes | Yes |
| Runtime | `scripts/`, `data_modules/` | Yes | Yes |
| Adapter template | `adapters/<host>/` | Yes | Yes |
| Generator | `scripts/generate_host_artifacts.py` | Yes | Yes |
| Non-Claude generated package | `dist/<host>/webnovel-writer/` | No | No |
| Small host manifest snapshot | `.codex-plugin/plugin.json` etc. | Host-dependent | Needs drift check |

## 7. Environment Variables and Path Strategy

### 7.1 Claude Code Path Stays Unchanged

In Claude Code plugin components continue to use:

```text
${CLAUDE_PLUGIN_ROOT}
```

This is the official `plugin-dev` recommended way, cannot crudely replace paths in Claude hooks or Claude Skills for cross-host.

### 7.2 Runtime May Add Compatible Resolution

Python runtime can support a more general plugin-root resolution order:

1. Explicit CLI argument.
2. `WEBNOVEL_PLUGIN_ROOT`.
3. `CLAUDE_PLUGIN_ROOT`.
4. Current script path upward derivation.

But this belongs to runtime compatibility layer, does not mean Claude plugin doc main variable should be renamed.

### 7.3 Path Writing in Skill Text

Executable examples in Claude Code Skill continue to use:

```bash
python -X utf8 "${CLAUDE_PLUGIN_ROOT}/scripts/webnovel.py" ...
```

Cross-host instructions go to `using-webnovel-writer` or `skills/*/references/host-tools.md`, do not cram all host variables into every Skill body.

## 8. Skill Adaptation Spec

### 8.1 Keep Current 8 Business Skills

Multi-host adaptation cannot remove the current 8 Skills, nor let `/webnovel-doctor` become a Claude-only omission.

Each Skill must satisfy:

- `SKILL.md` has `name` and specific trigger-type `description`.
- Body only writes flow, boundaries, and necessary commands.
- Detailed tool mapping, host differences, reference rules go to `references/`.
- Deterministic validation goes to runtime commands, not natural-language reminders.

### 8.2 New Optional Total-Entry Skill

Can add:

```text
skills/using-webnovel-writer/SKILL.md
```

Purpose:

- Give non-Claude hosts a unified usage guide.
- Explain tool-name mapping under current host.
- Guide to run `project-status` first, run `doctor` if necessary.
- Explain degradation mode for unsupported subagent/hook.

Limits:

- Does not replace 8 business Skills.
- Does not copy every Skill's full flow.
- Does not carry genre knowledge and Story System schema.

### 8.3 Hard Requirements for Chapter-Writing Skill

`webnovel-write` is the core acceptance target of multi-host adaptation. Any host's chapter-writing flow must keep:

1. Call `write-gate --stage prewrite` before writing.
2. Call `write-gate --stage precommit` before commit.
3. Commit facts only through `chapter-commit`.
4. Call `write-gate --stage postcommit` after commit.
5. On projection failure prompt `projections retry --chapter N`.
6. Cannot directly hand-write read-model.

## 9. Agent Adaptation Spec

### 9.1 Canonical Name and Old-Name Compatibility

Target canonical name uses `webnovel-` prefix:

| Old Name | Canonical Name |
|---|---|
| `context-agent` | `webnovel-context-agent` |
| `reviewer` | `webnovel-reviewer` |
| `data-agent` | `webnovel-data-agent` |
| `deconstruction-agent` | `webnovel-deconstruction-agent` |

Migration method:

1. First declare mapping in docs and adapter registry.
2. Then let generator output canonical names for different hosts.
3. Finally gradually modify Skill body to use canonical names.
4. Old name kept at least one minor version cycle, to avoid breaking existing calls.

### 9.2 Agent Boundaries

All hosts must obey existing boundaries:

- `context-agent` only handles pre-write context and brief.
- `reviewer` only handles review and blocking output.
- `data-agent` only produces commit artifacts, does not directly write projection.
- `deconstruction-agent` only handles reference deconstruction and experience sedimentation.

### 9.3 Degradation Mode for Hosts Without Subagent

If host cannot stably call subagent:

- Enter compatibility mode.
- Main agent executes per same brief and artifact schema.
- Output must explicitly state "subagent not called, using compatibility mode".
- Still must pass `artifact_validator`, `write-gate`, and behavior eval.
- Not allowed to claim already called non-existent subagent.

## 10. Hook Adaptation Spec

### 10.1 Claude Code Hook Stays As Is

Current Claude Code hook is valid baseline:

```text
hooks/hooks.json
hooks/session_start.py
hooks/guard_runtime_write.py
```

Must continue to meet official `plugin-dev`:

- `hooks/hooks.json` uses wrapper format: outer layer contains `description` and `hooks`.
- Command hook uses `${CLAUDE_PLUGIN_ROOT}`.
- Hook script only does lightweight, deterministic, fast-exit checks.

### 10.2 Other Host Hooks Optional

Whether other hosts support hooks is decided by the corresponding adapter's `support.md` and smoke test.

If host does not support hook:

- Does not affect core writing flow.
- Supplement via explicit commands `project-status` / `doctor` / `write-gate`.
- Cannot let a key capability exist only in hooks.

### 10.3 What Hooks Are Forbidden To Do

Hooks are not allowed to:

- Auto-write commit.
- Auto-modify body text.
- Auto-modify settings.
- Auto-install dependencies.
- Auto-start long-running services.
- Write chapter-flow state.

## 11. Doctor and Status Entry

### 11.1 All Hosts Share Same Status Entry

Multi-host adaptation must uniformly use:

```bash
python -X utf8 "<PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" project-status --format summary
```

When short status shows anomaly, then run:

```bash
python -X utf8 "<PLUGIN_ROOT>/scripts/webnovel.py" --project-root "<PROJECT_ROOT>" doctor --format text
```

### 11.2 No Second Status Added

`status` continues to keep macro creative-health report semantics.

Short status only uses `project-status`.

Deep health check only uses `doctor`.
