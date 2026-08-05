# Author-Friendly Reporting and Exception Visibility Plan

> Date: 2026-06-07
> Status: draft v2 · aligned with `docs/superpowers/specs/2026-06-07-author-friendly-experience-design.md`
> Scope: implements the spec's "author shell / author interface layer" seven components; unifies final reporting for `init / plan / write / review`, subagent return protocol, error catalog, review author view, next-step suggestions, exception classification, time-cost presentation, and author-friendly terminology; token statistics dropped first.
> Core principles: problems are not silent, automatic handling is explained, technical details hidden by default, final report faces the author not an engineering log; engineering core untouched.
> Method: first fix behavior via Skill / Agent contracts, then converge format via runtime helper, avoiding output drift from prompts alone.

---

## 0. Alignment with Product Spec

This plan is the engineering implementation plan of `docs/superpowers/specs/2026-06-07-author-friendly-experience-design.md`; it does not invent a separate product vocabulary.

Division of labor:

| Doc | Responsible for | Not responsible for |
|---|---|---|
| Product spec | Defines "engineering core + author shell" layering, seven components, error-recovery red lines, phased value | Does not expand specific files, tests, construction order |
| This plan | Lands the seven components into Skill / Agent / runtime helper / tests / docs | Does not redefine product goals, does not relax spec red lines |

Shared boundaries after alignment:

- Story System, `write-gate`, `chapter-commit`, projection, RAG and other engineering core: no semantic change, no weakened validation.
- Author by default sees milestones, conclusions, impact, next steps; engineering commands, JSON, schema, traceback go to logs or technical details by default.
- Automatic handling limited to idempotent, retryable, non-content-touching process issues; final report must state what was handled, not silent.
- No new UI, buttons, progress bars, command aliases, or auto-fix big loops.

Landing points of the seven components in this plan:

| Spec component | This plan landing |
|---|---|
| Terminology table | §5 single source of truth; Phase 1 lands structured glossary first |
| Progress broadcast spec | §8 process usability; Phase 5A |
| Error→action map | §15 exception classification + Phase 4 runtime helper; new `error_catalog.py` and `author_error_catalog.json` |
| Review author view | §16 helper / `review_pipeline.py` rendering; Phase 4 prioritizes `review` |
| Navigation tail | §4 three-part report part 3; §20 recommended build order as early delivery |
| Command task-ification | §4 / §19 / §23 next-step suggestions; only change prompt language, no new aliases |
| Auto-handled items + hidden engineering details by default | §3.2-3.4, §11, §15, §21; before phase 3 only explain and log, don't expand whitelist |

## 1. Goals

This plan changes `webnovel-writer`'s delivery experience from "main agent summarizes after flow finishes" to "every time a stable, readable, trustworthy author receipt".

Core deliverables:

1. Unified final-report spec: all main Skills end with fixed three-part report, opened by one overall status line.
2. Global author-friendly constraint: Chinese, few terms, not silent, automatic handling explained, technical details expandable on demand.
3. Phased report templates: strengthen final-report requirements for `/webnovel-init`, `/webnovel-plan`, `/webnovel-write`, `/webnovel-review` respectively.
4. Subagent return protocol: main flow summarizes `context-agent`, `reviewer`, `data-agent`, `deconstruction-agent` status, problems, auto-handling, time-cost.
5. Exception classification: all problems grouped as "auto-handled / needs confirmation / must handle", surfacing subagent failure, skip, retry, incomplete output.
6. Time-cost visible: record elapsed and key-step time; explain possible causes and result impact when no progress for long, don't promise fixed completion time.
7. Term translation: engineering words default-translated to author-understandable writing semantics.
8. Runtime helper: new unified report helper, prioritizing existing `project-status`, `doctor`, `write-gate`, `review-pipeline`, `chapter-commit`, `projection_log` structured outputs.
9. Process usability: clear progress, low-interruption confirmation, recoverable state, author-understandable stall explanation during long flows.
10. Resume from breakpoint: re-running same main command recognizes completed steps, continues from nearest trustworthy breakpoint, not asking author to remember re-run commands.
11. Interactive adjudication: problems needing user handling get limited options first, reducing "go fix the file yourself" cognitive load.
12. Technical traceability: author report stays clean while engineering details written to local log for fault feedback and dev troubleshooting.
13. Error catalog: map runtime error codes to author-understandable cause, impact, next action.
14. Review author view: one-line conclusion plus up to 3 actionable edit suggestions at top of review report.
15. Next-step suggestions: each main command ends with task-style explanation and copyable command, no new command aliases.

---

## 2. Background

