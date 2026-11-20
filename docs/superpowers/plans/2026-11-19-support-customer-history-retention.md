# Support Customer History Retention Plan

> **For agentic workers:** Execute this plan task-by-task in the current session. Use checkbox syntax to track progress.

**Goal:** Hide support tickets from the requesting customer's history and customer routes seven days after closure, while preserving support access and ranking data.

**Architecture:** Apply one shared retention cutoff to customer-owned ticket queries and participant chat reads. Keep support-only queries unchanged. Use the existing `closedAt` field; do not delete rows or add a migration.

**Tech Stack:** NestJS, Prisma 7, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-11-19-support-customer-history-retention-design.md`

## Global Constraints

- Count 7 days from `closedAt`.
- Do not expire `OPEN`, `IN_PROGRESS`, or `RESOLVED` tickets.
- Preserve the support console history and support rating records.
- Do not delete rows/messages, add a migration, or write to production data.

## Review Focus

- Boundary timestamp: tickets expire only when `closedAt` is older than the 7-day cutoff.
- Direct lookup: an expired ticket must be inaccessible to its requester by ticket ID.
- Messages: requester cannot read chat messages for expired tickets; support can still read them.
- Unclosed tickets: tickets without `closedAt` remain in customer history.
- Ranking integrity: support-only queue queries remain unaffected and ratings remain stored.

---

### Task 1: Apply customer retention rules in the API

**Files:**
- Modify: `D:/TCC/agendaqui-api/src/modules/user-management/support/application/support-tickets.service.ts`

**Interfaces:**
- Add a shared helper/constant for the seven-day cutoff and customer-visible ticket predicate.

- [x] Filter `listMine` to include unclosed tickets and tickets with `closedAt` within the last seven days.
- [x] Apply the same predicate to `getMine`; return not found for expired tickets.
- [x] Apply requester-only expiry to `getMessages`, while retaining participant authorization and support access.
- [x] Keep `getForSupport`, `listForSupport`, rating aggregation, and all write/delete behavior unchanged.
- [x] Run `npm run build` in `D:/TCC/agendaqui-api`; do not run a migration or mutate ticket data.

### Task 2: Review behavior and handoff

**Files:**
- Review: `support-tickets.service.ts` and the approved design.

- [x] Check the seven-day timestamp comparison uses an absolute UTC `Date` cutoff.
- [x] Confirm no migrations, database write commands, or unrelated files changed.
- [x] Report the changed customer routes and build result.
