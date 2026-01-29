
import React, { useState, useMemo } from 'react';
import { Search, Calendar, Info, XCircle, History as HistoryIcon, PackageX } from 'lucide-react';
import { useStore } from '../store';
import { Transaction } from '../types';
import { formatCurrency } from '../utils';

const History: React.FC = () => {
  const { transactions, voidTransaction } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  const getSafeDateString = (dateInput: any) => {
    try {
      if (!dateInput) return new Date().toISOString().split('T')[0];
      const d = new Date(dateInput);
      return d.toISOString().split('T')[0];
    } catch { return new Date().toISOString().split('T')[0]; }
  };

  const [startDate, setStartDate] = useState(getSafeDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [endDate, setEndDate] = useState(getSafeDateString(new Date()));

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((t) => {
      const txDate = getSafeDateString(t.createdAt);
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
        <div className="bg-[#F4F7F9]/95 backdrop-blur-sm z-20 px-6 pt-10 pb-6 shrink-0">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Riwayat Transaksi</h1>
          <p className="text-slate-500 font-medium mb-8">Lacak rekaman rincian menu dari setiap penjualan.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari ID atau nama..."
                className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-bold text-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border rounded-xl p-3 font-bold flex-1" />
              <span className="text-slate-400 font-bold">ke</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white border rounded-xl p-3 font-bold flex-1" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-4 no-scrollbar pb-24">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <HistoryIcon size={64} className="mb-4 opacity-10" />
              <p className="font-bold text-slate-400">Belum ada data transaksi</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div 
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className={`flex items-center justify-between p-6 bg-white border rounded-[28px] cursor-pointer transition-all hover:shadow-xl hover:border-[#4089C9]/40 ${tx.status === 'VOIDED' ? 'opacity-50 grayscale' : 'border-slate-100 shadow-sm'}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#4089C9] flex items-center justify-center"><Info size={24}/></div>
                  <div>
                    <h4 className="font-black text-slate-900 leading-none">#{tx.id}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase mt-1.5 tracking-widest">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID')} • {tx.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-slate-900">{formatCurrency(tx.total)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{(tx.items || []).length} Item</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedTx && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedTx(null)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-8 border-l animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900">Rincian Transaksi</h2>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-red-500"><XCircle size={28} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <div className="space-y-3">
                   <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">WAKTU</span><span className="text-slate-800">{new Date(selectedTx.createdAt).toLocaleString('id-ID')}</span></div>
                   <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">METODE</span><span className="text-slate-800">{selectedTx.paymentMethod}</span></div>
                   <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">PELANGGAN</span><span className="text-[#4089C9]">{selectedTx.customerName || '-'}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-slate-400 font-black text-[10px] uppercase mb-4 tracking-widest">Daftar Belanja</h3>
                <div className="space-y-3">
                  {!selectedTx.items || selectedTx.items.length === 0 ? (
                    <div className="p-10 border-2 border-dashed rounded-3xl text-center text-slate-300">
                      <PackageX size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">Rincian menu tidak terbaca</p>
                    </div>
                  ) : (
                    selectedTx.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="flex-1">
                          <p className="font-black text-slate-800 leading-tight">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{item.quantity} x {formatCurrency(item.price)}</p>
                        </div>
                        <p className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-6 border-t flex justify-between items-end">
                <span className="text-slate-400 font-black text-lg">TOTAL</span>
                <span className="text-4xl font-black text-[#4089C9] tracking-tighter">{formatCurrency(selectedTx.total)}</span>
              </div>
            </div>

            {selectedTx.status === 'COMPLETED' && (
              <button 
                onClick={() => setIsVoidModalOpen(true)}
                className="mt-8 w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all"
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
          <div className="relative bg-white w-full max-w-md rounded-[32px] p-8 animate-in zoom-in">
            <h3 className="text-2xl font-black text-red-600 mb-6">Konfirmasi Pembatalan</h3>
            <textarea
              placeholder="Berikan alasan void..."
              className="w-full bg-slate-50 border rounded-2xl p-4 mb-6 h-32 font-bold"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setIsVoidModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400">BATAL</button>
              <button onClick={handleVoid} disabled={!voidReason} className="flex-2 py-4 bg-red-600 text-white font-black rounded-xl">YA, VOID</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
