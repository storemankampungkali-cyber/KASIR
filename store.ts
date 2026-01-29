
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

export type ToastType = 'SUCCESS' | 'ERROR' | 'INFO';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  connectionStatus: 'CONNECTED' | 'SYNCING' | 'DISCONNECTED';
  setConnectionStatus: (status: 'CONNECTED' | 'SYNCING' | 'DISCONNECTED') => void;
  latency: number | null;
  checkLatency: () => Promise<void>;
  theme: 'light' | 'dark';
  products: Product[];
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  transactions: Transaction[];
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  voidTransaction: (id: string, reason: string) => Promise<void>;
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
      theme: 'light',
      
      checkLatency: async () => {
        const start = Date.now();
        try {
          const res = await fetch(`${API_URL.replace('/api', '')}/health`);
          if (res.ok) set({ latency: Date.now() - start, connectionStatus: 'CONNECTED' });
        } catch { set({ connectionStatus: 'DISCONNECTED', latency: null }); }
      },

      products: [],
      fetchProducts: async () => {
        try {
          const res = await fetch(`${API_URL}/products`);
          const data = await res.json();
          if (Array.isArray(data)) {
            // Map the API data strictly
            const mapped = data.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: Number(p.price || 0),
              costPrice: Number(p.costPrice || p.cost_price || 0),
              category: p.category,
              isActive: p.isActive === true || p.is_active === 1 || p.isActive === 1,
              outletId: p.outletId || p.outlet_id
            }));
            set({ products: mapped });
            console.log('[STORE] Products Refreshed:', mapped.length);
          }
        } catch (err) {
          console.error('[STORE] Fetch Products Failed', err);
        }
      },

      addProduct: async (p) => {
        try {
          const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...p, id: generateId() })
          });
          if (res.ok) await get().fetchProducts();
        } catch (err) {}
      },

      updateProduct: async (p) => {
        try {
          // Send specific mapping for API stability
          const payload = {
            id: p.id,
            name: p.name,
            price: p.price,
            costPrice: p.costPrice,
            category: p.category,
            isActive: p.isActive,
            outletId: p.outletId
          };
          
          const res = await fetch(`${API_URL}/products/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            await get().fetchProducts();
          }
        } catch (err) {
          console.error('[STORE] Update Product Failed', err);
        }
      },

      cart: [],
      addToCart: (p) => set((state) => {
        const existing = state.cart.find((item) => item.id === p.id);
        if (existing) return { cart: state.cart.map((item) => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item) };
        return { cart: [...state.cart, { ...p, quantity: 1 }] };
      }),
      removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),
      updateQuantity: (id, delta) => set((state) => ({
        cart: state.cart.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
      })),
      clearCart: () => set({ cart: [] }),

      transactions: [],
      fetchTransactions: async () => {
        try {
          const res = await fetch(`${API_URL}/transactions`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              set({ transactions: data });
              console.log('[STORE] Transactions Loaded:', data.length);
            }
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
             set({ connectionStatus: 'CONNECTED' });
          }
        } catch (err) {
          set({ connectionStatus: 'DISCONNECTED' });
        }
      },

      voidTransaction: async (id, reason) => {
        try {
          const res = await fetch(`${API_URL}/transactions/${id}/void`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voidReason: reason })
          });
          if (res.ok) await get().fetchTransactions();
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
      name: 'angkringan-pos-vFinal', // Reset local storage name to avoid stale data
      partialize: (state) => ({ currentUser: state.currentUser, theme: state.theme })
    }
  )
);
