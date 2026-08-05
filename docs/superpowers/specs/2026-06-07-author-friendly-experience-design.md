# Author-Friendly Experience Layer Design: Engineering Core + Author Shell

- Date: 2026-06-07
- Status: draft v2 · merged after bidirectional cross-validation
- Target author persona: **Chinese webnovel author already using Claude Code, but non-programmer** — can run `/webnovel-write`, but put off by jargon, error messages, long flows
- Chosen direction: Direction C "author-facing refactor", built on Direction B "author presentation layer" as foundation, landed in phases
- Position and division: this spec is the **product layering spec** (layers / component responsibility / boundary / red lines); companion `docs/architecture/author-friendly-reporting-plan-2026-06-07.md` (codex plan) is the **engineering implementation plan** (Phase / files / tests / build order). The two complement and are used together, not either-or.

---

## 1. Background and Problem

`webnovel-writer` has a rigorous engineering fact chain: `Story System → gate (write-gate) → CHAPTER_COMMIT → projection`, plus RAG and long-term memory. This chain guarantees consistency of "writing hundreds of chapters without breaking", and is the product's core value.

The problem: **this chain sprays engineering language, engineering process, engineering errors directly at the writer.** What the author actually touches is not "a well-designed writing tool", but developer-facing output like `preflight`, `write-gate prewrite/precommit/postcommit`, `projection_status`, `CHAPTER_COMMIT accepted/rejected`, `mainline_ready=false`.

Users clearly expressed willingness to improve on four pain points (all four selected):

| Pain point | Author's real experience |
|------|----------------|
| Progress like black box | When writing a chapter Claude floods a screen of commands and JSON; don't know what it's doing, if normal, how long left |
| Errors incomprehensible, can't rescue | Error tells technical cause, doesn't tell author "which command to run now / which file to edit" |
| Review report unusable | Per-chapter report too technical, too long, hard to quickly grasp "is this chapter OK, change or not, where" |
| Terminology puts off | Engineering words like contract / commit / projection / gate / commit accepted run through whole process, author has no matching mental model, feels distant |

## 2. Core Insight

This **is not four independent problems, but four facets of the same gap**:

> The system lacks a layer of **"author interface layer"** — translating engineering facts to author language, compressing engineering process into author-cared progress, mapping engineering errors to author-executable next steps, rendering review products into author-decidable conclusions.

| Pain point | Essence | What this layer adds |
|------|------|------------|
| Progress like black box | Process language not translated | Compress multi-step pipeline into author milestones |
| Errors can't rescue | Error not translated + no way out | Error code → plain language + next action; re-runnable resume |
| Review report unusable | Result not translated + not executable | One-line conclusion + at most 3 "how to fix", technical details expand on demand |
| Terminology puts off | Concept not translated | Unified terminology table |

Conclusion: the plan's core is **insert a translation/presentation layer between engineering chain and author, engineering fact source untouched a single character**. Engineering rigor not sacrificed, author side gets a completely different face.

## 3. Goals and Non-goals

**Goals**
- Let target author in daily use by default not directly touch engineering language, engineering process, engineering errors.
- On error author always gets "plain language + what to do next", and can auto-resume by re-running same command.
- Review conclusion judgeable and decidable by author within three seconds.
- Unified, understandable terminology throughout.

**Non-goals (YAGNI)**
- Don't rewrite any logic or data structure of engineering core (Story System / gate / commit / projection / RAG).
- Don't rename existing `/webnovel-*` commands, don't break existing user habits and docs.
- Don't lower consistency validation strength for non-technical authors.
- **Don't introduce any new UI** (no collapsible panel, no progress bar, no button). Author shell only lands in text hints, Skill specs, Python helper, log files.
- Don't do "auto-fix big loop" (see §8).

## 4. Constraints and Red Lines

Two principles throughout:

1. **Hiding from author ≠ relaxing validation, also ≠ silent.** All gates run and block as usual, fact-chain correctness zero compromise. System auto-handled things (like projection re-run) **must be stated in final report**, never silent; difference only in "by default not actively showing engineering details, not interrupting author for process trivialities".
2. **C built on B, landed in three phases.** Each phase independently delivers value, risk递增, can stop anytime, avoid one big bang.

