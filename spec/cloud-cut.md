# Cloud Cut Spec

## Summary

This document describes how to turn `apps/desktop` into a local-first desktop app that does not require Superset cloud auth, organization state, Electric sync, or first-party cloud APIs to start and be useful.

This is a desktop-first spec. It is not a repo-wide cloud removal plan for `web`, `api`, or shared packages outside the desktop execution path.

Nix-specific bootstrap and runtime details are intentionally excluded here. See [`nix-run.md`](./nix-run.md) for Linux/Nix-specific run and packaging constraints.

## Target State

The desktop app should:

- start without Superset sign-in or organization setup;
- open directly into the local workspace flow;
- keep local projects, workspaces, worktrees, terminal, settings, model configuration, and local chat;
- persist desktop chat/session metadata locally;
- avoid hard dependencies on Superset cloud routes, org-scoped collections, Electric, billing, API keys, team management, and cloud task/workspace surfaces.

The desktop app should not:

- require `authClient.useSession()` to render the main shell;
- require `activeOrganizationId` to start or navigate the local product;
- assume `NEXT_PUBLIC_API_URL` or Electric collections are available for the happy path;
- expose cloud-only UI that crashes without `CollectionsProvider`.

## Architecture Rules

### 1. Remove the cloud auth shell from desktop startup

Desktop startup must not depend on Superset auth or org bootstrap.

Required behavior:

- `/sign-in` redirects to `/workspace`;
- `/create-organization` redirects to `/workspace`;
- the authenticated desktop layout renders the local app shell directly instead of waiting for session/org state;
- route guards must not bounce local desktop users into auth-only flows.

Anchor paths:

- `apps/desktop/src/renderer/routes/sign-in/page.tsx`
- `apps/desktop/src/renderer/routes/create-organization/page.tsx`
- `apps/desktop/src/renderer/routes/_authenticated/layout.tsx`

### 2. Replace cloud chat/session persistence with local desktop persistence

Desktop chat metadata must be owned by the local DB instead of cloud `chatSessions`/`sessionHosts`.

Required behavior:

- add a local `chat_sessions` table for desktop-owned session metadata;
- create a desktop-local TRPC router for CRUD-like access to chat sessions;
- keep message/runtime storage keyed by session id, but stop requiring cloud session creation and title persistence;
- update chat title writes to go through local persistence when running in local-only mode;
- file attachment and chat send flows must not require Superset upload APIs.

Contract changes:

- local DB becomes the source of truth for desktop chat session registry;
- chat runtime must work with no Superset API client;
- Superset cloud tools in chat runtime are optional and disabled for the local-first path.

Anchor paths:

- `packages/local-db/src/schema/schema.ts`
- `apps/desktop/src/lib/trpc/routers/chat-sessions/index.ts`
- `packages/chat/src/server/trpc/service.ts`

### 3. Trim cloud-only routes and settings from the desktop navigation surface

Any route or settings screen that fundamentally depends on org collections, cloud billing, cloud tasks, or first-party cloud APIs must be removed, redirected, or replaced with a local-safe fallback.

Keep:

- appearance, ringtones, keyboard, behavior, git, agents, terminal, models, permissions;
- local workspace and project flows;
- local onboarding and workspace startup.

Remove or redirect:

- billing;
- organization and members management;
- cloud API keys;
- cloud devices and integrations;
- cloud secrets pages;
- cloud task surfaces;
- cloud `v2-workspace` entrypoints when they assume cloud routing.

Implementation rule:

- prefer explicit redirects or stripped-down pages over leaving a route mounted with dead provider dependencies.

### 4. Remove cloud provider dependencies from always-rendered UI

The desktop shell must not call `useCollections()` or cloud session hooks from components that render on the local-first path.

Required behavior:

- top-level shell components such as top bar, history, layout wrappers, and primary navigation must render without `CollectionsProvider`;
- if a component only makes sense with cloud tasks/orgs, remove it from the local-first shell;
- history/navigation should degrade to workspace-only behavior rather than depend on tasks or org data.

Concrete rule:

- any component reachable from `/workspace` must render safely with no `CollectionsProvider`.

### 5. Make cloud runtime integrations optional, not ambient

Desktop services that can talk to the cloud must not be ambient requirements for startup.

Required behavior:

- chat runtime can be created with `apiUrl` absent;
- Superset MCP tools are disabled when no cloud API is configured;
- host-service, org-routed cloud workspace helpers, and API clients must not be required for the local workspace path;
- environment validation must not fail just because cloud URLs are absent in local-only mode.

## Implementation Guidance

### Decision rules

- If a feature is local-first and useful without Superset cloud, keep it.
- If a feature is cloud-only but appears in the local shell, remove or redirect it.
- If a contract is shared but only desktop-local behavior is needed, make cloud fields optional instead of forcing dummy auth/org state.
- Prefer local persistence over mock cloud state.

### Route and UI cleanup rules

- Treat generated routing files as outputs, not source of truth.
- Edit real route source files first; generated route trees should follow from route generation.
- Do not leave dead sign-in, org creation, billing, or task shells reachable from the local happy path.

### Data layer rules

- Desktop-local data should live in `packages/local-db` and desktop TRPC routers.
- Do not introduce new fake organization requirements just to satisfy old interfaces.
- If a mutation only exists to update cloud state for the desktop client, replace it with a local equivalent or remove it from the local path.

## Known Remaining Cloud Debt

These areas still contain cloud concepts in the repository and should be treated explicitly when continuing the cleanup:

- `useCollections()` usages outside the already-fixed local shell paths.
  These are acceptable only if the route is no longer reachable from the local-first path; otherwise they must be removed or guarded.
- `authClient`, `NEXT_PUBLIC_API_URL`, and desktop API clients.
  These should be considered optional desktop integrations, not startup requirements.
- host-service manager and org-scoped cloud host routing.
  This is cloud-shaped debt and should not block local workspace usage.
- local DB schema still contains synced cloud tables such as organizations, members, and tasks.
  These can remain as dormant schema for now if they do not drive the local shell.
- generated route tree still references cloud routes.
  That is only acceptable if the source routes intentionally redirect or are otherwise harmless.

Classification:

- must remove from local startup path: `useCollections()` in always-rendered shell components, org menus, task-backed history, auth-only route guards;
- can stub or redirect: billing, members, organization, devices, integrations, cloud secrets, sign-in, create-organization;
- acceptable leftover for now: dormant synced tables, optional cloud clients, unreachable cloud pages.

## Acceptance Criteria

The desktop cloud cut is complete enough for local-first use when:

- the app opens to local workspace flows without sign-in;
- `/workspace` and its shell render without `CollectionsProvider` crashes;
- local chat/session metadata persists in the local DB;
- chat runtime can operate with no Superset API URL;
- local projects, workspaces, worktrees, terminal, and core settings still work;
- cloud-only settings and routes are either removed from primary navigation or explicitly redirected;
- no auth/org setup is required to use the local desktop happy path.

## Defaults And Assumptions

- Scope is `apps/desktop` and the desktop execution path in shared packages.
- This spec does not attempt to remove cloud concepts from `web`, `api`, or all shared schemas.
- Local-first behavior is preferred over cloud-compatible abstractions when the two conflict on desktop startup.
- Nix/Linux runtime issues are documented separately in [`nix-run.md`](./nix-run.md).
