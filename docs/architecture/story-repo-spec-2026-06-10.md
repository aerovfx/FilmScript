# Story Repo Format Spec (v7 draft 0.4 · frozen)

> Status: 0.4. Change vs 0.3: umbrella dir "定稿/" (Final) rename — author decision, fits author mental model: drafts in workspace, accepted into Final. Change vs 0.2: abolish monolithic YAML data file; promises and information-gaps change to "one Markdown per item + flat front matter" (§4.3, §5); add foolproof dialect (§2.2), repair card (§10 state 0), "conversation as editor" invariant (§1.9). Decision log see §14.
> Source: 2026-06-10 "most-correct architecture" discussion + strangler-pattern convergence plan Phase 0.
> Status: This spec is the legal text of v7. Code is a derivative of the format — when any implementation conflicts with this spec, change the implementation or change the spec; silently storing an extra copy in code is forbidden.

---

## 0. One-Liner

A book = a git repo. `定稿/` (Final) stores accepted facts and body text, `大纲/` (Outline) stores author intent and promises, `文风/` (Style) stores taste, `工作区/` (Workspace) stores everything before the ratchet. Accepting a chapter = one atomic commit. Except one deletable cache, no persistent derivative exists.

## 1. Design Invariants (legal clauses)

1. **File is truth**: all state is human-readable, hand-editable Markdown/YAML. System detects hand-edits and proposes carry-over, never errors out and refuses.
2. **Derivative is discardable**: after deleting `.cache/`, system fully rebuilds from source files, all queries answer normally. This is a CI acceptance item.
3. **Final only appends, never edits**: accepted-chapter facts are irreversible. Typo fix is exception; real setting change goes through explicit retcon transaction (§9).
4. **Settle atomicity**: chapter transaction's settle is either one complete commit, or workspace stays as-is, no intermediate state.
5. **Write/review separation**: rendering and review must be in different contexts; machine-check before model review.
6. **Escalation principle**: script < model < author. What can be counted is not estimated by model; what model can judge does not bother author; author's interface unit is decision card, not command.
7. **No VCS inside VCS**: versioning, audit, branching, rollback all use git, no self-built commit chain.
8. **Fault-tolerant read**: parsing any source file encountering unknown field must preserve and write back verbatim. Open-source users will extend the format, tools must not lose data.
9. **Conversation as editor**: any structured-data modification can be done with one natural-language sentence ("drop P-031, reason: switch to dark line"). Author need not learn any file format; hand-editing files is forever just an escape hatch.

## 2. Directory Overview (all Chinese)

All users are Chinese webnovel authors, **directory structure, file names, author-visible field names are all Chinese**. ASCII reserved only for machine protocol: item numbers (P-031, S-021), commit prefixes (ch/vol/retcon/fix), `spec_version`, technical files (`book.yaml`, `.gitignore`, `.cache/`).

```text
<book title>/
├── .git/
├── .gitignore                 # at least contains .cache/ and 工作区/
├── book.yaml                  # whole-book config (§3)
├── 定稿/                       # ── after ratchet ──
│   ├── 正文/
│   │   └── 0152-北境的雪.md    # chapter + front matter (§4.1)
│   ├── 设定/
│   │   ├── 角色/
│   │   │   └── 林晚.md         # character card (§4.2)
│   │   ├── 信息差/
│   │   │   └── S-021-灭门真凶.md  # information-gap, one file per item (§4.3)
│   │   ├── 世界观.md           # world rules, power system
│   │   ├── 时间线.md           # append-only table (§4.4)
│   │   └── 名册.md             # entity roster: canonical name / alias / first-appearance chapter (§4.5)
│   └── 记忆/
│       ├── 章摘要/0152.md      # entered on settle (§4.6)
│       └── 卷摘要/第05卷.md    # generated on volume retro
├── 大纲/                       # ── author intent, mutable ──
│   ├── 总纲.md                 # theme, golden finger, ending promise
│   ├── 卷纲/
│   │   └── 第05卷.md
│   └── 承诺/
│       └── P-031-灭门真凶.md   # promise, one file per item (§5)
├── 文风/                       # ── taste library ──
│   ├── 风格宪法.md             # (§6.1)
│   └── 金句库/                 # auto-harvested (§6.2)
├── 工作区/                     # ── before ratchet, default not in git ──
│   ├── 决策卡.md               # (§7)
│   ├── 上下文包.md             # context pack for this render, archived for audit
│   ├── 草稿-A.md               # best-of-N A/B/C
│   └── 评审报告/               # machine-check and shot-review output
└── .cache/                     # only allowed derivative cache (§11)
    └── index.db
```

