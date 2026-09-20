# drdreo/config

Portable configuration for my agent harnesses and, eventually, my Omarchy
workstation. The repository is the source of truth; a small dependency-free
Bash CLI links each managed item into place without taking over runtime state.

## Quick start

```bash
git clone https://github.com/drdreo/config.git ~/.config/drdreo
cd ~/.config/drdreo

./bin/config status
./bin/config apply --dry-run
./bin/config apply
```

`apply` creates one symlink per skill, extension, prompt template, or Pi context file. Existing paths are moved to
a timestamped backup under `~/.config-backups/drdreo-config/` before linking.
This lets managed files coexist with sessions, credentials, generated
integrations, and customizations owned by other tools.

Pulling updates is enough after the first apply because the links point into the
checkout:

```bash
git -C ~/.config/drdreo pull --ff-only
```

## Layout

```text
agents/skills/   Cross-harness Agent Skills
herdr/plugins/  Personal Herdr plugins (linked through Herdr)
pi/extensions/   Personal Pi extensions
pi/prompts/      Global Pi slash-command templates
pi/context/      Always-loaded Pi instructions (linked into ~/.pi/agent)
memory/          Policy and future curated durable context
omarchy/         Future Omarchy/Arch customization groups
bin/config       Apply, inspect, import, or unlink managed config
test/smoke.sh    Isolated-home smoke test
```

### Add a customization

Use the CLI:

```bash
./bin/config add skill ~/.agents/skills/my-skill
./bin/config add pi-extension ~/.pi/agent/extensions/my-extension.ts
./bin/config add pi-prompt ~/.pi/agent/prompts/my-prompt.md
./bin/config apply
```

Or copy it directly and apply:

```bash
cp -R /path/to/my-skill agents/skills/
cp /path/to/my-extension.ts pi/extensions/
./bin/config apply
```

Useful commands:

```bash
./bin/config status       # exits non-zero if anything needs applying
./bin/config apply        # safely backs up conflicts, then links
./bin/config unapply      # removes only links owned by this checkout
./test/smoke.sh           # tests against a temporary HOME
```

Override `AGENTS_HOME`, `PI_CODING_AGENT_DIR`, or `CONFIG_BACKUP_DIR` for a
nonstandard installation.

### Pi-only alternative

