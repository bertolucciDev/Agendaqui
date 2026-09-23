# VALIDAÇÃO TÉCNICA — FASE 0 (agendaqui-web)

> Comandos executados em cadeia limpa (node_modules reinstalado por `npm ci`).
> Resultado final: **Fase 0 NÃO VALIDADA — o build falha com 46 erros TS reais em src/.**
> Otypecheck (tsc --noEmit) é um **falso-verde**: usa o tsconfig raiz com `"files":[]`,
> logo compila zero arquivos e sempre retorna exit 0 independente do código.

---

## 1. Ambiente

```text
Node:             v20.19.2
npm:              9.2.0
SO/ambiente:      Linux
diretório:        /home/inetserver/agendaqui-web
engine (pkg):     ausente (sem campo engines)
packageManager:   ausente no package.json
```

## 2. Instalação (npm ci — 2x, node_modules removido antes de cada uma)

```text
Comando:     npm ci           (após `rm -rf node_modules`)
Resultado:   added 176 packages, audited 177, 0 vulnerabilities
Exit code:   0
```

```text
Comando:     npm ci  (2ª vez, pós `rm -rf node_modules`, à pedido)
Resultado:   added 176 packages, audited 177, 0 vulnerabilities
Exit code:   0
```

Sem erros. Dependências instaláveis; lockfile consistente.

## 3. Typecheck — FALSO-VERDE (não é validação real)

```text
Comando:     npm run typecheck  →  tsc --noEmit
Resultado:   exit 0  (mas NÃO checa código)
Classificação: CONFIRMADO — no-op
Causa:      tsconfig.json (raiz) = { "files": [], "references": [...] }
            → `tsc --noEmit` sem -b com `files:[]` compila 0 arquivos.
Evidência:  46 erros TS do build NÃO aparecem aqui.
Impacto:    CI "verde" engana; gate sozinho não protege nada.
```

## 4. Lint (oxlint)

```text
Comando:     npm run lint  →  oxlint
Resultado:   exit 1
Erros:       0  (nenhum arquivo de src/ com error)
Warnings:    1500+ — TODOS em dist-mobile/assets/*.js (bundle minificado gerado)
Causa:       oxlint varre dist-mobile (artefato gerado) — sem ignore no .oxlintrc.
Classificação: CONFIRMADO (ambiental, não é regressão de código Fase 0)
```

Nota: `grep` de `error` em src/ = 0; 100% dos avisos são do bundle `dist-mobile/assets/index-C5IRbn_t.js` (linhas 83+, código minificado), pertencente ao build, não ao código-fonte.

## 5. Build (tsc -b && vite build) — FALHA

```text
Comando:     npm run build  (tsc -b && vite build)
Resultado:   FALHOU na etapa tsc -b
Exit code:   2
Erros TS:    46  (todos reais, src/ — confirmados em build LIMMPO, sem cache tsbuildinfo)
Warnings:    0
Etapa:       typecheck incremental (tsc -b) — vite build NÃO chegou a rodar
```

## 6. Testes existentes

```text
npm run typecheck   → tsc --noEmit        (falso-verde, ver §3)
npm run lint        → oxlint
npm run build       → tsc -b && vite build  ← AIRONA real que FALHA
npm run dev/preview → vite / vite preview
(Não há script "test" definido em package.json.)
```

---

## 7. Arquivos da Fase 0

### src/services/api/appointments.ts — FASE 0 ✅ aplicado, MAS com erros TS
```text
Existe:    sim
Compila:   NÃO — 5 erros
Linhas:    (4,8) TS6133 StoredBusiness não usado
           (9,3) TS2305 @/types não exporta AppointmentTransition
           (9,3) TS6196 AppointmentTransition declarado e não usado
           (14,7) TS6133 getBusinessId declarado e não usado
           (28,3) TS2353 'professionalName' não existe em AvailableSlot
```

### src/services/api/businesses.ts — FASE 0 ✅ aplicado, MAS 1 erro TS
```text
Existe:    sim
Compila:   NÃO — linha (77,42) TS2304: Cannot find name 'PaginatedResponse'
Causa:     usa PaginatedResponse sem importar de @/types (e o helper não é
           exportado pelo módulo de tipos).
```

