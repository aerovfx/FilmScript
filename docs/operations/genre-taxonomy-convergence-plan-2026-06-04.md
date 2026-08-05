# Genre Taxonomy Convergence Plan

Date: 2026-06-04
Status: second revision

## Goal

Converge the genre system to the 15 `canonical_genre` values already used by the CSV, while keeping the 37 Chinese genre templates as stackable presets during initialization.

One-line principle:

> The CSV canonical is the retrieval backbone; the taxonomy index is the source of truth for the user-input layer; template files are presets; platform sub-genres, tropes, and formats are all tagged.

## Verified Facts

- `webnovel-writer/templates/genres/*.md` currently has 37 files.
- The 37 templates are only read directly in the init path:
  - `skills/webnovel-init/SKILL.md` prompts to read `templates/genres/` by user genre.
  - `scripts/init_project.py` concatenates `templates/genres/{key}.md` after `_normalize_genre_key()`.
- There are at least three genre-input normalization logics, with different output namespaces:
  - `scripts/init_project.py::_normalize_genre_key()`: user input -> template filename.
  - `scripts/reference_search.py::resolve_genre()`: user input / platform tag / legacy -> 15 canonical.
  - `scripts/data_modules/genre_aliases.py::GENRE_INPUT_ALIASES`: user input -> preset/profile legacy-image key prefix.
- The existing mapping scale can no longer be roughly estimated in dozens:
  - `PLATFORM_TO_CANONICAL` 34 keys.
  - `_LEGACY_GENRE_MAP` 27 keys.
  - 54 keys after dedup, 7 keys overlap.
  - Plus 15 canonical and `全部`, `resolve_genre()` can currently handle 67 distinct inputs.
  - Adding the 15 input aliases from `_normalize_genre_key()` / `GENRE_INPUT_ALIASES`, the taxonomy input coverage set is 78 distinct labels.
  - Adding the 37 template file stems, the full coverage set is currently 92 distinct labels/stems.
- `_normalize_genre_key()` and `GENRE_INPUT_ALIASES` currently have identical 15-item content — a duplicate source of truth.
- `state.json` current schema is `project_info.genre`, not top-level `project.genre`.
- Legacy `project.genre` consumers are more than plan/write:
  - `skills/webnovel-init/SKILL.md`
  - `skills/webnovel-plan/SKILL.md`
  - `skills/webnovel-write/SKILL.md`
  - `skills/webnovel-review/SKILL.md`
  - `scripts/data_modules/context_manager.py`
  - `scripts/data_modules/memory_contract_adapter.py`
- `context_manager.py` currently prioritizes `project.genre`, with `project_info.genre` as fallback; target state should reverse to `project_info` first.
- `memory_contract_adapter.py` current fallback chain is Story Contracts route -> protagonist genre -> legacy `state.project.genre`, does not read `project_info.genre`; target state should add `project_info` and put legacy `project.genre` last.
- `story_system_engine.py::_route()` includes keyword/alias match, explicit genre fallback, inferred genre fallback; when all miss it raises `StorySystemRoutingError`, not a silent fallback.
- `references/csv/题材与调性推理.csv` currently has 26 actual route rows; tests should cover the real CSV's full rows, not hardcode 26 or 27.
- `references/genre-profiles.md` is positioned as fallback; high-frequency genre main chains have migrated to Story Contracts.

## Core Design Boundaries

### 1. Two namespaces must not be confused

A unified resolver does not mean a single output value. Must explicitly distinguish:

- `canonical_genre`: used for CSV retrieval, Story System, adjudication rules, new project `project_info.genre`.
- `template_files`: used by init to load `templates/genres/*.md`.

Typical conflict:

- Old init behavior: `玄幻 -> 修仙.md`.
- Old reference behavior: `resolve_genre("玄幻") -> 玄幻`.

The new resolver must express both:

