
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Transaction, Category, PaymentMethod, User } from './types';
import { generateId } from './utils';

/**
 * STRATEGI URL:
 * Memastikan URL bersih dari trailing slash (/) agar penggabungan string tidak error (//api).
 */
const getBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (!envUrl) return 'http://localhost:3030/api';
  
  // Hapus tanda / di akhir jika ada
  return envUrl.replace(/\/$/, '');
};

const API_URL = getBaseUrl();
// Health URL: Ganti /api dengan /health, atau tambahkan /health jika tidak ada /api
const HEALTH_URL = API_URL.endsWith('/api') 
  ? API_URL.replace('/api', '/health') 
  : `${API_URL}/health`;

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
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); 
          
          console.log(`Checking connection to: ${HEALTH_URL}`);
          const res = await fetch(HEALTH_URL, { 
            signal: controller.signal,
            cache: 'no-store' 
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const end = Date.now();
            const data = await res.json().catch(() => ({}));
            
            // Logika baru: Jika Backend OK tapi Database Mati, tetap anggap Disconnected
            if (data.database === 'DISCONNECTED' || data.status === 'DOWN') {
               console.warn('Backend UP but Database DOWN');
               set({ latency: null, connectionStatus: 'DISCONNECTED' });
            } else {
               set({ latency: end - start, connectionStatus: 'CONNECTED' });
            }
          } else {
            console.error('Health Check Failed:', res.status, res.statusText);
            set({ latency: null, connectionStatus: 'DISCONNECTED' });
          }
        } catch (err) {
          console.error('Network unreachable:', err);
          set({ latency: null, connectionStatus: 'DISCONNECTED' });
        }
      },

      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      products: [],
      fetchProducts: async () => {
        try {
          console.log(`Fetching products from: ${API_URL}/products`);
          const res = await fetch(`${API_URL}/products`);
          if (!res.ok) {
             const errorText = await res.text();
             throw new Error(`Server Error (${res.status}): ${errorText}`);
          }
          const data = await res.json();
          set({ products: data, connectionStatus: 'CONNECTED' });
        } catch (err) {
          console.error('Fetch Products Error:', err);
          set({ connectionStatus: 'DISCONNECTED' });
          get().addToast('ERROR', 'Gagal Terhubung', 'Gagal memuat produk. Backend mungkin sedang restart.');
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
          set({ connectionStatus: 'CONNECTED' });
        } catch (err) {
          set({ connectionStatus: 'DISCONNECTED' });
          get().addToast('ERROR', 'Sinkronisasi Gagal', 'Gagal menyimpan produk.');
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
          set({ connectionStatus: 'CONNECTED' });
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
          if (!res.ok) throw new Error('Response not OK');
          const data = await res.json();
          set({ transactions: data, connectionStatus: 'CONNECTED' });
        } catch (err) {
          console.error('Fetch Transactions Error:', err);
          set({ connectionStatus: 'DISCONNECTED' });
        }
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
            get().addToast('SUCCESS', 'Tersinkron', 'Transaksi berhasil disimpan.');
          } else {
             throw new Error('Save failed');
          }
        } catch (err) {
          set({ connectionStatus: 'DISCONNECTED' });
          set((state) => ({ transactions: [t, ...state.transactions] }));
          get().addToast('INFO', 'Mode Offline', 'Transaksi disimpan lokal.');
        }
      },
      
      voidTransaction: async (id, reason) => {
        set({ connectionStatus: 'SYNCING' });
        try {
          const res = await fetch(`${API_URL}/transactions/${id}/void`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voidReason: reason })
          });
          if (!res.ok) throw new Error('Void failed');
          await get().fetchTransactions();
          set({ connectionStatus: 'CONNECTED' });
        } catch (err) {
          set({ connectionStatus: 'DISCONNECTED' });
        }
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
        set((state) => ({
          toasts: [...state.toasts, { id, type, title, message }]
        }));
        setTimeout(() => get().removeToast(id), 4000);
      },
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),
    }),
    { 
      name: 'angkringan-pos-railway',
      partialize: (state) => ({
        currentUser: state.currentUser,
        theme: state.theme,
      })
    }
  )
);
