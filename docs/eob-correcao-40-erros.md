# CORREÇÃO CIRÚRGICA — 40 ERROS TYPESCRIPT PRÉ-EXISTENTES

> Projeto: `agendaqui-web` — Validação: 21/09/2026
> Documento de retorno para a EOB sobre a correção dos 40 erros TS identificados em `docs/eob-investigacao-40-erros.md`.

---

## 1. SÍNTESE

| Métrica | Antes | Depois |
|---|---|---|
| `npm run typecheck` (`tsc -b`) | exit 2 — 40 erros | **exit 0** |
| `npm run build` (`tsc -b && vite build`) | exit 2 — falha no tsc (vite não rodava) | **exit 0** — bundle completo gerado (1878 módulos) |
| `npm run lint` (oxlint) | exit 0 — 7 warnings (imports não usados) | **exit 0** — 3 warnings (hints do plugin react, pré-existentes) |

Nenhum `any`, cast, `@ts-ignore` ou `@ts-expect-error` foi adicionado. Nenhuma regra foi desativada. Nenhum buildinfo/cache foi manipulado.

---

## 2. ALTERAÇÕES REALIZADAS

### RAIZ A — Contrato do componente `Input` (27 erros eliminados)

Arquivo: `src/components/ui/input.tsx`

- `error?: boolean` → `error?: string | boolean`.
  - **Evidência:** as 23 páginas passam `error={errors.X?.message}` (string). O render já tratava string (`typeof error === 'string'`); apenas o contrato de tipo era errado. O uso como flag booleana para `border-destructive` continua funcionando (string truthy/falsy).
- Adicionado `label?: string` à interface, destructure e render:
  - `{label && <label className="label">{label}</label>}` antes do `<input>`.
  - **Evidência:** as páginas já passavam `label="..."` (booking, businesses.new) — o prop era **silenciosamente descartado** no runtime (não ia ao `<input>`). A classe `.label` já existe em `src/index.css:90` (`display:block`), mesmo padrão usado manualmente em register/settings/etc.
  - **Verificação de não-duplicação:** campos com `<Input label>` (booking 383/389, businesses.new e services.new) **não** possuem `<label className="label">` manual acima; os labels manuais existentes (register, settings, selects/textarea de businesses.new e services.new) pertencem a campos que **não** passam `label` ao `Input`. Nenhuma duplicação introduzida.

### RAIZ B — `businessSchema`/resolver (5 erros eliminados)

**Sub-causa C3 (lat/long — 2 × TS2339), arquivo `src/pages/businesses.new.tsx`:**
- Removidas do payload de criação: `latitude: data.latitude || undefined` e `longitude: data.longitude || undefined`.
  - **Evidência:** `businessSchema` não declara `latitude/longitude`; `setValue` nunca os preenche (grep: apenas cep/street/neighborhood/city/state/document/phone). Não há geocodificação implementada. `latitude?: number`/`longitude?: number` são **opcionais** no contrato de `businessesApi.create` — chaves `undefined` nem são serializadas por `JSON.stringify`, então o payload de wire é **idêntico** ao de antes (campos apenas omitidos).

**Sub-causa C5 (Resolvida na raiz — 3 erros: 1 × TS2322 Resolver + 2 × TS2345 handleSubmit), arquivo `src/lib/validations.ts`:**
- `timezone: z.string().default('America/Sao_Paulo')` → `timezone: z.string()` (somente no `businessSchema`, linha 34).
  - **Causa exata (apresentação):** em Zod v4, `.default()` diverge os tipos de entrada e saída: `z.input` = `timezone?: string`, `z.output` = `timezone: string`. Como `BusinessFormData = z.infer<...>` (output) e o `zodResolver` tipa o form com `z.input`, o `Resolver` retornado era incompatível com `useForm<BusinessFormData>` → TS2322 em `zodResolver(businessSchema)` e os TS2345 em `handleSubmit(onSubmit)`/`handleSubmit` como cascata.
  - **Por que é seguro remover:** o `useForm<BusinessFormData>` em `businesses.new.tsx` **já declara** `defaultValues: { timezone: 'America/Sao_Paulo', ... }`. O valor default da UI não dependia do schema. Com `z.string()`, `input == output == timezone: string` → o `Resolver` se alinha a `BusinessFormData` e ambos os `handleSubmit` se alinham. Comportamento de formulário inalterado.
  - O `locationSchema` (linha 46, mesmo `.default()`) **não foi alterado**: não é usado com `zodResolver` em nenhuma página (grep: register/settings/services.new/businesses.new/staff.new/login) — correção mínima.

### RAIZ C — `AuthContext` sem `register` (1 erro eliminado — gap de funcionamento)

Arquivo: `src/app/providers/auth.tsx`

- Interface `AuthContextType` + implementação + value do provider:
  - `register: (name: string, email: string, password: string, phone?: string) => Promise<void>`