```python
GenreResolution(
    raw_label="玄幻",
    canonical_genre="玄幻",
    template_files=["修仙.md"],
    matched_labels=["玄幻"],
    route_tags=[],
    trope_tags=[],
    format_tags=[],
    unresolved=[],
    warnings=[]
)
```

### 2. Hard genre enum

The only hard enum continues to use the 15 canonical:

```text
都市 玄幻 仙侠 奇幻 科幻
历史 悬疑 游戏 古言 现言
幻言 年代 种田 快穿 衍生
```

These values are used for:

- CSV `适用题材`
- `裁决规则.csv`'s `题材`
- Story System's `canonical_genre`
- `reference_search.py --genre`
- new project `state.json.project_info.genre`

### 3. Taxonomy Index

Add `webnovel-writer/references/taxonomy/genre-index.csv`. It is not just a template list, but the sole taxonomy data source of truth for the user-input layer.

Suggested fields:

```csv
label,canonical_genre,label_type,template_file,route_tags,trope_tags,format_tags,aliases,notes
修仙,玄幻,preset,修仙.md,,,,"玄幻;玄幻修仙;修仙/玄幻;修真","preserve old init: 玄幻 loads 修仙.md"
都市脑洞,都市,platform,都市脑洞.md,都市脑洞,,,,"都市奇闻",
高武,都市,platform,高武.md,高武,,,,"都市高武",
电竞,游戏,platform,电竞.md,游戏电竞,,,,"电竞文;游戏电竞",
直播文,现言,format,直播文.md,,,直播文,"直播;直播带货;主播",
克苏鲁,悬疑,preset,克苏鲁.md,克苏鲁,,,,"克系;克系悬疑",
规则怪谈,悬疑,route,规则怪谈.md,规则怪谈,,,,"规则动物园;规则类",
知乎短篇,现言,format,知乎短篇.md,,,知乎短篇,"知乎体;盐选;小程序短篇",
历史古代,历史,platform,历史古代.md,历史古代,,,,"",
青春甜宠,现言,platform,青春甜宠.md,青春甜宠,,,,"青春",
游戏体育,游戏,platform,游戏体育.md,游戏体育,,,,"网游;竞技;体育",
民国言情,年代,platform,民国言情.md,民国言情,,,,"",
武侠,历史,legacy,,,,,,legacy without template
```

Rules:

- Every `templates/genres/*.md` must have exactly one row in the index with `template_file` pointing to it.
- `label` and `aliases` share the same lookup space, must be unique, must not map to multiple canonical.
- `aliases` use `;` separator; if a field contains a comma, it must be wrapped in CSV quotes.
- Platform/legacy aliases without template files must also enter the index, not stay in Python hardcoded dicts.
- `canonical_genre` must belong to the 15 canonical or `全部`.
- `label_type` suggested values: `canonical`, `platform`, `route`, `trope`, `format`, `preset`, `legacy`.
- Do not set a separate `template_type` to avoid overlap with `label_type`; template purpose is expressed jointly by `label_type` and tag columns.
- `GENRE_PROFILE_KEY_ALIASES` is not yet migrated to index. It outputs an English profile section key, different from the canonical/template namespace; Phase 1-5 only migrates input aliases, keeps the profile key mapping and renames/comments clearly.

### 4. Resolver Contract

Add a shared loader/resolver, e.g. `scripts/genre_taxonomy.py`:

```python
GenreResolution(
    raw_label="知乎短篇风的规则怪谈",
    canonical_genre="悬疑",
    matched_labels=["规则怪谈", "知乎短篇"],
    template_files=["规则怪谈.md", "知乎短篇.md"],
    route_tags=["规则怪谈"],
    trope_tags=[],
    format_tags=["知乎短篇"],
    unresolved=[],
    warnings=[]
)
```

Compatibility principles:

- `reference_search.resolve_genre()` stays as a wrapper, only returns canonical or the original value, for existing call sites.
- `_normalize_genre_key()` no longer owns an alias dict; if temporarily kept, can only delegate to the taxonomy resolver returning the stem of the first `template_file`.
- `data_modules/genre_aliases.py` no longer maintains `GENRE_INPUT_ALIASES`; only keeps the profile key mapping, or gets the template/profile lookup label via taxonomy first.
- Story System does not change `_route()`'s route-table matching semantics, only connects the input canonicalization capability to the same wrapper.
- The loader uses caching, e.g. `functools.lru_cache`, to avoid re-reading CSV on the hot path.

### 5. Resolver Matching Algorithm

Phase 1.5 must define and test the algorithm first, not rely on implicit behavior:

1. Normalize input: trim, unify fullwidth/halfwidth symbols, case-insensitive, remove extra whitespace.
2. Split tokens by separator: support `+`, `＋`, `/`, `、`, `,`, `，`, `|`, `与`.
3. Exact match first: when a token hits `label` or any alias, add directly to the match result.
4. Longest substring match as fallback: scan the full original input in descending order of label/alias length, supports composite natural-language input like `知乎短篇风的规则怪谈`.
5. Dedupe and conflict handling:
   - Same `template_file` kept only once.
   - `route/platform/canonical/preset` priority decides `canonical_genre`.
   - `format/trope` can append tags and templates, but must not override route/platform canonical.
   - When multiple high-priority tags point to different canonical, return `warnings=["ambiguous_canonical"]`; the init interaction layer should show the inferred result and let the user confirm.
6. Unmatched fragments go into `unresolved`, wrapper keeps old behavior: `resolve_genre()` returns the original value rather than raising directly.

## State Schema

New init project writes:

```json
{
  "project_info": {
    "genre": "悬疑",
    "genre_label": "知乎短篇风的规则怪谈",
    "genre_tags": {
      "route": ["规则怪谈"],
      "trope": [],
      "format": ["知乎短篇"],
      "templates": ["规则怪谈", "知乎短篇"]
    }
  }
}
```

Compatible read order:

1. `project_info.genre`
2. `project_info.genre_label`
3. legacy `project.genre`
4. config fallback

New projects no longer write top-level `project.genre`.

## Change Scope

### Must change

- `templates/genres/*.md`
  - H1 title in Chinese.
  - Do not move files.
- `references/taxonomy/genre-index.csv`
  - Cover the 37 templates.
  - Cover the label/alias sets of `PLATFORM_TO_CANONICAL`, `_LEGACY_GENRE_MAP`, `_normalize_genre_key()`, `GENRE_INPUT_ALIASES`.
- `scripts/genre_taxonomy.py`
  - Add shared CSV loader/resolver.
- `scripts/reference_search.py`
  - Remove hardcoded `PLATFORM_TO_CANONICAL` and `_LEGACY_GENRE_MAP`.
  - `resolve_genre()` delegates to taxonomy wrapper.
- `scripts/init_project.py`
  - Resolve user's raw genre via taxonomy at init.
  - `project_info.genre` writes canonical.
  - Load preset by `template_file` when reading templates, no longer concatenate path by raw input.
- `scripts/data_modules/genre_aliases.py`
  - Remove `GENRE_INPUT_ALIASES`.
  - Keep and comment `GENRE_PROFILE_KEY_ALIASES`, noting it belongs to the fallback profile key namespace.
- `scripts/data_modules/context_manager.py`
  - Currently `project.genre` first; change to `project_info.genre` / `genre_label` first, legacy `project.genre` fallback.
- `scripts/data_modules/memory_contract_adapter.py`
  - Currently does not read `project_info`; add `project_info.genre` / `genre_label` to fallback chain, put legacy `project.genre` last.
- `skills/webnovel-init/SKILL.md`
  - Main genre shows only 15 canonical.
  - Fix legacy `project.genre` shell snippet.
  - Explain that preset/trope/format can be input, but runtime maps to canonical.
- `skills/webnovel-plan/SKILL.md`
  - Fix all legacy `project.genre` shell snippets.
