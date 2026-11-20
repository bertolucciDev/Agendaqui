# Support Account Management Plan

> **For agentic workers:** Execute this plan task-by-task in the current session. Use checkbox syntax to track progress.

**Goal:** Add a support-only Accounts section with paginated account search and a safe action to send the existing password recovery code to the account's registered email.

**Architecture:** Add a support-protected paginated search endpoint returning minimal account fields and related business names. Add a support-protected reset request endpoint that resolves the canonical email, dispatches the existing `ForgotPasswordCommand`, and records an audit event. The frontend adds `/support/accounts`, moves account lookup out of the dashboard, and uses a searchable native selector.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, NestJS, CQRS, Prisma, BullMQ, existing audit and verification mail flow.

**Spec:** `docs/superpowers/specs/2026-11-19-support-account-management-design.md`

## Global Constraints

- Restrict account search and reset requests to `AdminLevel.SUPPORT`.
- Return only name, e-mail, status, creation date, and related business names; exclude logically deleted accounts.
- Deliver only the existing one-time recovery code to the registered email; support never receives the code or chooses a password.
- Audit the support actor and target account without recording email, code, token, or password in metadata.
- Create the additive audit enum migration but do not apply it to production in this task.

## Review Focus

- Authorization: non-support users must not access search/reset routes.
- Pagination and search: reject invalid bounds and avoid returning the full user table.
- Association mapping: include owner businesses and employee businesses without duplicates.
- Recovery privacy: only canonical database email receives the reset code; response contains no secret.
- Audit integrity: actor and target are recorded, with no credentials or PII in metadata.

---

### Task 1: Add support account search and reset actions to the API

**Files:**
- Modify: `D:/TCC/agendaqui-api/src/modules/user-management/support/presentation/controllers/support-account-lookup.controller.ts`
- Modify: `D:/TCC/agendaqui-api/src/modules/user-management/support/support.module.ts`
- Modify: `D:/TCC/agendaqui-api/src/modules/audit/domain/types/audit-action.type.ts`
- Modify: `D:/TCC/agendaqui-api/prisma/schema.prisma`
- Create: `D:/TCC/agendaqui-api/prisma/migrations/20261119200000_support_password_reset_audit/migration.sql`
- Create or modify support DTO/application files as needed for paginated account search and reset command orchestration.

**Interfaces:**
- `GET /support/users?search=<name-or-email>&page=<1-based>&limit=<bounded>` returns `{ items: SupportAccount[], page: number, limit: number, total: number }`.
- Search result includes `id`, `name`, `email`, `status`, `createdAt`, and unique `businessNames: string[]`.

- [x] Replace/extend exact-email lookup with bounded paginated search over non-deleted users; select owner business names and employee membership location business names.
- [x] Add a support-guarded reset action that reloads the target account by ID, dispatches `ForgotPasswordCommand` using the database email, and records actor/target in `AuditService`.
- [x] Add audit action/entity enum values and a reviewed additive PostgreSQL migration; do not apply the migration.
- [x] Import the existing auth/audit modules required by the support module; ensure no code path returns the reset code.
- [x] Run `npm run build` in `agendaqui-api`; do not run migration commands.

### Task 2: Add the Accounts section in the support UI

**Files:**
- Modify: `D:/TCC/agendaqui/src/App.tsx`
- Modify: `D:/TCC/agendaqui/src/components/layout/support-layout.tsx`
- Modify: `D:/TCC/agendaqui/src/pages/support/dashboard.tsx`
- Create: `D:/TCC/agendaqui/src/pages/support/accounts.tsx`
- Modify: `D:/TCC/agendaqui/src/services/api/support.ts`
- Modify: `D:/TCC/agendaqui/src/types/support.ts`

**Interfaces:**
- `supportApi.searchAccounts({ search, page, limit })` returns the paginated account contract.


- [x] Add `/support/accounts` under the existing `SupportGuard` and add an Accounts item to the support navigation.
- [x] Build a searchable selector backed by paginated search; display each option as person name, email, and associated business name(s).
- [x] On selection show status/creation date and provide an explicit â€œEnviar cÃ³digo de recuperaÃ§Ã£oâ€ action with pending/success/error states.
- [x] Remove â€œLocalizar contaâ€ and the exact-email lookup form from `/support` dashboard; retain the ticket queue/ranking unchanged.
- [x] Run `npm run build` in `agendaqui`; expected: TypeScript and Vite build pass.

### Task 3: Final safe review

- [x] Review only feature files and the SQL migration; confirm no `.env` edits or unrelated files are included.
- [x] Confirm no account reset request was sent and the audit migration was not applied to production.
- [x] Report builds, migration path, and the fact that the API audit action requires migration deployment before production use.
