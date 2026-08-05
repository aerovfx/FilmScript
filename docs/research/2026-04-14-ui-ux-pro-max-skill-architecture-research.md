# UI/UX Pro Max Skill Architecture Research Report

> Document status: `draft` (2026-04-14)

## Document Goal

This document investigates the real engineering structure of the `ui-ux-pro-max` skill, focusing on four questions:

- It is not a single-file prompt, so what structure is it really?
- Why can it work stably, instead of just piling up copy?
- Which ideas and architecture are worth `webnovel-writer` learning?
- Which practices can be borrowed, and which cannot be copied directly?

Notes:

- This investigation is based on the local source directory
  `C:\Users\lcy\.gemini\tmp\webnovel-writer\ui-ux-pro-max-skill\src\ui-ux-pro-max`
- The goal is not a file-by-file recap, but extracting its transferable system design
- The conclusions serve the subsequent convergence specs for `references/csv` and `story-system`

## One-Line Conclusion

The core of why `ui-ux-pro-max` works is not "writing a long prompt", but that it builds the skill into a small knowledge system of **external knowledge base + generic retrieval kernel + upper-layer reasoning aggregator + persistent master/override files + platform-distribution adaptation**.

What we really lack is not the aggregator (`StorySystemEngine` already plays that role), but a set of **explicit, structured, reviewable adjudication layer** — currently much adjudication logic is still scattered across engine code, CSV, context_manager, and skill text, not yet converged into an independent config layer.

What is most worth learning is not the UI data itself, but these five architecture moves:

1. Move knowledge out of prompt text into structured tables
2. Query different knowledge domains with a unified retrieval primitive
3. Use an explicit reasoning layer to turn "what was found" into "how to finally adjudicate"
4. Land runtime results as a `Master + Override` layered source of truth
5. Converge platform differences into the template/metadata layer, not pollute the main knowledge layer

But one key distinction must be stated up front: `ui-ux-pro-max` is essentially a "aggregate-at-query-time" quasi-static knowledge system — its knowledge domains (style, color, font, tech-stack best practices) do not evolve with runtime events. Ours does — character state, relationships, settings, world rules all keep changing with chapter commits. This means even if we fully replicate its first four layers, we still have to separately solve the runtime-evolution problem of the `Chapter Commit Layer` and `Projection Layer`.

## Investigation Scope

This time we focused on:

- `scripts/core.py`
- `scripts/design_system.py`
- `scripts/search.py`
- `data/*.csv`
- `data/stacks/*.csv`
- `data/_sync_all.py`
- `templates/base/*.md`
- `templates/platforms/*.json`

## Its Real System Layers

From the directory structure, `ui-ux-pro-max` has at least three physical layers, plus one independent run path:

```text
ui-ux-pro-max/
├── data/        # structured knowledge base
├── scripts/     # retrieval, reasoning, aggregation, persistence
└── templates/   # skill content templates, platform-install metadata
```

The run path is:

```text
query
  -> search.py
  -> core.py / design_system.py
  -> structured output or persisted artifact
```

### 1. Data layer: not one big table, but "topic tables + reasoning tables + tech-stack tables"

Its data layer is clearly split into three types:

#### 1.1 Topic knowledge tables

E.g.:

- `styles.csv`
- `colors.csv`
- `charts.csv`
- `landing.csv`
- `products.csv`
- `ux-guidelines.csv`
- `typography.csv`
- `icons.csv`
- `react-performance.csv`
- `app-interface.csv`
- `google-fonts.csv`

These tables do not aim to unify into one super-table, but split by "knowledge domain".
Corresponding evidence:

- `scripts/core.py:17`
- `scripts/core.py:18`
- `scripts/core.py:68`

Key features:

- each domain has its own `file`
- each domain has its own `search_cols`
- each domain has its own `output_cols`

That is, it is not "query the whole table", but defines **search fields** and **display fields** per knowledge type.

#### 1.2 Reasoning tables

It additionally has a `ui-reasoning.csv`, which does not hold raw knowledge entries, but carries:

- category-to-pattern mapping
- style priority
- key effects
- anti-patterns
- decision rules

Evidence:

- `scripts/design_system.py:24`
- `scripts/design_system.py:43`
- `scripts/design_system.py:88`

This is key:
It separates "retrieval result" from "final adjudication".

#### 1.3 Tech-stack tables

It also separately maintains:

- `data/stacks/react.csv`
- `data/stacks/nextjs.csv`
- `data/stacks/vue.csv`
- `data/stacks/react-native.csv`
- `data/stacks/threejs.csv`
  etc., 16 tables

