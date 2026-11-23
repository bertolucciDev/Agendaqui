# Dashboards por Papel Implementation Plan

> **For agentic workers:** Implement sequentially in this thread; do not delegate.

**Goal:** Provide separate professional and manager dashboards while preserving the owner's existing dashboard.

**Architecture:** Keep `/dashboard` and select the professional view by workspace mode and the manager view by the active membership role (the current session contract maps managers to `OWNER` mode). The professional agenda uses a server-scoped query that verifies the authenticated user's active memberships in the requested business. The manager dashboard uses the existing business schedule endpoints and manager permissions.

**Tech Stack:** React, TypeScript, TanStack Query, React Router, NestJS, CQRS, Prisma.

**Spec:** `docs/superpowers/specs/2026-11-20-professional-dashboard.md`

## Global Constraints

- Do not mix professional appointments from different businesses.
- Derive professional identity from the authenticated user; never trust a membership ID supplied by the client.
- Preserve the existing owner dashboard and business schedule behavior.
- Keep manager links and data within `appointments:read/write`, `staff:write`, and `services:write` capabilities.
- Keep the current `OWNER`/`MANAGER` authorization model and `position` as a descriptive title.
- Do not add dependencies, schema changes, or migrations.
- Do not add or run tests unless requested; verify builds only.

## Review Focus

- A user with memberships in multiple businesses sees only the active business's schedule.
- A revoked/inactive membership cannot retrieve the former professional's appointments.
- Time range covers local calendar boundaries and remains sorted chronologically.
- Appointment actions remain scoped to the professional's own appointment.
- Owner page and query retain their current behavior.
- Manager page never displays owner-only financial or business setup metrics.

### Task 1: Add a scoped professional agenda API contract

**Files:**
- Modify `agendaqui-api/src/modules/user-management/staff/domain/repositories/staff.repository.ts`
- Modify `agendaqui-api/src/modules/user-management/staff/infra/prisma/prisma-staff.repository.ts`
- Modify `agendaqui-api/src/modules/appointment/domain/repositories/appointment.repository.ts`
- Modify `agendaqui-api/src/modules/appointment/infra/prisma/prisma-appointment.repository.ts`
- Modify `agendaqui-api/src/modules/appointment/presentation/controllers/get-professional-agenda.controller.ts`
- Modify `agendaqui-api/src/modules/appointment/application/queries/impl/get-professional-agenda.query.ts`
- Modify `agendaqui-api/src/modules/appointment/application/queries/handlers/get-professional-agenda.handler.ts`

**Interfaces:**
- Accept `businessId`, `dateFrom`, `dateTo`, and optional bounded `limit` on `GET /me/agenda`.
- Resolve active memberships by `(authenticated userId, businessId)` via employee membership → location → business.
- Query professional appointments with relations and return `AppointmentResponse[]` using `toAppointmentResponses`.
- Return `403` when no active membership belongs to that user and business.

- [x] Extend staff repository query to return active employee membership IDs within one business.
- [x] Add an appointments repository query for those membership IDs with `APPOINTMENT_RELATIONS`, preserving start-time order and date/limit filters.
- [x] Update agenda query/controller/handler to require and enforce business scope, then map to the existing response contract.
- [x] Run API build and confirm compilation succeeds (`npm run build`; `pnpm` is unavailable in the environment).

### Task 2: Add the frontend professional agenda service method

**Files:**
- Modify `Agendaqui/src/services/api/appointments.ts`
- Modify `Agendaqui/src/lib/mock/handlers.ts`

**Interfaces:**
- `appointmentsApi.listProfessionalAgenda({ businessId, dateFrom, dateTo, limit? }): Promise<Appointment[]>`
- Use the existing `RawAppointment` → `toAppointment` adapter and response interceptor conventions.

- [x] Add the typed method using `/me/agenda` and the scoped query parameters.
- [x] Add mock handling for `/me/agenda` with the same active membership and business filtering.
- [x] Run `npm run build` in `Agendaqui` and confirm compilation succeeds.

### Task 3: Build the professional dashboard and scope the appointments calendar

**Files:**
- Modify `Agendaqui/src/pages/dashboard.tsx`
- Create `Agendaqui/src/pages/professional-dashboard.tsx`
- Modify `Agendaqui/src/pages/appointments.tsx`
- Modify `Agendaqui/src/components/appointments/appointment-actions.tsx`

**Interfaces:**
- `/dashboard` renders the new page only when `activeMode === 'PROFESSIONAL'`; existing management view remains intact otherwise.
- `/appointments` uses the professional agenda query in professional mode and existing business query otherwise.

- [x] Add the professional dashboard summary and chronological today/next-seven-days schedule, with loading, error, empty, and appointment-action states.
- [x] Use the active business and current professional membership context in TanStack Query keys and request parameters.
- [x] Make the existing calendar page use the scoped professional source in professional mode without changing owner/manager behavior.
- [x] Hide management navigation, global search, and appointment-creation shortcuts in professional mode.
- [x] Run `npm run build` in `Agendaqui` and confirm compilation succeeds.

### Task 4: Add the manager operations dashboard

**Files:**
- Create `Agendaqui/src/pages/manager-dashboard.tsx`
- Modify `Agendaqui/src/pages/dashboard.tsx`
- Modify `Agendaqui/src/components/layout/dashboard-layout.tsx`

**Interfaces:**
- Dashboard selection order: `activeMode === 'PROFESSIONAL'` → employee; `activeMembership.role === 'MANAGER'` → manager; otherwise → owner.
- Manager view uses `appointmentsApi.listBusiness` and `staffApi.listByBusiness` for the active business, and exposes agenda, team, services, and support navigation.

- [x] Add manager operational cards for today's appointments, pending confirmations, and active professionals, plus the team timeline and links to agenda/team/services.
- [x] Select manager dashboard using the active membership role; preserve the owner dashboard path.
- [x] Hide owner-only sections and search in manager mode; limit navigation to manager operations and support.
- [x] Run `npm run build` in `Agendaqui` and confirm compilation succeeds.