Current project's underlying flow is fairly complete:

- `project-status` judges project stage and next step.
- `doctor` does stage-aware health check.
- `write-gate` covers pre-write, pre-commit, post-commit boundaries.
- `review-pipeline` normalizes review results, generates report, persists.
- `chapter-commit` generates post-write facts and drives state / index / summary / memory / vector projection.
- `projection_log` locates projection status.

The problem is not missing checks, but these check results are not stably translated to the author:

1. Final reply format unstable; author must re-judge "is it done" each time.
2. Technical details, JSON, command output easily exposed directly, heavy reading burden.
3. Some degradation, skip, retry, or auto-handling only exist inside flow; final report may not explain.
4. Subagent success/failure, output completeness, time-cost not unified summarized.
5. `init / plan / write / review` four main flows have clear success criteria, but "how to deliver to author" requirements unclear.
6. During long flows, author may not know current step, why waiting, whether intervention needed, whether interruptible and resumable.
7. After occasional failure, author often needs to understand internal steps and re-run commands; recovery cost high.
8. Problems needing user adjudication easily become "error exit + long explanation", not converged to clear choices.

This round does not rewrite the writing main chain, does not add auto-fix big loop; focuses on补全 "author-understandable delivery layer".

---

## 3. Design Principles

### 3.0 Claude Code capability boundary

All changes must be based on Claude Code's existing capabilities and this plugin's achievable runtime capabilities; do not fabricate host-nonexistent UI, background tasks, or interaction mechanisms.

Capabilities already relyable:

- Skill constrains flow and final output via `SKILL.md`.
- Main flow can use Claude Code's `Agent` tool to call registered subagents.
- Main flow can use `AskUserQuestion` for key adjudication, if that Skill frontmatter allows and host supports.
- Main flow can read, write, run this plugin's scripts via `Read` / `Write` / `Edit` / `Bash`.
- Plugin runtime can read/write `.webnovel/`, `.story-system/`, logs, intermediate products via Python CLI.

Capabilities cannot be assumed:

- Cannot assume Claude Code has real-time progress bar, graphical buttons, background task queue, or in-terminal native selection menu.
- Cannot assume subagent auto-returns structured metadata; needs prompt protocol and main-flow recording.
- Cannot assume re-running Skill naturally resumes; resume must be implemented by plugin runtime reading products, run ledger, gate results.
- Cannot assume AskUserQuestion can bear complex forms; adjudication options should stay 2-3 short options.
- Cannot assume logs, time-cost, recovery points auto-exist; these must be explicitly recorded by script or main flow.

Therefore, "process hints" in this plan are main flow outputting short hints at key nodes; "interactive adjudication" is limited choices based on `AskUserQuestion` or plain conversation questions; "resume from breakpoint" is plugin runtime's file and state check capability, not Claude Code's built-in workflow engine.

### 3.1 Author-friendly, not engineering show-off

Default to author-understandable Chinese expression; do not directly output engineering words like `subagent`, `artifact`, `projection`, `schema`, `runtime contract`.

When needed, keep file path and command in problem details, but default to impact first:

```text
"Save this chapter's story facts" failed, will affect later queries of what happened in this chapter.
```

not:

```text
data-agent artifact schema_error: extraction_result missing accepted_events
```

### 3.2 Problems not silent

Following must appear in final report:

- subagent call failed.
- subagent skipped by user mode selection.
- subagent output incomplete.
- reviewer skipped or `--minimal` wrote no-review artifact.
- data-agent three results missing or schema unqualified.
- `write-gate` any stage failed.
- `chapter-commit` rejected.
- projection failed / pending / missing.
- RAG degraded.
- backup failed.
- time-cost anomaly.

### 3.3 Auto-handling must be explained

System auto-done things briefly explained, including:

- auto re-run projection.
- auto degrade to keyword search.
- auto apply whitelist non-blocking point fix, e.g. format cleanup or clear typo correction.
- auto overwrite old no-review artifact.
- auto init Git or fall back to local backup.

Explanation need not tell all process, only "what handled, whether affects result".

### 3.4 Technical details hidden by default

Final report gives conclusion and impact first. Only when user needs to handle, give path, command, or error type.

### 3.5 Runtime first, prompt fallback

States confirmable by runtime not judged by main agent orally.

Final report helper prioritizes structured data:

- `project-status --format json`
- `doctor --format json`
- `write-gate --format json`
- `review-pipeline` payload
- `chapter-commit` payload
- `projection_log`
- subagent run summary

Skill docs only specify "what must be reported", don't let each Skill invent report format.

### 3.6 Process usability is also delivery