These are not product knowledge, but **implementation-layer best practices**.

Evidence:

- `scripts/core.py:75`
- `scripts/core.py:95`
- `data/stacks/react.csv`

This shows its data layering is by responsibility, not by file type:

- product/style/color/font "design knowledge"
- reasoning "adjudication knowledge"
- stack "implementation knowledge"

## Runtime Architecture

### 2. Generic retrieval kernel: one BM25 primitive serves all domains

The core of `core.py` is not complex, but the architecture is clean:

1. `CSV_CONFIG` registers domains
2. `_load_csv()` uniformly reads tables
3. `_search_csv()` uniformly goes BM25
4. `search()` does domain query
5. `search_stack()` does stack query

Evidence:

- `scripts/core.py:17`
- `scripts/core.py:166`
- `scripts/core.py:221`
- `scripts/core.py:243`

What is most worth learning is not BM25 itself, but:

- all domains share one search primitive
- change points all sink to config tables
- the script layer only cares "which table to read, which columns to query, which columns to emit"

This lets its data tables keep growing without rewriting a logic set per table.

Key excerpt:

```python
CSV_CONFIG = {
    "style": {
        "file": "styles.csv",
        "search_cols": [...],
        "output_cols": [...]
    },
    "color": {
        "file": "colors.csv",
        "search_cols": [...],
        "output_cols": [...]
    },
}
```

Here we must also calibrate the real gap between our current implementation and it.
`webnovel-writer/scripts/reference_search.py` is still **globally hardcoded fields**, not per-domain registration:

```python
_SEARCH_FIELD_WEIGHTS = {
    "意图与同义词": 4,
    "关键词": 3,
    "核心摘要": 2,
    "详细展开": 1,
}

_CONTENT_COLUMNS = [
    "技法名称", "桥段名称", "人设类型", ...
]
```

This means the more accurate correspondence is not
`core.py -> reference_search.py`, but:

- `core.py -> reference_search.py + not-yet-existing CSV_CONFIG registration layer`

### 3. Automatic domain detection: first judge "which knowledge to query"

`detect_domain()` uses a keyword table to first guess the domain, then decide what to query by default.

Evidence:

- `scripts/core.py:198`
- `scripts/core.py:202`
- `scripts/core.py:216`

Simple as this step is, it is inspiring:

- the skill does not require the caller to always explicitly specify a table
- the system first classifies the natural-language question into a knowledge domain
- then enters unified retrieval

For us, this maps to:

- genre-input routing
- task-intent to knowledge-table mapping
- table selection for different pre-write steps

### 4. Upper-layer aggregator: not "return after query", but "query then reason then assemble"

`design_system.py` is the true hub of this skill.

Its logic order:

1. first query `product`
2. get category from `product` result
3. use `ui-reasoning.csv` to find the corresponding reasoning rule
4. do multi-domain retrieval with `style_priority`
5. pick the best items from style / color / typography / landing
6. assemble into a unified `design_system` dict

Evidence:

- `scripts/design_system.py:51`
- `scripts/design_system.py:64`
- `scripts/design_system.py:88`
- `scripts/design_system.py:163`
- `scripts/design_system.py:197`

This is one layer above plain `reference_search`, because it is no longer "return search hits", but:

- has routing
- has adjudication
- has priority
- has a final unified output object

This is actually already very close to a lightweight contract generator.

## Persistence Architecture

### 5. Master + Overrides: land runtime results as a layered source of truth

Another key design of it:
The design system generated at runtime can be persisted as:

- `design-system/<project>/MASTER.md`
- `design-system/<project>/pages/<page>.md`

Evidence:

- `scripts/search.py:13`
- `scripts/design_system.py:561`
- `scripts/design_system.py:589`
- `scripts/design_system.py:612`
- `scripts/design_system.py:886`

The significance of this pattern is huge:

- `MASTER.md` is the global source of truth
- `pages/*.md` only records local deviations
- the override relationship is explicit, not implicit splicing

This is actually isomorphic to our current Story System:

- `MASTER_SETTING` ≈ `MASTER.md`
- `VOLUME / CHAPTER / REVIEW contract` ≈ `page override`

That is, the core idea of `ui-ux-pro-max` is not UI-specific, but:

- first unify the master source of truth
- then allow local overrides
- overrides must be explicitly expressed

## Distribution and Platform Adaptation

### 6. Platform metadata is separate from skill content

`templates/platforms/*.json` shows it is not prepared for only one agent platform.

E.g.:

