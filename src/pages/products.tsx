import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { Package, Plus, Pencil, Power, Warehouse } from 'lucide-react'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useWorkspace } from '@/app/providers/workspace'
import { businessesApi } from '@/services/api/businesses'
import { locationsApi } from '@/services/api/locations'
import { posApi } from '@/services/api/pos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { notify } from '@/lib/notify'
import type { InventoryMovementKind, PosProduct } from '@/types/pos'

const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const { businessId } = useActiveBusiness()
  const { activeMode, activeMembership, activeLocationId, switchLocation } = useWorkspace()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stockByProduct, setStockByProduct] = useState<Record<string, string>>({})
  const [reasonByProduct, setReasonByProduct] = useState<Record<string, string>>({})
  const [kindByProduct, setKindByProduct] = useState<Record<string, InventoryMovementKind>>({})

  const businessQuery = useQuery({
    queryKey: ['business-profile', businessId],
    queryFn: () => businessesApi.getBySlug(businessId!),
    enabled: !!businessId,
  })
  const locationsQuery = useQuery({
    queryKey: ['locations', businessId],
    queryFn: () => locationsApi.list(businessId!),
    enabled: !!businessId,
  })
  const locations = locationsQuery.data ?? []
  const locationId = activeLocationId ?? locations[0]?.id
  const productsQuery = useQuery({
    queryKey: ['pos-products', businessId],
    queryFn: () => posApi.listProducts(businessId!),
    enabled: !!businessId,
  })
  const inventoryQuery = useQuery({
    queryKey: ['pos-inventory', businessId, locationId],
    queryFn: () => posApi.listInventory(businessId!, locationId!),
    enabled: !!businessId && !!locationId,
  })
  const salesQuery = useQuery({
    queryKey: ['pos-sales', businessId, locationId],
    queryFn: () => posApi.listSales(businessId!, { page: 1, limit: 8, locationId }),
    enabled: !!businessId,
  })
  const inventoryByProduct = useMemo(
    () => new Map((inventoryQuery.data ?? []).map((item) => [item.id, item])),
    [inventoryQuery.data]
  )

  const invalidateProducts = () => {
    void queryClient.invalidateQueries({ queryKey: ['pos-products', businessId] })
    void queryClient.invalidateQueries({ queryKey: ['pos-inventory', businessId] })
    void queryClient.invalidateQueries({ queryKey: ['pos-sales', businessId] })
  }

  const saveProduct = useMutation({
    mutationFn: () => {
      if (!businessId) throw new Error('Negócio não selecionado')
      const priceCents = Math.round(Number(price.replace(',', '.')) * 100)
      if (!Number.isSafeInteger(priceCents) || priceCents < 1) {
        throw new Error('Informe um preço válido maior que zero.')
      }
      const payload = { name: name.trim(), sku: sku.trim() || undefined, description: description.trim() || undefined, priceCents }
      return editingId
        ? posApi.updateProduct(businessId, editingId, payload)
        : posApi.createProduct(businessId, payload)
    },
    onSuccess: () => {
      invalidateProducts()
      setEditingId(null)
      setName('')
      setSku('')
      setDescription('')
      setPrice('')
      notify.success('Produto salvo.')
    },
    onError: (error) => notify.error(error),
  })

  const toggleBusinessProducts = useMutation({
    mutationFn: (enabled: boolean) => businessesApi.update(businessId!, { sellsProducts: enabled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['business-profile', businessId] })
      await queryClient.invalidateQueries({ queryKey: ['pos-catalog'] })
      notify.success('Configuração de vendas atualizada.')
    },
    onError: (error) => notify.error(error),
  })

  const toggleProduct = useMutation({
    mutationFn: (product: PosProduct) =>
      posApi.updateProduct(businessId!, product.id, { active: !product.active }),
    onSuccess: () => {
      invalidateProducts()
      notify.success('Produto atualizado.')
    },
    onError: (error) => notify.error(error),
  })

  const adjustStock = useMutation({
    mutationFn: (productId: string) => {
      if (!businessId || !locationId) throw new Error('Selecione uma unidade.')
      const quantity = Number(stockByProduct[productId])
      const type = kindByProduct[productId] ?? 'STOCK_IN'
      if (!Number.isSafeInteger(quantity) || quantity === 0) throw new Error('Informe uma quantidade inteira diferente de zero.')
      if (type === 'STOCK_IN' && quantity < 0) throw new Error('Entrada de estoque deve ser positiva.')
      const reason = reasonByProduct[productId]?.trim()
      if (!reason) throw new Error('Informe o motivo da movimentação.')
      return posApi.adjustInventory(businessId, {
        productId,
        locationId,
        type: type as 'STOCK_IN' | 'ADJUSTMENT',
        quantityDelta: quantity,
        reason,
      })
    },
    onSuccess: (_result, productId) => {
      void queryClient.invalidateQueries({ queryKey: ['pos-inventory', businessId, locationId] })
      setStockByProduct((current) => ({ ...current, [productId]: '' }))
      setReasonByProduct((current) => ({ ...current, [productId]: '' }))
      notify.success('Estoque atualizado.')
    },
    onError: (error) => notify.error(error),
  })

  if (activeMode === 'PROFESSIONAL' || activeMembership?.role === 'MANAGER') {
    return <Navigate to="/dashboard" replace />
  }

  const startEditing = (product: PosProduct) => {
    setEditingId(product.id)
    setName(product.name)
    setSku(product.sku ?? '')
    setDescription(product.description ?? '')
    setPrice((product.priceCents / 100).toFixed(2).replace('.', ','))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    saveProduct.mutate()
  }

  return (
    <>
      <PageHeader>
        <div>
          <PageTitle>Produtos e estoque</PageTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Catálogo compartilhado com saldo separado por unidade.</p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="mx-auto max-w-6xl space-y-5">
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Vender produtos no negócio</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ative o PDV para permitir que a equipe registre vendas.</p>
            </div>
            <Button
              type="button"
              variant={businessQuery.data?.sellsProducts ? 'secondary' : 'primary'}
              loading={toggleBusinessProducts.isPending || businessQuery.isLoading}
              disabled={!businessId || businessQuery.isError}
              onClick={() => toggleBusinessProducts.mutate(!businessQuery.data?.sellsProducts)}
            >
              {businessQuery.data?.sellsProducts ? 'PDV ativo' : 'Ativar PDV'}
            </Button>
          </Card>

          <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                {editingId ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
                <h2 className="font-semibold">{editingId ? 'Editar produto' : 'Novo produto'}</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input label="Nome *" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Preço (R$) *" required inputMode="decimal" placeholder="0,00" value={price} onChange={(event) => setPrice(event.target.value)} />
                  <Input label="SKU (opcional)" maxLength={64} value={sku} onChange={(event) => setSku(event.target.value)} />
                </div>
                <Input label="Descrição (opcional)" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} />
                <div className="flex gap-2">
                  <Button type="submit" loading={saveProduct.isPending} disabled={!businessId}>
                    {editingId ? 'Salvar alterações' : 'Cadastrar produto'}
                  </Button>
                  {editingId && <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>}
                </div>
              </form>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Catálogo e estoque</h2>
                  <p className="mt-1 text-sm text-muted-foreground">O preço é do negócio; a quantidade é desta unidade.</p>
                </div>
                <Select
                  aria-label="Unidade do estoque"
                  options={locations.map((location) => ({ value: location.id, label: location.name }))}
                  value={locationId ?? ''}
                  onChange={(event) => switchLocation(event.target.value)}
                  disabled={!locations.length}
                />
              </div>
              {productsQuery.isLoading || inventoryQuery.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Carregando produtos…</p>
              ) : productsQuery.isError || inventoryQuery.isError ? (
                <p className="py-8 text-center text-sm text-destructive-soft-fg">Não foi possível carregar produtos e estoque.</p>
              ) : productsQuery.data?.length ? (
                <div className="space-y-3">
                  {productsQuery.data.map((product) => {
                    const inventory = inventoryByProduct.get(product.id)
                    const movementType = kindByProduct[product.id] ?? 'STOCK_IN'
                    return (
                      <article key={product.id} className="rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="rounded-lg bg-primary-soft p-2 text-primary-soft-fg"><Package className="h-4 w-4" /></div>
                            <div className="min-w-0">
                              <h3 className="truncate font-medium">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">{money(product.priceCents)}{product.sku ? ` · SKU ${product.sku}` : ''}</p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Warehouse className="h-3.5 w-3.5" /> {inventory?.quantity ?? 0} em {inventory?.locationName ?? 'unidade'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={product.active ? 'success' : 'neutral'}>{product.active ? 'Ativo' : 'Inativo'}</Badge>
                            <Button type="button" size="sm" variant="outline" onClick={() => startEditing(product)}>Editar</Button>
                            <Button type="button" size="icon" variant="ghost" aria-label={product.active ? `Desativar ${product.name}` : `Ativar ${product.name}`} onClick={() => toggleProduct.mutate(product)}>
                              <Power className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <form
                          className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-[120px_150px_minmax(0,1fr)_auto] sm:items-end"
                          onSubmit={(event) => { event.preventDefault(); adjustStock.mutate(product.id) }}
                        >
                          <Select
                            label="Movimento"
                            options={[{ value: 'STOCK_IN', label: 'Entrada' }, { value: 'ADJUSTMENT', label: 'Ajuste' }]}
                            value={movementType}
                            onChange={(event) => setKindByProduct((current) => ({ ...current, [product.id]: event.target.value as InventoryMovementKind }))}
                          />
                          <Input
                            label="Quantidade"
                            type="number"
                            step="1"
                            value={stockByProduct[product.id] ?? ''}
                            onChange={(event) => setStockByProduct((current) => ({ ...current, [product.id]: event.target.value }))}
                            placeholder={movementType === 'STOCK_IN' ? 'Ex.: 12' : 'Ex.: -2'}
                            required
                          />
                          <Input
                            label="Motivo"
                            value={reasonByProduct[product.id] ?? ''}
                            onChange={(event) => setReasonByProduct((current) => ({ ...current, [product.id]: event.target.value }))}
                            placeholder="Reposição, perda…"
                            maxLength={200}
                            required
                          />
                          <Button type="submit" size="sm" loading={adjustStock.isPending}>Atualizar</Button>
                        </form>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">Nenhum produto cadastrado</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cadastre bebidas, lanches ou outros itens que vende no local.</p>
                </div>
              )}
            </Card>
          </section>

          <Card className="p-5">
            <h2 className="font-semibold">Vendas recentes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Registros desta unidade, feitos no PDV.</p>
            {salesQuery.isLoading ? <p className="py-5 text-sm text-muted-foreground">Carregando vendas…</p> : null}
            {salesQuery.isError ? <p className="py-5 text-sm text-destructive-soft-fg">Não foi possível carregar o histórico de vendas.</p> : null}
            {salesQuery.data?.data.length ? (
              <div className="mt-4 divide-y divide-border">
                {salesQuery.data.data.map((sale) => (
                  <div key={sale.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">{sale.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}</p>
                      <p className="text-xs text-muted-foreground">{sale.seller.name} · {new Date(sale.createdAt).toLocaleString('pt-BR')} · {sale.paymentMethod}</p>
                    </div>
                    <span className="font-semibold">{money(sale.totalCents)}</span>
                  </div>
                ))}
              </div>
            ) : salesQuery.isSuccess ? <p className="py-5 text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p> : null}
          </Card>
        </div>
      </PageContent>
    </>
  )
}
