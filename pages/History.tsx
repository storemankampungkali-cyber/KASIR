
import React, { useState, useMemo } from 'react';
import { Search, Calendar, Info, XCircle, History as HistoryIcon } from 'lucide-react';
import { useStore } from '../store';
import { Transaction } from '../types';
import { formatCurrency } from '../utils';

const History: React.FC = () => {
  const { transactions, voidTransaction } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  // Default range: last 7 days for history
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  
  const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txDate = new Date(t.createdAt).toISOString().split('T')[0];
      const matchDate = txDate >= startDate && txDate <= endDate;
      const searchStr = `${t.id} ${t.customerName || ''}`.toLowerCase();
      const matchSearch = searchStr.includes(searchQuery.toLowerCase());
      return matchDate && matchSearch;
    });
  }, [transactions, searchQuery, startDate, endDate]);

  const handleVoid = () => {
    if (selectedTx && voidReason) {
      voidTransaction(selectedTx.id, voidReason);
      setIsVoidModalOpen(false);
      setVoidReason('');
      setSelectedTx(null);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#F4F7F9] overflow-hidden">
      <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto overflow-hidden">
        {/* STICKY HEADER AREA */}
        <div className="bg-[#F4F7F9]/95 backdrop-blur-sm z-20 px-4 lg:px-10 pt-4 lg:pt-10 pb-6 shrink-0 sticky top-0">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Riwayat Transaksi</h1>
            <p className="text-slate-500 font-medium">Lacak dan kelola rekaman seluruh transaksi penjualan Anda.</p>
          </div>

          {/* Filters Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4089C9]" size={18} />
                <input
                  type="text"
                  placeholder="Cari ID transaksi atau nama pelanggan..."
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4089C9]/20 shadow-sm transition-all font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 flex flex-col">
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-sm text-slate-600 shadow-sm focus-within:ring-2 focus-within:ring-[#4089C9]/20 transition-all">
                    <Calendar size={16} className="text-[#4089C9]" />
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent outline-none border-none p-0 cursor-pointer font-bold text-slate-800 w-full" 
                    />
                  </div>
                </div>
                <span className="text-slate-400 font-bold">s/d</span>
                <div className="flex-1 flex flex-col">
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-sm text-slate-600 shadow-sm focus-within:ring-2 focus-within:ring-[#4089C9]/20 transition-all">
                    <Calendar size={16} className="text-[#4089C9]" />
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent outline-none border-none p-0 cursor-pointer font-bold text-slate-800 w-full" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLABLE LIST SECTION */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-10 space-y-4 no-scrollbar pb-24">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <HistoryIcon size={80} className="mb-4 opacity-20" />
              <p className="font-bold text-slate-400">Tidak ada transaksi ditemukan untuk periode ini</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div 
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className={`group flex items-center justify-between p-6 bg-white border rounded-[28px] cursor-pointer transition-all shadow-sm hover:shadow-md hover:border-[#4089C9]/30 ${
                  tx.status === 'VOIDED' ? 'opacity-60 grayscale' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center space-x-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    tx.status === 'VOIDED' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#4089C9]'
                  }`}>
                    <Info size={26} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 flex items-center space-x-2 text-lg">
                      <span>ID #{tx.id}</span>
                      {tx.status === 'VOIDED' && (
                        <span className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-full font-black uppercase">VOID</span>
                      )}
                    </h4>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {tx.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-2xl text-slate-900">{formatCurrency(tx.total)}</p>
                  <p className="text-xs text-slate-400 font-bold uppercase">{tx.items.length} Menu Dipesan</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Details Modal & Void Modal (Unchanged) */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedTx(null)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-10 border-l border-slate-200 animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-10 shrink-0">
              <h2 className="text-2xl font-black text-slate-900">Rincian Transaksi</h2>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><XCircle size={28} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar">
              <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 shrink-0">
                <div className="space-y-4">
                   <div className="flex justify-between">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waktu</span>
                     <span className="text-sm font-black text-slate-800">{new Date(selectedTx.createdAt).toLocaleString('id-ID')}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Metode</span>
                     <span className="text-sm font-black text-slate-800">{selectedTx.paymentMethod}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span>
                     <span className={`text-xs font-black px-3 py-1 rounded-full ${selectedTx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                       {selectedTx.status}
                     </span>
                   </div>
                   {selectedTx.customerName && (
                     <div className="flex justify-between border-t border-slate-100 pt-3">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pelanggan</span>
                       <span className="text-sm font-black text-[#4089C9]">{selectedTx.customerName}</span>
                     </div>
                   )}
                </div>
              </div>

              <div>
                <h3 className="text-slate-400 font-bold text-[10px] uppercase mb-4 tracking-[0.2em]">Daftar Menu</h3>
                <div className="space-y-3">
                  {selectedTx.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div>
                        <p className="font-black text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400 font-bold">{item.quantity} x {formatCurrency(item.price)}</p>
                      </div>
                      <p className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 font-black text-xl">TOTAL</span>
                  <span className="text-4xl font-black text-[#4089C9] tracking-tighter">{formatCurrency(selectedTx.total)}</span>
                </div>
              </div>

              {selectedTx.status === 'VOIDED' && (
                <div className="bg-red-50 border border-red-100 p-6 rounded-3xl">
                  <p className="text-[10px] text-red-500 font-black uppercase mb-2 tracking-widest">Alasan Void</p>
                  <p className="text-red-900 font-medium italic">"{selectedTx.voidReason}"</p>
                </div>
              )}
            </div>

            {selectedTx.status === 'COMPLETED' && (
              <button 
                onClick={() => setIsVoidModalOpen(true)}
                className="mt-8 w-full py-5 bg-red-600 text-white font-black rounded-3xl shadow-xl shadow-red-500/20 active:scale-95 transition-all text-lg shrink-0"
              >
                VOID TRANSAKSI
              </button>
            )}
          </div>
        </div>
      )}

      {isVoidModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsVoidModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[40px] p-10 border border-slate-200 shadow-2xl animate-in zoom-in">
            <h3 className="text-3xl font-black mb-2 text-red-600 tracking-tight">Batalkan Transaksi</h3>
            <p className="text-slate-500 font-medium mb-8">Berikan alasan pembatalan untuk rekaman audit laporan.</p>
            
            <textarea
              placeholder="Contoh: Kesalahan input menu..."
              className="w-full bg-slate-50 border border-slate-200 rounded-[28px] p-6 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 mb-8 h-40 font-medium transition-all"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />

            <div className="flex space-x-4">
              <button onClick={() => setIsVoidModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl active:scale-95 transition-all">BATAL</button>
              <button onClick={handleVoid} disabled={!voidReason} className="flex-2 py-4 bg-red-600 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-red-500/30 active:scale-95 transition-all">KONFIRMASI VOID</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