- `templates/platforms/claude.json`
- `templates/platforms/codex.json`
- `templates/platforms/gemini.json`

These JSONs define:

- install root
- skillPath
- frontmatter
- title / description
- whether to attach quickReference

Evidence:

- `templates/platforms/claude.json`
- `templates/platforms/codex.json`
- `templates/platforms/gemini.json`

This means it thoroughly separates three things:

1. **knowledge content**
2. **runtime logic**
3. **platform adaptation shell**

This is a boundary very worth copying.

## Data Maintenance Strategy

### 7. It allows engineering scripts to maintain consistency, but does not treat scripts as runtime main logic

The role of `data/_sync_all.py` is clear:

- sync `products.csv`, `colors.csv`, `ui-reasoning.csv`
- handle rename / remove / add
- derive some default color and reasoning rows

Evidence:

- `data/_sync_all.py:1`
- `data/_sync_all.py:63`
- `data/_sync_all.py:136`

This script shows it has an "offline data-maintenance pipeline", not runtime temp-patching data.

But we must be cautious learning this part:

- **Can learn its "offline validation/sync" idea**
- **Cannot copy its "program-generated content" approach**

Because our hard constraints are:

- `md -> csv` knowledge migration must be done manually
- auto-extraction, auto-translation, auto-sentence-splitting into the DB is forbidden

So for us we should keep:

- schema-validation scripts
- uniqueness validation
- alias-coverage validation
- routing-table vs rule-table consistency validation

But must not write:

- auto batch-generate story knowledge entries from md

## Ideas Most Worth Migrating to Us

### 8. What we should learn is not UI data, but mapping it into our six-layer main chain

To avoid clashing with the six-layer terminology of `story-system-evolution-spec.md`, the following uniformly describes migration by the `evolution-spec 6.1` six layers:

```text
Knowledge Layer
    -> Reasoning Layer
        -> Contract Layer
            -> Runtime Assembly Layer
                -> Chapter Commit Layer
                    -> Projection Layer
```

`ui-ux-pro-max` mainly covers the first four layers, plus a `MASTER.md + page override` persistent source of truth;
but our story system must additionally add `Chapter Commit` and `Projection`, because knowledge evolves with chapter runtime.

Mapped to our project, the more accurate correspondence is:

| `evolution-spec` six layers | `ui-ux-pro-max` reference | `webnovel-writer` status / goal | current completeness |
|------|------|------|------|
| `Knowledge Layer` | `products.csv`, `styles/colors/...`, stack tables | `references/csv` base tables, dynamic tables, routing base tables | base skeleton exists: 7 rule tables, routing table, README schema in place |
| `Reasoning Layer` | `core.py`'s `CSV_CONFIG + detect_domain()`, and `design_system.py`'s reasoning rule | `题材与调性推理.csv`, `StorySystemEngine._route()`, future explicit `CSV_CONFIG` and reasoning config | half-done: route and engine adjudication exist, but not yet extracted into explicit config layer |
| `Contract Layer` | `design_system` unified object and `MASTER.md/pages/*.md` | `MASTER_SETTING / VOLUME_BRIEF / CHAPTER_BRIEF / REVIEW_CONTRACT / anti_patterns` | main skeleton connected: `engine.build()` can output `MASTER/CHAPTER/ANTI`, `RuntimeContractBuilder` can output `VOLUME/REVIEW` |
| `Runtime Assembly Layer` | "page override first, then MASTER" assembly logic when generating pages | `context_manager(contract-first)` and runtime context assembly | half-done: `context_manager` already reads runtime contracts, but overall still a runtime assembler, not yet fully converged to contract-first SSOT |
| `Chapter Commit Layer` | no complete counterpart; UI/UX skill has no event-commit main chain | `CHAPTER_COMMIT` + `override ledger` | wired, pending governance: `ChapterCommitService` can already generate commit, write event log, trigger amend proposal and projection writers, but rejected/backlog governance not yet fully closed |
| `Projection Layer` | no complete counterpart; no state-projection chain | `state / index / summaries / memory / dashboard` | wired, pending downgrade: four projection writers exist, but old state/index/memory scattered writes and dual-write chains not yet fully retired to projection layer |

If we only look at search primitive and aggregator, the correspondence should be stricter:

- `core.py` ≈ `reference_search.py + not-yet-existing CSV_CONFIG registration layer`
- `design_system.py` ≈ `StorySystemEngine + story_system.py + RuntimeContractBuilder`

### 8.1 What we really lack is not the "aggregator", but the "explicit reviewable adjudication layer"