- Implementação delegando a serviço já existente (mesmo padrão de `login`/`logout`):
  - `await usersApi.create(name, email, password, phone)`
  - Import ajustado: `import { authApi, usersApi } from '@/services/api'` (`usersApi` já era exportado em `src/services/api/index.ts`).
  - **Evidência:** `usersApi.create` (`src/services/api/auth.ts:74`) faz `POST users` com `{ name, email, password, phone }` — mesmo contrato que `register.tsx` espera. Nenhum endpoint novo, nenhuma alteração de backend, nenhuma duplicação de lógica.
  - **Impacto:** antes, `registerUser is not a function` ao abrir `/register` (crash); depois, fluxo de `/register` completo passa a funcionar (registro → `toast.success('Conta criada!')` → já cobre 'already exists').

### RAIZ D — 7 imports órfãos (7 erros eliminados — TS6133)

Arquivos removidos (confirmado por `grep`: cada símbolo ocorria apenas no import de seu arquivo):

| Arquivo | Símbolo removido |
|---|---|
| `src/pages/booking/index.tsx` | `User`, `Phone` |
| `src/pages/businesses.new.tsx` | `Loader2` |
| `src/pages/forgot-password.tsx` | `CalendarDays` |
| `src/pages/home.tsx` | `Check` |
| `src/pages/login.tsx` | `Loader2` |
| `src/pages/staff.tsx` | `Users` |

---

## 3. ERROS ELIMINADOS (40/40)

- **Raiz A:** 27 (23 × `string→boolean` + 4 × `InputProps.label`). **0 restantes.**
- **Raiz B:** 5 (2 × TS2339 lat/long + 1 × TS2322 Resolver + 2 × TS2345 handleSubmit). **0 restantes.**
- **Raiz C:** 1 (TS2339 `register`). **0 restantes.**
- **Raiz D:** 7 (TS6133). **0 restantes.**

**Total eliminado: 40/40.** Nenhum erro novo introduzido.

---

## 4. ERROS RESTANTES

- TypeScript: **zero** (typecheck e build exit 0).
- Lint: **3 warnings** do plugin react, todos pré-existentes e **não associados** a esta correção:
  - `auth.tsx:91` `only-export-components` (padrão `useAuth` compartilhando contexto — pré-existente).
  - `auth.tsx:41` `set-state-in-effect` (efeito de carregamento de sessão — pré-existente).
  - `businesses.new.tsx:92` `incompatible-library` (API de cep que não memoiza — pré-existente, linha deslocada pela remoção do payload).
- Os 7 warnings de imports não usados **foram eliminados** junto com a Raiz D (eram a mesma causa).

---

## 5. VALIDAÇÃO

Comandos executados (na ordem):

```
npm run typecheck   → exit 0   (antes: exit 2, 40 erros)
npm run build       → exit 0   (antes: exit 2; agora gera bundle de produção completo)
npm run lint        → exit 0   (antes: exit 0, 7 warnings; agora 3 warnings)
```

Comparação antes/depois registrada acima (seções 1 e 3). O `build` voltou a gerar `dist/` completo (`vite built in 15.15s`, 1878 módulos).

---

## 6. RISCOS E MITIGAÇÕES

| Risco | Avaliação |
|---|---|
| `Input.error` agora aceita `boolean` | Nenhum chamador usa `error` booleano puro hoje (todos passam `string`). Comportamento de borda/flag inalterado. |
| `Input.label` renderizado internamente | Visual idêntico ao padrão manual (classe `.label`). Verificado: sem duplicação de labels em nenhuma página. |
| Remoção de `latitude/longitude` do payload | Campos opcionais no contrato; `undefined` não serializado → wire payload idêntico. Sem regressão de backend. |
| Remoção do `.default()` do timezone | `defaultValues` do `useForm` cobre o default; `BusinessFormData.timezone` continua `string` (output inalterado). `locationSchema` intocado. |
| Provider `register` criado | Delega a `usersApi.create` (contrato `POST /users` existente). Sem estado novo, sem duplicação. |
| Imports removidos | Todos confirmados órfãos por grep (1 ocorrência = o próprio import). |

---

## 7. DECISÕES TOMADAS

1. **C3 (lat/long):** remover os campos-fantasma do payload em vez de adicionar `latitude/longitude` ao schema — a funcionalidade não existe e seria anti-simples adicionar campos fictícios só para eliminar TS2339.
2. **C5 (resolver):** corrigir a raiz da divergência (`.default()` redundante) em vez de aplicar `zodResolver` config ou casts ao `Resolver`. O default real vem de `defaultValues`.
3. **C1/C2:** corrigir o **contrato do componente** (`Input`) para refletir o uso real, sem editar as 8 páginas.
4. **C4 / Raiz C:** expor `register` no provider delegando ao serviço já existente, sem criar endpoint ou duplicar lógica de cadastro.
5. **Raiz D:** remoção direta dos imports (sem reexporta-los para "engolir" warning).

---

## 8. IMPACTO FUNCIONAL

- `/register` deixa de crashar e passa a funcionar de ponta a ponta (raiz C).
- Contrato de criação de negócio: inalterado no wire (lat/long omitidos, opcionais).
- UI de formulários com `label` (booking, businesses.new, services.new): agora exibe o título do campo (antes era silenciosamente omitido).
- Demais 33 erros eram puramente tipográficos/contratuais: sem mudança de comportamento.