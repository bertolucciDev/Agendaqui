import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios/client'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<Category[]>('categories')
      return data
    },
  })

  const grouped = useMemo(() => {
    const list = categories ?? []
    return {
      parents: list.filter((c) => !c.parentId),
      children: list.filter((c) => c.parentId),
    }
  }, [categories])

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; slug: string }) =>
      apiClient.post('categories', payload),
    onSuccess: () => {
      notify.success('Categoria criada!')
      setNewName('')
      setNewSlug('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
    onError: (e: any) => notify.error(e?.message ?? 'Erro ao criar categoria'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`categories/${id}`),
    onSuccess: () => {
      notify.success('Categoria removida!')
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
    onError: (e: any) => notify.error(e?.message ?? 'Erro ao remover categoria'),
  })

  return (
    <div>
      <PageHeader>
        <PageTitle>Categorias</PageTitle>
      </PageHeader>

      <PageContent>
        <div className="mb-8 rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Nova Categoria</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Nome (ex: Beleza)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Slug (ex: beleza)"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (!newName.trim() || !newSlug.trim()) return
                createMutation.mutate({ name: newName, slug: newSlug })
              }}
              disabled={!newName.trim() || !newSlug.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Criar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : grouped.parents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.parents.map((cat) => (
              <div key={cat.id} className="rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.slug}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {grouped.children
                  .filter((c) => c.parentId === cat.id)
                  .map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between border-t border-border px-4 py-3 pl-8"
                    >
                      <div>
                        <p className="text-sm text-foreground">{child.name}</p>
                        <p className="text-xs text-muted-foreground">{child.slug}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(child.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!deleteId}
          title="Remover categoria?"
          description="Esta ação não pode ser desfeita."
          confirmLabel="Remover"
          variant="destructive"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      </PageContent>
    </div>
  )
}
