
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Banknote, X, ChevronUp } from 'lucide-react';
import { useStore } from '../store';
import { Category, PaymentMethod } from '../types';
import { formatCurrency, generateId } from '../utils';

const Cashier: React.FC = () => {
  const { products, cart, addToCart, updateQuantity, removeFromCart, clearCart, addTransaction, currentUser, qrisConfig, addToast } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
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
      setShowMobileCart(false);
      setIsProcessing(false);
      setCustomerName('');
      setCashReceived(0);
      addToast('SUCCESS', 'Pembayaran Berhasil', `Transaksi senilai ${formatCurrency(total)} telah tersimpan.`);
    }, 800);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#F4F7F9] relative">
      {/* Main Product Section */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* STICKY HEADER: Kategori & Search */}
        <div className="p-4 lg:p-6 space-y-4 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4089C9]" size={20} />
            <input
              type="text"
              placeholder="Cari menu nikmat..."
              className="w-full bg-slate-100 border-2 border-transparent focus:border-[#4089C9]/50 rounded-[24px] py-3.5 pl-14 pr-6 text-slate-900 placeholder-slate-400 focus:outline-none text-base lg:text-lg transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-6 lg:px-8 py-2.5 lg:py-3 rounded-2xl font-bold text-xs lg:text-sm transition-all active:scale-90 ${
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
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 no-scrollbar bg-[#F4F7F9]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5 pb-32 lg:pb-10">
            {filteredProducts.map((product) => {
              const inCart = cart.find(c => c.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`flex flex-col text-left bg-white border-2 rounded-[28px] lg:rounded-[32px] p-4 lg:p-5 transition-all active:scale-95 group relative overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 ${
                    inCart ? 'border-[#4089C9]' : 'border-transparent'
                  }`}
                >
                  <span className="text-slate-400 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest mb-1.5 lg:mb-2">{product.category}</span>
                  <span className="text-slate-900 font-extrabold text-base lg:text-lg leading-snug mb-2 lg:mb-3 h-12 lg:h-14 line-clamp-2">{product.name}</span>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[#4089C9] font-black text-lg lg:text-xl">{formatCurrency(product.price)}</span>
                    {inCart && (
                      <div className="bg-[#4089C9] text-white p-1.5 lg:p-2 rounded-xl shadow-lg animate-in zoom-in">
                        <span className="text-[10px] lg:text-xs font-black">{inCart.quantity}x</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Cart Sidebar */}
      <aside className="hidden lg:flex flex-col w-[380px] xl:w-[420px] border-l border-slate-200 bg-white shadow-xl h-full overflow-hidden shrink-0">
        <div className="p-8 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#4089C9] text-white rounded-2xl shadow-lg">
              <ShoppingCart size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Pesanan</h2>
          </div>
          <button onClick={() => { clearCart(); addToast('INFO', 'Dikosongkan', 'Keranjang belanja telah dikosongkan.'); }} className="text-slate-300 hover:text-red-500 transition-all p-2">
            <Trash2 size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200">
              <ShoppingCart size={80} className="mb-4 opacity-20" />
              <p className="text-center font-bold text-slate-400">Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 shadow-sm transition-all hover:shadow-md animate-in slide-in-from-right duration-300">
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

      {/* Mobile Sticky Checkout Bar */}
      {cart.length > 0 && !showCheckoutModal && (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-40 animate-in slide-in-from-bottom duration-500">
          <div className="bg-[#132B41] rounded-[32px] p-5 shadow-2xl flex items-center justify-between border border-white/10 ring-8 ring-white/10">
            <div className="flex items-center space-x-4 ml-2" onClick={() => setShowMobileCart(true)}>
              <div className="relative">
                <div className="bg-[#4089C9] text-white p-3 rounded-2xl">
                  <ShoppingCart size={22} />
                </div>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#132B41]">
                  {cart.length}
                </span>
              </div>
              <div className="text-left">
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest leading-none mb-1 flex items-center">
                  Total <ChevronUp size={10} className="ml-1" />
                </p>
                <p className="text-white font-black text-xl leading-none">{formatCurrency(total)}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCheckoutModal(true)}
              className="bg-[#4089C9] text-white px-8 py-4 rounded-[24px] font-black text-base shadow-xl active:scale-95 transition-all"
            >
              BAYAR
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {showMobileCart && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMobileCart(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-500">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
               <h2 className="text-2xl font-black text-slate-900">Rincian Pesanan</h2>
               <button onClick={() => setShowMobileCart(false)} className="text-slate-400 bg-slate-50 p-2 rounded-full"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
               {cart.map((item) => (
                <div key={item.id} className="bg-slate-50 p-5 rounded-[28px] border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{item.name}</h3>
                      <p className="text-[#4089C9] font-bold text-sm">{formatCurrency(item.price)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-300 p-1"><X size={18} /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5"><Minus size={14} /></button>
                      <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-[#4089C9]"><Plus size={14} /></button>
                    </div>
                    <p className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 pb-10">
              <div className="flex justify-between items-center mb-6">
                 <span className="text-slate-400 font-bold uppercase text-xs">Total Tagihan</span>
                 <span className="text-3xl font-black text-[#4089C9]">{formatCurrency(total)}</span>
              </div>
              <button 
                onClick={() => { setShowMobileCart(false); setShowCheckoutModal(true); }}
                className="w-full py-5 bg-[#4089C9] text-white rounded-[24px] font-black text-lg shadow-xl active:scale-95 transition-all"
              >
                LANJUT PEMBAYARAN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-6">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in" onClick={() => !isProcessing && setShowCheckoutModal(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in">
            <div className="p-8 lg:p-10 text-center bg-slate-50 border-b border-slate-100">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] lg:text-xs mb-2">Total Tagihan</p>
              <h2 className="text-4xl lg:text-5xl font-black text-[#4089C9] tracking-tighter">{formatCurrency(total)}</h2>
            </div>
            
            <div className="p-6 lg:p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div>
                <p className="text-slate-900 font-black mb-4 text-base lg:text-lg">Metode Pembayaran</p>
                <div className="grid grid-cols-3 gap-2 lg:gap-4">
                  {Object.values(PaymentMethod).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-5 lg:py-6 rounded-[24px] lg:rounded-[28px] font-black text-sm lg:text-lg transition-all active:scale-90 border-2 ${
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

              {(paymentMethod === PaymentMethod.HUTANG || paymentMethod === PaymentMethod.TUNAI) && (
                <div className="space-y-4">
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nama Pelanggan (Opsional)</p>
                  <input
                    type="text"
                    className="w-full bg-slate-100 border-2 border-transparent focus:border-[#4089C9] rounded-[24px] py-4 px-6 text-slate-900 font-bold focus:outline-none transition-all"
                    placeholder="Masukkan nama..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              )}

              {paymentMethod === PaymentMethod.TUNAI && (
                <div className="space-y-4">
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Uang Diterima (Rp)</p>
                  <div className="relative">
                    <Banknote className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                    <input
                      type="number"
                      className="w-full bg-slate-100 border-2 border-transparent focus:border-[#4089C9] rounded-[24px] py-5 lg:py-6 pl-16 pr-6 text-2xl lg:text-3xl font-black text-slate-900 focus:outline-none transition-all"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(parseInt(e.target.value) || 0)}
                      autoFocus
                    />
                  </div>
                  {cashReceived > total && (
                    <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100 animate-in fade-in">
                       <span className="text-emerald-600 font-bold text-sm">KEMBALIAN</span>
                       <span className="text-emerald-700 font-black text-xl">{formatCurrency(cashReceived - total)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3 lg:space-x-4 pt-4 pb-4">
                <button onClick={() => setShowCheckoutModal(false)} disabled={isProcessing} className="flex-1 py-4 lg:py-5 bg-slate-100 text-slate-400 font-black rounded-[24px] text-sm lg:text-base">BATAL</button>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || isCashInsufficient}
                  className={`flex-[2] py-4 lg:py-5 text-white font-black text-base lg:text-xl rounded-[24px] shadow-2xl transition-all ${
                    isCashInsufficient ? 'bg-slate-200 cursor-not-allowed' : 'bg-[#4089C9] shadow-[#4089C9]/40 active:scale-95'
                  }`}
                >
                  {isProcessing ? 'MEMPROSES...' : 'KONFIRMASI BAYAR'}
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
