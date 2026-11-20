# Support Rating and Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep resolved support conversations available until the customer submits a filled 1–5 star rating, persist that rating against the responsible support account, and show a trustworthy support ranking.

**Architecture:** Add a relational `SupportRating` record with one rating per ticket. The rating endpoint validates ownership and resolved state, then records the rating, chat history entry, and ticket closure atomically. The support queue response includes an aggregate ranking by support user; the frontend adds selectable stars with a separate confirmation action and a ranking section on `/support`.

**Tech Stack:** React 19, TypeScript, TanStack Query, NestJS, Prisma 7, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-11-19-support-rating-and-ranking-design.md`

## Global Constraints

- Keep conversations readable in `RESOLVED` and `CLOSED`; sending ordinary messages stays limited to `IN_PROGRESS`.
- Enforce one rating per ticket, with score from 1 to 5, linked to its requester and assigned support user.
- Keep the chat message as a human-readable record; use the structured rating table for rankings.
- Do not apply the migration to the production database.
- Do not use real support tickets to simulate ratings.

## Review Focus

- Duplicate/concurrent submissions: a ticket must have only one rating and one closure transition.
- Wrong account or status: only the ticket requester can rate, and only while the ticket is `RESOLVED`.
- Assignment integrity: a rating must remain associated with the support account assigned to that ticket.
- Empty ranking: show a useful empty state instead of divide-by-zero or `NaN` averages.
- Conversation availability: resolved tickets remain accessible until rating; closed tickets remain readable afterward.

---

### Task 1: Add the persisted support rating model

**Files:**
- Modify: `D:/TCC/agendaqui-api/prisma/schema.prisma`
- Create: `D:/TCC/agendaqui-api/prisma/migrations/20261119181600_add_support_ratings/migration.sql`

**Interfaces:**
- Produces Prisma model `SupportRating` with `id`, unique `supportTicketId`, `requesterUserId`, `supportUserId`, `score`, and `createdAt`.
- Adds named relations from `User` and a one-to-one relation from `SupportTicket`.

- [ ] Add schema relations and constraints: score stored as integer, `supportTicketId` unique, foreign keys cascade on ticket/requester deletion and restrict deletion of a support user with historical ratings.
- [ ] Add SQL migration that creates the table, unique/index constraints, and foreign keys; inspect the SQL without connecting to or applying it to production.
- [ ] Run `npx prisma validate` and `npx prisma generate` in `agendaqui-api`; expected: schema validates and generated client contains `supportRating` delegate.

### Task 2: Make rating and ranking consistent in the API

**Files:**
- Modify: `D:/TCC/agendaqui-api/src/modules/user-management/support/application/support-tickets.service.ts`
- Modify: `D:/TCC/agendaqui-api/src/modules/user-management/support/presentation/controllers/support-tickets.controller.ts`
- Modify: `D:/TCC/agendaqui-api/src/modules/user-management/support/presentation/controllers/help-tickets.controller.ts`
- Modify: `D:/TCC/agendaqui-api/src/modules/user-management/support/infra/support-chat.gateway.ts`

**Interfaces:**
- `rate(ticketId: string, requesterUserId: string, score: number)` returns `{ rating: SupportRating; message: SupportMessage }`.
- `listForSupport()` returns existing ticket queue/counts plus `ranking: { supportUserId: string; name: string; average: number; total: number }[]`.

- [ ] Change the rating mutation to check ownership, `RESOLVED`, assigned support user, score range, and the unique ticket rating; persist rating, `Nota do atendimento: N/5` chat entry, and `CLOSED` transition in one Prisma transaction.
- [ ] Keep retry behavior safe: a repeated identical submission can return the existing rating; a conflicting second score returns conflict without another message or closure side effect.
- [ ] Aggregate ratings by assigned support user and return average plus count, ordered by average descending then total descending; do not include support users with zero ratings.
- [ ] Publish the saved rating chat message through the existing ticket room and emit `support:rating-submitted` to the support room so an open support dashboard refreshes its ranking.
- [ ] Run `npm run build` in `agendaqui-api`; expected: Nest and Prisma client compile successfully. Do not run migrations against the configured database.

### Task 3: Add filled, confirmable stars in the customer conversation

**Files:**
- Modify: `D:/TCC/agendaqui/src/components/support/ticket-conversation.tsx`
- Modify: `D:/TCC/agendaqui/src/services/api/support.ts`

**Interfaces:**
- Rating mutation consumes an integer score from 1 to 5 and uses the API's structured rating response.
- `SupportRatingSubmission` is `{ rating: { id: string; supportTicketId: string; requesterUserId: string; supportUserId: string; score: number; createdAt: string }; message: SupportMessage }`.
- Customer UI holds a local selected score until the user confirms it.

- [ ] Add selected-score state; clicking a star selects a score but does not submit immediately.
- [ ] Fill all stars up to the selected score, provide an explicit “Enviar avaliação” action, and retain the selected value on API error for retry.
- [ ] Keep the conversation visible while ticket status is `RESOLVED`; after success, show the saved score as filled stars and a thank-you state. Keep `CLOSED` conversations readable.
- [ ] Update the support ticket/message caches from the mutation response and invalidate the customer ticket list after successful rating.
- [ ] Run `npm run build` in `agendaqui`; expected: TypeScript and Vite build pass.

### Task 4: Display the ranking in `/support`

**Files:**
- Modify: `D:/TCC/agendaqui/src/types/support.ts`
- Modify: `D:/TCC/agendaqui/src/pages/support/dashboard.tsx`

**Interfaces:**
- `SupportQueue` includes `ranking: { supportUserId: string; name: string; average: number; total: number }[]`.

- [ ] Render a ranking section from the queue response, showing rank, support name, average to one decimal place, filled star indicator, and number of evaluations.
- [ ] Add an empty state when there are no ratings yet.
- [ ] Listen for `support:rating-submitted` on the existing support socket and invalidate `['support-queue']` so the ranking refreshes while the dashboard is open.
- [ ] Run `npm run build` in `agendaqui`; expected: frontend build passes.

### Task 5: Final review and safe handoff

**Files:**
- Review only: all files above and the migration SQL.

- [ ] Review the diff for generated artifacts, accidental `.env` changes, and production database commands.
- [ ] Confirm no database migration was applied and no real ticket was rated.
- [ ] Report build outcomes, migration path, and the exact command the user can run later when ready to apply the migration in the intended environment.
