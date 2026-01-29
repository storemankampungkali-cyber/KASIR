
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
  // Added setConnectionStatus to AppState
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
      // Implemented setConnectionStatus
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
            set({ products: data.map((p: any) => ({
              ...p,
              price: Number(p.price),
              costPrice: Number(p.costPrice || 0)
            })) });
          }
        } catch (err) {}
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
          await fetch(`${API_URL}/products/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p)
          });
          await get().fetchProducts();
        } catch (err) {}
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
              // Sinkronisasi data ke tipe data Frontend yang benar
              const normalized = data.map((t: any) => ({
                id: t.id,
                subtotal: Number(t.subtotal),
                discount: Number(t.discount),
                total: Number(t.total),
                paymentMethod: t.paymentMethod,
                customerName: t.customerName,
                status: t.status,
                createdAt: t.createdAt,
                outletId: t.outletId,
                cashierId: t.cashierId,
                voidReason: t.voidReason,
                items: Array.isArray(t.items) ? t.items.map((i: any) => ({
                  id: i.id,
                  name: i.name,
                  price: Number(i.price),
                  costPrice: Number(i.costPrice),
                  quantity: Number(i.quantity)
                })) : []
              }));
              set({ transactions: normalized });
              console.log('[STORE] History Updated:', normalized.length);
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
          if (res.ok) await get().fetchTransactions();
        } catch (err) {}
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

      toasts: [],
      addToast: (type, title, message) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({ toasts: [...state.toasts, { id, type, title, message }] }));
        setTimeout(() => get().removeToast(id), 4000);
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    { 
      name: 'angkringan-pos-vFinal', // Reset storage total
      partialize: (state) => ({ currentUser: state.currentUser, theme: state.theme })
    }
  )
);
