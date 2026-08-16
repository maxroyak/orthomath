# OrtoMath — Agent Workflow

> All agents MUST follow this workflow. PMBot owns orchestration.
> This file is the source of truth for orchestration, task states, QA, and Git gate.

## Orchestration Rule

PMBot is the ONLY orchestration authority.

Specialist agents do NOT directly invoke or hand work to other specialist agents.

Examples:
- PIBot returns requirements to PMBot.
- FrontendDevBot returns implementation results to PMBot.
- CalculationBot returns implementation results to PMBot.
- DevBot returns implementation results to PMBot.
- QABot returns QA status to PMBot.
- GitBot returns repository status to PMBot.

Only PMBot decides which agent executes next.

Expected control flow:

```
User -> PMBot -> specialist -> PMBot -> next specialist -> PMBot -> QABot -> PMBot -> GitBot -> PMBot -> Done
```

## Hub-and-Spoke Model

```
                         User
                           │
                           ▼
                         PMBot
                           │
                ┌──────────┴──────────┐
                │                     │
              PIBot             Engineering
           (when needed)              │
                            ┌──────────┼──────────┐
                            │          │          │
                     FrontendDevBot  DevBot  CalculationBot
                            │          │          │
                            └──────────┼──────────┘
                                       │
                                       ▼
                                     PMBot
                                       │
                                       ▼
                                     QABot
                                  ┌────┴────┐
                                PASS       FAIL
                                  │          │
                                  │          ▼
                                  │        PMBot
                                  │          │
                                  │      Developer
                                  │          │
                                  │        PMBot
                                  │          │
                                  │        QABot
                                  │
                                  ▼
                                PMBot
                                  │
                                  ▼
                                GitBot
                                  │
                                  ▼
                                PMBot
                                  │
                                  ▼
                                 Done
```

PMBot is the orchestration layer. All spokes return to PMBot.
Developers must NOT independently decide what product functionality to implement.
QABot must verify completed implementation before work is considered finished.
GitBot manages repository operations only after QA passes.

## Prohibited Workflow

```
User -> DevBot -> code    (FORBIDDEN for substantial changes)
PIBot -> CalculationBot   (FORBIDDEN — must go through PMBot)
FrontendDevBot -> QABot   (FORBIDDEN — must go through PMBot)
```

## Required Workflow

```
User -> PMBot -> PIBot (when needed) -> Developer(s) -> QABot -> GitBot -> Done
```

---

## Task Stages

### Stage 1 — Request
User provides a feature, bug, or change request.

### Stage 2 — PM Analysis
PMBot analyzes the request, inspects the repository state, and produces a task spec:

```
Task ID: ORTO-XXX

Request:
...

Goal:
...

Current behavior:
...

Expected behavior:
...

Affected areas:
...

Acceptance criteria:
- ...
- ...

Required agents:
...

Risk:
...
```

### Stage 3 — Product Analysis (when needed)
PMBot sends the requirement to PIBot when the task involves:
- orthodontic terminology
- clinical interpretation
- formulas
- calculation meaning
- warning thresholds
- tolerances
- treatment scenarios

PIBot analyzes and returns to PMBot using the ANALYSIS_COMPLETE output contract.

### Stage 4 — Implementation
PMBot assigns tasks to the appropriate developer(s):
- FrontendDevBot — UI, components, forms, pages, frontend validation
- CalculationBot — calculation engine, formulas, numerical precision
- DevBot — small cross-stack tasks, maintenance, refactoring, bugs

Parallel implementation is allowed ONLY when tasks are independent.
Do not run tasks in parallel when one depends on the result of another.

Engineering agents return IMPLEMENTATION_COMPLETE to PMBot.

### Stage 5 — Integration
The responsible developer verifies that all changed components work together.

### Stage 6 — QA (Mandatory Gate)
PMBot sends the completed implementation to QABot.
QABot evaluates acceptance criteria, runs tests, checks calculations, verifies architecture.

### Stage 7 — Fix Loop (QA Remediation)
If QABot returns FAIL, PMBot must NOT mark the task complete and must NOT invoke GitBot.

Required loop:
```
QABot (FAIL) -> PMBot -> Responsible developer -> PMBot -> QABot (retest)
```

Repeat until PASS, PASS_WITH_NOTES, or BLOCKED.
Limit automated remediation to 3 QA fix cycles.
Do not silently weaken acceptance criteria to get a PASS.

### Stage 8 — Git
After QA passes (PASS or PASS_WITH_NOTES), PMBot invokes GitBot.
GitBot reviews repository changes, checks for secrets, prepares commit.

Commit and push are SEPARATE operations. Respect existing user-confirmation safeguards.

### Stage 9 — Completion
PMBot provides a final completion report:
```
Implemented:
...

Changed:
...

Tests:
...

QA:
PASS

Git:
...

Known limitations:
...
```

---

## Task State

Use lightweight task state for substantial work. Follow existing tasks/ and worklog.md conventions.

Example:
```
Task ID: ORTO-004

Title:
Configurable Bolton thresholds

Status:
IN_PROGRESS

Acceptance criteria:
- ...

Agent status:
PIBot: DONE
CalculationBot: DONE
FrontendDevBot: IN_PROGRESS
QABot: PENDING
GitBot: PENDING

QA result:
PENDING

Git result:
PENDING
```

Do not create a complex ticketing system.

---

## QA Result Codes

QABot MUST return one of:

- **PASS** — all criteria met, tests pass, no regressions
- **PASS_WITH_NOTES** — acceptable, minor observations noted, does not block completion
- **FAIL** — criteria not met, tests fail, or regression found; return to developer
- **BLOCKED** — cannot verify due to missing dependency or environment issue; escalate to PMBot

A FAIL must be returned to PMBot and then to the responsible development agent.
Developers must fix the issue and QABot must retest.

---

## Definition of Done

A task is NOT done because code was written. A task is Done only if ALL applicable conditions hold:

- [ ] PMBot analyzed the request
- [ ] acceptance criteria are defined
- [ ] required product/clinical analysis is complete
- [ ] implementation is complete
- [ ] relevant tests exist
- [ ] npm test passes
- [ ] npm run build passes
- [ ] npm run lint has no new relevant errors
- [ ] QABot returned PASS or PASS_WITH_NOTES
- [ ] GitBot reviewed the intended repository changes
- [ ] no secrets were introduced
- [ ] unrelated changes were excluded
- [ ] documentation was updated where necessary
- [ ] PMBot produced the final completion report

---

## Worklog Convention

`worklog.md` (project root, gitignored) is the append-only work log.

Format:
```
- YYYY-MM-DD: AgentName — brief description of action
```

All agents append to worklog.md when starting/completing work.

---

## Task Folder Convention

Tasks follow the pattern: `tasks/task-NNN-<name>/TASK.md` (gitignored).
PMBot creates a task folder for each significant piece of work.
Never overwrite previous task files.