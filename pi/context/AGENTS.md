# Work reporting

Use the shared `daylog` skill proactively after implementation, investigation, review, or another meaningful work segment; do not wait for the user to request logging. Load its instructions and execute `daylog add` before the final response for that segment, confirming `queued <candidate-id>`. A chat summary is not a submitted report. Athena decides journal relevance; include partial results and useful read-only findings rather than self-filtering them.

Do not duplicate an acknowledged report without a new delta, or report pure conversation/status-only replies. Respect explicit no-logging instructions and tool restrictions. If capture is unavailable or fails, briefly disclose that; never claim publication, bypass restrictions, or impersonate a human.
