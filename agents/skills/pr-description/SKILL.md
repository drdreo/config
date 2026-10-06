---
name: pr-description
description: Write or revise pull request titles and descriptions in STE-inspired plain technical English, with verified, clickable Linear and GitHub issue references. Use whenever creating, submitting, or updating a PR, including through another shipping or stack skill, or when asked to draft, shorten, or improve a PR description.
---

# PR descriptions

Write for a reviewer who has not opened the diff and the engineer who later finds the merge commit during an incident. Use ASD-STE100-inspired language, not a claim of formal STE compliance. The full standard includes a controlled dictionary; this skill adapts its clarity principles for software PRs. Repository-specific PR rules and explicit user instructions take precedence over these defaults.

## Establish the facts

1. Read the repository's PR guidance and template, the actual diff against the intended base, and any existing PR body. For a stack, inspect this layer against its parent, not the whole stack against main.
2. Read the originating issue and acceptance criteria through the available issue-tracker tooling. A ticket key in a branch name is a lead, not proof of scope or completion. If access fails, disclose that gap; do not invent ticket details.
3. Identify the problem, the changed behavior, who is affected, and any remaining work. Separate measured results from expected effects. Draft from the final diff, not the implementation plan or commit-message history.

## Language

- Use active voice and name the actor: “The worker retries the request,” not “Retries are performed.”
- Give each sentence one main idea. Aim for no more than 25 words; split longer sentences without losing conditions or exceptions.
- Use one term for one concept. Keep code identifiers, product names, and domain terms exact. Explain an unfamiliar term at first use instead of substituting an inaccurate everyday word.
- Prefer direct verbs: “use,” “start,” and “remove,” not “utilize,” “initiate,” or “perform the removal of.”
- State concrete behavior. Replace “improves reliability” with the failure this change prevents. Remove “This PR aims to,” “seamlessly,” and unsupported claims such as “robust” or “production-ready.”
- Make references unambiguous. Replace “this” or “it” with the relevant noun when two actors could fit. Preserve uncertainty when evidence is incomplete.

## Title and body

Use the repository's title convention; otherwise use `type(scope): concrete change`, omitting scope when it adds nothing. Keep a short action phrase, not a ticket title pasted verbatim. Preserve repository-specific revert formats.

Start the body with `<!-- created using pr-description -->`, unless repository tooling prescribes another watermark. Keep any required existing attribution.

The first visible content is a one- or two-sentence TLDR stating the change and its purpose. Aim for 25–40 words, with no heading. Move paths, size limits, implementation mechanics, and stack dependencies below it unless they are the change itself.

Most bodies should fit within 150 words, excluding diagrams, required tables, and evidence attachments; evidence prose still counts. Do not meet the word budget by packing more clauses into fewer paragraphs.

Place an optional diagram immediately after the TLDR. When no flow fits a chart, use a plain view from Diagrams instead. Omit the visual only when the TLDR already makes the change obvious; a command invocation and output-file inventory are not a flow diagram.

Add only context the diff cannot show: a consequential trade-off, exposure and rollout constraints, compatibility risk, a stack dependency, or reviewer-actionable evidence. Link measured results for performance claims. For UI changes, include before/after screenshots and an interaction recording when required by the repository. State missing evidence instead of claiming verification.

Do not add a file-by-file walkthrough, a commit diary, a checklist of commands, or a `## Test plan` section by default. Put necessary reproduction steps or manual setup in the prose. Mark unverified behavior as “Reviewer: confirm …”. Preserve required repository sections, such as feature-flag tables, with their exact schema. For long machine output, use a collapsed `<details>` block.

## Spacing and scanability

Use one topic per paragraph and one or two short sentences, usually 20–40 words. Split or trim any paragraph over 45 words. A one-sentence paragraph is welcome; do not merge it with another topic just to avoid a short block.

Insert a blank line between paragraphs and around headings, fenced diagrams, and screenshots. GitHub folds single source newlines into spaces: use blank lines for visible separation, not hard-wrapped prose or `<br>`. Keep each paragraph on one unwrapped source line.

After the TLDR and optional diagram, default to `## Evidence` and `## Merge Danger`. Add `## Scope` only when it needs a separate explanation. Keep sections short; report a verification gap rather than leaving Evidence empty. Preserve repository-required structure.

Keep rationale, stack dependencies, fallback behavior, and evidence in separate blocks. Put each reviewer instruction in its own paragraph. Use up to three short bullets for parallel cases or results instead of chaining them into a paragraph.

Cut implementation inventories and self-review chronology. Summarize the final behavior, not how each revision got there. Keep the strongest evidence link and its limitation visible; move detailed runs, sample counts, and machine output into `<details>` when they are still useful.

## Diagrams

Use a fenced `mermaid` diagram by default for GitHub PR bodies. Use a fenced `text` ASCII diagram only when the target does not render Mermaid or the user requests it. Show relationships, not an alternate prose description.

- Use at most five nodes with short labels of one to five words. Prefer a simple `flowchart TD`; use a sequence diagram when interaction order is the change.
- Prefer a vertical layout when a horizontal flow would need scrolling. Use simple node IDs and quoted labels; avoid custom styling and diagram features that require plugins.
- Keep arrow labels to a short condition or action, such as `new` or `retry`. Put commands, paths, flags, formats, limits, and caveats outside the chart. Retain an exact identifier only when it is needed to identify a boundary.
- Show the changed connection or label before/after when the difference would otherwise be unclear. For a knowledge change, show which information reaches which agent or decision. Do not draw the whole system or narrate every arrow again below it.

