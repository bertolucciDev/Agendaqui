import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Mail, Search, ShieldCheck, UserRound } from 'lucide-react'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { Input } from '@/components/ui/input'
import { supportApi } from '@/services/api/support'
import type { SupportAccountSearchItem } from '@/types/support'

const PAGE_SIZE = 20
const ACCOUNT_STATUS: Record<string, string> = {
  ACTIVE: 'Ativa',
  BLOCKED: 'Bloqueada',
  PENDING_VERIFICATION: 'Pendente de verificação',
}

export default function SupportAccountsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedAccount, setSelectedAccount] = useState<SupportAccountSearchItem | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
      setSelectedAccount(null)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  const accountsQuery = useQuery({
    queryKey: ['support-accounts', debouncedSearch, page],
    queryFn: () => supportApi.searchAccounts({ search: debouncedSearch, page, limit: PAGE_SIZE }),
    enabled: debouncedSearch.length >= 2,
  })
  const accounts = accountsQuery.data?.items ?? []
  const pageCount = Math.max(1, Math.ceil((accountsQuery.data?.total ?? 0) / PAGE_SIZE))

  function selectAccount(userId: string) {
    setSelectedAccount(accounts.find((account) => account.id === userId) ?? null)
  }

  return (
    <>
      <PageHeader><PageTitle>Contas</PageTitle></PageHeader>
      <PageContent className="mx-auto w-full max-w-4xl space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Localizar conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pesquise pelo nome ou e-mail para consultar os dados básicos da conta e os negócios relacionados.
          </p>
        </section>

        <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
          <label htmlFor="support-account-search" className="block text-sm font-medium text-foreground">
            Nome ou e-mail
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="support-account-search"
              type="search"
              autoComplete="off"
              maxLength={120}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setSelectedAccount(null)
              }}
              placeholder="Digite pelo menos 2 caracteres"
              className="pl-10"
            />
          </div>

          {search.trim().length < 2 ? (
            <p className="text-sm text-muted-foreground">Digite ao menos 2 caracteres para buscar contas.</p>
          ) : null}
          {accountsQuery.isFetching ? <p role="status" className="text-sm text-muted-foreground">Buscando contas...</p> : null}
          {accountsQuery.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível buscar contas. Tente novamente.</p> : null}

          {debouncedSearch.length >= 2 && accountsQuery.data ? (
            <>
              {accounts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
              ) : (
                <div>
                  <label htmlFor="support-account-select" className="mb-2 block text-sm font-medium text-foreground">
                    Selecione uma conta
                  </label>
                  <select
                    id="support-account-select"
                    value={selectedAccount?.id ?? ''}
                    onChange={(event) => selectAccount(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Escolha uma pessoa...</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} — {account.email} · {account.businessNames.length ? account.businessNames.join(', ') : 'Sem negócio vinculado'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {accountsQuery.data.total > 0 ? (
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{accountsQuery.data.total} conta(s) encontrada(s)</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setPage((current) => Math.max(1, current - 1)); setSelectedAccount(null) }} disabled={page <= 1 || accountsQuery.isFetching} className="btn btn-outline px-3 py-1.5 disabled:opacity-50">Anterior</button>
                    <span>Página {page} de {pageCount}</span>
                    <button type="button" onClick={() => { setPage((current) => Math.min(pageCount, current + 1)); setSelectedAccount(null) }} disabled={page >= pageCount || accountsQuery.isFetching} className="btn btn-outline px-3 py-1.5 disabled:opacity-50">Próxima</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {selectedAccount ? (
          <section aria-live="polite" className="space-y-5 rounded-xl border border-border bg-surface p-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Conta selecionada</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <AccountDetail icon={<UserRound className="h-4 w-4" />} label="Nome" value={selectedAccount.name} />
                <AccountDetail icon={<Mail className="h-4 w-4" />} label="E-mail cadastrado" value={selectedAccount.email} />
                <AccountDetail icon={<ShieldCheck className="h-4 w-4" />} label="Status" value={ACCOUNT_STATUS[selectedAccount.status] ?? selectedAccount.status} />
                <AccountDetail icon={<Building2 className="h-4 w-4" />} label="Negócios relacionados" value={selectedAccount.businessNames.length ? selectedAccount.businessNames.join(', ') : 'Nenhum negócio vinculado'} />
                <AccountDetail icon={<UserRound className="h-4 w-4" />} label="Cadastro" value={new Date(selectedAccount.createdAt).toLocaleDateString('pt-BR')} />
              </dl>
            </div>

          </section>
        ) : null}

        <p className="text-xs text-muted-foreground">
          A busca é limitada a nome, e-mail e negócios relacionados.
        </p>
      </PageContent>
    </>
  )
}

function AccountDetail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  )
}