### src/pages/booking/index.tsx — erros PRÉ-EXISTENTES (não Fase 0)
```text
Existe:    sim
Linhas:    (10,3)/(11,3) TS6133 User/Phone sem uso; (385/391) TS2322
           InputProps com campo não conhecido (pré-existente).
```

### src/pages/staff.tsx
```text
Existe:    sim
(2,28):    TS6133 'Users' declarado e não usado — pré-existente.
```

### src/pages/staff.new.tsx
```text
Existe:    sim
(86,19)/(107,19): TS2322 string→boolean (checkbox) — pré-existente.
```

### Demais (fora do escopo Fase 0, pré-existentes)
```text
businesses.new.tsx, services.new.tsx, settings.tsx, register.tsx, login.tsx,
forgot-password.tsx, home.tsx, booking/index.tsx — erros TS2322 (string → boolean
em checkbox/input) e TS6133 (imports não usados). NÃO relacionados à Fase 0.
```

---

## 8. Problemas encontrados

### P1 — Build quebra (gate principal) — CONFIRMADO
```text
Problema:  46 erros TS reais; diagnose execute `npm run build`.
Evidência: build exit 2, erros listados em §5 e §7.
Impacto:   app não compila; Fase 0 não pode ser considerada entregue.
Rel. Fase 0: 5 erros em appointments.ts + 1 em businesses.ts são DA Fase 0
             (tipos do contrato não foram sincronizados com @/types).
Correção:  NÃO ALTERAR AINDA
```

### P2 — Typecheck falso-verde — CONFIRMADO
```text
Problema:  tsc --noEmit usa tsconfig raiz com "files":[].
Evidência: exit 0 apesar de 46 erros no build.
Impacto:   CI/validação enganosa; a Fase 0 parecia "validada" sem estar.
Rel. Fase 0: diretamente — foi a forma como a Fase 0 foi reportada como ok.
Correção:  NÃO ALTERAR AINDA (candidato a fix real: apontar typecheck p/ tsconfig.app.json)
```

### P3 — Lint exit 1 por artefato dist-mobile — CONFIRMADO (ambiental)
```text
Problema:  oxlint varre dist-mobile/ gerado.
Evidência: 1500+ warnings, todos dist-mobile/assets/*.js.
Impacto:   exit 1 fake; não indica erro de código fonte.
Rel. Fase 0: nenhum.
Correção:  NÃO ALTERAR AINDA (adicionar ignore no .oxlintrc — decisão EOB)
```

### P4 — Onboarding/ônboarding bloqueado por D6 (categoria + documento) — CONFIRMADO
```text
Evidência: API exige categoryId UUID válido + CPF/CNPJ válido (probe ao vivo 400/500);
           onboarding envia categoryId:'' e document:'00000000000' → 400 garantido.
Rel. Fase 0: bloqueio D6 já catalogado no relatório anterior.
Correção:  NÃO ALTERAR AINDA
```

---

## 9. Veredito técnico
```text
NÃO VALIDADA
```
Motivos: o único gate real (build, 46 erros TS) **falha**; o typecheck é falso-verde e
não cobre o código; erro TS2305/TS2353/TS2304 em appointments.ts/businesses.ts são DA
Fase 0 (tipos de contrato não sincronizados com @/types). "VALIDADAS" está vedado, pois
typecheck e build não passam.

## 10. Próximo passo
1. EOB/owner decide: (a) sincronizar tipos de contrato (@/types) com o mapper da Fase 0
   — AppointmentTransition, AvailableSlot.professionalName, import PaginatedResponse
   (fix real de Fase 0); (b) apontar `typecheck` para tsconfig.app.json; (c) ignorar
   dist-mobile no oxlint.
2. Enquanto isso, os 40 erros TS2322/TS6133 restantes em pages/ são pré-existentes e
   devem ser tratados em lote separado (decisão EOB), não na Fase 0.
3. Reexecutar: `npm ci && npm run typecheck && npm run lint && npm run build` até exit 0.