### 2.1 Engineering Constraints for Chinese Paths (normative, CI-enforced)

The encoding tax of Chinese paths is absorbed by the following hard constraints, not luck:

- All file IO explicitly `encoding='utf-8'`; scripts and subprocess entries uniformly inject `PYTHONUTF8=1`; forbid depending on system locale.
- On repo init set `git config core.quotepath false` (Chinese paths readable in git log).
- File sorting always relies on zero-padded numeric prefix (`0152-`, `第05卷`, `P-031`), not Chinese dictionary order.
- Entity references always use **canonical name** (Chinese), alias resolved via roster (§4.5); no ASCII entity id introduced.
- CI must include full-chain test of Chinese paths on Windows (build → write chapter → settle → rebuild cache).

### 2.2 Foolproof Dialect (normative constraint on system-written format)

Three non-programmer author hand-edit YAML slips are full-width punctuation, indentation, type surprises. All structured content the system writes must obey this dialect — author editing in the shape the system writes is less error-prone:

- **Always flat**: front matter and `book.yaml` forbid nested maps, all fields top-level.
- **Lists always block format** (one `- item` per line), forbid inline `[a, b]` — block format is naturally immune to full-width commas.
- **Quote dangerous values**: when writing, strings that YAML may misjudge type (pure-numeric shape, true/false/yes/no/是/否 shape) auto-quote.
- Indent uniformly two spaces; encoding UTF-8 no BOM.
- **Always one file per record**, forbid monolithic data file — breaking one record only ruins one, and free text goes to Markdown body (full-width punctuation freely used), front matter only carries few flat short fields.

## 3. book.yaml

The repo's only pure YAML file: low-frequency, flat, under ten lines.

```yaml
spec_version: "7.0"
书名: Example Book Title
类型: Xuanhuan
每章目标字数: 3000
卷规模: 40                 # reference value, not hard constraint
文体基线起: 1              # style-fingerprint baseline chapter range, author can change
文体基线止: 30
高承诺最大搁置章数: 10     # beyond this lights "pacing debt"
连续弱钩上限: 3
关键章稿数: 3              # volume-opening / turning / climax chapter best-of-N
```

## 4. 定稿/ (Final)

Drafts in workspace, accepted into Final — directory name is the mental model.

### 4.1 Chapter File `定稿/正文/NNNN-title.md`

File name: four-digit zero-padded chapter number + hyphen + title. Front matter carries this chapter's contract and settle summary — **chapter carries its own acceptance record**, audit does not depend on external table. This file only written by settle (author edits body, not front matter).

```markdown
---
章号: 152
标题: Snow of the Northern Border
卷: 5
视角: Lin Wan
书内时间: Winter Moon 3, Year 1023 of Great Calendar    # free text, consistent format across book
字数: 3120
开启承诺:
  - P-058
推进承诺:
  - P-031
  - P-007
兑付承诺:
  - P-019
合同:                           # contract assertions at acceptance (already verified)
  - Lin Wan learns the first hard evidence of the massacre truth
  - P-058 opened: origin of the mysterious old man
  - ending strong hook: Mystic-tier token appears
---
body...
```

### 4.2 Character Card `定稿/设定/角色/<canonical-name>.md`

Front matter is machine-checked structured fields (flat, block lists); body is free setting text.

```markdown
---
姓名: Lin Wan
别名:
  - Wanwan
  - Junior Sister Lin
状态: Alive                # Alive/Dead/Missing/Sealed...
位置: Northern Snow Plains # last known location
境界: Foundation Seven Layer # dimension see 世界观.md
持有:
  - Frostblue Sword
  - Mystic-tier Token
最后变更章: 152
---
## Setting
...free text...
## Relationships
...free text, important relationship changes should also reflect in timeline...
```

### 4.3 Information-Gap `定稿/设定/信息差/<number>-<short-topic>.md`

Does not track "what each character knows about which events", only registers **information-gaps worth managing**, one file per item. Leak machine-check = scan character dialogue / inner monologue for keywords of info-gaps they don't know; waste machine-check =复述 to reader "what reader already knows". Ensemble-scene "who is present" need covered by timeline's presence column (§4.4), no separate mechanism.

```markdown
---
知情人:
  - Grand Elder
  - Mysterious Old Man
读者已知: false
登记章: 87
关键词:                   # for leak scan
  - Grand Elder
  - Massacre
  - Blood Letter
---
## Content
The true culprit of the massacre is the Grand Elder. The executor of that year's blood case was his dead disciples.
```