This repository is also a [Pi package](https://pi.dev/docs/packages.html), so Pi
can load the same extensions and skills directly. The package also bundles
`pi-web-access`, which provides web search and page fetching:

```bash
pi install git:github.com/drdreo/config
```

Use either the Pi package installation **or** `./bin/config apply`, not both, to
avoid duplicate resource discovery. The config CLI is preferred because
`.agents/skills` remains available to multiple harnesses. If you install the
package, do not separately install `npm:pi-web-access`; it is loaded from the
bundle.

## Toolchain inventory

### Harnesses and companion CLIs

| Tool | Role | Integration here |
| --- | --- | --- |
| [Pi](https://pi.dev) | Extensible terminal coding harness | Personal extensions, all skills, and bundled web access |
| [Herdr](https://herdr.dev) | Terminal workspaces, worktrees, and agent orchestration | `herdr` skill and workspace coordinator plugin; its generated Pi bridge stays tool-managed |
| [daylog](https://github.com/drdreo/daylog) | Append-only daily trail of substantive human and agent work | `daylog` skill; journal data stays local |
| [Texlr](https://github.com/drdreo/texlr) | Polished PDF and self-contained LaTeX handoffs | `texlr-handoff` skill |
| [Notion CLI (`ntn`)](https://ntn.dev) | Notion API, pages, files, and worker operations | `notion-cli` skill |
| [GitHub CLI](https://cli.github.com/) | Issues, PRs, and repository automation | Used by review and shipping workflows |

### Skills

| Skill | Purpose |
| --- | --- |
| [`build-to-rebuild`](agents/skills/build-to-rebuild/) | Disposable architecture probe followed by a clean reimplementation |
| [`code-review`](agents/skills/code-review/) | Parallel three-axis review; optional `quick` / `simple` for a single-agent bugs/regressions pass |
| [`daylog`](agents/skills/daylog/) | Proactively submit factual work handovers; Athena decides relevance |
| [`herdr`](agents/skills/herdr/) | Inspect and control Herdr sessions safely |
| [`notion-cli`](agents/skills/notion-cli/) | Drive `ntn` using its live CLI documentation |
| [`ship-ticket`](agents/skills/ship-ticket/) | Take Linear or GitHub tickets through implementation and PR |
| [`teach-me-something`](agents/skills/teach-me-something/) | Short, code-grounded lessons from the active repository |
| [`texlr-handoff`](agents/skills/texlr-handoff/) | Produce designed PDF handoff documents |

PR drafting instructions and `ship-ticket` also require the separately installed
`pr-description` skill at `~/.agents/skills/pr-description/SKILL.md`; it is not
bundled in this repository. If unavailable, PR drafting stops at that prerequisite.

### Work reporting

The shared Daylog skill explicitly runs `daylog add` before a work segment's final
response and checks capture acknowledgement. `pi/context/AGENTS.md` adds an
always-loaded Pi reminder, so reporting does not depend solely on skill discovery.
Run `./bin/config apply`, then `/reload` in existing Pi sessions (or start a new
session). The Pi-package-only installation does not install this context file.
This is instruction-based reporting, not an automatic capture hook or a guarantee
that every agent will comply. Capture failures must be disclosed, not hidden.

### Code review command

After `./bin/config apply`, reload Pi with `/reload` (or start a new session):

```text
/code-review main                  # full three-axis review
/code-review quick                 # lightweight review of working changes, or branch diff if clean
/code-review quick main            # lightweight branch review
/code-review simple <PR-URL>       # same lightweight mode for a PR
```

One skill, with an optional `quick` / `simple` mode: a focused bugs/regressions
pass in the current session, without sub-agents, spec discovery, the three-axis
report, or PR posting. `/code-review` is just a prompt alias for that skill;
`/skill:code-review quick main` also works. Without a mode, review stays full.

### Herdr workspace coordinator

The [workspace coordinator plugin](herdr/plugins/workspace-coordinator/) names the initial unnamed pane of each new workspace `Coordinator`. The Herdr skill uses that label to delegate independent tasks without waiting for completion. Explicit worker assignments take precedence.

With Herdr 0.8.2 or newer and `python3` available, run this from the repository root inside Herdr:

```bash
herdr plugin link "$PWD/herdr/plugins/workspace-coordinator"
```

Herdr registers the plugin separately from `./bin/config apply`; neither that command nor the Pi package install registers it. The linked checkout is the plugin's source of truth. Existing workspaces are unchanged, and existing pane labels are preserved. The managed Pi context in `pi/context/AGENTS.md` tells agents inside Herdr to load the skill and resolve their role before the first task, including slash commands. Reload existing Pi sessions with `/reload`; other harnesses need equivalent startup instructions or explicit skill loading. The plugin itself does not start agents or inject instructions.

To stop labeling new workspaces, run `herdr plugin unlink local.workspace-coordinator`. Existing labels remain.

### Pi extensions

| Extension | Purpose |
| --- | --- |
| [`pi-env.ts`](pi/extensions/pi-env.ts) | Applies global and trusted project `env` settings to Pi sessions |
| [`thinking-footer.ts`](pi/extensions/thinking-footer.ts) | Compact footer with model, thinking, usage, cache, cost, and git context |

## What belongs here

Track declarative, reviewable source: skills, extensions, prompts, themes,
non-secret preferences, package lists, and portable OS configuration.

Do **not** track credentials, API keys, `auth.json`, session logs, caches,
`trust.json`, daylog data, generated model stores, or machine-specific runtime
state. Keep raw or private memory out of this public repository; see
[`memory/README.md`](memory/README.md).

The Herdr-generated `herdr-agent-state.ts` extension is intentionally not
managed here because Herdr owns and overwrites it.

## Future Omarchy organization

Add Omarchy changes as small groups under [`omarchy/`](omarchy/) and extend the
source/target arrays in `bin/config`. Keep package manifests separate from
Hyprland, Waybar, shell, and host-specific layers so each group can be applied
or removed independently.
