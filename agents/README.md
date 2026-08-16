# OrtoMath — Agent Architecture

> This directory defines the multi-agent team structure for OrtoMath development.
> The executable entry point is `AGENTS.md` in the repo root — it is auto-injected
> into every Hermes Agent session and defines how PMBot delegates to specialists.

## Orchestration Rule

PMBot is the ONLY orchestration authority.

Specialist agents do NOT directly invoke or hand work to other specialist agents.

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

## Architecture Diagram

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

## Final Agent Roster

Exactly 7 agents. Do not create additional agents unless the project architecture
materially changes in the future.

| Agent | File | Role |
|-------|------|------|
| PMBot | `PMBot.md` | Central orchestrator — receives requests, decomposes tasks, delegates, enforces QA gate, coordinates GitBot |
| PIBot | `PIBot.md` | Product/clinical analyst — orthodontic domain interpretation, formulas, edge cases |
| DevBot | `DevBot.md` | General-purpose developer — maintenance, refactoring, cross-cutting bugs |
| FrontendDevBot | `FrontendDevBot.md` | React UI specialist — components, pages, forms, routing, state |
| CalculationBot | `CalculationBot.md` | Orthodontic calculation specialist — formulas, precision, tolerances, boundary conditions |
| QABot | `QABot.md` | Mandatory QA gate — tests, build, lint, calculation verification |
| GitBot | `GitBot.md` | Repository manager — git operations only after QA PASS |

## Agents NOT Created (and why)

- **BackendDevBot** — no backend, server, or API layer. Pure client-side SPA.
- **DataBot / DatabaseBot** — no database, no migrations, no schema. localStorage only.
- **InfraBot / DevOpsBot** — no Docker, no CI/CD, no deployment config, no infrastructure.
- **SecurityBot** — no authentication, no patient data sent to servers, no external APIs.
- **UXBot** — FrontendDevBot covers UX responsibilities at current project scale.

These should only be created if actual product requirements justify them in the future.

## Scope Control

Developers implement ONLY work explicitly assigned by PMBot.
Developers must not expand the task scope without returning the issue to PMBot.

Prohibited:
- unrelated refactoring
- changing adjacent functionality "while here"
- changing formulas that were not part of the task
- changing UI terminology independently
- adding dependencies without justification
- changing architecture without PM approval

If an agent discovers another issue, it reports to PMBot:

```
OUT_OF_SCOPE_FINDING

Issue:
...

Impact:
...

Recommendation:
...
```

Do not fix it automatically.

## Shared Files

All agents MUST read these before starting any task:

| File | Purpose |
|------|---------|
| `PROJECT_CONTEXT.md` | Product description, technology stack, architecture, domain model, Git workflow, Definition of Done |
| `WORKFLOW.md` | Orchestration model, task states, agent handoffs, QA gate, remediation loop, Git gate |

Avoid duplicating the complete project context into every individual agent file.
Use shared context plus role-specific instructions.

## Executable Integration

This is not merely conceptual documentation. The agent roster is executable via
Hermes Agent's `delegate_task` mechanism:

- The main Hermes session acts as PMBot.
- Each specialist is invoked as a `delegate_task` leaf subagent.
- Role instructions and task specs are passed via the `context` parameter.
- The `AGENTS.md` file in the repo root is auto-injected into every session.

See `AGENTS.md` for the delegation protocol.

## Required Workflow

```
User -> PMBot -> PIBot (when needed) -> Developer(s) -> QABot -> GitBot -> Done
```

PMBot owns orchestration. Developers must NOT independently decide what to implement.
QABot is a mandatory gate. GitBot operates only after QA passes.