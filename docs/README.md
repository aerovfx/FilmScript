# Documentation Center

The `docs/` directory is organized by function for easy browsing.

## Table of Contents

### Architecture

- [`architecture/overview.md`](./architecture/overview.md): System architecture, agent responsibilities, and Story System design
- [`architecture/plugin-runtime-hardening-spec-2026-06-04.md`](./architecture/plugin-runtime-hardening-spec-2026-06-04.md): Runtime reliability refactor spec based on research of excellent Claude Code plugins
- [`architecture/plugin-runtime-hardening-plan-2026-06-04.md`](./architecture/plugin-runtime-hardening-plan-2026-06-04.md): Implementation plan, change scope, and impact analysis for the runtime reliability refactor
- [`architecture/multi-agent-adaptation-spec-2026-06-05.md`](./architecture/multi-agent-adaptation-spec-2026-06-05.md): Multi-host and multi-agent adaptation spec based on the v6.1.0 current state
- [`architecture/context-minimal-writing-flow-plan-2026-06-05.md`](./architecture/context-minimal-writing-flow-plan-2026-06-05.md): Context-reduction, reading-method, and token-optimization refactor plan (v3) for Skills / Agents / References
- [`archive/architecture/current-system-diagnosis.md`](./archive/architecture/current-system-diagnosis.md): Historical system state diagnosis

### User Guides

- [`guides/commands.md`](./guides/commands.md): Quick reference for Skill commands and CLI subcommands
- [`guides/rag-and-config.md`](./guides/rag-and-config.md): RAG retrieval pipeline, environment variables, and configuration
- [`guides/genres.md`](./guides/genres.md): 37 genre templates and composite-genre rules

### Operations

- [`operations/operations.md`](./operations/operations.md): Project directory structure, ops commands, backup and recovery
- [`operations/plugin-release.md`](./operations/plugin-release.md): Plugin release process and version synchronization

### Memory System

- [`memory/long-term-memory-architecture-v2.md`](./memory/long-term-memory-architecture-v2.md): Long-term memory architecture explanation

### Research and External Solutions

- [`research/long-term-memory-research-report.md`](./research/long-term-memory-research-report.md): Research on long-term memory papers and open-source solutions
- [`research/storyteller-paper-summary.md`](./research/storyteller-paper-summary.md): Summary of the STORYTELLER paper

### Archive

- [`archive/superpowers/README.md`](./archive/superpowers/README.md): Navigation for historical architecture specs and design documents

## Categorization Principles

- `architecture/`: System structure and technical architecture
- `guides/`: Commands, configuration, and genre explanations that users need to consult
- `operations/`: Operations, releases, backup, and recovery
- `memory/`: Long-term memory architecture explanation
- `research/`: Paper summaries and external solution research
- `archive/`: Historical architecture snapshots, specs, and design plans

## Recommended Reading Order

1. First read [`../README.md`](../README.md) to understand installation and basic usage
2. Then read [`architecture/overview.md`](./architecture/overview.md) to understand the overall architecture
3. For retrieval configuration, read [`guides/rag-and-config.md`](./guides/rag-and-config.md)
4. For command usage, read [`guides/commands.md`](./guides/commands.md)
5. For troubleshooting runtime issues, read [`operations/operations.md`](./operations/operations.md)
