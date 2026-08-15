# OrthoMath

**Orthodontic Treatment Sandbox**

A clinical calculation and treatment-planning support tool for orthodontists. Enter patient measurements once, create several treatment scenarios, and OrthoMath automatically recalculates space balance and highlights whether each proposed treatment plan is mathematically feasible.

> OrthoMath is a clinical calculation and treatment-planning support tool intended for qualified dental professionals. It does not provide a diagnosis or prescribe treatment. All calculations must be interpreted and verified by the treating clinician.

---

## Product Description

The central differentiator is NOT individual orthodontic calculators — it is:

**one patient → one dataset → several treatment strategies → instant mathematical comparison**

The product answers questions such as:
- If I avoid extractions, how much expansion/IPR/distalization do I need?
- If I reduce IPR, how much space remains unresolved?
- What happens to my space balance if I distalize 1 mm instead of 2 mm?
- How much extraction space remains after allocating space to alignment?
- Which assumptions are responsible for the result?

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Testing | Vitest 4 |
| Persistence | Browser localStorage (designed for future SQLite/Prisma migration) |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/maxroyak/orthomath.git
cd orthomath

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run oxlint |

---

## Architecture

```
src/
├── domain/                    # Pure domain logic (no UI dependencies)
│   ├── types/                 # All TypeScript domain types
│   │   └── index.ts
│   ├── calculations/          # Calculation engine
│   │   ├── spaceBalance.ts    # Space balance + individual mechanic calculations
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
│   └── ui/                    # Button, Card, NumberInput, BalanceBar, etc.
├── pages/                     # Route-level pages
│   ├── LandingPage.tsx
│   ├── DashboardPage.tsx
│   ├── DiagnosticsPage.tsx
│   ├── SpaceAnalysisPage.tsx
│   ├── ScenariosPage.tsx
│   ├── ComparisonPage.tsx
│   ├── SummaryPage.tsx
│   ├── SettingsPage.tsx
│   └── AboutPage.tsx
└── test/                      # Automated tests
    ├── spaceBalance.test.ts
    ├── bolton.test.ts
    ├── scenarioDuplication.test.ts
    ├── warnings.test.ts
    └── settings.test.ts
```

### Separation of Concerns

The calculation engine is completely separated from UI components:

- **Domain layer** (`src/domain/`) — Pure functions, no React imports, unit-testable
- **Persistence layer** (`src/persistence/`) — Simple localStorage CRUD, portable to SQLite
- **UI layer** (`src/components/`, `src/pages/`) — React components that call domain functions

---

## Calculation Rules

### Space Balance

```
finalBalance = initialDiscrepancy + Σ(mechanicSpaceEffects)
```

Where:
- Negative values represent **crowding** (space deficiency)
- Positive values represent **excess space**

### IPR (Interproximal Reduction)

```
totalSpace = iprPerContact × numberOfContacts
```

Example: `0.2 mm × 10 contacts = +2.0 mm`

### Expansion

**Calculated mode:**
```
spaceGain = expansionAmount × coefficient
```

Example: `3.0 mm × 0.6 = +1.8 mm`

The coefficient is clinician-defined and configurable. It is NOT a biological constant.

**Manual mode:** Clinician enters estimated space gain directly.

### Distalization

```
potentialSpace = rightDistalization + leftDistalization
```

Clinician can manually reduce usable space:
```
usableSpace = expectedUsableSpace (if provided)
```

### Extraction

```
theoreticalSpace = Σ(mesiodistalWidths of extracted teeth)
usableSpace = theoreticalSpace × (utilizationPercent / 100)
```

Example: `14.0 mm × 50% = +7.0 mm`

The remainder is allocated to incisor retraction, anchorage loss, molar movement, etc.

### Incisor Advancement / Retraction

```
spaceEffect = incisorMovement × coefficient
```

- Positive movement = advancement → creates space
- Negative movement = retraction → consumes space

The coefficient is clinician-defined and configurable.

### Bolton Overall Ratio

```
ratio = (Σ mandibular 12 teeth / Σ maxillary 12 teeth) × 100
```

Reference value: **91.3%**

### Bolton Anterior Ratio

```
ratio = (Σ mandibular anterior 6 teeth / Σ maxillary anterior 6 teeth) × 100
```

Reference value: **77.2%**

### Balance Status Classification

| Status | Condition |
|--------|-----------|
| Balanced | `|finalBalance| ≤ tolerance` (default ±0.5 mm) |
| Minor discrepancy | `tolerance < |finalBalance| ≤ minorThreshold` (default 2.0 mm) |
| Unresolved discrepancy | `|finalBalance| > minorThreshold` |

---

## Clinical Assumption Principle

OrthoMath never presents assumptions as biological facts. Whenever a conversion is not universally deterministic, it is configurable:

- **Bad:** "1 mm expansion always generates 0.6 mm space"
- **Good:** "Estimated space gain = expansion × clinician-defined coefficient"

Each scenario retains the assumptions used when it was calculated (auditability).

---

## Warnings

The warning system is rule-based and flags mathematical inconsistencies:

1. **Unresolved crowding** — Arch remains deficient after all mechanics
2. **Excess space** — Arch shows remaining space; clinician should confirm intent
3. **Excessive dependency** — >60% of space from one mechanic; review feasibility
4. **IPR limit** — Per-contact IPR exceeds configured threshold

Warnings are NOT clinical diagnoses.

---

## Auditability

Every scenario retains:
- Input measurements
- Mechanics and their parameters
- Coefficients and settings used at calculation time
- Calculated results

If global assumptions change later, previously saved scenarios retain their own assumptions.

---

## Privacy

- All data is stored locally in the browser (localStorage)
- No patient data is sent to any server
- Anonymized patients are supported (auto-generated IDs)
- No analytics that send patient data to third parties

---

## Known Limitations

- MVP uses localStorage — data is per-browser and does not sync
- No authentication or multi-user support
- No STL upload or 3D analysis
- No automatic tooth measurement from scans
- All measurements are manually entered
- Cephalometric values are stored but not yet used in calculations
- Condylography module is data-model only (hidden behind "Experimental / Future Module")
- Mobile support is secondary; desktop and tablet are primary

---

## Future Roadmap

- STL upload and 3D arch analysis
- Automatic tooth measurements from scans
- Cephalometric analysis engine
- CBCT integration
- Aligner treatment-plan analysis
- Condylography and TMJ MRI data
- Treatment progress tracking
- Multi-user clinics with authentication
- Cloud synchronization (SQLite/Prisma + PostgreSQL)
- AI-assisted features (case summaries, consistency review, TRG landmark detection)
- Treatment Sandbox with interactive sliders

---

## Test Coverage

Automated tests cover:

- Space balance calculation (zero crowding, positive spacing, multiple mechanics)
- IPR calculation (decimal values, zero contacts, negative values)
- Expansion calculation (calculated and manual modes)
- Distalization calculation (with and without usable space override)
- Extraction calculation (utilization percentage, single/multiple teeth)
- Incisor movement (advancement and retraction)
- Bolton anterior and overall ratios
- Bolton with missing teeth
- Bolton discrepancy direction detection
- Scenario duplication (new IDs, non-preferred, copied assumptions)
- Warning generation (unresolved crowding, excess space, IPR limits, dependency)
- Settings-based thresholds (custom tolerance, minor threshold, large values, decimal precision)

---

## License

This is a private project. All rights reserved.