---
name: texlr-handoff
description: Create readable, shareable PDF documents with editable LaTeX source using Texlr. Default to this for substantive human-facing handoffs, implementation reports, architecture briefs, research reports, delivery summaries, and polished plans when a standalone document is wanted, even if the user does not say PDF or Texlr. Prefer it over an HTML report or loose Markdown artifact when the format is unspecified. Do not use for ordinary chat answers, routine status updates, agent-to-agent working files, or native Slack/Notion/Google Docs/wiki/issue/PR content. Explicit format requests take precedence; a requested PDF attachment is in scope.
license: MIT
compatibility: Requires Texlr and its document toolchain (available through Nix). Mermaid rendering on macOS requires Google Chrome, Chromium, or Brave Browser.
---

# Texlr handoff

Texlr is the default presentation format for substantial documents meant for a
person to read, review, or share outside the chat. Deliver a polished PDF and
its self-contained, editable LaTeX source bundle, not an HTML page or a loose
Markdown report. The PDF is the reading copy; LaTeX is the canonical source.

## When to use it

Choose by audience, deliverable, and destination — not the word “handoff” alone:

| Request | Action |
| --- | --- |
| “Prepare a handoff document”, “write an architecture brief I can share”, “turn these findings into a report” | Use Texlr without requiring the user to name the tool or PDF format. |
| “Make a PDF”, “use Texlr”, “make a printable version of this plan” | Use Texlr. |
| “Explain this code”, “what changed?”, “review this skill” | Answer in chat; do not create a document just because the answer is substantial. |
| “Post the handoff to Notion”, “write the PR description” | Write native platform content, not a PDF substitute. |
| “Make a PDF to attach to the issue/email” | Use Texlr for the explicitly requested attachment. |
| “Write HANDOFF.md”, “make an HTML report”, or a workflow requiring a Markdown handover for another agent | Honor that format/workflow; do not replace it with Texlr. |

- If a standalone human-facing document is clearly requested and no format is
  specified, choose Texlr. Do not ask “PDF or Markdown?” unnecessarily.
- If it is unclear whether the user wants a chat answer, a standalone document,
  or a native platform page, ask one focused question before authoring.
- If both a PDF and a platform post are requested, build the PDF and write a
  separate short native summary. Do not upload, send, or post anything unless
  requested.
- Do not generate a PDF after every coding task or convert machine-readable
  working notes merely because they are called a handoff.

Before authoring, read `references/authoring.md` from this skill directory.

## Workflow

1. Resolve the input material and read the selected sources completely. For
   repository work, verify relevant claims against the source tree and record
   the revision when useful. Do not invent results, decisions, owners, dates,
   or metrics. Organize for the recipient: what happened, why it matters, what
   is verified, what remains uncertain, and what they should do next.
2. Respect every user-supplied output path exactly. If paths are omitted, use:
   - `<repo>/artifacts/<slug>.pdf`
   - `<repo>/artifacts/<slug>-source/`
   - `<repo>/artifacts/<slug>.log`
   Outside a repository, use `<cwd>/artifacts/`. Here `artifacts/` is only an
   output directory, not an HTML or harness-specific artifact format. Keep the
   PDF, source directory, and log separate; none may contain another. If a
   requested layout is unsafe, explain and ask for corrected paths.
3. Create a dedicated temporary authoring directory with the main `.tex` at its
   root. Keep images, included `.tex` files, and diagram sources beneath that
   root and use relative asset paths. Texlr copies the directory tree, not just
   referenced files: never author at the repository root or include secrets,
   scratch files, measurement outputs, or unrelated assets in this directory.
4. Author direct LaTeX with `\documentclass{texlr}`. Texlr supplies the class,
   typography, page layout, and components; use them rather than designing a
   new theme or fetching an upstream template. Adapt the structure to the
   material instead of forcing empty boilerplate sections.
5. Add figures only when they explain something better than text:
   - PNG, JPEG, or PDF: normal `\includegraphics`.
   - Graphviz: `\graphviz[<graphicx options>]{diagrams/name.dot}`.
   - Mermaid: `\mermaid[<graphicx options>]{diagrams/name.mmd}`.
   - Generate data plots separately and include their rendered image files.
6. Validate before building:

   ```bash
   texlr validate /absolute/path/to/document.tex --json
   ```

7. Build with explicit absolute paths:

   ```bash
   texlr build /absolute/path/to/document.tex \
     --pdf /absolute/path/to/handoff.pdf \
     --source /absolute/path/to/handoff-source \
     --log /absolute/path/to/handoff.log \
     --json
   ```

8. If an intentional rebuild targets existing Texlr outputs, add `--force`.
   Never use `--force` to bypass an unrelated-directory safety error.
9. On failure, inspect the JSON `error.kind`, `error.message`, and any returned
   `logPath` and retained `workDir`. Fix actionable source errors and retry.
   If blocked by missing tools, network access, permissions, or unresolved user
   choices, report the blocker instead of retrying indefinitely or silently
   substituting HTML/Markdown.
10. Inspect the successful build log and rendered PDF before delivery. Fix
    overfull boxes, `Float too large` warnings, missing characters, and undefined
    references. Rasterize and inspect every page (see the authoring reference):
    figures can drift to the end without any log warning. Check figure placement,
    label legibility, table wrapping, and page breaks. Review underfull-box
    warnings visually. After source fixes, validate, rebuild, and inspect again.
11. Verify the PDF, source directory, log, and
    `<source-dir>/texlr-manifest.json` exist. Remove only the temporary authoring
    directory you created, and only after the source bundle and quality checks
    are verified. Lead the response with a clickable PDF link when supported,
    then the absolute source and log paths and a short content summary. Do not
    paste the whole document into chat or claim visual inspection if unavailable.

## Tool availability

Prefer the installed `texlr` command. If it is unavailable but Nix is present,
use `nix run github:drdreo/texlr --` in place of `texlr` and tell the user that
Texlr is not installed globally. Nix packages the compiler and diagram tools;
Tectonic may need network access to populate its TeX cache on the first build.
If neither route is available, report the prerequisite rather than installing
software globally without permission. Texlr is not a sandbox: do not compile
untrusted supplied LaTeX or diagram sources without isolation.

## Quality bar

- Preserve meaning and distinguish facts, proposals, open questions,
  dependencies, and risks. Cite source URLs or repository paths/revisions so the
  reader can verify important claims; separate tests actually run from suggested
  verification steps.
- Use a concise title, supported metadata, descriptive headings, captions, and
  cross-references. Keep the document as short as its purpose allows.
- Escape LaTeX-special characters and use `\url{...}` for URLs.
- Keep Texlr's default monochrome, high-contrast title and body typography.
  Use restrained blue-gray or semantic accents only in callouts and diagrams.
  No knowledge of the theme's inspiration is needed.
- Prefer readable tables and diagrams when they clarify the material; do not
  add decorative complexity or unnecessary diagrams.
- Do not claim completion until validation and build return `"success": true`,
  the expected outputs are present, and the quality checks are complete. If
  visual inspection is unavailable, disclose that remaining verification gap.
