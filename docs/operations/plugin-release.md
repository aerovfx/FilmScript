# Plugin Release Guide

This project's release notes are oriented first toward Chinese webnovel authors: explain what this version helps with for writing, then add the CLI, schema, testing, and CI details that maintainers care about.

## Pre-Release Audit

The release notes must cover ALL changes from "the last official version tag to this release commit", not just the last commit.

Before releasing, confirm the version boundary:

```bash
git tag --list "v*" --sort=-v:refname
git log --oneline vLAST..HEAD
git diff --stat vLAST..HEAD
```

Split changes into four categories:

- Author-facing changes: writing, review, planning, query, recovery, docs — changes users can feel.
- Compatibility: whether old book projects need migration, whether existing `/webnovel-*` command habits change.
- Known impact: skipped items, limits, risks to watch.
- Maintainer-facing: new CLI, schema, helpers, tests, CI, internal refactors.

## Release Note Sources

Every official version must have two documents:

- `CHANGELOG.md`: long-term changelog.
- `releases/vX.Y.Z.md`: the sole source for the GitHub Release body.

README keeps only a one-line Chinese user-benefit summary, e.g.:

```md
| **v6.2.0 (current)** | Clearer chapter results, better recovery after failure |
```

Don't use README as a full changelog.

## Version Sync

After writing `CHANGELOG.md` and `releases/vX.Y.Z.md`, sync the version number and README summary:

```bash
python -X utf8 webnovel-writer/scripts/sync_plugin_version.py --version X.Y.Z --release-notes "one-line Chinese user benefit"
```

This command updates:

- `webnovel-writer/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `README.md` version badge
- `README.md` current-version line

## Local Validation

Before committing, at least run:

```bash
python -X utf8 webnovel-writer/scripts/sync_plugin_version.py --check --expected-version X.Y.Z
python -X utf8 webnovel-writer/scripts/validate_release_notes.py --version X.Y.Z
python -X utf8 webnovel-writer/scripts/validate_plugin_package.py
git diff --check
```

When code or prompt changes are involved, also run the corresponding pytest, behavioral eval, or smoke test, and write the results into the "Verification" section of `releases/vX.Y.Z.md`.

## Automated Release

1. Confirm local validation passes.
2. Commit and push the release notes and version metadata to `master`.
3. The `Plugin Release` workflow will automatically:
   - Validate `plugin.json`, `marketplace.json`, and README version consistency.
   - Validate `CHANGELOG.md` and `releases/vX.Y.Z.md` exist and cover the last tag.
   - Validate plugin package structure.
   - Create and push the `vX.Y.Z` tag.
   - Create the GitHub Release using `releases/vX.Y.Z.md`.

If the corresponding tag already exists, the workflow won't re-tag; if the GitHub Release already exists, it will skip automatically. If only a tag was created before but the Release is missing, rerunning the workflow will backfill the Release.

You can also manually trigger `Plugin Release` as a fallback from the Actions page. When running manually you can input `version`, or leave it empty to let the workflow read the current version from `plugin.json`.

## Automated Version Check

The `Plugin Version Check` workflow automatically checks on Push / PR:

- Version metadata consistency.
- README version badge consistency.
- Current version has a release note.
- `CHANGELOG.md` includes the current version.

Trigger files:

- `.claude-plugin/marketplace.json`
- `webnovel-writer/.claude-plugin/plugin.json`
- `webnovel-writer/scripts/sync_plugin_version.py`
- `webnovel-writer/scripts/validate_release_notes.py`
- `README.md`
- `CHANGELOG.md`
- `releases/**`
