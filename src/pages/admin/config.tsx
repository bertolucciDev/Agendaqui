import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/services/api/admin'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidersHorizontal } from 'lucide-react'

export default function AdminConfigPage() {
  const queryClient = useQueryClient()
  const [commission, setCommission] = useState('')
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'config'],
    queryFn: adminApi.getPlatformConfig,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { commissionRateBps: number }) =>
      adminApi.updatePlatformConfig(payload),
    onSuccess: () => {
      notify.success('Configuração salva!')
      setSaving(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'config'] })
    },
    onError: (e: any) => {
      notify.error(e?.message ?? 'Erro ao salvar')
      setSaving(false)
    },
  })

  useEffect(() => {
    if (data && commission === '') {
      setCommission(String(data.commissionRateBps))
    }
  }, [data])

  const handleSave = () => {
    const value = parseInt(commission, 10)
    if (isNaN(value) || value < 0 || value > 10000) {
      notify.error('Taxa deve ser entre 0 e 10000 (0% a 100%)')
      return
    }
    setSaving(true)
    updateMutation.mutate({ commissionRateBps: value })
  }

  return (
    <div>
      <PageHeader>
        <PageTitle>Configurações da Plataforma</PageTitle>
      </PageHeader>

      <PageContent>
        <div className="max-w-xl space-y-6">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3 mb-4">
              <SlidersHorizontal className="h-5 w-5 text-primary-500" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Taxa de Comissão</h3>
                <p className="text-xs text-muted-foreground">
                  Percentual cobrado pela plataforma sobre cada agendamento.
                </p>
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Taxa (basis points)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {commission ? `${(parseInt(commission) / 100).toFixed(2)}%` : '—'}
                  </p>
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </div>
      </PageContent>
    </div>
  )
}
