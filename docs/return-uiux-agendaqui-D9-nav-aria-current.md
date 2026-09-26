# RETURN — UI/UX AGENDAQUI D9 — NAV ACTIVE STATE / ARIA-CURRENT

## RESUMO EXECUTIVO
A navegação principal (à esquerda, desktop e mobile) agora expõe `aria-current="page"` **somente no item da rota ativa**. O atributo é derivado de `location` (React Router), portanto **atualiza ao vivo ao navegar** no SPA (visto em teste real de clique: migra do item anterior para o novo sem reload). Visual, ordem dos itens, business switcher e autorização preservados.

## CAUSA
O `dashboard-layout` já coloria o item ativo (isActive visual), mas não expunha o estado de forma semântica (`aria-current`). Leitores de tela não sabiam qual item correspondia à página atual.

## ARQUIVOS ALTERADOS
- `src/components/layout/dashboard-layout.tsx` — adicionado `aria-current={isActive ? 'page' : undefined}` no `Link` do item de navegação (única rota ativa por vez); reindentação do bloco `nav`.

## DIFF (essência, artefato D9)
```diff
               {navItems.map((item) => {
                 const isActive =
                   location.pathname === item.to || location.pathname.startsWith(item.to + '/')
-
                 return (
                   <Link
                     key={item.to}
                     to={item.to}
                     onClick={() => setSidebarOpen(false)}
+                    aria-current={isActive ? 'page' : undefined}
                     className={cn(
                       'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                       isActive
```

## VALIDAÇÃO (Playwright real + axe; viewport 390×844, produção `agendaqui-delta.vercel.app`)
Procedimento honesto: como `/dashboard/*` redireciona para as rotas reais (`/staff`, `/appointments`, etc.), a validação navegou **clicando nos itens reais do `<nav>`** (não por URL hardcoded), verificando `aria-current` no DOM resultante:

| Ação | Path resultante | `aria-current="page"` no nav | Resultado |
|---|---|---|---|
| clamp inicial (Dashboard) | `/dashboard` | `["Dashboard"]` | 1 ativo ✓ |
| SPA clique "Equipe" | `/staff` | `["Equipe"]` (migrou do Dashboard) | único, atualiza ✓ |
| SPA clique "Agendamentos" | `/appointments` | `["Agendamentos"]` | único ✓ |
| SPA clique "Negócios" | `/dashboard/businesses` → SPA | `["Negócios"]` | único ✓ |
| SPA clique "Configurações" | footer (fora do nav) | (sem aria-current — correto, não é item do nav) | ✓ |

Regra satisfeita: **todos os itens ativos = exatamente 1**, e o atributo **some do item anterior e aparece no novo** ao navegar.

## GATES
- `tsc -b` (typecheck): **PASS**
- `oxlint`: **PASS**
- `vite build --outDir dist-vercel`: **PASS**

## REGRESSÕES (axe real pós-deploy — landmark/region, para garantir que nada foi quebrado)
```
  /login → []   /register → []   /dashboard → []   /appointments → []
  /staff → []   /dashboard/businesses → []   /dashboard/settings → []
  /dashboard → [] (heading-order)   /book/barbearia-elite → []
```
Nenhuma regressão introduzida: landmarks/headings do D8 continuam **zerados**.

## MOCK / REGRAS
- `MOCK PRESERVADO` — nenhuma chamada real a API; validação em produção usa o mock do deploy.
- Nenhuma regra de negócio alterada; autorização idx lambda removida (não-executável pelo mock) preservada por segurança.

## VEREDITO
`D9 ARIA-CURRENT CORRIGIDO E VALIDADO`
