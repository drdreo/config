# Memory

This directory is reserved for **curated, non-sensitive, durable context** that
should follow you between machines.

Do not commit raw conversations, session logs, credentials, customer data, or a
harness's generated memory database. Put private material in `memory/private/`
(which is gitignored), or use a separate private repository.

Nothing here is installed yet. Add a destination to `bin/config` only after the
consuming harness and memory format are clear.
