# Codex Agent Signal Monitor

This document records the current Codex-side automation setup for the unattended AI workflow dry run.

It is a companion note for `docs/unattended-ai-workflow.md` and should be folded into the final workflow once Claude and Codex agree the signalling loop is working.

## Purpose

The monitor exists to test whether Claude and Codex can hand work to each other through GitHub without the human acting as the messenger.

This is currently a dry run. It is intended to prove the signalling loop, not to authorise unattended code changes.

## Current Automation

Name: `Codex agent signal monitor`

Automation id: `codex-agent-signal-monitor`

Schedule: every 5 minutes

Target repo: `physicshack/visibledotdot.com-budget`

Initial focus: PR #10, `Draft unattended AI workflow for overnight work`

Mode: dry-run, comment-only

## Important Correction: Do Not Use GitHub Mentions

The first proposed convention used literal GitHub mentions like `@Codex` and `@Claude`.

That is not suitable for this workflow because GitHub may route those mentions to bot/user integrations and create unrelated noise, such as built-in Codex connector responses.

Use explicit non-mention signal tokens instead:

```text
AGENT-CODEX-NEXT
AGENT-CLAUDE-NEXT
AGENT-BLOCKED
```

These are plain text markers for the agents' polling systems. They should not trigger GitHub user or bot mention behaviour.

## What It Watches For

The monitor checks for a fresh Codex handoff signal, such as:

- label: `agent:codex-next`
- PR comment containing `AGENT-CODEX-NEXT` with an action request

Recommended signal format:

```text
AGENT-CODEX-NEXT
Action: review against acceptance criteria.
```

Labels carry the machine-readable state. Comments carry the human-readable instruction.

The monitor ignores literal `@Codex`, `@codex`, `@Claude`, and `@claude` mentions as automation triggers.

## Stale-Signal Guard

Before leaving a comment, the monitor must check freshness:

- Find the newest `AGENT-CODEX-NEXT` signal comment on the PR.
- Find the latest Codex/automation response comment on the same PR.
- Act only if the newest signal is newer than the latest Codex/automation response.
- If the signal is older than the latest Codex response, treat it as already handled and skip silently.

This prevents the 5-minute monitor from repeatedly commenting on the same old signal while the label remains in place.

## What It May Do

For the current dry run, Codex may:

- inspect PR comments
- inspect review comments
- inspect labels
- inspect changed files and latest diff
- leave a concise PR comment if a fresh Codex signal is found

The comment should say:

- what signal was found
- what Codex reviewed
- what the next action should be

## What It Must Not Do

For the current dry run, Codex must not:

- edit files
- create commits
- merge PRs
- deploy
- change production data
- touch secrets
- remove labels
- change branch state

## Expected Claude-to-Codex Handoff

When Claude finishes a worker pass and wants Codex review:

1. Claude posts a PR comment:

```text
AGENT-CODEX-NEXT
Action: [one-line request]
```

2. Claude applies label:

```text
agent:codex-next
```

3. Codex monitor notices the fresh signal on its next run.

4. Codex leaves a PR comment with one of:

```text
AGENT-CLAUDE-NEXT
Action: [one-line request]
```

```text
Codex review complete; ready for human review.
```

```text
AGENT-BLOCKED
Human decision needed: [short reason]
```

## Expected Codex-to-Claude Handoff

When Codex finishes and wants Claude to act:

1. Codex posts a PR comment:

```text
AGENT-CLAUDE-NEXT
Action: [one-line request]
```

2. If label tools are available and authorised, Codex may apply:

```text
agent:claude-next
```

For the dry run, Codex is not currently authorised to remove labels or mutate repo state beyond comments.

## Required Setup Before Overnight Use

Before this is trusted for an 8-hour flight or overnight session:

1. Create or verify labels:
   - `agent:codex-next`
   - `agent:claude-next`
   - `agent:blocked`
2. Dry-run Claude-to-Codex signalling on PR #10 using `AGENT-CODEX-NEXT`, not `@Codex`.
3. Dry-run Codex-to-Claude signalling on PR #10 using `AGENT-CLAUDE-NEXT`, not `@Claude`.
4. Confirm Claude polling can notice `agent:claude-next` and/or `AGENT-CLAUDE-NEXT`.
5. Confirm Codex automation can notice `agent:codex-next` and/or `AGENT-CODEX-NEXT`.
6. Confirm neither agent acts on stale comments or old labels.
7. Confirm human can pause the workflow by removing labels or disabling the automation.

## Permission Notes

The current Codex monitor does not need extra human permission for local shell access because it is comment-only and GitHub-connector based.

Extra permission would be needed before Codex is allowed to:

- edit files
- create commits
- push branches
- update labels
- remove labels
- broaden the monitor beyond the agreed repo/PR scope

The safer progression is:

1. Monitor only, no GitHub comments.
2. Monitor and leave comments when signalled. Current state.
3. Monitor, comment, and update labels.
4. Monitor, comment, update labels, and make small corrective commits.

Only step 2 is currently authorised.

## If The Human Does Not Return

The automation should keep running every 5 minutes while it remains active in Codex.

It will not do anything unless it sees a fresh Codex handoff signal.

If no fresh signal is present, it should end the run silently and avoid creating noisy GitHub comments.

If a fresh signal is present, it may leave a PR comment. It must still obey the dry-run limits above.

## Open Items For Claude

Claude should respond on PR #10 with:

- whether it can apply `agent:codex-next`
- whether it can detect `agent:claude-next`
- whether it can switch its polling from GitHub mentions to non-mention tokens
- whether it can use `AGENT-CLAUDE-NEXT` and `AGENT-CODEX-NEXT` exactly as written
- whether the stale-signal guard is sufficient
- whether this companion doc should be folded into `docs/unattended-ai-workflow.md` or kept separate
