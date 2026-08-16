# OrtoMath — Shared Project Context

> All agents MUST read this file before starting any task.
> Role-specific instructions live in each agent's .md file in this directory.
> The executable entry point is `AGENTS.md` in the repo root.

## Product

**OrtoMath** — Orthodontic Treatment Sandbox.

A clinical calculation and treatment-planning support tool for orthodontists.
Enter patient measurements once, create several treatment scenarios, and OrtoMath
automatically recalculates space balance and highlights whether each proposed
treatment plan is mathematically feasible.

**Core differentiator:** one patient -> one dataset -> several treatment strategies -> instant mathematical comparison.

**Critical rule:** OrtoMath does NOT diagnose, prescribe treatment, or replace the clinician.
All calculations must be interpreted and verified by the treating clinician.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 (via @tailwindcss/vite) |
| Routing | React Router 7 |
| Testing | Vitest 4 (globals enabled, node environment) |
| Linting | oxlint (react + typescript + oxc plugins) |
| Persistence | Browser localStorage |
| Backend | None — pure client-side SPA |
| Database | None — localStorage only |
| Auth | None |
| Docker/CI-CD | None |

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR (http://localhost:5173)
npm run build        # Type-check (tsc -b) + Vite production build
npm run preview      # Preview production build locally
npm test             # Run all tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)
npm run lint         # Run oxlint
```

---

## Architecture

```
src/
├── domain/                    # Pure domain logic — NO React imports, fully unit-testable
│   ├── types/                 # All TypeScript domain types
│   │   └── index.ts
│   ├── calculations/          # Calculation engine
│   │   ├── spaceBalance.ts   # Space balance + individual mechanic calculations
│   │   └── bolton.ts          # Bolton anterior and overall ratio
│   ├── scenarios/             # Scenario management
│   │   └── scenarioEngine.ts  # Duplication and ID reassignment
│   └── warnings/              # Warning engine
│       └── warningEngine.ts   # Rule-based mathematical warnings
├── persistence/               # Data layer
│   ├── store.ts               # localStorage-based CRUD
│   └── seedData.ts            # Demo patient with 3 scenarios
├── components/                # Reusable UI components
│   ├── layout/                # Sidebar, PatientHeader, AppLayout
│   └── ui/                    # Button, Card, NumberInput, BalanceBar, BalanceChain, etc.
├── pages/                     # Route-level pages (9 pages)
│   ├── LandingPage.tsx
│   ├── DashboardPage.tsx
│   ├── DiagnosticsPage.tsx
│   ├── SpaceAnalysisPage.tsx
│   ├── ScenariosPage.tsx
│   ├── ComparisonPage.tsx
│   ├── SummaryPage.tsx
│   ├── SettingsPage.tsx
│   └── AboutPage.tsx
└── test/                      # Automated tests (8 files, 67 tests)
    ├── spaceBalance.test.ts
    ├── bolton.test.ts
    ├── boltonTolerance.test.ts
    ├── scenarioDuplication.test.ts
    ├── warnings.test.ts
    ├── extractionAllocation.test.ts
    ├── extractionWarnings.test.ts
    └── settings.test.ts
```

### Separation of Concerns (MANDATORY)

- **Domain layer** (`src/domain/`) — Pure functions, NO React imports, unit-testable.
  Calculations must NEVER depend on UI state or React components.
- **Persistence layer** (`src/persistence/`) — localStorage CRUD. Portable to SQLite.
- **UI layer** (`src/components/`, `src/pages/`) — React components that CALL domain functions.
  UI must NOT contain calculation logic.

---

## Domain Model Overview

Key types (see `src/domain/types/index.ts` for full definitions):

- **Patient** — id, name, age, sex, dentitionStage, notes
- **DiagnosticRecord** — archMeasurements, toothMeasurements, cephalometric, includeBolton
- **ToothMeasurement** — fdiNumber, arch, mesiodistalWidth
- **TreatmentScenario** — name, mechanics[], assumptions snapshot, isPreferred, clinicalNotes
- **TreatmentMechanic** — type (IPR/EXPANSION/DISTALIZATION/EXTRACTION/INCISOR_MOVEMENT/CUSTOM),
  arch, parameters, spaceEffect
- **CalculationAssumptions** — per-scenario snapshot of coefficients and thresholds
- **UserSettings** — default assumptions, tolerance thresholds
- **SpaceBalanceResult** — startingDiscrepancy, totalSpaceCreated/Consumed, finalBalance, status
- **Warning** — level (info/review/conflict), arch, message

### Calculation Rules

- **Space Balance:** `finalBalance = startingDiscrepancy + Sum(mechanicSpaceEffects)`
  - Negative = crowding, positive = excess space
- **IPR:** `totalSpace = iprPerContact x numberOfContacts`
- **Expansion:** `spaceGain = expansionAmount x coefficient` (coefficient is clinician-defined, NOT biological)
- **Distalization:** `potentialSpace = rightDistalization + leftDistalization`
- **Extraction:** `usableSpace = Sum(toothWidths) x (utilizationPercent / 100)`, with allocation breakdown
- **Incisor Movement:** `spaceEffect = movement x coefficient` (positive=advancement creates space, negative=retraction consumes)
- **Bolton Overall:** `(Sum mandibular 12 / Sum maxillary 12) x 100`, reference 91.3%
- **Bolton Anterior:** `(Sum mandibular anterior 6 / Sum maxillary anterior 6) x 100`, reference 77.2%

### Clinical Assumption Principle

OrtoMath never presents assumptions as biological facts. When a conversion is not universally
deterministic, it is configurable. Each scenario retains the assumptions used when calculated (auditability).

---

## Important Directories

| Path | Purpose |
|------|---------|
| `src/domain/` | Pure calculation engine — no UI dependencies |
| `src/persistence/` | localStorage store + seed data |
| `src/components/` | Reusable React components |
| `src/pages/` | Route-level page components |
| `src/test/` | Automated tests |
| `tasks/` | Task definitions (gitignored — internal management) |
| `worklog.md` | Work log (gitignored — internal management) |
| `agents/` | Agent definitions (tracked in Git) |
| `AGENTS.md` | Executable entry point (tracked in Git, auto-injected by Hermes) |

---

## Git Workflow

- **Repository:** github.com/maxroyak/orthomath (PRIVATE)
- **Default branch:** `main`
- **Branch naming:** `feature/<name>`, `fix/<name>`, `refactor/<name>`, `test/<name>`, `docs/<name>`
- **Commit style:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- **Only GitBot** may run `git commit` or `git push`.
- **Never commit:** secrets, credentials, `.env` files, generated temp files, editor-specific files
- **Gitignored management files:** `worklog.md`, `TASK.md`, `QA_REPORT.md`, `tasks/` — these are internal, never pushed

---

## Definition of Done

A task is NOT finished simply because code was written. A task is Done only when ALL of these are true:

1. PMBot analyzed the request
2. Acceptance criteria are defined
3. Required product/clinical analysis is complete
4. Implementation follows the existing architecture (domain/persistence/UI separation)
5. Relevant tests exist and pass (`npm test`)
6. `npm run build` succeeds
7. `npm run lint` has no new relevant errors
8. QABot returns PASS or PASS_WITH_NOTES
9. GitBot reviewed the intended repository changes
10. No secrets were introduced
11. Unrelated changes were excluded
12. Documentation updated where necessary
13. PMBot confirms completion

---

## Architecture Discipline

All agents must:

- Inspect existing implementation before modifying it
- Reuse existing components where reasonable
- Avoid duplicate business logic
- Avoid unnecessary dependencies
- Avoid unnecessary architecture changes
- Avoid rewriting working modules without reason
- Preserve backward compatibility unless explicitly changing behavior
- Keep calculations deterministic and testable
- Keep domain logic separate from presentation logic
- Never silently change calculation formulas, thresholds, clinical interpretations, or terminology