Currently we already have:

- `题材与调性推理.csv`
- 7 rule tables
- `reference_search.py`
- `story_system_engine.py`

And the current system is not "only search, no aggregation".
`story_system.py` has already strung the main chain `build -> persist story seed -> build runtime contracts -> persist runtime contracts`:

```python
contract = engine.build(...)
persist_story_seed(...)
volume_brief, review_contract = RuntimeContractBuilder(project_root).build_for_chapter(...)
persist_runtime_contracts(project_root, args.chapter, volume_brief, review_contract)
```

`StorySystemEngine.build()` already directly outputs `MASTER_SETTING` / `CHAPTER_BRIEF` / `anti_patterns`:

```python
return {
    "master_setting": {
        "meta": {"contract_type": "MASTER_SETTING"},
        ...
    },
    "chapter_brief": {
        "meta": {"contract_type": "CHAPTER_BRIEF"},
        ...
    },
    "anti_patterns": anti_patterns,
}
```

This means the current `StorySystemEngine + RuntimeContractBuilder` already jointly shoulder most of the responsibilities in the route / aggregate / persist main chain.

So the current state is not "still missing an aggregator like `design_system.py`", but:

- we already have an aggregator
- but aggregation-adjudication logic is still scattered across engine code, CSV, `context_manager.py`, and skill text
- not yet extracted like `ui-reasoning.csv` into an explicit, structured, reviewable, testable rule layer

Currently much adjudication is still scattered in:

- `story_system_engine.py`
- `context_manager.py`
- skill text
- empirical prompt

Suggestion: later converge such rules explicitly into a Python config layer, or land them as an independent reasoning table.

Not necessarily CSV, but must be **structured, reviewable, testable**.

### 8.2 We should also keep strengthening the "Master + Override" mindset

We have actually partly done this, but need to write it harder at the spec level:

- `MASTER_SETTING` is the global source of truth
- `VOLUME_BRIEF` is the volume-level offset
- `CHAPTER_BRIEF` / `REVIEW_CONTRACT` are the chapter-level offset
- accepted `CHAPTER_COMMIT` is the post-write fact source of truth

This is the same class of idea as `ui-ux-pro-max`'s `MASTER.md + page override`.

But here we must add a key calibration:
`ui-ux-pro-max` is actually a **two-layer override**:

- `MASTER.md`
- `pages/*.md`

And we are already a **four-layer contract override + post-write fact layer**:

- `MASTER_SETTING`
- `VOLUME_BRIEF`
- `CHAPTER_BRIEF`
- `REVIEW_CONTRACT`
- accepted `CHAPTER_COMMIT`

This means the same field may be overridden at multiple layers, far more complex than the two-layer rule "page override trumps master".
So we cannot directly copy its override-decision logic; it must be designed together with the `override ledger` of `evolution-spec 8.5`.

### 8.3 We should learn its "registration-style config", not its data volume

What truly matters to us is to build a unified registry, clarifying:

- each table's responsibility
- search columns
- output columns
- poison-pill columns
- whether it belongs to base / dynamic / routing table
- whether it may enter the contract main chain

That is, build our own `CSV_CONFIG`.

But the starting point of this step should be: acknowledge that current `reference_search.py` is only a **generic BM25 primitive**, not yet a registration-style config layer.
Its current search and display columns are globally hardcoded, not domain-distinguished:

```python
_SEARCH_FIELD_WEIGHTS = {
    "意图与同义词": 4,
    "关键词": 3,
    "核心摘要": 2,
    "详细展开": 1,
}
_CONTENT_COLUMNS = [...]
```

So the next step is not to rewrite the search algorithm, but to add a per-table / per-domain metadata registration on top of it.

### 8.4 We should learn its "consumer-adaptation-layer isolation"

Our own future CSV / contract system should not directly expose table structure to all consumers.

The right direction is:

- `story-system` is responsible for producing unified contracts
- `context-agent` / `webnovel-write` / `webnovel-query` / `dashboard` only consume contracts
- platform/skill differences stay only at the consumption-entry layer

### 8.5 Context-window cost is an underestimated difference

`ui-ux-pro-max`'s CSV retrieval results go directly into the prompt; a single interaction's context window is enough to digest. But our writing brief must weave multi-source data like prior summaries, long-term memory, RAG clues, current state, reader-retention signals, etc., and the context-agent's own research stage already consumes a lot of context.

This means the reasoning layer cannot copy its "retrieve everything then reason" mode, but must consider:

- which data sources are queried on demand during the research stage (not dumped in full)
- the final brief's information density must be取舍, not "stuff in everything found"
- the reasoning rules themselves must be lightweight, not occupy large context chunks

This difference directly affects the "how heavy should the reasoning layer be" design decision: our reasoning layer should be lightweight config + on-demand routing, not like `design_system.py` stringing together five or six domain retrieval results in a single call.

## Places We Cannot Directly Copy

### 9.1 Cannot copy auto data generation

`ui-ux-pro-max`'s `_sync_all.py` has a tendency toward "program-generated derived data".
This is acceptable for UI color data, but not for a story knowledge base.

Our hard boundary must remain:

- knowledge-entry content must be manually curated
- scripts may only validate, fill gaps, align, dedup, check numbering
- cannot auto-migrate content from md

### 9.2 Cannot treat auto domain detect as the only truth

Its `detect_domain()` mainly relies on keyword heuristics.
This is usable in UI scenarios, but the story system cannot rely on this alone.

Our more suitable order is:

1. explicit user genre / `.story-system` contract
2. `题材与调性推理.csv`
3. alias / fallback
4. only last is heuristic guessing

Note: this is the **genre-routing decision order**, different from `evolution-spec 7.2`'s **runtime context-assembly priority**.
The latter, when a contract already exists, assembles input by `chapter -> volume -> master -> 题材与调性推理.csv -> genre-profiles.md -> templates/genres/*.md`.

### 9.3 Cannot let platform templates reverse-dominate the knowledge structure

The platform-adaptation layer must be a shell, not reverse-determine the CSV structure.

## Direct Inspiration for Our Next-Step Spec

If this investigation lands as an executable spec, what should be written into the spec is not "keep adding hundreds of CSV rows", but the following structural requirements:

### 10.1 Build our `CSV_CONFIG`

Here `CSV_CONFIG` should not replace `references/csv/README.md`; the two should have a clear division:

- `CSV_CONFIG`: Python-code-layer registration dict, directly consumed by runtime retrieval, routing, contract injection
- `README.md`: human-readable schema / entry spec / table-boundary explanation
- validation script: ensure `CSV_CONFIG` and `README.md` column definitions, table roles, and prefix conventions stay consistent

Current `README.md` already carries the schema-doc responsibility, e.g.:

```md
| `关键词` | 是 | high-weight trigger word, multi-value field, uniformly use `|` |
| `核心摘要` | 是 | concise summary for high-weight recall and result display |

### 命名规则.csv
| `命名对象` | character, book title, location, faction, technique, item, etc. |
```

So the more reasonable landing direction is not "README or `CSV_CONFIG` either/or", but:

- README speaks human
- `CSV_CONFIG` speaks machine
- **hard constraint**: there must be a CI validation script ensuring the two sides align. Without automated validation, two schema definitions will drift soon — this is not a suggestion, it is a must

At minimum clarify:

- table name / file name
- role
- search fields
- output fields
- poison-pill fields
- whether base / dynamic / routing table
- contract injection position
- whether allowed into the main chain
- the schema section in README it corresponds to

### 10.2 Clarify the "route -> reasoning -> rule tables -> contract" pipeline

This step is the most critical migration conclusion of this investigation.

### 10.3 Add a "research-entry-validation-acceptance" closed loop for the CSV main line

That is:

- manual topic selection
- manual distillation
- CSV entry
- schema / alias / route validation
- contract sampling verification

### 10.4 Demote skills / agents / dashboard all to consumption layer

Consume unified contracts, not each re-assemble knowledge.

## Final Judgment

The success of `ui-ux-pro-max` essentially shows one thing:

> The core of a strong skill is not writing a longer manual, but making knowledge, retrieval, reasoning, persistence, and consumption boundaries into explicit layers.

For `webnovel-writer`, what is ultimately most worth learning is not:

- keep writing longer skill text
- keep piling more scattered md
- keep letting each entry decide which references to query

But:

- use `references/csv` for the `Knowledge Layer` (see `evolution-spec 6.1`, `12.3`)
- use `story_system + explicit reasoning config` for the `Reasoning / Contract Layer` (see `evolution-spec 6.1`, `7`)
- use `.story-system` for the master source of truth and override layer (see `evolution-spec 7`, `8.5`)
- use `CHAPTER_COMMIT + override ledger + canonical event log` for the runtime-evolution main chain (see `evolution-spec 9`, `10`)
- let skills / agents / dashboard only consume unified output and projection views (see `evolution-spec 9.4`, `12`)

This is the idea and architecture truly worth migrating from it.
