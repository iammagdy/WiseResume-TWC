specs/007-portfolio-phase-2/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (generated via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/          # Sharable UI components
│   └── portfolio/       # Portfolio-specific sub-components (Refactoring Target)
├── pages/
│   ├── PortfolioEditorPage.tsx   # Stability & Score logic target
│   └── PublicPortfolioPage.tsx    # Monolith refactoring & Observer target
├── hooks/
│   └── usePublicPortfolio.ts      # Data fetching logic
└── lib/
    └── portfolioThemes.ts         # Theme registry
```

**Structure Decision**: Refactor `PublicPortfolioPage` by extracting theme sections and sticky header logic into `src/components/portfolio/`. Maintain existing page routing.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A        |            |                                     |
