---
name: herdr
description: "Inspect or control herdr panes, tabs, workspaces, worktrees, and running agents. Use when the user explicitly mentions herdr or has established herdr as the preferred manager for agent sessions; requires running inside herdr."
---

# Herdr

## Agent/session orchestration

When the user asks to spawn, delegate, review, or run work in separate Pi/agent sessions or worktrees, use Herdr to own the workspaces, panes, agent lifecycle, and visibility when Herdr is the established preference. Do not launch Pi directly through Bash as a fallback. Re-check `HERDR_ENV=1` before control; if it is not set, report that Herdr control is unavailable and stop.

The installed binary is the authority on command syntax. This file deliberately pins none: the CLI changes between releases and `herdr --skill` always prints instructions matching the installed version.

1. Verify you are inside herdr: `test "${HERDR_ENV:-}" = 1`. If the check fails, say you are not running inside herdr and stop; never inspect or control a herdr session from outside it.
2. Print the current agent instructions and follow them: `herdr --skill`
3. Discover per-command syntax by running the group command without a subcommand (`herdr agent`, `herdr pane`, `herdr workspace`, `herdr tab`, `herdr worktree`, `herdr session`), not by guessing. Do not run bare `herdr` for discovery; it attaches the TUI.

Keep the Herdr UI legible as work is created or changes. Inspect the current labels and consider renaming workspaces, tabs, panes, and agents you created or control to concise, task-oriented names. Label only the levels where a name distinguishes the work; do not repeat the same label across every level. For parallel work, prefer role-plus-subject names such as `auth-review` and `auth-tests` over generic names such as `agent-2`. Update stale labels when a pane or agent changes purpose. Preserve user-owned labels unless the user asks to rename them.
