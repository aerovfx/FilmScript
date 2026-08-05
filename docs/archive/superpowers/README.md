# Superpowers Documentation Navigation

This directory holds architecture specs, design docs, and implementation plans distilled through the `superpowers` workflow.

## Directory Notes

- [`specs/`](./specs/): architecture design, refactoring plans, and post-review converged specification docs
- [`plans/`](./plans/): implementation plans and phased execution docs broken down from specs

## Current Key Documents

- [`specs/2026-04-09-skills-restructure-and-reference-gaps.md`](./specs/2026-04-09-skills-restructure-and-reference-gaps.md): skill restructuring and reference-gap spec
- [`specs/2026-04-12-story-system-pro-max-retrofit-spec.md`](./specs/2026-04-12-story-system-pro-max-retrofit-spec.md): Pro Max architecture retrofit spec on existing chain
- [`specs/2026-04-12-webnovel-story-intelligence-system-spec.md`](./specs/2026-04-12-webnovel-story-intelligence-system-spec.md): ideal-state architecture blueprint for final state
- [`specs/2026-04-12-story-system-evolution-spec.md`](./specs/2026-04-12-story-system-evolution-spec.md): current-system-diagnosis-based evolutionary spec
- [`plans/2026-04-12-story-system-phase1-contract-seed.md`](./plans/2026-04-12-story-system-phase1-contract-seed.md): Story System Phase 1 contract-seed layer implementation plan
- [`plans/2026-04-12-story-system-phase2-contract-first-runtime.md`](./plans/2026-04-12-story-system-phase2-contract-first-runtime.md): Story System Phase 2 contract-first runtime implementation plan
- [`plans/2026-04-12-story-system-phase3-chapter-commit-chain.md`](./plans/2026-04-12-story-system-phase3-chapter-commit-chain.md): Story System Phase 3 chapter-commit main-chain implementation plan
- [`plans/2026-04-12-story-system-phase4-event-log-and-override-ledger.md`](./plans/2026-04-12-story-system-phase4-event-log-and-override-ledger.md): Story System Phase 4 unified event main-chain and Override Ledger implementation plan
- [`plans/2026-04-13-story-system-phase5-legacy-downgrade.md`](./plans/2026-04-13-story-system-phase5-legacy-downgrade.md): Story System Phase 5 legacy-chain downgrade and main-chain closure implementation plan
- [`../architecture/story-system-phase4.md`](../architecture/story-system-phase4.md): Phase 4 landed event main-chain and override ledger operation guide
- [`../architecture/story-system-phase5.md`](../architecture/story-system-phase5.md): Phase 5 landed main-chain/projection/fallback operation guide

## Usage Conventions

- New specs uniformly go to `specs/`
- Corresponding implementation plans uniformly go to `plans/`
- When writing implementation plans later, by default list related doc-update items synchronously
