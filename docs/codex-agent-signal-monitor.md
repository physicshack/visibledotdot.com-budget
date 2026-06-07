# Codex PR10 Conversation Monitor

This document records the current Codex-side automation setup for the unattended AI workflow dry run.

It is a companion note for `docs/unattended-ai-workflow.md` and should be folded into the final workflow once Claude and Codex agree the loop is working.

## Purpose

The monitor tests whether Codex can keep up with a PR-based conversation without the human acting as messenger.

This is currently a dry run. It is intended to prove the monitoring loop, not to authorise unattended code changes.

## Current Automation

Name: `Codex PR10 conversation monitor`

Automation id: `codex-agent-signal-monitor`

Kind: `heartbeat`

Schedule: every 5 minutes

Target: the current Codex thread

Target repo: `physicshack/visibledotdot.com-budget`

Initial focus: PR #10, `Draft unattended AI workflow for overnight work`

Mode: dry-run, comment-only

## Important Correction: Heartbeat, Not Cron

The first Codex automation was created as a `cron` job with:

```text
FREQ=MINUTELY;INTERVAL=5
```

That was the wrong automation type. Codex cron automations are for hourly or weekly schedules. Minute-level follow-up belongs to a thread heartbeat.

Result: the automation file existed and looked active, but no automation thread ran for over an hour.

Correction: the automation is now a `heartbeat` attached to this Codex thread, still scheduled every 5 minutes.

## Important Correction: The PR Is The Signal

The first signalling design over-focused on labels and magic tokens. For PR #10, that is unnecessary.

The dry-run rule is now:

- inspect PR #10 every run
- read PR conversation comments
- read review comments and unresolved inline comments
- read changed files and latest diff
- read labels as context only
- if there is new material since the latest Codex automation-style response, leave one concise PR comment
- if there is no new material, stay silent

Labels and tokens may still help for a multi-PR overnight queue, but PR #10 itself is the shared conversation.

## Important Correction: Do Not Use GitHub Mentions

Literal GitHub mentions like `@Codex` and `@Claude` are not suitable workflow signals because GitHub may route them to bot/user integrations and create unrelated noise.

If explicit text markers are needed later, use non-mention tokens:

```text
AGENT-CODEX-NEXT
AGENT-CLAUDE-NEXT
AGENT-BLOCKED
```

For PR #10, even these tokens should not be required. New comments or file changes are enough.

## What It May Do

For the current dry run, Codex may:

- inspect PR comments
- inspect review comments
- inspect labels
- inspect changed files and latest diff
- leave one concise PR comment if new material appears since the latest Codex automation-style response

The comment should say:

- what changed
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
- add or remove labels
- change branch state

## Freshness Guard

Before commenting, the monitor should compare PR activity against the latest Codex automation-style response comment.

Act only if newer material exists:

- new PR conversation comment
- new review comment
- new unresolved inline review comment
- new commit or file change

If nothing new exists, skip silently.

This prevents repeated 5-minute comments on the same old PR state.

## Required Setup Before Overnight Use

Before this is trusted for an 8-hour flight or overnight session:

1. Confirm the heartbeat actually fires.
2. Confirm it can inspect PR #10.
3. Confirm it can leave one PR comment when new material appears.
4. Confirm it stays silent when nothing changed.
5. Confirm it does not respond to GitHub mention noise.
6. Confirm human can pause the workflow by disabling the heartbeat.
7. Only then consider widening scope beyond PR #10.

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
2. Monitor and leave comments when new PR activity appears. Current intended state.
3. Monitor, comment, and update labels.
4. Monitor, comment, update labels, and make small corrective commits.

Only step 2 is currently authorised.

## Current Status

As of the latest inspection:

- The old cron-style 5-minute automation did not fire.
- No automation-spawned Codex thread appeared in the app thread list.
- The configuration has been corrected to a 5-minute heartbeat attached to this thread.
- The heartbeat still needs to be observed firing before the workflow is considered validated.