### 4.4 Timeline `定稿/设定/时间线.md`

Append-only Markdown table, settle appends one row. **Presence column can be empty**: daily chapters don't fill, ensemble / conspiracy scenes suggested — it is the only data source for later "who saw what".

```markdown
| 章 | 书内时间 | one-line event | present |
|----|----------|------------|------|
| 152 | Winter Moon 3, 1023 | Lin Wan gets Blood Letter in North, Mystic-tier token appears | Lin Wan, Mysterious Old Man |
```

### 4.5 Entity Roster `定稿/设定/名册.md`

Prevents "same person different name / same name different person". Table: `| canonical name | alias | type | first-appearance chapter |`. Machine-check at settle compares body's new proper nouns with roster, unregistered proper nouns listed in acceptance card for author confirmation (new entity or typo).

### 4.6 Memory Layer `定稿/记忆/`

- `章摘要/NNNN.md`: ≤200 chars, generated by model before settle, **put into acceptance card for author glance** (can edit on the fly), entered with transaction.
- `卷摘要/第NN卷.md`: ≤500 chars, generated on volume retro: main-line progress, relationship changes, unfulfilled-promise list.
- Longer-range "whole-book skeleton" is **derivative**: assembled on demand from volume summaries, not persisted.

## 5. Promises `大纲/承诺/` (one file per item)

The heart of the system. Foreshadowing, suspense, emotional line, satisfying-moment expectation, flag-planting unified as "promise to reader". File name `P-031-灭门真凶.md` (number-short-topic); front matter only six flat short fields, description / fulfillment plan /履历 all Markdown body — author writes as they like.

```markdown
---
类型: Suspense                # Foreshadowing|Suspense|Conflict|Relationship|Flag|Satisfying-setup
强度: High                  # High|Medium|Low
状态: Active                # Active|Fulfilled|Dropped
开启章: 12
兑付期限: Vol 7           # volume or chapter number; required when intensity is "High"
最后推进章: 152
---
## Description
Identity of the massacre true culprit.

## Fulfillment Plan
Publicly expose at Vol 7 sect assembly. Required at open, prevents hanging.

## 履历 (History)
- Ch 12: opened
- Ch 87: advanced — Blood Letter clue appears
- Ch 152: advanced — Lin Wan obtains hard evidence
```

**Settle rules (script-executed, machine-check level)**:

- Each chapter settle must touch (open/advance/fulfill) at least one promise, else rejected. **Exemption right in decision card**: author can check "exempt this chapter from promise settle" when拍板 brief (reason required, e.g. pure side story); model cannot self-exempt.
- settle's write to promise file = update front matter (status / last-advance chapter) + append one row to履历.
- New promise must have fulfillment plan; intensity "High" must have fulfillment deadline.
- Pacing debt = intensity "High" and `current chapter − last-advance chapter > max-high-promise-idle-chapters`, lights yellow in decision card.
- Drop must leave reason row in履历 (even abandoning a thread leaves a trace).
- Ledger-level view (due list, pacing debt, stats) provided by `.cache/` and disk, **no summary file maintained**.
- Derived metrics (no separate mechanism): card-strength = intensity of unfulfilled promises at chapter end; reader-retention risk = pacing-debt count + consecutive-weak-hook count.

## 6. 文风/ (Style)

### 6.1 Style Constitution `文风/风格宪法.md`

All system knowledge of author taste, author can review and edit. Front matter is machine-consumed part (block lists; catchphrases flattened as `character: phrase` list rows, not nested):

```markdown
---
禁词:
  - eyes narrowed
  - lips curled into a
禁句式:
  - 'not.*but'
口癖:
  - Lin Wan: self-address "this lady"
---
## Iron Laws
...
## Pacing Preference
...
## Rules from Vetoes
- Do not open with weather (source: Ch 89/103/121 three vetoes)
```

Rules enter constitution via "three similar vetoes → system proposes → author confirms" flow, each with source.

### 6.2 Golden-Line Library `文风/金句库/`

At settle if `diff(model draft, author final)` exceeds threshold (default: single-paragraph change > 30%), auto-save "author-revised paragraph + scene tag" as sample. Injected as few-shot when rendering similar scenes. Split by scene into files: `战斗.md` (combat), `对白.md` (dialogue), `情感.md` (emotion)... each file keeps latest 20, old rotated to archive.

## 7. 工作区/ (Workspace) and Decision Card

Workspace default fully gitignored — everything before ratchet allowed to lose; contract's final home is chapter front matter (§4.1). **Users wanting to keep draft history just delete that line in `.gitignore`**: settle still clears workspace, system behavior unchanged, history naturally left by git. This is normative requirement — implementation must not assume workspace not git-tracked.

