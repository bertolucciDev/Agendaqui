# PDV por unidade Implementation Plan

> **For agentic workers:** Use this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add owner-managed products and per-location inventory, plus a point of sale where employees and managers can record sales in their active location.

**Architecture:** Add a NestJS POS module using the existing CQRS and Prisma repository conventions. Product definitions belong to a business; inventory, sales, and inventory movements are location-scoped. A sale validates authorization, current prices, and stock and commits sale items, stock deductions, and audit movements in one database transaction. The React app adds an owner product-management screen and a role-scoped POS screen using typed API services, TanStack Query, and existing workspace context.

**Tech Stack:** NestJS, CQRS, Prisma, PostgreSQL, React, TypeScript, React Router, TanStack Query, existing API client and UI primitives.

**Spec:** `docs/superpowers/specs/2026-11-20-point-of-sale.md`

## Global Constraints

- Money is stored as integer cents.
- Product catalog belongs to a business; inventory belongs to a product/location pair.
- Reuse the existing `Business.sellsProducts` flag to activate the POS; do not add a duplicate setting.
- Only business owners manage products and inventory; active `EMPLOYEE` and `MANAGER` memberships can sell at their authorized location.
- The API resolves seller identity and scope from authenticated session and active membership; it never trusts client-supplied totals or seller IDs.
- No stock may go negative; checkout and all stock movements are atomic.
- Sales preserve item name and price snapshots; product removal is soft deactivation.
- No fiscal document, payment gateway, refunds, barcodes, or customer PII in in-person sales in this release.
- Create migrations for review; do not apply them to production without separate authorization.

## Review Focus

- Tampered business, location, membership, or product IDs must be rejected by server authorization and ownership checks. Pin in product/inventory and sale handler tests.
- Two checkouts competing for the final unit must not create a negative balance or partial sale. Pin in the sale transaction integration test.
- A product's stock in one location must not affect another location. Pin in inventory query and sale tests.
- Client-submitted prices/totals and later product edits must not change the authoritative checkout amount or historical sale snapshots. Pin in sale handler tests.
- Inactive or zero-stock products must not be sellable; zero-stock active products remain visible with a clear unavailable state. Pin in catalog API and POS UI tests.

---

### Task 1: Persist products, location inventory, sales, and stock movements

**Files:**
- Modify: `agendaqui-api/prisma/schema.prisma`
- Create: `agendaqui-api/prisma/migrations/<timestamp>_add_pos_inventory_sales/migration.sql`
- Modify: `agendaqui-api/src/modules/app/app.module.ts`
- Create: focused schema/repository tests in `agendaqui-api/src/modules/pos/`