- `skills/webnovel-write/SKILL.md`
  - Fix legacy `project.genre` shell snippet.
- `skills/webnovel-review/SKILL.md`
  - Fix legacy `project.genre` shell snippet.
- `templates/output/state-schema.md`
  - Add `project_info.genre_label` and `project_info.genre_tags` examples.
- `scripts/validate_csv.py`
  - Add taxonomy index bidirectional validation.
  - Add symmetric diff validation from three old dicts to index.
- Related tests
  - `reference_search` resolver compatibility test.
  - `init_project` state/schema/template loading test.
  - Story System real CSV route end-to-end test.
  - grep/fixture validation that all SKILL.md read `genre`.

### Should change

- `references/csv/genre-canonical.md`
  - Clarify that `题材与调性推理.csv`'s `题材/流派` is a route tag, not the canonical enum.
- `references/csv/README.md`
  - Add the relationship between taxonomy index, template preset, and canonical.
- `references/index/reference-loading-map.md`
  - Update init-stage genre template loading rules.
- `references/genre-profiles.md`
  - Fix the `project.genre` doc wording to `project_info.genre`, and mark the fallback positioning.

### Won't change for now

- No large rewrite of the 9 core CSV contents.
- No deletion of the 37 templates.
- No immediate split of `templates/genres/` into `canonical/` and `presets/` subdirs.
- No batch migration of users' existing project `state.json`, only provide compatible reads.
- No re-promotion of `genre-profiles.md` to primary source of truth.
- No migration of `GENRE_PROFILE_KEY_ALIASES` to index in Phase 1-5; it belongs to the profile fallback namespace, evaluated separately later.

## Phased Plan

### Phase 1: Taxonomy Index and Template Validation

Scope:

- Add `references/taxonomy/genre-index.csv`.
- Cover the existing 37 template files.
- Bring the following sets all into the index's `label` or `aliases`:
  - `GENRE_CANONICAL` 15 items and `全部`.
  - `PLATFORM_TO_CANONICAL` 34 keys.
  - `_LEGACY_GENRE_MAP` 27 keys.
  - `_normalize_genre_key()` 15 keys.
  - `GENRE_INPUT_ALIASES` 15 keys.
  - 37 template file stems.
- The index can carry multiple aliases in one row, so 92 rows are not required, but the coverage set must be complete.
- All template H1 in Chinese, remove English parentheses.
- New validations:
  - Actual `templates/genres/*.md` count and index `template_file` bidirectional consistency.
  - Each `template_file` exists and is unique.
  - Each `canonical_genre` belongs to the 15 canonical or `全部`.
  - Each `label`/`alias` unique, must not map to multiple canonical.
  - Old dict keys vs index label/alias symmetric diff, diff must be empty or explicitly in allowlist.

No runtime logic change.

Validation:

```powershell
(Get-ChildItem -Path webnovel-writer\templates\genres -Filter *.md | Measure-Object).Count
python -X utf8 webnovel-writer\scripts\validate_csv.py
```

### Phase 1.5: Resolver Contract Lands First

Scope:

- Add shared taxonomy loader/resolver.
- Define structured `GenreResolution`.
- Implement and test the exact + longest-substring matching algorithm from Section 5.
- Clarify delegation for `reference_search.resolve_genre()`, `init_project` template resolution, `genre_aliases` profile key lookup.
- Clarify `GENRE_PROFILE_KEY_ALIASES` stays in `genre_aliases.py`, but input alias source changes to taxonomy.
- In tests first prove old behavior is not lost:
  - `PLATFORM_TO_CANONICAL` original cases all pass via index resolver.
  - `_LEGACY_GENRE_MAP` original cases all pass via index resolver.
  - `_normalize_genre_key()` original alias cases all resolve to the same template file.
  - `GENRE_INPUT_ALIASES` original alias cases all get the same profile lookup label.

The goal of this phase is to remove the "multiple sources of truth" design risk before moving to call-site migration.

