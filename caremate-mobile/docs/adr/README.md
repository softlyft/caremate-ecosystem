# Architecture Decision Records

[← Back to index](../README.md)

ADRs capture **significant, hard-to-reverse technical choices** for CareMate. Prefer short, durable rationale over tutorial-style writing. Implementation detail lives in the rest of `docs/`.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](./001-why-expo.md) | Why Expo | Accepted |
| [ADR-002](./002-why-sqlite.md) | Why SQLite | Accepted |
| [ADR-003](./003-why-supabase.md) | Why Supabase | Accepted |
| [ADR-004](./004-guest-first.md) | Guest First | Accepted |
| [ADR-005](./005-repository-pattern.md) | Repository Pattern | Accepted |
| [ADR-006](./006-core-vs-mini-apps.md) | Core shell vs mini-app packaging | Accepted |

## Conventions

- **File name:** `NNN-short-kebab-title.md` (three-digit number, never reuse)
- **Status:** Proposed → Accepted → Deprecated / Superseded by ADR-XXX
- **When to write one:** platform choice, data ownership, auth model, layering rule, or anything later contributors will ask “why did we…?”
- **When not to:** routine feature work, UI polish, dependency bumps without architectural impact

### Template

```markdown
# ADR-NNN: Title

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | YYYY-MM-DD |

## Context

What forces the decision?

## Decision

What we chose.

## Consequences

Pros, cons, and follow-on constraints.

## Alternatives considered

What we rejected and why (brief).
```
