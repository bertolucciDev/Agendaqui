# Support Notifications and Settings Implementation Plan

> Implement in this session. Do not add dependencies, backend endpoints, or database migrations.

**Goal:** Add a support-area bell that opens waiting tickets and a support settings route with profile and sound preferences.

**Architecture:** Reuse the existing support queue API and Socket.IO events. Route bell selections to the support dashboard with a ticket query parameter so its existing conversation modal opens. Reuse the general settings screen and extend the current browser-local notification preferences with a support ticket sound flag.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Socket.IO client, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-11-19-support-notifications-settings.md`

## Global Constraints

- Do not change API or database schema.
- Keep notification state browser-local and disclose this in settings.
- Sound requires browser user activation; do not attempt autoplay before a user gesture.
- Keep all links and ticket interactions inside the support route.

## Review Focus

- Empty queue shows zero badge and an empty-state message.
- Socket create/update events refresh the bell list and badge.
- Ticket click opens the correct conversation and close clears the URL parameter.
- Disabled sound produces no beep; enabled sound becomes available after user interaction.
- Existing profile/security settings continue working at `/support/settings`.

### Task 1: Bell and direct ticket navigation

**Files:**
- Create `src/components/support/support-notification-bell.tsx`
- Modify `src/components/layout/support-layout.tsx`
- Modify `src/pages/support/dashboard.tsx`

- [x] Fetch the first five OPEN tickets and refresh that query on support ticket create/update events.
- [x] Render an accessible top-right bell with OPEN count and a dropdown ticket list.
- [x] Navigate to `/support?ticketId=<id>` on selection and synchronize modal open/close with that parameter.
- [x] Build the frontend.

### Task 2: Support account settings and persistent sound toggle

**Files:**
- Modify `src/lib/notification-preferences.ts`
- Modify `src/hooks/use-notification-sound.ts`
- Modify `src/pages/settings.tsx`
- Modify `src/components/layout/support-layout.tsx`
- Modify `src/App.tsx`

- [x] Add a browser-local `supportTicketSound` preference, default enabled, while preserving old stored preference values.
- [x] Make the sound hook prepare Web Audio on a user gesture and play only when the preference is enabled.
- [x] Add the sound preference to settings only in support mode and explain its device-local/browser gesture behavior.
- [x] Add `/support/settings`, reuse account profile/security controls, and add a Settings navigation link.
- [x] Build the frontend.