When the change has no flow or interaction worth a chart, such as a refactor, a moved responsibility, or new logic, show the smallest plain `text` view that makes the point:

- a shallow file tree with a one-line responsibility note per entry, for layout or ownership changes;
- a call tree or component tree, for a changed call path or UI structure, with new nodes marked `(new)`;
- short pseudocode, for changed logic or an algorithm.

Keep it under about 10 lines and show only the nodes that matter.

## Evidence

Show concrete before/after evidence of the changed behavior, not merely that CI is green. Prefer before/after screenshots for visual changes when the environment supports capture (S-tier); include recordings for interaction changes when useful or required. Otherwise use execution-based evidence (A-tier): a focused test, console output, or a measured run.

Name the exact test or scenario and its observed result before and after. Use brief, labeled pseudocode to explain the same case failing before the fix and passing afterward; link the real test or run. Pseudocode is an explanation, not execution evidence. Never invent runs, screenshots, or results. If either side was not run, state that gap and the reviewer action needed.

Follow repository evidence rules: when test output is excluded from PR bodies, use accepted behavioral evidence instead. Do not add tests solely to fill this section or bypass the repository's test policy. Keep long output in `<details>`.

## Merge Danger

Open the section with two label paragraphs, then the prose below:

```markdown
**Door:** two-way | one-way

**Blast radius:** <one or two words, such as "webhook credits">
```

State whether the change is a two-way door (cheap to roll back) or a one-way door (destructive or hard to reverse), and why. Name the rollback action and what it cannot undo. A code revert alone does not restore deleted data, reverse external effects, or guarantee compatibility with already-written state.

Describe the plausible blast radius: affected users, consumers, data, and deployment boundaries, plus important failure modes. For UI changes, consider layout shifts and mobile responsiveness; for APIs or shared code, consider downstream breakage and version skew. Explain containment such as a flag or limited rollout when present. Avoid an exhaustive hypothetical checklist or an unsupported “low risk.”

## Issue links

End the body with one compact linked line per applicable issue, without a heading or bullets. Default to `Linear: [SCA-4314](<verified-issue-url>)` or `GitHub: [#123](<verified-issue-url>)`. Use `owner/repo#123` as the link label for a cross-repository GitHub issue. Do not leave the identifier as plain text or rely on automatic linking.

Use the canonical issue URL returned by the tracker or verified from the supplied link; never invent a workspace, repository, or issue slug. If verification fails, disclose the gap rather than fabricate a link. Omit issue lines when no real issue applies; examples and placeholders do not belong in a published PR.

Keep navigation separate from completion claims. Use `Closes` only when merging completes the acceptance criteria, `Part of` when work remains, and `Related to` for context only. For a stack, intermediate layers are `Part of`; merging into a stack branch is not necessarily completion on the target branch.

Repository-required headings and automation syntax take precedence over the compact default. Preserve required keywords and plain-text references when the integration needs them, but still provide a clickable issue link. Do not assume a navigation link changes issue status or that Markdown links preserve keyword automation. Do not manually change tracker status or post an issue comment just to accompany a PR description.

## Example

Illustrative only; the ticket and behavior must come from the actual task.

Title: `fix(billing): prevent duplicate credits on webhook retries`

<!-- created using pr-description -->

Prevent duplicate credit grants when Stripe retries an upgrade webhook. Store the event ID with each grant and skip events already processed.

```mermaid
flowchart TD
    webhook["Upgrade webhook"] --> check{"Event ID check"}
    check -->|duplicate| skip["Skip"]
    check -->|new| grant["Store ID + grant"]
```

## Scope

Existing grants remain unchanged. The event ID and credit grant are stored atomically so concurrent retries cannot both issue credits.

## Evidence

Before/after execution has not been captured. Reviewer: run the duplicate-delivery scenario against the base and head; confirm only one grant on head.

Illustrative pseudocode, not an executed result:

```text
deliver the same upgrade event twice concurrently
assert credit grant count == 1
```

## Merge Danger

**Door:** two-way

**Blast radius:** upgrade credits

Two-way door for code if the stored event ID remains compatible with the previous version. Reverting reopens duplicate-grant risk and cannot undo issued credits. The blast radius is upgrade-webhook credit grants.

Linear: [BILL-123](https://linear.app/example/issue/BILL-123)

## Before delivery

Before publishing, make a separate readability pass:

1. Count words per prose paragraph, including the TLDR and evidence. Split or trim blocks over 45 words; do not hide the same wall of text in one long bullet.
2. Scan only the TLDR, headings, and diagram labels. They should reveal the change and where to find its scope and evidence. Remove any diagram that adds no useful information.
3. Check Mermaid syntax and, when a preview is available, the rendered layout and arrow labels. Move inline explanations into prose or delete them. For an ASCII fallback, check width and box spacing.

Recheck the title, behavioral claims, diagram connections, evidence, rollback assumptions, blast radius, and issue relationships against the latest diff. Check that every issue reference has an explicit Markdown link to the verified issue URL and uses the compact heading-free format unless repository rules require otherwise. Remove stale claims after review changes. Preserve valid evidence and required sections when editing a body.
