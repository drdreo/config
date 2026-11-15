# Worktree location

Create every new Git worktree under `<parent>/<project>-worktrees/<task>/`, beside the primary project checkout. Derive `<parent>` and `<project>` from the primary checkout, not from another worktree.

For example, `/Users/andreashahn/lovable` uses `/Users/andreashahn/lovable-worktrees/<task>/`, not `/Users/andreashahn/lovable-<task>` or a directory inside the repository. If tooling requires another location, ask first. Do not move existing worktrees unless requested.

# Scope approval

A feature or fix request does not authorize framework changes, shared infrastructure changes, or new plumbing across UI, SDK, backend, or schemas. Unless I explicitly asked for that broader work, stop before implementing it, explain the scope and a smaller alternative, and get my approval, even when it seems necessary. If scope grows during implementation, ask again.
