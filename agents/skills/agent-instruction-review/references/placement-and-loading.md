# Placement and loading

Facts checked 2026-10-22 against vendor docs. Loading semantics are harness- and version-specific. Re-check the linked page before relying on a version-bound claim.

## Contents
- What belongs where
- Claude Code loading
- Codex loading
- Skills (both)
- Consequences for a review

## What belongs where

| Kind | Belongs there | Does not belong there |
|---|---|---|
| Always-loaded rules (CLAUDE.md, AGENTS.md, global rules) | Durable project exceptions, key commands, scope and permission boundaries, short routing pointers to skills or references | A codebase encyclopedia; every task's procedure; duplicated tool docs |
| Task prompt | This job's goal, inputs, scope, output and acceptance check | Repeating global rules; scripting every reasoning step |
| SKILL.md | One reusable workflow: what and when in metadata; inputs, essential steps, stop conditions, verification | Generic expertise claims; unrelated workflows; every possible reference inline |
| Reference or knowledge file | Definitions, schemas, factual constraints, examples, canonical source and version, known gaps | Motivational language; undocumented guesses; global behavioral commands |
| Executable controls (tests, schemas, formatters, permissions, hooks) | Anything that must hold regardless of what the model decides | Assuming a prose prohibition blocks execution |

## Claude Code loading

Source: https://code.claude.com/docs/en/memory

- CLAUDE.md and auto memory are "context, not enforced configuration". To block an action regardless of the model's decision, use a PreToolUse hook.
- Ancestor CLAUDE.md files concatenate. Nested CLAUDE.md files load when Claude works with files under them.
- `@path` imports are expanded at launch alongside the importing file, up to four hops. Splitting a long CLAUDE.md into imports does not reduce its context cost.
- Docs target under 200 lines per CLAUDE.md file. This is vendor guidance, not a measured optimum. The separate "first 200 lines or 25 KB" limit applies to auto memory's MEMORY.md, not CLAUDE.md.
- Path-scoped rules under `.claude/rules/` load only for matching files. A symlinked rule pointing outside the working directory is treated as an external import and needs approval.
- Native AGENTS.md reading needs v2.1.277 or later; before v2.1.281 some sessions (Bedrock, telemetry disabled) read CLAUDE.md only. By default a project-path CLAUDE.md wins and AGENTS.md is skipped unless imported.
- `/doctor prompt-audit` (v2.1.283 or later) reports outdated or conflicting instructions and proposes edits. It is a static audit, not a behavioral test.

## Codex loading

Source: https://learn.chatgpt.com/docs/agent-configuration/agents-md (formerly developers.openai.com/codex/guides/agents-md)

- Global scope first (`AGENTS.override.md` if present, else `AGENTS.md`), then project scope walked from repository root down to the current directory. At most one file per directory.
- Files closer to the current directory appear later in the combined prompt and therefore override earlier guidance.
- Combined project docs are capped by `project_doc_max_bytes`, 32 KiB by default. Files past the cap are silently not added.
- Skill listing shown at startup has a budget; descriptions can be shortened or skills omitted. Current skill paths use `.agents/skills`.

## Skills (both harnesses)

- Metadata (name, description) is pre-loaded for all skills; the body loads on use; references load only when read. A reference saves context only if it is not eagerly imported.
- Agent Skills spec (https://agentskills.io/specification): `name` and `description` required; body recommended under 5000 tokens and 500 lines. The `skills-ref` validator and OpenAI's `quick_validate.py` check frontmatter and naming only, not routing, safety or output quality. `skills-ref` labels itself demonstration-only. `quick_validate.py` rejects the spec's `compatibility` field and lets empty name/description strings pass.
- Anthropic's docs: Claude may partially read files referenced from referenced files. Keep references one level deep; add a table of contents to reference files over 100 lines.

## Consequences for a review

- "Move it to a reference" only helps if the reference is linked, not imported, and the main file says when to read it.
- A rule that must hold unconditionally is a hook, permission or test, not a sentence.
- Nearer files win in Codex; concatenation in Claude Code means conflicting ancestor and nested rules both load. Look for contradictions across the chain, not just inside one file.
- Do not cite a line or token limit as a finding. Cite the relevant vendor target as guidance and move on to behavior.