`决策卡.md` (Decision Card) is the only interface author needs to see, fixed four sections:

```markdown
# Decision Card: Chapter 152
## Board (script-generated)
- Position: Vol 5, 24/40 chapters
- Pacing debt: P-031 (High, 12 chapters not advanced)
- Consecutive weak hooks: 2 chapters
## Proposal
Advance P-031 (Lin Wan obtains evidence), open P-058 on the way, end with Mystic-tier token appears card chapter.
## Contract (effective on拍板)
- [ ] Lin Wan learns first hard evidence of massacre truth
- [ ] P-058 opened: origin of mysterious old man
- [ ] ending strong hook
## Alternatives
B plan: this chapter pure emotional transition, P-031 to next chapter (cost: pacing debt +1)
(if exempt promise settle, note reason here)
```

Author has only three actions: adopt / edit card / pick alternative. Edit card = directly edit this file, or one sentence let system edit (invariant 9).

## 8. Chapter Transaction (inner loop)

| # | Stage | Executor | File effect |
|---|------|--------|----------|
| 1 | brief | script reads board | generate `工作区/决策卡.md` |
| 2 | 拍板 (decide) | **author** | decision card's contract section solidified |
| 3 | pack | script | assemble `工作区/上下文包.md`: board+contract+fact slice+info-gap boundary+recent chapter endings+re-read list+style anchor |
| 4 | render | model (clean context) | `工作区/草稿-*.md`; key chapters best-of-N |
| 5 | machine-check | script | contract assertion compare, leak scan (info-gaps), banned-word/repeat scan, new proper-noun compare roster, word count. **Fail → directly back to step 4, no bother author** |
| 6 | shot review | model ×3 (each fresh context) | reader shot (satisfying / which part want to skip), editor shot (structure & commerciality), fact shot (only explains machine-check result) → `工作区/评审报告/` |
| 7 | accept | **author** | acceptance card = draft + three-sentence review + new proper nouns to confirm + **chapter summary (glance, editable)**. Action: accept / accept after edit / reject |
| 8 | settle | script, **atomic** | see below |

**settle's one commit contains**: draft → `定稿/正文/` (front matter writes contract and promise settle); `设定/` changes (location/status/realm/hold/info-gap/roster/timeline); involved `大纲/承诺/` file settle (front matter update +履历 append); `记忆/章摘要/` (acceptance-card final version); `文风/金句库/` harvest (if triggered); workspace cleared.

**commit message convention** (ASCII prefix is machine protocol, for `git log --grep`):

```text
ch(152): Snow of the Northern Border

承诺: +P-058 ~P-031 ~P-007 $P-019     # + open ~ advance $ fulfill
设定: Lin Wan.location=Northern Snow Plains; info-gap+S-021
```

## 9. Middle Loop, Outer Loop and Exception Transactions

- **Volume retro** `vol(05): retro and next-volume planning`: promise audit (this volume open/close/expired list) → `记忆/卷摘要/` → dialogue with author produces `大纲/卷纲/第06卷.md` → on the way do foreshadowing-opportunity scan (model proposes 3-5 "can bury this volume, echoes N volumes later" candidates, must cite concrete long-term nodes in master outline, author checks then generate promise file).
- **Health check** (auto every 50 chapters): style-fingerprint vs style-baseline-range drift report + promise bad debt + timeline orphans → report to workspace, not entered; author decides pull back or update baseline.
- **retcon**: `retcon(87): fix Grand Elder realm setting` — explicit transaction, allows editing Final, requires commit message stating reason, setting/promise synced, audit traced.
- **Hand-edit detection**: each startup `git status` finds Final/Outline has unsettled hand-edits → decision card asks "settle?" → after confirm `fix(设定): …` entered. **System adapts to author, no error.**
- **Branch future**: author wants to try another line → `git branch what-if/xxx`, each推演 3-chapter outline, after reading merge or delete branch.

## 10. Board State Machine (single entry)

On startup judge in order, stop on hit:

| # | Condition | Next |
|----|------|--------|
| 0 | Any source file parse failed | **Repair card**: locate line, show context, model proposes repair preserving intent, author confirms. Full-width colon/comma at structural position (after key, list separator) is deterministic error, can pre-repair then only report not ask. **Never crash with stack.** |
| 1 | Final/Outline has unsettled hand-edits | propose fix settle |
| 2 | Workspace has unfinished transaction | continue from interrupted stage |
| 3 | Just-settled chapter is volume-end | volume retro |
| 4 | Chapter number reaches health-check cycle | health-check card |
| 5 | else | new chapter brief (inner loop step 1) |

