# Agent Execution Rules (AGENTS.md)

This repository defines mandatory behavior for any coding agent (Codex, Claude Code, etc.) operating in this repo.

## Primary Rule: iMessage Notification Is Required

After the agent finishes all planned work and before exiting, it MUST send an iMessage notification indicating completion status.

The notification MUST be sent exactly once per execution.

## Success Notification

If all tasks complete successfully, the agent MUST run:

```bash
imsg "batu.bora.tech@gmail.com" "Codex finished successfully"
```

## Failure Notification

If execution fails at any point, the agent MUST run:

```bash
imsg "batu.bora.tech@gmail.com" "Codex failed"
```

## When To Send

The notification MUST be sent at the end of the run, after all of the following are complete (if applicable):

* code changes
* file writes
* formatting
* tests, typecheck, lint
* git commit(s)
* updates to any progress or planning files

The agent MUST NOT exit before attempting to send the notification.

## Assumptions

* The agent may assume the `imsg` shell function is available in the execution environment.
* macOS Automation permissions for controlling Messages have already been granted to the terminal application being used.

## Definition of Done

The task is not considered complete until the notification command has been executed.
Failure to attempt notification constitutes an incomplete run.

## Non-Interactive Requirement

The agent MUST NOT ask the user to confirm notification delivery.
The notification must be sent automatically.

## Final Requirement

At the very end of execution, the agent MUST run exactly one of the following commands:

```bash
imsg "batu.bora.tech@gmail.com" "Codex finished successfully"
```

or

```bash
imsg "batu.bora.tech@gmail.com" "Codex failed"
```
