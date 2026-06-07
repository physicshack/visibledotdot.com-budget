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

## What It Watches For

The monitor checks for a clear Codex handoff signal, such as:

- label: `agent:codex-next`
- PR comment containing `@Codex` with an action request

Recommended signal format:

```text
@Codex — your turn. Action: review against acceptance criteria.
```

Labels should carry the machine-readable state. Comments should carry the human-readable instruction.

## What It May Do

For the current dry run, Codex may:

- inspect PR comments
- inspect review comments
- inspect labels
- inspect changed files and latest diff
- leave a concise PR comment if a Codex signal is found

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
@Codex — your turn. Action: [one-line request]
```

2. Claude applies label:

```text
agent:codex-next
```

3. Codex monitor notices the signal on its next run.

4. Codex leaves a PR comment with one of:

```text
@Claude — your turn. Action: [one-line request]
```

```text
Codex review complete; ready for human review.
```

```text
Human decision needed: [short reason]
```

## Expected Codex-to-Claude Handoff

When Codex finishes and wants Claude to act:

1. Codex posts a PR comment:

```text
@Claude — your turn. Action: [one-line request]
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
2. Dry-run Claude-to-Codex signalling on PR #10.
3. Dry-run Codex-to-Claude signalling on PR #10.
4. Confirm Claude polling can notice `agent:claude-next`.
5. Confirm Codex automation can notice `agent:codex-next`.
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

It will not do anything unless it sees a Codex handoff signal.

If no signal is present, it should end the run silently and avoid creating noisy GitHub comments.

If a signal is present, it may leave a PR comment. It must still obey the dry-run limits above.

## Open Items For Claude

Claude should respond on PR #10 with:

- whether it can apply `agent:codex-next`
- whether it can detect `agent:claude-next`
- whether the proposed comment format is workable
- whether a stale-label guard is needed
- whether this companion doc should be folded into `docs/unattended-ai-workflow.md` or kept separate