Final report only reduces "post-end uncertainty", cannot solve execution-process anxiety.

Long flow must let author continuously know four things:

1. Which step currently doing.
2. What this step roughly produces.
3. Whether author decision needed.
4. If stuck, what the stall is, whether it affects existing results.

Process hints should be short, few terms, few interruptions. Default system continues; only interrupt user when truly affecting creative direction, fact consistency, or file safety.

### 3.7 Recovery should prioritize automation

"Tell author how to recover" is baseline; "author re-runs same command to auto-resume" is goal.

Main flow should gradually become idempotent:

- Completed and trustworthy products not regenerated.
- After failure, keep existing text, review report, intermediate results.
- Re-running same command first checks breakpoint state, then continues from nearest failed step.
- Only when product expired, params changed, or user explicitly asks rewrite, re-run prerequisite steps.

### 3.8 Technical traceability doesn't disturb author

Author by default doesn't see JSON, schema, traceback, full command log.

But system needs to keep local traceability material:

- For developers to locate problems.
- For users to feedback unrecoverable faults.
- For runtime helper to judge breakpoint and step state.

Plain report only gives one low-interruption hint:

```text
To feedback fault, attach .webnovel/logs/run_last.log.

---

## 4. Unified Final Report Spec

All main Skills final output unified as:

```text
Overall status: completed / partially completed / needs your action / not completed.

1. Files produced and completion
- ...

2. Problems and anomalous time-cost encountered
- Auto-handled: ...
- Needs confirmation: ...
- Must handle: ...
- Time-cost anomaly: ...

