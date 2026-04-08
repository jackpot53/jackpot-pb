# Structure

## Status

**Greenfield project** — no application source code exists yet.

## Current Directory Layout

```
jackpot-pb/
├── README.md                    # Project description
├── docs/
│   └── 개발일지.md              # Development journal (empty)
├── .claude/                     # GSD agent framework
│   ├── settings.json            # Claude Code permissions & hooks
│   ├── hooks/                   # GSD lifecycle hooks
│   └── get-shit-done/           # GSD workflow engine
├── .agent/                      # Agent configuration
└── .planning/                   # GSD planning artifacts
    └── codebase/                # Codebase map (this directory)
```

## Key Locations

| Path | Purpose |
|------|---------|
| `README.md` | Project overview |
| `docs/` | Documentation |
| `.claude/` | Claude Code configuration |
| `.planning/` | GSD planning artifacts |

## Naming Conventions

Not established — no source code yet.

## Expected Structure (Post-Planning)

To be defined during `/gsd-new-project` initialization.

---
*Generated: greenfield — re-run after first code is added*
