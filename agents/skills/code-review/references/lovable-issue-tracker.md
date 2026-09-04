# Issue tracker: Linear

Lovable uses Linear for issues and specs. Use the `linear` CLI for Linear operations and `gh` for GitHub pull requests.

## Conventions

- **Issue keys**: Linear tickets use uppercase team keys such as `ENG-123`, `AC-456`, or `SEC-789`. Search PR titles, bodies, branch names, and commit messages for them.
- **Read an issue with comments**: `linear issue view <KEY> --workspace lovable --json --no-pager`.
- **Search issues**: `linear issue query --workspace lovable --all-teams --search "<terms>" --all-states --json --no-pager`.
- **List issues**: `linear issue query --workspace lovable --team <TEAM> --state <STATE> --json --no-pager`.
- **Read a document**: `linear document view <ID> --workspace lovable`.
- **Create, update, or comment**: use `linear issue create`, `linear issue update`, or `linear issue comment` only when the user explicitly asks. Project guidance prohibits unsolicited Linear comments.

## GitHub and Linear reviews

Fetch GitHub PR metadata with `gh pr view`. If its title, body, branch, or commits contain a Linear issue key, fetch that issue as the spec.

A URL under `linear.app/lovable/review/` is a Linear code-review surface, not an issue key. The CLI has no dedicated `review` command. Use the review slug as search terms with `linear issue query`; if no issue is found, resolve the corresponding GitHub PR and use its body as the fallback spec.

## When a skill says "publish to the issue tracker"

Create or update a Linear issue only when the user requested an issue-tracker write. Otherwise return the proposed issue or comment text.

## When a skill says "fetch the relevant ticket"

1. Search the supplied PR, branch, commits, and URL for a Linear issue key.
2. Run `linear issue view <KEY> --workspace lovable --json --no-pager`.
3. If no key is present, search by PR title, branch, or Linear review slug with `linear issue query`.
4. If no ticket is found, use the PR body or ask the user for the Linear issue.
