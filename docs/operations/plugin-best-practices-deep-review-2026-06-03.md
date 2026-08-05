# Plugin Best Practices Deep Review

Review target: `webnovel-writer/` Claude Code plugin source directory
Review date: 2026-06-03
Rollback correction: 2026-06-04

## Current Conclusion

**Best-practice compliance: medium-high.**

The plugin's engineering foundation, directory structure, version sync, test coverage, and source wrapping are all fairly solid; but against Anthropic's official `plugin-dev` strict agent/skill metadata standards, some non-blocking gaps remain.

This report has been corrected per the 2026-06-04 rollback: the previously Codex-added agent English trigger descriptions, the `When to invoke` sections, and the `deconstruction-agent`'s `magenta` color change have been reverted.

## Completed / Verified

- `.claude-plugin/plugin.json` exists and the manifest is readable.
- Version sync check passed: `Versions are in sync: 6.0.0`.
- Prompt integrity test passed.
- Full pytest passed.
- The plugin source subdirectory already has `README.md` and `LICENSE`.
- `webnovel-init`'s init-collection schema has been moved down to `references/init-collection-schema.md`.
- `webnovel-plan`'s structured node example has been moved down to `references/outlining/chapter-planning.md`.
- `webnovel-query/references/system-data-flow.md` has been marked legacy, and the old `/webnovel-resume` and "6 Agents in parallel" drift descriptions corrected.
- `docs/superpowers/` has been archived to `docs/archive/superpowers/`, active entry links corrected.
- `docs/architecture/` historical snapshots have been archived to `docs/archive/architecture/`, active entry links corrected.

## Rollback Notes

The following Codex-added changes have been reverted:

- 4 agents' English `Use this agent when...` trigger descriptions.
- 4 agents' `## When to invoke` scenario sections at the top of the body.
- `deconstruction-agent`'s `color: magenta`, restored to `color: purple`.

Current agent frontmatter state:

- `context-agent`: short Chinese description, `model: inherit`, `color: blue`
- `data-agent`: short Chinese description, `model: inherit`, `color: green`
- `deconstruction-agent`: Chinese description, `model: inherit`, `color: purple`
- `reviewer`: Chinese description, `model: inherit`, `color: yellow`

## Remaining Best-Practice Gaps

### Agent metadata

The official `agent-development` doc suggests agent descriptions use clearer trigger phrasing and provide trigger scenarios in the body. Since we have rolled back to the Claude original-conversation state as required, the following still exist:

- Description is short or leans on internal terminology.
- No `When to invoke` scenario.
- `deconstruction-agent`'s `purple` is not one of the colors listed by the official `validate-agent.sh`; the official script lists `blue`, `cyan`, `green`, `yellow`, `magenta`, `red`.

This is not a runtime blocker, but if you later want to strictly pass the official validator, you need to separately confirm whether to accept such metadata changes.

### Cross-platform shell assumptions

Multiple SKILL.md files still contain Bash-style snippets, e.g. `export`, `${VAR}`, `cat`, `for ch in $(seq ...)`. It is recommended to note in the README or operations docs that these snippets assume execution in the Claude Code Bash tool or a compatible shell.

### Real-machine load verification

File-level and test-level verification have passed, but the real Claude Code plugin enable/load flow has not yet been executed in a clean directory.

## Verification Records

```powershell
python -X utf8 webnovel-writer\scripts\sync_plugin_version.py --check --expected-version 6.0.0
$env:PYTHONUTF8='1'; python -m pytest webnovel-writer\scripts\data_modules\tests\test_prompt_integrity.py -q --no-cov
$env:PYTHONUTF8='1'; python -m pytest -q --no-cov
```

Results:

- Version sync: passed
- Prompt integrity: passed
- Full pytest: passed

## Final Assessment

The current state has completed the B/C wrap-up main line proposed in the original Claude conversation, and preserved the rolled-back agent metadata. If the next goal is "strict official validator pass", the user must explicitly agree before adjusting agent description, trigger scenarios, and `deconstruction-agent` color.
