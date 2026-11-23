import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useWorkspace } from '@/app/providers/workspace'
import { posApi } from '@/services/api/pos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { notify } from '@/lib/notify'
import type { PosPaymentMethod, PosSale } from '@/types/pos'

const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

export default function PosPage() {
  const queryClient = useQueryClient()
  const { businessId, business } = useActiveBusiness()
  const { activeMode, activeMembership, activeLocationId } = useWorkspace()
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('PIX')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [completedSale, setCompletedSale] = useState<PosSale | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const canUsePos = activeMode === 'PROFESSIONAL' || activeMembership?.role === 'MANAGER'

  const catalogQuery = useQuery({
    queryKey: ['pos-catalog', businessId, activeLocationId],
    queryFn: () => posApi.getCatalog(businessId!, activeLocationId!),
    enabled: canUsePos && !!businessId && !!activeLocationId,
  })
  const catalog = catalogQuery.data ?? []
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return catalog.filter((product) => !term || product.name.toLocaleLowerCase('pt-BR').includes(term) || product.sku?.toLocaleLowerCase('pt-BR').includes(term))
  }, [catalog, search])
  const cartItems = useMemo(
    () => catalog.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] })),
    [catalog, cart]
  )
  const totalCents = cartItems.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0)

  const checkout = useMutation({
    mutationFn: () => {
      if (!businessId || !activeLocationId) throw new Error('Selecione o negócio e a unidade antes de vender.')
      if (!cartItems.length) throw new Error('Adicione um produto ao carrinho.')
      return posApi.createSale({
        businessId,
        locationId: activeLocationId,
        items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        paymentMethod,
      })
    },
    onSuccess: async (sale) => {
      setCompletedSale(sale)
      setCart({})
      setCheckoutError(null)
      await queryClient.invalidateQueries({ queryKey: ['pos-catalog', businessId, activeLocationId] })
      notify.success('Venda registrada e estoque atualizado.')
    },
    onError: async (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir a venda.'
      setCheckoutError(message)
      await queryClient.invalidateQueries({ queryKey: ['pos-catalog', businessId, activeLocationId] })
      notify.error(error)
    },
  })

  if (!canUsePos) return <Navigate to="/dashboard" replace />

  const changeQuantity = (productId: string, delta: number) => {
    const product = catalog.find((item) => item.id === productId)
    if (!product) return
    setCart((current) => {
      const next = (current[productId] ?? 0) + delta
      if (next <= 0) {
        const { [productId]: _removed, ...rest } = current
        return rest
      }
      if (next > product.quantity) return current
      return { ...current, [productId]: next }
    })
    setCompletedSale(null)
    setCheckoutError(null)
  }

  return (
    <>
      <PageHeader>
        <div>
          <PageTitle>Ponto de venda</PageTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{business?.name} · venda na unidade selecionada</p>
        </div>
        <Badge variant="info">PDV</Badge>
      </PageHeader>
      <PageContent>
        <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-4">
            <Input
              aria-label="Buscar produto"
              placeholder="Buscar produto ou SKU…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {catalogQuery.isLoading ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">Carregando catálogo…</Card>
            ) : catalogQuery.isError ? (
              <Card className="p-8 text-center text-sm text-destructive-soft-fg">
                Não foi possível acessar o PDV. Confirme se a unidade e a venda de produtos estão ativas.
              </Card>
            ) : visibleProducts.length ? (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {visibleProducts.map((product) => {
                  const quantityInCart = cart[product.id] ?? 0
                  const outOfStock = product.quantity <= 0
                  return (
                    <Card key={product.id} className="flex flex-col justify-between p-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-medium">{product.name}</h2>
                          <Badge variant={outOfStock ? 'neutral' : 'success'}>{outOfStock ? 'Sem estoque' : `${product.quantity} un.`}</Badge>
                        </div>
                        {product.sku && <p className="mt-1 text-xs text-muted-foreground">SKU {product.sku}</p>}
                        {product.description && <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{formatMoney(product.priceCents)}</span>
                        <div className="flex items-center gap-1.5">
                          {quantityInCart > 0 && (
                            <>
                              <Button type="button" size="icon" variant="outline" aria-label={`Diminuir ${product.name}`} onClick={() => changeQuantity(product.id, -1)}><Minus className="h-4 w-4" /></Button>
                              <span className="min-w-6 text-center text-sm font-medium">{quantityInCart}</span>
                            </>
                          )}
                          <Button type="button" size={quantityInCart ? 'icon' : 'sm'} disabled={outOfStock || quantityInCart >= product.quantity} aria-label={quantityInCart ? `Adicionar mais ${product.name}` : `Adicionar ${product.name}`} onClick={() => changeQuantity(product.id, 1)}>
                            <Plus className="h-4 w-4" />{quantityInCart ? null : 'Adicionar'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 font-medium">{catalog.length ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}</p>
                <p className="mt-1 text-sm text-muted-foreground">{catalog.length ? 'Tente outro nome ou SKU.' : 'O dono do negócio precisa cadastrar produtos ativos.'}</p>
              </Card>
            )}
          </section>

          <aside className="xl:sticky xl:top-5 xl:self-start">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Carrinho</h2>
                <Badge variant="neutral">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} itens</Badge>
              </div>
              {cartItems.length ? (
                <div className="mt-4 divide-y divide-border">
                  {cartItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{quantity} × {formatMoney(product.priceCents)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatMoney(product.priceCents * quantity)}</span>
                        <Button type="button" size="icon" variant="ghost" aria-label={`Remover ${product.name}`} onClick={() => setCart((current) => { const { [product.id]: _removed, ...rest } = current; return rest })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-4 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">Selecione produtos para iniciar uma venda.</p>}

              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-4 flex items-center justify-between text-base font-semibold">
                  <span>Total</span><span>{formatMoney(totalCents)}</span>
                </div>
                <Select
                  label="Forma de pagamento"
                  options={[
                    { value: 'PIX', label: 'Pix' },
                    { value: 'CASH', label: 'Dinheiro' },
                    { value: 'DEBIT_CARD', label: 'Cartão de débito' },
                    { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
                  ]}
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PosPaymentMethod)}
                />
                {checkoutError && <p className="mt-2 text-xs text-destructive-soft-fg" role="alert">{checkoutError}</p>}
                <Button type="button" className="mt-4 w-full" loading={checkout.isPending} disabled={!cartItems.length} onClick={() => checkout.mutate()}>
                  Concluir venda
                </Button>
              </div>
            </Card>

            {completedSale && (
              <Card className="mt-4 border-success/40 p-4" role="status">
                <p className="font-semibold text-success-soft-fg">Venda concluída</p>
                <p className="mt-1 text-sm text-muted-foreground">Total registrado: {formatMoney(completedSale.totalCents)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Pagamento: {completedSale.paymentMethod}</p>
              </Card>
            )}
          </aside>
        </div>
      </PageContent>
    </>
  )
}