> On "Claude Code capability boundary": this design doesn't assume host has collapsible UI, progress bar, background task, or graphical button. All "hide engineering details" implemented via **Skill constraint less output + Python helper renders concise report**, not any UI-level collapse.

## 5. Architecture: Engineering Core + Author Shell

Three layers. Author only deals with top layer, engineering core retreats behind. Author shell **is not new program/new UI**, but the collective name of Skill prompt spec + Python helper + text output + log these four things.

```
┌─────────────────────────────────────────────┐
│  Author Shell   ← physical carrier: Skill spec + helper + text + log │
│  · Next-step tail: "next you can..."                       │
│  · Command task-ification (only prompt language, not command name)               │
│  · Auto-handled items: don't disturb author, but final report must state          │
│  · Engineering details hidden by default: author sees milestones+conclusion, gives path/command when needed │
├─────────────────────────────────────────────┤
│  Presentation/Translation Layer (Author Layer)  ← foundation, zero intrusion          │
│  · Progress narration spec  · Error→action map (catalog)        │
│  · Review author view  · Terminology table                      │
├─────────────────────────────────────────────┤
│  Engineering Core (Engine)  ← untouched a single character                   │
│  Story System · gate · commit · projection · RAG        │
└─────────────────────────────────────────────┘
```

## 6. Component Design

Seven single-responsibility, independently-deliverable components, landed by phase. Each component clarifies its engineering landing in the codex plan.

