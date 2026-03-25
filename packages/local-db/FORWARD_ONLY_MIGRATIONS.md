# Forward-Only Local DB Migrations

`packages/local-db/drizzle/` is treated as release history for user-owned desktop SQLite databases.

## Rules

- Never rewrite already shipped local DB history to "insert" upstream migrations into the past.
- After a fork/upstream rebase, reconcile schema drift with forward-only changes:
  - a new migration on top, or
  - a desktop startup compatibility repair for legacy databases, or
  - both when the code path is critical.
- Do not drop or rollback user-facing local tables such as `chat_sessions` as part of a rebase repair.
- If upstream adds a column/table that old fork databases may have skipped, add an additive bridge instead of replaying old migration numbers.

## Current Example

- Fork release history shipped local `chat_sessions`.
- Upstream later added `worktrees.created_by_superset`.
- Older fork databases can skip the upstream migration because Drizzle SQLite tracks only the latest migration timestamp.
- The desktop startup path therefore applies a forward-only compatibility repair before running Drizzle migrations.

Anchor:

- `apps/desktop/src/main/lib/local-db/forward-only-compatibility.ts`
