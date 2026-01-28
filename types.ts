
export enum Category {
  MINUMAN = 'Minuman',
  MAKANAN = 'Makanan',
  SATE = 'Sate',
  LAINNYA = 'Lainnya'
}

export enum PaymentMethod {
  TUNAI = 'Tunai',
  QRIS = 'QRIS',
  HUTANG = 'Hutang'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number; // Added: Cost of goods sold / Harga Modal
  category: Category;
  isActive: boolean;
  outletId: string;
}

export interface CartItem extends Product {
  quantity: number;
  note?: string;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  createdAt: string;
  outletId: string;
  cashierId: string;
  status: 'COMPLETED' | 'VOIDED';
  voidReason?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
  outletId: string;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
}