### 6.1 Terminology Table (Glossary) · Phase 1
- **Responsibility**: engineering word → author word + one-line author explanation single source of truth; other components all reference it.
- **Consumes**: none (it's the vocabulary itself).
- **Produces**: controlled vocabulary, e.g.: contract→setting archive, commit→file into archive, projection→sync to各处, gate→self-check checkpoint, `mainline_ready`→whether this book's archive is ready.
- **Depends**: none. Is the base of other three.
- **Landing form**: single source file (`references/author_glossary.md` or structured `author_glossary.json`), SKILL prompt and script output uniformly reference, forbid each place inventing own translation. codex plan §5 already gives initial translation table, merged into this component.

### 6.2 Progress Narration Spec · Phase 1
- **Responsibility**: compress write-chapter pipeline into author milestones and define wording template.
- **Consumes**: write-chapter flow's current step.
- **Produces**: author only sees "check prior context → write text → health check → file into archive → done".
- **Depends**: terminology table.
- **Landing form**: write narration convention into each multi-step command, specify when each milestone reports, what to report. **By default not actively show engineering commands and JSON** (via Skill constraint less output + helper renders concise, not UI collapse); **failure info must surface**. Corresponds to codex plan §8.

### 6.3 Error→Action Map (Error Catalog) · Phase 1
- **Responsibility**: map known errors to "plain description + next action + severity". Highest-value component of this plan (codex review agreed to include).
- **Consumes**: error codes or features produced by `preflight` / `write-gate` / `doctor` etc.
- **Produces**: e.g. `mainline_ready=false` → "this book not yet archived, run `/webnovel-init` first".
- **Depends**: terminology table.
- **Landing form**: `error_catalog.py` + `author_error_catalog.json`; on miss degrade to "honest error + point to `/webnovel-doctor`", never crash or mistranslate.

### 6.4 Review Author View · Phase 1
- **Responsibility**: render author view on top of existing review report.
- **Consumes**: `review-pipeline` produced review_result (incl `blocking_count` etc).
- **Produces**: report top one-line conclusion (✅ pass / ⚠️ suggest change / ⛔ must change) + at most 3 "how to fix" executable items, technical details folded below (expand on demand, not UI collapse, is typeset segmentation).
- **Depends**: terminology table; existing review product structure.
- **Landing form**: `review_pipeline.py` report render stage adds author view section, doesn't change reviewer schema, doesn't change judgment logic.

### 6.5 Next-Step Advisor · Phase 2
- **Responsibility**: answer "what should I do now". **Decision: embed into each command's ending**, don't add independent entry command (codex review agreed this judgment).
- **Consumes**: `project-status` output phase and next step.
- **Produces**: each command after run appends unified-format hint, e.g. "next you can **write next chapter** `/webnovel-write 5`". Naturally parasitizes codex plan three-part report's part 3 "next-step suggestions".
- **Depends**: terminology table; `project-status`.
- **Landing form**: as part of `user_report.py`, called by each command's ending, outputs unified format + copyable command.

### 6.6 Command Task-ification (Task Language) · Phase 2
- **Responsibility**: express actions in author task language, reduce burden of "remember 8 command names".
- **Consumes**: next-step advisor's next-step suggestion.
- **Produces**: hint presents in task language (open new book / write next chapter / see how this chapter is / query a setting), with original command name attached.
- **Depends**: next-step advisor; terminology table.
- **Landing form**: only prompt-layer mapping, **keep `/webnovel-*` original command names untouched**, don't make real alias commands.

### 6.7 Auto-handled Items + Engineering Details Hidden by Default (Auto-handled & Quiet) · Phase 3
- **Responsibility**: keep system's existing limited auto-handling; by default don't disturb author for process trivialities; engineering details hidden by default.
- **Consumes**: error catalog's classification; retryable process error signals.
- **Produces**: projection failure→auto retry, contract missing→re-emit etc **kept**, but **process doesn't interrupt author + final report must state what handled + details to log**; by default only see milestones and conclusions, give path/command when needed.
- **Depends**: error catalog; progress narration spec; final report.
- **Landing form**: hang actions on error catalog's "auto-handled" category, constrained by §8 boundary. **Don't do auto-fix big loop**; real "error recovery" relies on author re-run → idempotent resume (see §8, engineering implementation cites codex plan §9).

## 7. Data Flow

Translation layer is **read-only consume + re-render, never inserts into engineering chain's write path**.

```
Engineering chain produces fact products as usual
(state.json / review_result.json / gate JSON / error code / projection_log.jsonl)
        │  (read-only consume)
        ▼
Translation layer   query terminology table / error catalog / review view spec  → render into author language
        │
        ▼
Author sees plain language; the "next step" they choose still calls original engineering command
```

**Fact source is always engineering product, not translation product.** If translation wrong just fix translation layer,底层 data never moved — this is the technical guarantee of "hide but don't relax validation", also makes translation layer independently testable and replaceable.

## 8. Error Handling and Recovery Boundary

Errors split into three types, corresponding to codex plan's exception classification (auto-handled / needs confirmation / must handle):

1. **Auto-handled (don't disturb author, but must state)** — only idempotent, retryable, non-content-touching process errors (projection failure→retry, contract missing→re-emit). Process doesn't interrupt author, **final report truthfully states what handled, whether affects result**, details to log. **Never silent.**
2. **Ask author decision (surface + limited options)** — involves content trade-off or irreversible (review blocking can't move, commit rejected due to `missed_nodes`) → plain language clear + 2-3 limited options (accept / hand-edit / give up).
3. **Honest error + help path** — environment-dependency level (RAG key not configured, Python dependency missing) → plain language + point to `/webnovel-doctor`.

**Error recovery = re-run is resume (absorbs codex plan §9).** Author needn't remember re-run commands; re-run same command, system per "trustworthy completion criterion" recognizes completed steps, continues from failure point, doesn't rewrite existing results. First version only covers `/webnovel-write`.

**Re-run must stop and ask author boundary (codex §9.5, fully agreed):**
- Text manually edited → ask: keep or rewrite (**never overwrite author hand-edit**).
- Chapter outline updated later than text → ask: old text or re-draft.
- Same chapter already accepted then re-run → ask: rewrite or only view status.

**Red lines**: never auto-skip validation, never disguise rejected as accepted, never swallow errors affecting fact correctness, never silently fix (fixed must state). **Don't do auto-fix big loop** (self-heal whitelist easily expands into new fault point, worst risk/benefit, both independent reviews vetoed).

## 9. Verification Strategy

Test behavior, not copy literal (consistent with project "tests are probes not constraints" orientation):

- **Fidelity probe**: same engineering product, translation output must keep key facts (pass/fail, which nodes missing, blocking count), not tamper or lose.
- **Error catalog coverage**: unknown error code auto-degrades to "honest error", no crash, no mistranslate.
- **No-silence probe**: auto-handled things (like projection re-run) must appear in final report, not swallowed.
- **Resume boundary probe**: text hand-edited / chapter outline updated later than text / already accepted etc scenarios, re-run must stop and ask author, not擅自 overwrite.

## 10. Phased Landing Roadmap

| Phase | Scope | Deliverable | Exit condition |
|----|------|--------|----------|
| One (foundation) | Translation layer four-piece | Terminology table, progress narration spec, error catalog, review author view | Four-piece online and pass fidelity/coverage probe; zero intrusion engineering core |
| Two (shell upper) | Next-step tail + command task-ification | Each command ending unified "next step" hint, task language mapping | Each command ending gives correct next step; original command name unchanged |
| Three (shell lower) | Auto-handled item statement + engineering details hidden by default + re-run resume | Auto-handled items into report, default concise presentation, `/webnovel-write` re-run resume | No-silence/resume boundary probe all pass; default view only milestones and conclusions |

Each phase independently delivers, can stop anytime. This order consistent with codex plan priority (see §11).

## 11. Bidirectional Cross-validation Conclusion and Merge Plan

**Correct one self-speculation**: this spec v1 §11 once speculated codex plan "focuses reporting, narrower scope". After reading its full text, this speculation **wrong** — codex plan scope very broad, resume-from-breakpoint, subagent return protocol, time-cost presentation, desensitized logging all covered, more complete and落地 on these facets than this spec.

**Bidirectional cross-validation (two independent products + mutual review) reached consensus:**
- Agreement: engineering core untouched, only presentation layer; terminology translation / process hint / error understandable / next-step suggestion are core; problems not silent, don't disguise rejected as accepted; runtime/structured data drive prior to pure prompt; author by default doesn't see engineering details but keeps troubleshooting log.
- This spec stronger: Error Catalog, Review Author View, Next-Step Advisor (embed ending), command task-ification, more restrained phasing — codex review agreed, suggested into its plan.
- codex plan stronger (this spec absorbed): unified final report three-part + four statuses, resume/run ledger, subagent return protocol, time-cost presentation, desensitized log, Phase 0-7施工 detail.
- codex pointed out and this v2 corrected spec risks: ① "collapse" changed to "hide engineering details by default" (CC no collapse UI); ② "silent self-heal" changed to "auto-handled but must state"; ③ "author shell" nailed physical carrier as Skill spec + helper + text + log, prevent scope膨胀.

**Merge division**: this spec defines **product layering** (layers / component responsibility / boundary / red lines), codex plan defines **engineering landing** (Phase / files / tests / build order). This spec's seven components into codex plan landing see each component "landing form".

**Post-merge implementation priority (aligned with codex review):**
1. Terminology table single source of truth
2. Error Catalog
3. Review Author View
4. Next-Step Advisor
5. Process hint spec
6. `user_report` helper
7. Resume / run ledger
8. Auto-handled whitelist (most restrained, do last)

## 12. Risks and Open Questions

- **Risk: translation layer and engineering core drift.** When engineering adds error code/product field, error catalog and author view need sync; rely on "miss then honest degrade" as backstop, but need include sync in release validation.
- **Risk: progress simplification hides real stall.** After hiding engineering details by default, must ensure failure signal always surfaces, auto-handled always written to report (guaranteed by §9 no-silence probe).
- **Open question: terminology table carrier** (pure markdown spec vs structured data + validation) — affects testability, leave to implementation plan.
- **Open question: auto-handled whitelist specifically which error codes** — lowest priority, before phase three based on error catalog real entries evaluate one by one, rather lack than excess.