### Phase 2: Migrate Runtime Call Sites

Scope:

- `reference_search.py` removes hardcoded mapping, uses taxonomy.
- `init_project.py` removes local alias dict, loads templates by `GenreResolution.template_files`.
- `story_system_engine.py` keeps `_route()`'s keyword/alias/fallback/exception order, internal canonical resolve uses the same wrapper.
- `genre_aliases.py` input alias migrates to taxonomy, profile key only handles profile section/key compatibility.
- Add lint/grep to forbid new hardcoded input dicts like `PLATFORM_TO_CANONICAL`, `_LEGACY_GENRE_MAP`, `GENRE_INPUT_ALIASES`.

Validation:

- `都市日常 -> 都市`
- `宫斗宅斗 -> 古言`
- `玄幻言情 -> 幻言`
- `规则怪谈 -> 悬疑`
- `网游 -> 游戏`
- `玄幻 -> canonical 玄幻, and init template selects 修仙.md`
- `克系 -> canonical 悬疑 or per index config, and init template selects 克苏鲁.md`
- `知乎短篇风的规则怪谈 -> canonical 悬疑, and templates include 规则怪谈.md and 知乎短篇.md`

### Phase 3: Init Write and Schema Consumer Fixes

Scope:

- `init_project.py` writes `project_info.genre`, `project_info.genre_label`, `project_info.genre_tags`.
- `skills/webnovel-init/SKILL.md`, `skills/webnovel-plan/SKILL.md`, `skills/webnovel-write/SKILL.md`, `skills/webnovel-review/SKILL.md` genre reading changes to:
  - `project_info.genre` first.
  - `project_info.genre_label` as display/diagnostics.
  - legacy `project.genre` fallback.
- `memory_contract_adapter.py` and `context_manager.py` also change to `project_info` first.
- Update `templates/output/state-schema.md`.

Compatibility strategy:

- Old projects with only `project.genre` remain readable.
- New projects no longer write `project.genre`.
- Non-canonical old values are compatible via taxonomy resolver, no direct crash.

Validation:

- init new project state schema test.
- The four SKILL.md shell snippet read-logic test or grep validation.
- memory/context fallback test.

### Phase 4: Story System Real CSV End-to-End Validation

Scope:

- Add real CSV route coverage test using `webnovel-writer/references/csv/题材与调性推理.csv`.
- For each route row:
  - If `关键词` / `意图与同义词` / `题材别名` has a value, take the first available alias as query, assert `_route()` does not raise, and usually `keyword_or_alias_match`.
  - If alias field is empty, use `题材/流派` or `canonical_genre` as explicit genre fallback input, assert no raise.
- Assert:
  - No `StorySystemRoutingError` raised.
  - `route.canonical_genre` belongs to 15 canonical.
  - `route.genre_filter == route.canonical_genre`, unless canonical is empty or `全部`.
  - Unknown query + unknown genre should still raise `StorySystemRoutingError`, preserving existing failure semantics.
- The current real CSV is 26 rows, but tests should dynamically cover the actual row count, not hardcode 26 or 27.

Validation:

```powershell
$env:PYTHONUTF8='1'; python -m pytest webnovel-writer\scripts\data_modules\tests\test_story_system_engine.py -q --no-cov
$env:PYTHONUTF8='1'; python -m pytest webnovel-writer\scripts\data_modules\tests\test_story_system_cli.py -q --no-cov
```

### Phase 5: Skill and Docs Wrap-Up

Scope:

- `webnovel-init/SKILL.md`
  - Main genre shows 15 canonical.
  - preset/trope/format explained by example, not mixed into the hard enum.
- `webnovel-plan/SKILL.md`, `webnovel-write/SKILL.md`, `webnovel-review/SKILL.md`
  - Confirm genre snippet is `project_info` first.
- `references/csv/genre-canonical.md`
  - Clarify canonical, route tag, trope tag, format tag boundaries.