3. Next-step suggestions
- ...
```

Status meanings:

| Status | Meaning |
|---|---|
| completed | Current stage products complete, key checks passed, can proceed to next step |
| partially completed | Has main product, but skip/degrade/incomplete/non-blocking issues exist |
| needs your action | Current result saveable, but must be confirmed/adjudicated/supplemented by user |
| not completed | Key product missing or blocking failure, cannot continue next stage |

---

## 5. Terminology Translation Table (single source of truth)

Term translation is not written per Skill, but maintained as single source of truth for Author Layer.

First version uses structured data, reusable by runtime helper and prompt integrity tests:

```text
webnovel-writer/references/author_glossary.json
```

Optionally add a Markdown summary for doc reading, but implementation and tests only use JSON as source.

Maintenance rules:

- Skill / Agent docs can reference terms, but must not invent different translations.
- `user_report.py`, `error_catalog.py`, review author view all take author-friendly expression from same glossary.
- Unregistered new engineering word defaults to original word, and report prioritizes explaining impact; add to glossary later, don't hard-translate on the spot.
- Glossary test only checks key terms exist and have author explanation, doesn't lock full wording.

| Engineering word | Author-friendly expression |
|---|---|
| subagent | writing assistant / review assistant / research assistant / deconstruction assistant |
| context-agent | pre-writing prep |
| reviewer | writing check |
| data-agent | save this chapter's story facts |
| deconstruction-agent | reference work deconstruction |
| artifact | intermediate result file |
| review_results | writing check results |
| fulfillment_result | this chapter's goal completion |
| disambiguation_result | pending name/setting ambiguity |
| extraction_result | this chapter's newly occurred story facts |
| chapter-commit | commit this chapter's facts |
| projection | update story materials |
| state / index / summary / memory / vector | state / index / summary / long-term memory / retrieval library |
| blocking issue | problem that affects continuing writing |
| fallback | temporary degraded read |
| runtime contract | this chapter's writing requirements |
| schema error | intermediate result format incomplete |
| pending | awaiting confirmation |
| rejected | this chapter's facts failed commit |
| accepted | this chapter's facts passed commit |

---

## 6. Modification Scope

### 6.1 Skill / Agent docs

- `webnovel-writer/skills/webnovel-init/SKILL.md`
- `webnovel-writer/skills/webnovel-plan/SKILL.md`
- `webnovel-writer/skills/webnovel-write/SKILL.md`
- `webnovel-writer/skills/webnovel-review/SKILL.md`
- `webnovel-writer/agents/context-agent.md`
- `webnovel-writer/agents/reviewer.md`
- `webnovel-writer/agents/data-agent.md`
- `webnovel-writer/agents/deconstruction-agent.md`

### 6.2 Runtime helper

New:

- `webnovel-writer/references/author_glossary.json`
- `webnovel-writer/references/author_error_catalog.json`
- `webnovel-writer/scripts/data_modules/author_glossary.py`
- `webnovel-writer/scripts/data_modules/error_catalog.py`
- `webnovel-writer/scripts/data_modules/review_author_view.py`
- `webnovel-writer/scripts/data_modules/user_report.py`
- `webnovel-writer/scripts/data_modules/run_ledger.py`
- `webnovel-writer/scripts/data_modules/run_logger.py`
- `webnovel-writer/scripts/data_modules/tests/test_author_glossary.py`
- `webnovel-writer/scripts/data_modules/tests/test_error_catalog.py`
- `webnovel-writer/scripts/data_modules/tests/test_review_author_view.py`
- `webnovel-writer/scripts/data_modules/tests/test_user_report.py`
- `webnovel-writer/scripts/data_modules/tests/test_run_ledger.py`
- `webnovel-writer/scripts/data_modules/tests/test_run_logger.py`

Modify:

- `webnovel-writer/scripts/data_modules/webnovel.py`
- `webnovel-writer/scripts/review_pipeline.py`
- `webnovel-writer/scripts/data_modules/tests/test_webnovel_unified_cli.py`
- `webnovel-writer/skills/webnovel-write/SKILL.md`

### 6.3 Prompt / behavior tests

Modify or add:

- `webnovel-writer/scripts/data_modules/tests/test_prompt_integrity.py`
- `webnovel-writer/evals/fixtures/behavior/fast.json`

---

## 7. Capability Mapping and Implementation Boundary

| Usability goal | Available Claude Code capability | Plugin needs new/modify | Doesn't depend on |
|---|---|---|---|
| Process hint | main flow natural language output | Skill adds key-node hint requirement | real-time progress bar |
| Pre-start expectation management | main flow opening short note | Skill adds flow overview template | background task time-estimate system |
| Final report | main flow final reply | `user_report.py` renders text/json | Claude Code auto-format |
| Subagent status summary | `Agent` call + main flow record | `SubagentRun` protocol and main-flow summary | subagent auto telemetry |
| Exception classification | main flow reads runtime JSON | `user_report.py` classification logic | host auto error classification |
| Time-cost record | Bash / Python timing or main flow record | run ledger / helper records step time | Claude Code built-in perf panel |
| Resume from breakpoint | Bash runs Python CLI, read/write local files | `run_ledger.py`, product trustworthiness check, gate reuse | Claude Code built-in resume engine |
| Interactive adjudication | `AskUserQuestion` or plain conversation question | Skill defines limited options and handling branches | graphical buttons / complex forms |
| Technical traceability | Python writes local log | `run_logger.py`, sensitive-info filter | host auto log export |
| Next-step command | final report text | `user_report.py` fills suggested command | one-click button |

Implementation principles:

1. First land with existing Skill / Agent / Bash / Python CLI capabilities.
2. Any capability needing runtime judgment must have local file, JSON, or command output as basis.
3. Any experience looking like UI can only appear as text hint, limited question, or final report, unless future separate Dashboard rework.
4. Don't write Claude Code-uncommitted behavior as acceptance criteria.

---

## 8. Process Usability Design

### 8.1 Goal

Let author during flow not need to understand internal engineering chain, yet know:

- What system is doing now.
- Why this step necessary.
- Whether still progressing.
- When own decision needed.
- What completed if mid-failure, where to continue.

Process experience is not printing every command, but splitting long flow into author-understandable "current action".

### 8.2 Pre-start expectation management

Before long flow starts, give author short overview:

```text
Starting writing chapter 13. This run goes through: organize basis -> draft text -> writing check -> polish -> save this chapter's story facts -> update materials and backup.
Different APIs, models, network speeds vary greatly; this flow doesn't promise fixed time-cost; only asks you when creative adjudication or fact conflict occurs.
```

Expectation management must include:

- This run's goal.
- Main steps.
- Note not promising fixed time-cost.
- Whether user needs to stay nearby.

### 8.3 Unified process hint format

Process hints use short sentences, at most two lines:

```text
Organizing this chapter's writing basis: will read chapter outline, recent plot, unrecycled foreshadowing.
```

```text
Saving this chapter's story facts: this step updates summary, character state, later retrieval materials.
```

Avoid:

```text
Running write-gate --stage precommit and validating artifacts...
```

### 8.4 Stage name translation

| Internal step | Process hint name |
|---|---|
| preflight | check project environment |
| placeholder-scan | check unfilled placeholders |
| story-system | refresh this chapter's writing requirements |
| write-gate prewrite | pre-write check |
| context-agent | organize writing basis |
| draft | draft text |
| reviewer | writing check |
| review-pipeline | generate check report |
| polish | polish and typeset |
| data-agent | save this chapter's story facts |
| write-gate precommit | pre-commit check |
| chapter-commit | commit this chapter's facts |
| write-gate postcommit | post-commit confirmation |
| projections retry | re-run story material update |
| backup | backup this chapter's results |

### 8.5 Low-interruption confirmation strategy

Default don't interrupt author, unless:

| Must ask | Reason |
|---|---|
| init final plan confirmation | will write new book's core settings |
| reference deconstruction quality insufficient but user wants to adopt | may pollute new book's creativity |
| plan found master outline / setting conflict | needs creative adjudication |
| write found unpointfixable blocking issue | affects this chapter's continued commit |
| data-agent low-confidence ambiguity affecting fact入库 | later state may be wrong |
| commit rejected but user still wants to continue | needs explicit risk acceptance |
| file write scope anomaly | may pollute other chapters or project |

Should not ask:

- Ordinary non-blocking review problems, system can handle in polish.
- RAG degraded but doesn't affect current writing.
- projection retry can auto re-run.
- backup fell back from Git to local backup and succeeded.
- Simply long time-cost but normal result.

### 8.6 Long-flow progress nodes

Each main Skill suggests at most 3-6 process nodes, not every internal command.

`/webnovel-init`:

1. Collect story core.
2. Organize creative constraints.
3. Wait final confirmation.
4. Create project files.
5. Generate writing main-chain base materials.
6. Verify project can enter planning.

`/webnovel-plan`:

1. Read master outline and existing plot state.
2. Fill setting baseline.
3. Plan volume pacing and timeline.
4. Split chapter outlines.
5. Write back new settings.
6. Refresh writing requirements.

`/webnovel-write`:

1. Check pre-write conditions.
2. Organize writing basis.
3. Draft text.
4. Writing check and polish.
5. Save this chapter's story facts.
6. Commit, update materials, backup.

`/webnovel-review`:

1. Confirm chapters to review.
2. Organize review basis.
3. Execute writing check.
4. Generate review report and persist.
5. If blocking problem, wait user adjudication.

### 8.7 Stall process feedback

When flow stalls, don't just report error, explain three things:

1. Which step stuck.
2. What already completed.
3. How to recover next.

Example:

```text
Stuck at "save this chapter's story facts": text and review report already done, but this chapter's fact extraction result missing summary field.
I will re-run the research assistant; if still fails, will keep text and review report, won't commit incomplete facts.
```

### 8.8 Recoverable state hint

When flow interrupts or fails, final report and process feedback should explain recovery point:

| Stall point | Recovery suggestion |
|---|---|
| context-agent failed | fill chapter outline / contract then re-run write |
| review failed after draft | keep text, re-run writing check |
| review has blocking | point-fix or user adjudication then continue polish |
| data-agent artifact missing | re-run save this chapter's story facts |
| precommit failed | fix intermediate result then re-run pre-commit check |
| commit rejected | fix missed_nodes / pending / blocking then re-commit |
| projection failed | re-run `projections retry` |
| backup failed | manual or re-run backup, doesn't affect committed facts |

### 8.9 Author-controllable detail level

Later can add optional params:

```text
--quiet      only show key confirmation and final report
--verbose    show process nodes, exception causes, key commands
```

First version doesn't force param implementation, but Skill docs should follow default "concise process hint + detailed final report" experience.

---

## 9. Resume from Breakpoint Design

### 9.1 Goal

Let author after occasional failure not need to understand internal re-run commands. Re-running same main command, system auto-recognizes completed steps, continues from nearest trustworthy breakpoint.

Example:

```text
Detected last run chapter 13 already completed "draft text" and "writing check", but stuck at "save this chapter's story facts".
This run will continue from "save this chapter's story facts", won't rewrite text.
```

### 9.2 Breakpoint state sources

Prioritize reusing existing products and gates:

| Step | Trustworthy completion criterion |
|---|---|
| Pre-write check | `write-gate prewrite ok=true` or current re-run passes |
| Writing basis | `context-agent` returned brief and not expired |
| Text draft | target chapter text file exists and non-empty |
| Writing check | `review_results.json` marks target chapter, and `review-pipeline` generated report |
| Polish | text modified time later than review report, and no anti-ai blocking record |
| Save facts | three data artifacts exist and `write-gate precommit` passed |
| Commit facts | commit file exists and status accepted |
| Update materials | `write-gate postcommit` passed, projection five items done/skipped |
| Backup | backup returned success or chapter backup record exists |

### 9.3 Run Ledger

First version can skip complex state machine, but suggest lightweight run ledger:

```text
.webnovel/runs/write_ch0013.json
.webnovel/logs/run_last.log
```

`write_ch0013.json` saves machine-readable progress:

```json
{
  "schema_version": "webnovel-run-ledger/v1",
  "command": "webnovel-write",
  "chapter": 13,
  "started_at": "",
  "updated_at": "",
  "steps": [
    {"id": "draft", "label": "draft text", "status": "done", "outputs": ["正文/第0013章.md"]},
    {"id": "data", "label": "save this chapter's story facts", "status": "failed", "problem": "API timeout"}
  ]
}
```

`run_last.log` saves engineering details:

- Command.
- JSON output summary.
- traceback.
- subagent raw exception.
- time-cost.

Author report doesn't expand `run_last.log` directly, only hints path on unrecoverable fault.

### 9.4 Idempotency strategy

Re-running main command:

1. First resolve `PROJECT_ROOT`, chapter number, mode params.
2. Read run ledger and existing products.
3. Verify completed steps still trustworthy.
4. Continue from first untrustworthy or failed step.
5. If user params changed, text manually modified, chapter outline update time later than text, ask whether re-run prerequisite steps.

### 9.5 Must-ask resume branches

| Scenario | Handling |
|---|---|
| Text exists but user asks rewrite this run | ask overwrite / save-as / cancel |
| Chapter outline update later than text | ask use old text or re-draft |
| Review report from old text | auto re-run review |
| Commit already accepted, but user re-runs write same chapter | ask rewrite chapter or only view status |
| Backup failed but commit done | auto re-run backup, don't rewrite text |

### 9.6 Phased landing

Phase 1 only does `/webnovel-write` resume, since it has longest steps and most failure points.

Later expand:

- `/webnovel-plan`: batch-level resume, failed batch redone, don't overwrite whole volume.
- `/webnovel-init`: Q&A state before user confirmation not force-resumed; generation stage can fill per file.
- `/webnovel-review`: skip already-reviewed and text-unchanged chapters by chapter range.

---

## 10. Interactive Adjudication Design

### 10.1 Goal

When problem needing user handling occurs, prioritize limited options, not let author understand error and hand-edit file.

### 10.2 Adjudication presentation format

```text
Needs your adjudication: this chapter's "Shen Zhao" magic item conflicts with outline.

