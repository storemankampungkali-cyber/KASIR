
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Transaction, Category, PaymentMethod, User } from './types';
import { generateId } from './utils';

interface QrisConfig {
  merchantName: string;
  qrImageUrl: string;
  isActive: boolean;
}

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  updateItemPrice: (productId: string, newPrice: number) => void;
  updateItemNote: (productId: string, note: string) => void;
  clearCart: () => void;
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  voidTransaction: (id: string, reason: string) => void;
  qrisConfig: QrisConfig;
  updateQrisConfig: (config: Partial<QrisConfig>) => void;
}

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Nasi Kucing Sambal Teri', price: 3000, costPrice: 1800, category: Category.MAKANAN, isActive: true, outletId: 'o1' },
  { id: '2', name: 'Nasi Kucing Ayam Suwir', price: 3500, costPrice: 2000, category: Category.MAKANAN, isActive: true, outletId: 'o1' },
  { id: '3', name: 'Es Teh Manis', price: 4000, costPrice: 1200, category: Category.MINUMAN, isActive: true, outletId: 'o1' },
  { id: '4', name: 'Kopi Hitam', price: 3000, costPrice: 1000, category: Category.MINUMAN, isActive: true, outletId: 'o1' },
  { id: '5', name: 'Sate Usus', price: 2000, costPrice: 900, category: Category.SATE, isActive: true, outletId: 'o1' },
  { id: '6', name: 'Sate Telur Puyuh', price: 3000, costPrice: 1500, category: Category.SATE, isActive: true, outletId: 'o1' },
  { id: '7', name: 'Sate Ati Ampela', price: 3000, costPrice: 1600, category: Category.SATE, isActive: true, outletId: 'o1' },
  { id: '8', name: 'Wedang Jahe', price: 5000, costPrice: 1500, category: Category.MINUMAN, isActive: true, outletId: 'o1' },
  { id: '9', name: 'Gorengan Tempe', price: 1000, costPrice: 400, category: Category.LAINNYA, isActive: true, outletId: 'o1' },
  { id: '10', name: 'Kerupuk Putih', price: 1000, costPrice: 300, category: Category.LAINNYA, isActive: true, outletId: 'o1' },
];

// Generate 20 Sample Transactions for Dashboard visualization
const generateSamples = (): Transaction[] => {
  const samples: Transaction[] = [];
  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setHours(now.getHours() - i);
    const item = INITIAL_PRODUCTS[Math.floor(Math.random() * INITIAL_PRODUCTS.length)];
    const qty = Math.floor(Math.random() * 5) + 1;
    const total = item.price * qty;
    samples.push({
      id: generateId(),
      items: [{ ...item, quantity: qty }],
      subtotal: total,
      discount: 0,
      total: total,
      paymentMethod: i % 3 === 0 ? PaymentMethod.QRIS : PaymentMethod.TUNAI,
      createdAt: date.toISOString(),
      outletId: 'o1',
      cashierId: 'u1',
      status: 'COMPLETED'
    });
  }
  return samples;
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: { id: 'u1', name: 'Alfian Dimas', role: 'ADMIN', outletId: 'o1' },
      setCurrentUser: (user) => set({ currentUser: user }),
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      products: INITIAL_PRODUCTS,
      setProducts: (products) => set({ products }),
      addProduct: (p) => set((state) => ({ 
        products: [...state.products, { ...p, id: Math.random().toString(36).substr(2, 9) }] 
      })),
      updateProduct: (p) => set((state) => ({
        products: state.products.map((item) => item.id === p.id ? p : item)
      })),
      cart: [],
      addToCart: (p) => set((state) => {
        const existing = state.cart.find((item) => item.id === p.id);
        if (existing) {
          return { cart: state.cart.map((item) => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item) };
        }
        return { cart: [...state.cart, { ...p, quantity: 1 }] };
      }),
      removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),
      updateQuantity: (id, delta) => set((state) => ({
        cart: state.cart.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
      })),
      updateItemPrice: (id, price) => set((state) => ({
        cart: state.cart.map((item) => item.id === id ? { ...item, price } : item)
      })),
      updateItemNote: (id, note) => set((state) => ({
        cart: state.cart.map((item) => item.id === id ? { ...item, note } : item)
      })),
      clearCart: () => set({ cart: [] }),
      transactions: generateSamples(),
      addTransaction: (t) => set((state) => ({ transactions: [t, ...state.transactions] })),
      voidTransaction: (id, reason) => set((state) => ({
        transactions: state.transactions.map((t) => t.id === id ? { ...t, status: 'VOIDED', voidReason: reason } : t)
      })),
      qrisConfig: { merchantName: 'ANGKRINGAN PRO', qrImageUrl: '', isActive: true },
      updateQrisConfig: (config) => set((state) => ({ qrisConfig: { ...state.qrisConfig, ...config } })),
    }),
    { name: 'angkringan-pos-v5' }
  )
);
