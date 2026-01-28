
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Banknote, X } from 'lucide-react';
import { useStore } from '../store';
import { Category, PaymentMethod } from '../types';
import { formatCurrency, generateId } from '../utils';

const Cashier: React.FC = () => {
  const { products, cart, addToCart, updateQuantity, removeFromCart, clearCart, addTransaction, currentUser, qrisConfig, addToast } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TUNAI);
  const [customerName, setCustomerName] = useState('');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const categories: (Category | 'Semua')[] = ['Semua', ...Object.values(Category)];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch && p.isActive;
    });
  }, [products, selectedCategory, searchQuery]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal;

  useEffect(() => {
    if (showCheckoutModal) {
      setCashReceived(0);
    }
  }, [showCheckoutModal, total]);

  const isCashInsufficient = paymentMethod === PaymentMethod.TUNAI && cashReceived < total;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === PaymentMethod.HUTANG && !customerName) {
      addToast('ERROR', 'Input Pelanggan', 'Nama pelanggan wajib diisi untuk transaksi hutang.');
      return;
    }
    if (paymentMethod === PaymentMethod.TUNAI && cashReceived < total) {
      addToast('ERROR', 'Uang Kurang', 'Nominal yang diterima harus lebih besar atau sama dengan total tagihan.');
      return;
    }
    if (paymentMethod === PaymentMethod.QRIS && !qrisConfig.isActive) {
      addToast('INFO', 'Konfigurasi QRIS', 'Fitur QRIS belum diaktifkan di pengaturan.');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      addTransaction({
        id: generateId(),
        items: [...cart],
        subtotal,
        discount: 0,
        total,
        paymentMethod,
        customerName: customerName || undefined,
        createdAt: new Date().toISOString(),
        outletId: currentUser?.outletId || 'o1',
        cashierId: currentUser?.id || 'u1',
        status: 'COMPLETED' as const,
      });
      clearCart();
      setShowCheckoutModal(false);
      setIsProcessing(false);
      setCustomerName('');
      setCashReceived(0);
      addToast('SUCCESS', 'Pembayaran Berhasil', `Transaksi senilai ${formatCurrency(total)} telah tersimpan.`);
    }, 800);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#F4F7F9]">
      {/* Product Section */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* STICKY HEADER: Kategori & Search */}
        <div className="p-6 space-y-4 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4089C9]" size={22} />
            <input
              type="text"
              placeholder="Cari menu nikmat..."
              className="w-full bg-slate-100 border-2 border-transparent focus:border-[#4089C9]/50 rounded-[24px] py-4 pl-14 pr-6 text-slate-900 placeholder-slate-400 focus:outline-none text-lg transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-8 py-3 rounded-2xl font-bold text-sm transition-all active:scale-90 ${
                  selectedCategory === cat 
                    ? 'bg-[#4089C9] text-white shadow-lg shadow-[#4089C9]/30' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-[#4089C9]/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* SCROLLABLE PRODUCT GRID */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar bg-[#F4F7F9]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5 pb-10">
            {filteredProducts.map((product) => {
              const inCart = cart.find(c => c.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`flex flex-col text-left bg-white border-2 rounded-[32px] p-5 transition-all active:scale-95 group relative overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                    inCart ? 'border-[#4089C9]' : 'border-transparent'
                  }`}
                >
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">{product.category}</span>
                  <span className="text-slate-900 font-extrabold text-lg leading-snug mb-3 h-14 line-clamp-2">{product.name}</span>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[#4089C9] font-black text-xl">{formatCurrency(product.price)}</span>
                    {inCart && (
                      <div className="bg-[#4089C9] text-white p-2 rounded-xl shadow-lg">
                        <span className="text-xs font-black">{inCart.quantity}x</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Desktop - FIXED POSITIONS FOR HEADER/FOOTER */}
      <aside className="hidden lg:flex flex-col w-[400px] border-l border-slate-200 bg-white shadow-xl h-full overflow-hidden">
        {/* STICKY CART HEADER */}
        <div className="p-8 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#4089C9] text-white rounded-2xl shadow-lg">
              <ShoppingCart size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Pesanan</h2>
          </div>
          <button onClick={() => {
            clearCart();
            addToast('INFO', 'Keranjang Kosong', 'Daftar pesanan telah dibersihkan.');
          }} className="text-slate-300 hover:text-red-500 transition-all p-2">
            <Trash2 size={22} />
          </button>
        </div>

        {/* SCROLLABLE CART ITEMS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200">
              <ShoppingCart size={80} className="mb-4 opacity-20" />
              <p className="text-center font-bold text-slate-400">Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight text-lg">{item.name}</h3>
                    <p className="text-[#4089C9] font-bold text-sm mt-0.5">{formatCurrency(item.price)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 p-1.5 transition-all">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-white rounded-[18px] p-1 border border-slate-200">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 active:scale-75 transition-all"><Minus size={16} /></button>
                    <span className="w-8 text-center font-black text-slate-900">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-slate-50 rounded-xl text-[#4089C9] active:scale-75 transition-all"><Plus size={16} /></button>
                  </div>
                  <p className="font-black text-lg text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* STICKY CART FOOTER */}
        <div className="p-8 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Bayar</span>
              <span className="text-3xl font-black text-[#4089C9] tracking-tighter">{formatCurrency(total)}</span>
            </div>
          </div>
          <button
            onClick={() => setShowCheckoutModal(true)}
            disabled={cart.length === 0}
            className="w-full py-5 bg-[#4089C9] disabled:bg-slate-200 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-[#4089C9]/30 active:scale-95 transition-all"
          >
            BAYAR SEKARANG
          </button>
        </div>
      </aside>

      {/* Checkout Modal (Unchanged checkout logic) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => !isProcessing && setShowCheckoutModal(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in">
            <div className="p-10 text-center bg-slate-50 border-b border-slate-100">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-3">Tagihan Pembayaran</p>
              <h2 className="text-5xl font-black text-[#4089C9] tracking-tighter">{formatCurrency(total)}</h2>
            </div>
            
            <div className="p-8 space-y-8">
              <div>
                <p className="text-slate-900 font-black mb-4 text-lg">Pilih Metode</p>
                <div className="grid grid-cols-3 gap-4">
                  {Object.values(PaymentMethod).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-6 rounded-[28px] font-black text-lg transition-all active:scale-90 border-2 ${
                        paymentMethod === m 
                          ? 'bg-[#4089C9] text-white border-[#4089C9] shadow-xl shadow-[#4089C9]/30' 
                          : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === PaymentMethod.TUNAI && (
                <div className="space-y-4">
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Uang Diterima (Rp)</p>
                  <div className="relative">
                    <Banknote className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                    <input
                      type="number"
                      className="w-full bg-slate-100 border-2 border-transparent focus:border-[#4089C9] rounded-[24px] py-6 pl-16 pr-6 text-3xl font-black text-slate-900 focus:outline-none transition-all"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(parseInt(e.target.value) || 0)}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button onClick={() => setShowCheckoutModal(false)} disabled={isProcessing} className="flex-1 py-5 bg-slate-100 text-slate-400 font-black rounded-[24px]">BATAL</button>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || isCashInsufficient}
                  className={`flex-[2] py-5 text-white font-black text-xl rounded-[24px] shadow-2xl transition-all ${
                    isCashInsufficient ? 'bg-slate-200 cursor-not-allowed' : 'bg-[#4089C9] shadow-[#4089C9]/40 active:scale-95'
                  }`}
                >
                  {isProcessing ? 'Memproses...' : 'KONFIRMASI BAYAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cashier;