Outline records: Qingfeng Sword
Text wrote: Zijin Gourd

Choose handling:
1. Stick to outline: auto change relevant text back to "Qingfeng Sword"
2. Adopt new setting: keep "Zijin Gourd", write setting change into story materials
3. I handle manually: pause flow, continue after edit
```

### 10.3 Standard adjudication types

| Type | Options |
|---|---|
| Setting conflict | stick to existing setting / adopt new setting / manual |
| Timeline conflict | fix text per timeline / adjust timeline / manual |
| Character OOC | fix text per character card / update character change reason / manual |
| Low-confidence disambiguation | adopt A / adopt B / don't入库 yet |
| Commit rejected | fix then re-submit / accept risk but don't submit / manual |
| File write scope anomaly | cancel write / keep only safe files / view details |

### 10.4 Relation with AskUserQuestion

In Claude Code environment, prioritize `AskUserQuestion` for key adjudication.

Options must be short, explain impact:

- Recommended item first.
- Each option explains what it changes.
- No "other" as fixed option; user can freely supplement.

### 10.5 Red lines not auto-adjudicated

Following cannot be decided by system on its own:

- Change protagonist's long-term ability route.
- Change core antagonist identity.
- Change volume-end climax result.
- Write reference work content into new book canon.
- Overwrite user manually-edited text.
- Treat rejected commit as accepted and continue.

---

## 11. Technical Traceability and Logging

### 11.1 Goal

Author report stays clean, engineering troubleshooting material kept complete.

### 11.2 Log location

Suggest:

```text
.webnovel/logs/run_last.log
.webnovel/logs/runs/YYYYMMDD-HHMMSS-{command}.log
```

### 11.3 Log content

Log includes:

- Command and params.
- Resolved project root.
- Each process node start / end time.
- subagent run summary.
- runtime JSON output summary.
- Exception traceback.
- Final `user-report --format json`.

Log should not include:

- API key.
- `.env` original.
- User-unconfirmed new book core setting draft, unless it already appeared as this run's input.

### 11.4 Presentation in final report

Only show log path in following cases:

- Not completed.
- Needs user handling but problem hard to describe.
- User uses `--verbose`.

Example:

```text
Technical details saved: .webnovel/logs/run_last.log. Attach it when feedback fault.
```

---

## 12. Phase 0: Baseline Audit

### 12.1 Goal

First confirm existing reports, gates, agent output boundaries, avoid not knowing where format drift comes from after rework.

### 12.2 Work items

- [ ] Record current final-output requirements of four main Skills.
- [ ] Record current output format and write responsibility of four agents.
- [ ] Record JSON fields of `project-status`, `doctor`, `write-gate`, `review-pipeline`, `chapter-commit`.
- [ ] Record existing error codes, repair copy, gate failure features and projection status, as `author_error_catalog.json` initial material.
- [ ] Record fields in `review-pipeline` usable for author view: total score, blocking count, dimension problems, suggestions, report path.
- [ ] Record engineering words already appearing in current docs and Skills, dedupe with §5 glossary.
- [ ] Confirm which current tests are text-level assertions, which can become behavior-level assertions.

### 12.3 Acceptance

- Current reusable structured data sources listed.
- Clear which problems only prompt-recordable, which runtime-helper-readable.
- `author_glossary.json` and `author_error_catalog.json` first-batch entry sources clear, not guessed at implementation time.

---

## 13. Phase 1: Skill Final Report Contract

### 13.1 Goal

First use minimal changes to make four main flows obey unified format in final reply.

### 13.2 `/webnovel-init`

Must report:

- Project dir.
- `.webnovel/state.json`.
- `设定集/世界观.md`, `设定集/力量体系.md`, `设定集/主角卡.md`, `设定集/反派设计.md`.
- `大纲/总纲.md`.
- `.webnovel/idea_bank.json`.
- `.story-system/MASTER_SETTING.json`.
- Whether reference work deconstruction used.
- Cases where canon not written before user confirmation.
- Whether missing info affects later plan.

Work items:

- [ ] Add "final report requirements" section in `webnovel-init/SKILL.md`.
- [ ] Map success criteria to "three-part report".
- [ ] Clarify reference deconstruction failure, insufficient input or quality must enter "needs confirmation / must handle".

### 13.3 `/webnovel-plan`

Must report:

- `大纲/第{volume_id}卷-节拍表.md`.
- `大纲/第{volume_id}卷-时间线.md`.
- `大纲/第{volume_id}卷-详细大纲.md`.
- Which setting files new settings written back to.
- `大纲/第{volume_id}卷-总纲写回.json`.
- Whether `master-outline-sync` done.
- Whether `update-state` done.
- Whether Story System contract refreshed.
- Whether placeholders, timeline, node continuity passed.

Work items:

- [ ] Add "final report requirements" section in `webnovel-plan/SKILL.md`.
- [ ] Clarify timeline rollback, BLOCKER, placeholder residue must be reported.
- [ ] Clarify auto-handled content must be stated when only redoing failed batch.

### 13.4 `/webnovel-write`

Must report:

- Text file path.
- Writing check report path.
- `.webnovel/tmp/review_results.json`.
- `.webnovel/tmp/fulfillment_result.json`.
- `.webnovel/tmp/disambiguation_result.json`.
- `.webnovel/tmp/extraction_result.json`.
- `.story-system/commits/chapter_{NNN}.commit.json`.
- state / index / summary / memory / vector update status.
- Backup status.
- Whether can continue next chapter.

Work items:

- [ ] Add "final report requirements" section in `webnovel-write/SKILL.md`.
- [ ] Clarify `--fast` and `--minimal` skip items must be stated.
- [ ] Clarify `chapter-commit rejected` final status must not write "completed".
- [ ] Clarify projection retry occurrence must state auto-handled and result.

### 13.5 `/webnovel-review`

Must report:

- Review report file.
- `review_metrics.json`.
- Whether `review_metrics` persisted.
- Blocking problem count.
- User adjudication status.
- If no blocking, clarify can continue writing.

Work items:

- [ ] Add "final report requirements" section in `webnovel-review/SKILL.md`.
- [ ] Clarify blocking problem must enter "must handle" or "needs confirmation".
- [ ] Clarify when only saving report, later handling, final status is "needs your action" or "partially completed".

---

## 14. Phase 2: Subagent Return Protocol

### 14.1 Goal

Let main flow stably summarize each subagent's completion status, problems, auto-handled content, time-cost.

### 14.2 Unified protocol

Main flow records one `SubagentRun` per subagent call:

```json
{
  "name": "data-agent",
  "user_label": "save this chapter's story facts",
  "status": "completed | partial | failed | skipped",
  "problems": [],
  "auto_handled": [],
  "needs_user_action": false,
  "duration_ms": 0,
  "outputs": []
}
```

Field explanation:

| Field | Meaning |
|---|---|
| `name` | agent name |
| `user_label` | author-friendly name |
| `status` | completion status |
| `problems` | problems encountered |
| `auto_handled` | auto-handled content |
| `needs_user_action` | whether needs user handling |
| `duration_ms` | time-cost |
| `outputs` | key products produced or returned |

### 14.3 Work items

- [ ] `context-agent`: insufficient context, legacy fallback, missing foreshadowing data must be recordable by main flow.
- [ ] `reviewer`: empty text, failed state read, dimension skip must be written to summary or problem field.
- [ ] `data-agent`: three artifact write status, long no-progress, pending disambiguation must be summarizable.
- [ ] `deconstruction-agent`: insufficient input, quality below line, degraded quick mode must be summarizable.
- [ ] Main Skill after calling agent must record `SubagentRun` for final report.

### 14.4 Acceptance

- Write-chapter final report can list pre-write prep, writing check, save-this-chapter-facts three assistants' status.
- Any agent skip, fail, incomplete output, final report won't write as fully successful.

---

## 15. Phase 3: Exception Classification and Time-Cost Presentation

### 15.1 Exception classification

All problems grouped into three types:

| Type | Definition | Example |
|---|---|---|
| Auto-handled | system already re-ran, degraded, or completed whitelist point-fix, no user handling needed | projection retry success, RAG degraded but doesn't affect result |
| Needs confirmation | result usable, but suggest user glance | reference deconstruction quality slightly low, some character naming ambiguous but adopted |
| Must handle | not handling affects continuing writing, commit, or consistency | blocking issue, text missing, commit rejected, projection failed |

### 15.2 Error Catalog

`author_error_catalog.json` is error-to-author-action map, shared by `error_catalog.py` and `user_report.py`. It doesn't change error judgment, only translates known errors to:

- Plain-language cause.
- Impact on current chapter / later writing.
- Next action or copyable command.
- Severity and exception classification.
- Whether auto-handling allowed.

Unknown errors must honestly degrade:

```text
Here's a problem the system hasn't registered yet. Currently won't treat it as completed; please run /webnovel-doctor first, or attach log when feedback.
```

Error catalog only translates and classifies; auto-handling whitelist must be registered separately and explicitly, and not expanded before phase 3.

### 15.3 Time-cost presentation

Default only shows:

- Elapsed time.
- Whether current step still progressing.
- Possible cause when long no-progress.
- Whether affects completed results.

No fixed time-cost threshold. Different APIs, models, networks, chapter lengths, review complexity vary too much; fixed threshold misleads author.

Process hint can use relative expression:

```text
"Save this chapter's story facts" has run a while, maybe interface response slow or this chapter has many new facts; currently won't affect generated text.
```

### 15.4 Work items

- [ ] Add "exception classification" to Skill final report requirements.
- [ ] Add `author_error_catalog.json` and `error_catalog.py`.
- [ ] Build first-batch entries for `mainline_ready=false`, `write-gate failed`, `chapter-commit rejected`, projection failed / pending, RAG degraded, artifact schema incomplete etc.
- [ ] On missing error code, degrade to "honest error + /webnovel-doctor + log path", don't crash or mistranslate.
- [ ] In `data-agent.md` keep and standardize "long no-progress must state cause and impact".
- [ ] Implement time-cost formatting in runtime helper.
- [ ] No token statistics, don't show token in final report.

### 15.5 Acceptance

- Final report won't mix warning, blocking, auto-handled together.
- Known errors map to author-executable next step; unknown errors honestly degrade.
- Long-no-progress step must have cause guess and impact judgment.
- Token not user-visible report item.

---

## 16. Phase 4: Runtime Report Helper

### 16.1 Goal

Add unified helper rendering structured run results to author-friendly report.

This phase also lands spec's Review Author View: add author view at top of existing review report, without changing reviewer schema, without changing scoring and blocking judgment.

Author view format:

```text
This chapter conclusion: ✅ can continue / ⚠️ suggest change / ⛔ must change first

1-3 most worth handling:
- ...
```

Generation rules:

- `blocking_count > 0`: conclusion "must change first", list at most 3 blocking or high-risk problems.
- No blocking but obvious suggestion exists: conclusion "suggest change", list at most 3 suggestions with most plot/character/pacing gain.
- No blocking and suggestion light: conclusion "can continue", keep one-line note.
- Technical indicators, schema, raw reviewer dimensions go to report details below, not top conclusion.

### 16.2 CLI form

New:

```bash
python -X utf8 "${SCRIPTS_DIR}/webnovel.py" --project-root "${PROJECT_ROOT}" user-report \
  --stage write \
  --chapter {chapter_num} \
  --format text
```
```
```