**Interfaces:**
- `Product`: business ID, name, optional SKU/description, price cents, active flag, timestamps.
- `LocationInventory`: product ID, location ID, integer quantity, unique `(productId, locationId)`.
- `Sale`: business ID, location ID, seller membership ID, total cents, payment method (`CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `PIX`), created timestamp.
- `SaleItem`: sale ID, optional product ID, snapshot name/price cents, quantity and subtotal cents.
- `InventoryMovement`: product/location, kind (`STOCK_IN`, `ADJUSTMENT`, `SALE`), signed quantity delta, resulting quantity, actor user ID, optional sale ID, reason, created timestamp.

- [ ] Add Prisma models, relations, unique constraints, nonnegative quantity constraint, and indexes for business/location/time lookups.
- [ ] Add the migration and verify it matches the schema without applying it to production.
- [ ] Add `PosModule` to `AppModule`; keep CQRS command/query handlers in the new module.
- [ ] Test model constraints: duplicate inventory pair is rejected and zero/positive quantities are accepted while negative quantities are rejected.
- [ ] Run: `cd agendaqui-api && npm test -- --runInBand src/modules/pos`
- [ ] Run: `cd agendaqui-api && npm run build`

### Task 2: Owner product catalog and inventory API

**Files:**
- Create: `agendaqui-api/src/modules/pos/presentation/controllers/products.controller.ts`
- Create: `agendaqui-api/src/modules/pos/presentation/controllers/inventory.controller.ts`
- Create: DTOs, CQRS commands/queries/handlers, domain repository contracts and Prisma adapters under `agendaqui-api/src/modules/pos/`
- Modify: `agendaqui-api/src/modules/pos/pos.module.ts`

**Interfaces:**
- `GET /businesses/:businessId/products` returns active and inactive products to the owner.
- `POST /businesses/:businessId/products` accepts `{ name, sku?, description?, priceCents }` and creates an active product.
- `PATCH /businesses/:businessId/products/:productId` accepts `{ name?, sku?, description?, priceCents?, active? }`.
- `GET /businesses/:businessId/inventory?locationId=...` returns products with that location's quantities.
- `POST /businesses/:businessId/inventory/movements` accepts `{ productId, locationId, kind, quantity, reason }`; quantity is positive for stock-in and signed only for adjustment. Sale movements are internal-only.

- [ ] Write owner/foreign-business authorization tests for product CRUD and inventory reads/writes.
- [ ] Implement handlers using the existing business owner lookup and return established API response shapes.
- [ ] Persist every stock adjustment and its resulting balance atomically; reject a product/location belonging to another business and reject negative resulting stock.
- [ ] Test catalog creation/update/deactivation, per-location stock isolation, and inventory movement history.
- [ ] Run focused POS tests and `cd agendaqui-api && npm run build`.

### Task 3: Authorized catalog and atomic sale API

**Files:**
- Create: `agendaqui-api/src/modules/pos/presentation/controllers/me-pos.controller.ts`
- Create: sale/catalog DTOs, handlers, repository contracts, and Prisma transaction adapter under `agendaqui-api/src/modules/pos/`
- Modify: `agendaqui-api/src/modules/pos/pos.module.ts`

**Interfaces:**
- `GET /me/pos/catalog?businessId=...&locationId=...` resolves and validates the caller's active membership at that location; returns active products, prices, and local balances.
- `POST /me/pos/sales` accepts `{ businessId, locationId, items: [{ productId, quantity }], paymentMethod }`; the supplied location is only a selector and must match the caller's active membership. No seller ID, item price, or total is accepted from the client.
- `GET /businesses/:businessId/sales?page=...&limit=...&locationId?=...&dateFrom?=...&dateTo?=...` returns owner-only paginated history with item snapshots.

- [ ] Test that employee and manager memberships can query/sell only in their active authorized location and owner/nonmembers/other-business IDs cannot use `/me/pos`.
- [ ] Implement catalog query with `Business.sellsProducts` enforcement, active products, and location inventory, including zero-stock products.
- [ ] Implement checkout transaction: derive membership, validate product business and active status, use current DB prices, conditionally decrement each location balance, create sale/items/movements, and roll back all writes if any item fails.
- [ ] Test forged totals are ignored, inactive/insufficient items reject, two checkouts cannot oversell, and snapshots remain stable after product price/name changes.
- [ ] Test owner-only sales history pagination and location/date filters.
- [ ] Run focused POS tests and `cd agendaqui-api && npm run build`.

### Task 4: Typed frontend API and mock contract

**Files:**
- Create: `Agendaqui/src/services/api/pos.ts`
- Modify: `Agendaqui/src/services/api/index.ts`
- Modify: `Agendaqui/src/types/index.ts` (or a focused `src/types/pos.ts` exported from it)
- Modify: `Agendaqui/src/lib/mock/handlers.ts`

**Interfaces:**
- `PosProduct`, `LocationInventory`, `PosCartItem`, `PaymentMethod`, `Sale`, and `SaleItem` mirror the API response DTOs.
- API methods: `listProducts`, `createProduct`, `updateProduct`, `listInventory`, `adjustInventory`, `getCatalog`, `createSale`, `listSales`.
- Sale input is `{ businessId, items: Array<{ productId: string; quantity: number }>, paymentMethod: PaymentMethod }`.

- [ ] Add contract tests for envelope unwrapping, query parameters, and sale payload (no client totals or identity fields).
- [ ] Implement typed requests and mock responses, including location-specific stock and insufficient-stock behavior.
- [ ] Run focused frontend tests, `cd Agendaqui && npm run typecheck`, and `npm run build`.

### Task 5: Owner product, stock, and sales screen

**Files:**
- Create: `Agendaqui/src/pages/products.tsx`
- Modify: `Agendaqui/src/App.tsx`
- Modify: `Agendaqui/src/components/layout/dashboard-layout.tsx`
- Reuse: existing product form, table, dialog, select, and UI primitives where available.

**Interfaces:**
- Route: `/products`, accessible only in the owner workspace.
- Sidebar label: `Produtos`.
- Product form fields: name, optional SKU/description, price; stock is managed separately by selected location.
- Inventory adjustment action: product, location, movement kind, positive quantity (or signed adjustment), required reason.
- Sales history: paginated, date/location filter, item snapshots, totals and payment method.

- [ ] Test owner route visibility and ensure employee/manager direct navigation is denied/redirected.
- [ ] Implement product list/create/edit/deactivate, the existing `sellsProducts` activation toggle, and per-location inventory adjustments with query invalidation.
- [ ] Implement basic paginated sale history using server responses.
- [ ] Test empty/loading/error states and that changing a product does not rewrite rendered historical sale snapshots.
- [ ] Run focused frontend tests, `cd Agendaqui && npm run typecheck`, and `npm run build`.

### Task 6: Employee and manager point-of-sale screen

**Files:**
- Create: `Agendaqui/src/pages/pos.tsx`
- Modify: `Agendaqui/src/App.tsx`
- Modify: `Agendaqui/src/components/layout/dashboard-layout.tsx`

**Interfaces:**
- Route: `/pos`, visible to `activeMode === 'PROFESSIONAL'` and `activeMembership.role === 'MANAGER'` only.
- Sidebar entry appears only for those roles when `sellsProducts` is active and `GET /me/pos/catalog` returns at least one active product for the active location.
- Catalog query passes active business and location IDs; the server validates both against the caller's active membership.
- Cart state contains product ID and quantity only; the server remains authoritative for price and total.
- Checkout form captures `CASH | CREDIT_CARD | DEBIT_CARD | PIX` and renders the returned sale confirmation.

- [ ] Test navigation visibility for employee, manager, owner, empty catalog, and loading/error catalog states.
- [ ] Implement catalog search, quantity selection, cart totals from current catalog display, checkout payment choice, and confirmation.
- [ ] On checkout success invalidate catalog/inventory and sales queries; on insufficient stock refresh catalog and retain cart with an actionable message.
- [ ] Test empty catalog, zero stock, empty cart, rejected checkout, and successful confirmation.
- [ ] Run focused frontend tests, `cd Agendaqui && npm run typecheck`, and `npm run build`.

### Task 7: Cross-layer verification and migration review

**Files:**
- Modify only failures uncovered in earlier tasks.
- Review: `agendaqui-api/prisma/migrations/<timestamp>_add_pos_inventory_sales/migration.sql`

- [ ] Run API POS unit/integration tests and frontend POS tests.
- [ ] Run `cd agendaqui-api && npm run build` and `cd Agendaqui && npm run build`.
- [ ] Review migration for constraints, indexes, and safe defaults; confirm no production command was run.
- [ ] Walk the acceptance checklist in `docs/superpowers/specs/2026-11-20-point-of-sale.md` with mock/local development data.
- [ ] Report any runtime behavior that could not be checked without credentials or a running browser/database.