- `references/csv/README.md`
  - State CSV only accepts canonical, taxonomy index handles the user-input layer.
- `references/index/reference-loading-map.md`
  - Update template loading rules.
- `references/genre-profiles.md`
  - Clarify fallback trigger conditions.

### Phase 6: Optional Directory Restructure

Only after the first five phases are stable.

Target structure:

```text
templates/genres/
  index.csv
  canonical/
    都市.md
    玄幻.md
  presets/
    都市异能.md
    规则怪谈.md
    知乎短篇.md
```

This step has large path impact and must be a separate commit.

## genre-profiles.md Fallback Rules

`genre-profiles.md` is only used in these scenarios:

1. Old project has no Story Contracts, cannot get route/profile from `.story-system`.
2. `story_contracts.master.route.primary_genre` is empty, and protagonist/state fallback has genre.
3. User explicitly enabled legacy profile fallback.

Target priority:

1. Story Contracts route/profile.
2. `project_info.genre_label` or `project_info.genre` after taxonomy resolve.
3. legacy `project.genre`.
4. config fallback genre.

`genre_profile_excerpt` can only be supplementary context, cannot override Story System contract's route decision.

## Suggested Commit Split

1. `docs(genres): address taxonomy plan review`
2. `chore(genres): add taxonomy index and normalize headings`
3. `feat(genres): add taxonomy resolver`
4. `refactor(genres): migrate genre resolution call sites`
5. `feat(init): persist canonical genre and genre tags`
6. `docs(genres): update skill and csv taxonomy guidance`
7. Optional: `refactor(genres): split canonical and preset templates`

## Risks and Controls

- Risk: CSV index becomes yet another source of truth.
  Control: Phase 2 must remove Python hardcoded input mappings, add grep/lint to prevent regression.

- Risk: template namespace and canonical namespace confused.
  Control: `GenreResolution` returns both `canonical_genre` and `template_files`; call sites take only the field they need.

- Risk: historical behavior like `玄幻 -> 修仙.md` lost.
  Control: explicitly model in index, add regression test.

- Risk: default canonical for `系统流`, `知乎短篇` etc. is disputed.
  Control: mark `label_type` in index; init interaction layer shows inferred result, user can explicitly specify canonical if they disagree.

- Risk: Story System route broken by resolver behavior change.
  Control: Phase 4 uses real `题材与调性推理.csv` full route rows for end-to-end test, and preserves unknown-input raise semantics.

- Risk: schema read point missed, still reads `project.genre`.
  Control: Phase 3 adds grep validation for the four SKILL.md and memory/context, plus compatible-read tests.

- Risk: `GENRE_PROFILE_KEY_ALIASES` orphaned.
  Control: Phase 1-5 explicitly keeps it but removes input alias; file comment clearly states it only serves fallback profile key.

## Completion Criteria

- All 37 templates have index mapping, and index and actual files are bidirectional consistent.
- Index covers the label/alias sets of old mappings and template stems, symmetric diff empty or only explicit allowlist.
- All template titles pure Chinese.
- `PLATFORM_TO_CANONICAL`, `_LEGACY_GENRE_MAP`, `GENRE_INPUT_ALIASES` no longer exist as hardcoded input dicts.
- `_normalize_genre_key()` no longer maintains local alias.
- `GENRE_PROFILE_KEY_ALIASES` ownership clarified, not mixed with canonical/template resolver.
- `reference_search.py`, `init_project.py`, `genre_aliases.py` use the same taxonomy resolver as the input normalization source of truth.
- New init project writes canonical `project_info.genre`, and saves `genre_label` and `genre_tags`.
- Old project `project.genre` still compatibly readable, but not the new write schema.
- All SKILL.md genre reads are `project_info.genre` first.
- Real Story System route CSV full end-to-end test passes, unknown input still raises `StorySystemRoutingError`.
- `validate_csv.py`, prompt integrity, and full pytest pass.
