# System Architecture and Module Design

## Core Philosophy

### Source-of-Truth Split

- Pre-write source of truth: `.story-system/MASTER_SETTING.json`, `volumes/`, `chapters/`, `reviews/`
- Post-write source of truth: accepted `CHAPTER_COMMIT`
- `.webnovel/state.json`, `index.db`, `summaries/`, `memory_scratchpad.json`: only as projection / read-model
- `references/genre-profiles.md`: fallback-only

### Three Laws Against Hallucination

| Law | Description | Enforcement |
|-----|-------------|-------------|
| **Outline Is Law** | Follow the outline, no unauthorized improvisation | Context Agent forcibly loads chapter outline |
| **Setting Is Physics** | Obey the setting, no self-contradiction | Reviewer Agent has built-in consistency check |
| **Invention Must Be Registered** | New entities must be entered into the database | Data Agent auto-extracts and disambiguates |

### Strand Weave Pacing System

| Strand | Meaning | Ideal Ratio | Description |
|--------|---------|-------------|-------------|
| **Quest** | Main plot | 60% | Drive core conflict |
| **Fire** | Emotional line | 20% | Character relationship development |
| **Constellation** | World-building expansion | 20% | Background / faction / setting |

Pacing red lines:

- Quest uninterrupted no more than 5 chapters
- Fire gap no more than 10 chapters
- Constellation gap no more than 15 chapters

## Overall Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code                           │
├─────────────────────────────────────────────────────────────┤
│  Skills (7):                                               │
│    init / plan / write / review / query / learn / dashboard │
├─────────────────────────────────────────────────────────────┤
│  Agents (3):                                               │
│    Context Agent / Data Agent / Reviewer (with six-dimension review) │
├─────────────────────────────────────────────────────────────┤
│  Data Layer:                                               │
│    state.json / index.db (SQLite) / vectors.db             │
├─────────────────────────────────────────────────────────────┤
│  Story System:                                             │
│    .story-system/ (contracts · commits · events)           │
└─────────────────────────────────────────────────────────────┘
```

## Agent Division of Labor

### Context Agent (read)

- File: `agents/context-agent.md`
- Responsibility: Build the "creative brief" before writing, provide this chapter's context, constraints, and reader-retention strategy.

### Data Agent (write)

- File: `agents/data-agent.md`
- Responsibility: Extract `accepted_events / state_deltas / entity_deltas / summary_text` and other commit artifacts from the body text, hand them to `chapter-commit` to drive projection writers updating `state.json`, `index.db`, summaries, and long-term memory.

### Reviewer (review)

- File: `agents/reviewer.md`
- Responsibility: Chapter quality review, internally containing the following six review dimensions:

| Review Dimension | Check Focus |
|------------------|-------------|
| High-point Checker | Density and quality of satisfying moments |
| Consistency Checker | Setting consistency (power / location / timeline) |
| Pacing Checker | Strand ratio and gaps |
| OOC Checker | Whether character behavior deviates from persona |
| Continuity Checker | Scene and narrative coherence |
| Reader-pull Checker | Hook strength, expectation management, reader retention |

## Story System (Contract-Driven System)

The Story System uses `.story-system/` as an independent runtime surface, composed of the following parts:

- **Contract seed**: `MASTER_SETTING.json` + chapter contracts + anti-pattern config
- **Contract-first runtime**: volume contracts (`volumes/`) + review contracts (`reviews/`) + pre-write validation
- **Chapter commit chain**: `commits/chapter_XXX.commit.json` + state/index/summary/memory projection
- **Event audit chain**: `events/chapter_XXX.events.json` + revision proposals + override ledger

The current default is contract-first + commit-first: `.story-system/` is the main-chain source of truth, the old `.webnovel/*` is downgraded to projection / read-model, `preflight` and dashboard expose runtime health.

Core chain:

```text
story-system --persist
    -> write contract seed (MASTER_SETTING.json, etc.)
story-system --emit-runtime-contracts --chapter N
    -> generate runtime contracts + pre-write validation
chapter-commit --chapter N
    -> submit accepted commit + execute each projection write
story-events --chapter N / --health
    -> event audit and health check
preflight / dashboard
    -> story runtime health / fallback status / latest commit status
```

The event audit chain does not start a second projection loop; event routing only declaratively activates writers, the actual execution entry is still `ChapterCommitService.apply_projections()`.

See detailed design: `docs/archive/architecture/story-system-phase5.md`
