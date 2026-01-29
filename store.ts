
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Transaction, Category, PaymentMethod, User } from './types';
import { generateId } from './utils';

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3030/api';
  }
  return '/api';
};

const API_URL = getBaseUrl();
const HEALTH_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3030/health' 
  : '/health';

export type ToastType = 'SUCCESS' | 'ERROR' | 'INFO';
export type ConnectionStatus = 'CONNECTED' | 'SYNCING' | 'DISCONNECTED';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface QrisConfig {
  merchantName: string;
  qrImageUrl: string;
  isActive: boolean;
}

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  latency: number | null; 
  checkLatency: () => Promise<void>; 
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  products: Product[];
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  updateItemPrice: (productId: string, newPrice: number) => void;
  updateItemNote: (productId: string, note: string) => void;
  clearCart: () => void;
  transactions: Transaction[];
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  voidTransaction: (id: string, reason: string) => Promise<void>;
  qrisConfig: QrisConfig;
  updateQrisConfig: (config: Partial<QrisConfig>) => Promise<void>;
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message: string) => void;
  removeToast: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: { id: 'u1', name: 'Alfian Dimas', role: 'ADMIN', outletId: 'o1' },
      setCurrentUser: (user) => set({ currentUser: user }),
      connectionStatus: 'CONNECTED',
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      latency: null,
      
      checkLatency: async () => {
        const start = Date.now();
        try {
          const res = await fetch(HEALTH_URL, { cache: 'no-store' });
          if (res.ok) {
            const end = Date.now();
            const data = await res.json();
            if (data && data.database === 'CONNECTED') {
              set({ latency: end - start, connectionStatus: 'CONNECTED' });
            } else {
              set({ latency: null, connectionStatus: 'DISCONNECTED' });
            }
          } else {
            set({ latency: null, connectionStatus: 'DISCONNECTED' });
          }
        } catch (err) {
          set({ latency: null, connectionStatus: 'DISCONNECTED' });
        }
      },

      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      products: [],
      fetchProducts: async () => {
        try {
          const res = await fetch(`${API_URL}/products`);
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          const rawData = await res.json();
          
          if (!Array.isArray(rawData)) {
            console.warn("[API] Data produk bukan array:", rawData);
            return;
          }

          const normalizedProducts = rawData.map((p: any) => ({
            id: p.id || generateId(),
            name: p.name || 'Tanpa Nama',
            price: Number(p.price || 0),
            costPrice: Number(p.costPrice ?? p.cost_price ?? 0),
            category: p.category || 'Lainnya',
            isActive: p.isActive === true || p.isActive === 1 || p.is_active === 1 || p.is_active === true,
            outletId: p.outletId ?? p.outlet_id ?? 'o1'
          }));

          set({ products: normalizedProducts, connectionStatus: 'CONNECTED' });
        } catch (err: any) {
          console.error(`[API ERROR]`, err.message);
          set({ connectionStatus: 'DISCONNECTED' });
        }
      },
      
      addProduct: async (p) => {
        set({ connectionStatus: 'SYNCING' });
        const newProduct = { ...p, id: generateId() };
        try {
          const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
          });
          if (!res.ok) throw new Error('Create failed');
          await get().fetchProducts();
          get().addToast('SUCCESS', 'Tersimpan', `${newProduct.name} berhasil ditambahkan.`);
        } catch (err: any) {
          get().addToast('ERROR', 'Gagal', 'Gagal menyimpan ke server.');
        }
      },
      
      updateProduct: async (p) => {
        set({ connectionStatus: 'SYNCING' });
        try {
          const res = await fetch(`${API_URL}/products/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p)
          });
          if (!res.ok) throw new Error('Update failed');
          await get().fetchProducts();
        } catch (err) {
          set({ connectionStatus: 'DISCONNECTED' });
        }
      },

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

      transactions: [],
      fetchTransactions: async () => {
        try {
          const res = await fetch(`${API_URL}/transactions`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) set({ transactions: data });
          }
        } catch (err) {}
      },
      
      addTransaction: async (t) => {
        set({ connectionStatus: 'SYNCING' });
        try {
          const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(t)
          });
          if (res.ok) {
            await get().fetchTransactions();
          }
        } catch (err) {
          set({ connectionStatus: 'DISCONNECTED' });
        }
      },
      
      voidTransaction: async (id, reason) => {
        try {
          await fetch(`${API_URL}/transactions/${id}/void`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voidReason: reason })
          });
          await get().fetchTransactions();
        } catch (err) {}
      },

      qrisConfig: { merchantName: 'ANGKRINGAN PRO', qrImageUrl: '', isActive: true },
      updateQrisConfig: async (config) => {
        const newConfig = { ...get().qrisConfig, ...config };
        set({ qrisConfig: newConfig });
        try {
          await fetch(`${API_URL}/config/qris`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
          });
        } catch (err) {}
      },
      
      toasts: [],
      addToast: (type, title, message) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({ toasts: [...state.toasts, { id, type, title, message }] }));
        setTimeout(() => get().removeToast(id), 4000);
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    { 
      name: 'angkringan-pos-v4', // Ganti nama agar storage bersih
      partialize: (state) => ({
        currentUser: state.currentUser,
        theme: state.theme,
      })
    }
  )
);