8 old commands all internalized into above states' stages. Author only needs one entry and "continue".

## 11. Derivative Cache `.cache/index.db`

Only allowed persistent derivative, gitignored, deletable any time. First query rebuilds, rebuilder only reads 定稿/大纲/文风 source files. Tables (machine domain, English table names): `chapters` (front matter expanded), `promises`, `secrets`, `entities` (roster), `fingerprints` (style-fingerprint history). **Rebuilder is the reference implementation of the format** — able to fully rebuild proves format self-consistent.

## 12. Migration Map (v6 → v7, one-time script)

| v6 | v7 |
|----|----|
| `正文/` | `定稿/正文/` (add front matter, contract fields marked "migrated") |
| `设定集/` | `定稿/设定/` (character card add front matter) |
| `大纲/` (master, volume) | `大纲/总纲.md`, `大纲/卷纲/` |
| plot_threads / foreshadowing / chase_debt / reading_power | generate `大纲/承诺/` files one by one |
| `.webnovel/state.json` | one-time expand into `定稿/设定/` |
| `summaries/` | `定稿/记忆/` |
| project_memory patterns / scratchpad | `文风/风格宪法.md` (human pass before entering constitution) |
| `.story-system/` commit chain | on migration compress into one initial commit, original dir read-only archived |
| index.db / vectors.db / projection_log | delete (index into `.cache/` rebuild; vector is optional plugin) |

## 13. Not-Doing List

- ❌ Monolithic YAML data file (multiple records always one Markdown file per item)
- ❌ Event-log table and per-event witnesses projection (replaced by info-gap/ + timeline presence column)
- ❌ Persistent vector db (semantic retrieval = optional plugin, never fact-recall main path)
- ❌ Long-running service (Dashboard changed to on-demand static report, read-only story repo)
- ❌ Self-built commit chain / projection_log / scratchpad
- ❌ Model freely judges "good or bad writing" (explicitly excluded in shot responsibilities)
- ❌ Fully automatic unattended mode

## 14. Decision Log

### 0.1 → 0.2

| # | Problem | Decision | Decider | Reason |
|---|------|------|--------|------|
| 1 | Directory language | All-Chinese dirs + all-Chinese author-visible fields; machine protocol keeps ASCII | Author | All users are Chinese webnovel authors; encoding tax absorbed by §2.1 hard constraints |
| 2 | Workspace in git? | Default not; delete one `.gitignore` line to opt in, implementation must compat both states | Claude | Default keeps "pre-ratchet discardable" simplicity, complex need satisfied by one-line switch |
| 3 | Info-gap simplification enough? | Keep lightweight registry; timeline adds optional "presence" column covering ensemble need | Claude | One column data vs a set of event-projection mechanism, cost differs two orders of magnitude |
| 4 | Who decides chapter summary | Into acceptance card for author glance, editable, entered with transaction | Author | Summary is source of long-term memory, one wrong pollutes later hundreds of chapters |
| 5 | Must settle promise each chapter | Keep hard machine-check; exemption right in decision card, belongs to author, reason required | Claude | Rule must be hard to matter, but exemption is taste decision, belongs to human not model |

### 0.2 → 0.3 (cause: author questioned "is YAML convenient for author to edit")

| # | Problem | Decision | Decider | Reason |
|---|------|------|--------|------|
| 6 | Monolithic YAML unsafe for non-programmers | Promises and info-gaps split into "one Markdown per item + flat front matter"; only pure YAML in repo is book.yaml | Author proposed, Claude designed | Three slips full-width punctuation / indentation / type; blast radius shrinks from whole ledger to single item; free text returns to body |
| 7 | Slip prevention | Foolproof dialect (§2.2): always flat, block lists, quote dangerous values | Claude | Author editing in shape system writes is less error-prone |
| 8 | Slip fallback | Parse failure issues repair card (§10 state 0), no crash; full-width-punctuation structural error deterministically pre-repaired | Claude | System always has LLM present, this is fallback ordinary software lacks |
| 9 | Root-path cure | "conversation as editor" into constitution (invariant 9) | Claude | Author need not learn YAML from start to finish |

### 0.3 → 0.4

| # | Problem | Decision | Decider | Reason |
|---|------|------|--------|------|
| 10 | "正典" (canon) translation stiff | Umbrella dir renamed "定稿/" (Final), structure unchanged (alternatives: flatten top level, "正史" official history) | Author | Fits author mental model: drafts in workspace, accepted into Final |
