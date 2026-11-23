export type PosPaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX'
export type InventoryMovementKind = 'STOCK_IN' | 'ADJUSTMENT' | 'SALE'

export interface PosProduct {
  id: string
  businessId: string
  name: string
  sku: string | null
  description: string | null
  priceCents: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface LocationInventory extends PosProduct {
  locationId: string
  locationName: string
  quantity: number
}

export interface PosSaleItem {
  id: string
  productId: string | null
  productName: string
  unitPriceCents: number
  quantity: number
  subtotalCents: number
}

export interface PosSale {
  id: string
  businessId: string
  locationId: string
  totalCents: number
  paymentMethod: PosPaymentMethod
  createdAt: string
  seller: { userId: string; name: string }
  items: PosSaleItem[]
}

export interface PosSalePage {
  data: PosSale[]
  total: number
}
