# Dashboard e fluxo da conta de suporte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma área separada para `SUPPORT`, com lookup somente leitura de usuários por e-mail exato.

**Architecture:** O frontend consulta `/me/admin-profile` para rotear cada perfil de plataforma e fornece uma dashboard `/support`. O backend adiciona `POST /support/users/lookup`, protegido por `SUPPORT`, reaproveitando `UserRepository.findByEmail` e expondo somente campos mínimos.

**Tech Stack:** React, React Router, TanStack Query, TypeScript, NestJS CQRS, class-validator, Prisma via repositório existente.

**Spec:** `docs/superpowers/specs/2026-11-18-support-account-flow.md`

## Global Constraints

- Apenas `SUPPORT` pode chamar o endpoint de lookup.
- A consulta não pode alterar conta ou expor telefone, dados de negócio, documentos ou pedidos LGPD.
- Não adicionar tabelas/migrations nem novas dependências.
- Preservar os fluxos de login e roteamento de `ADMIN`, `SUPER_ADMIN` e usuários comuns.

## Review Focus

- Conta comum tentando abrir `/support` → deve retornar para `/dashboard`.
- Perfil `SUPPORT` abrindo `/admin` → deve ser redirecionado para `/support`.
- `ADMIN`/`SUPER_ADMIN` abrindo `/support` → devem retornar para `/admin`.
- Busca sem correspondência → exibir estado sem resultado sem expor se houve erro interno.
- E-mail inválido ou contendo espaços → rejeitar/normalizar antes do lookup.

### Task 1: Role routing and support shell

**Files:** `src/App.tsx`, `src/components/layout/admin-guard.tsx`, new role guard, support guard/layout, support dashboard.

- [ ] Load admin profile once through TanStack Query and route support and admin levels to their own areas.
- [ ] Add `/support` under protected routes independent from business workspace.
- [ ] Build the support shell and account lookup states without admin-only navigation.
- [ ] Verify all role routing and compile the frontend.

### Task 2: Restricted account lookup API

**Files:** new support module/controller/DTO/query/handler/contract; `src/modules/app/app.module.ts`; frontend support service/types.

- [ ] Add a validated email-only request and `@Roles('SUPPORT')` controller.
- [ ] Resolve exact normalized email through `UserRepository.findByEmail` and return only the allowlisted account fields or `null`.
- [ ] Register the support module and connect the frontend lookup.
- [ ] Verify API and frontend compilation and manually review the role boundary and response shape.
