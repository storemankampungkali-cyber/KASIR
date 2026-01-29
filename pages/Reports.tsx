
import React, { useState, useMemo } from 'react';
import { TrendingUp, Wallet, Package, Download, ArrowUpRight, Loader2, Calendar } from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Reports: React.FC = () => {
  const { transactions } = useStore();
  const [isExporting, setIsExporting] = useState(false);
  
  const getSafeDateString = (dateInput: any) => {
    try {
      if (!dateInput) return '1970-01-01';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '1970-01-01';
      return d.toISOString().split('T')[0];
    } catch {
      return '1970-01-01';
    }
  };

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const [startDate, setStartDate] = useState(getSafeDateString(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(getSafeDateString(now));

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter(t => {
      const txDate = getSafeDateString(t.createdAt);
      return t.status === 'COMPLETED' && txDate >= startDate && txDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Kalkulasi Finansial yang Presisi
  const { totalSales, totalCost, netProfit, totalOrders } = useMemo(() => {
    let sales = 0;
    let cost = 0;
    
    filteredTransactions.forEach(t => {
      sales += Number(t.total || 0);
      (t.items || []).forEach(item => {
        const itemCost = Number(item.costPrice || item.cost_price || 0);
        cost += itemCost * Number(item.quantity || 0);
      });
    });

    return {
      totalSales: sales,
      totalCost: cost,
      netProfit: sales - cost,
      totalOrders: filteredTransactions.length
    };
  }, [filteredTransactions]);

  const paymentData = useMemo(() => {
    const data = [
      { name: 'Tunai', value: filteredTransactions.filter(t => t.paymentMethod === 'Tunai').reduce((a, b) => a + Number(b.total || 0), 0) },
      { name: 'QRIS', value: filteredTransactions.filter(t => t.paymentMethod === 'QRIS').reduce((a, b) => a + Number(b.total || 0), 0) },
      { name: 'Hutang', value: filteredTransactions.filter(t => t.paymentMethod === 'Hutang').reduce((a, b) => a + Number(b.total || 0), 0) },
    ].filter(d => d.value > 0);
    return data;
  }, [filteredTransactions]);

  const topItemsData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      (t.items || []).forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + Number(item.quantity || 0);
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredTransactions]);

  const COLORS = ['#4089C9', '#10b981', '#f59e0b', '#ef4444'];

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const primaryColor = [64, 137, 201];
      const dateStr = new Date().toLocaleString('id-ID');
      
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('LAPORAN PENJUALAN PRO', 20, 25);
      doc.setFontSize(10);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 20, 32);

      (doc as any).autoTable({
        startY: 50,
        head: [['Metrik Finansial', 'Nilai']],
        body: [
          ['Total Omset', formatCurrency(totalSales)],
          ['Total Modal (HPP)', formatCurrency(totalCost)],
          ['Laba Bersih', formatCurrency(netProfit)],
          ['Jumlah Transaksi', `${totalOrders} Pesanan`]
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColor }
      });

      doc.save(`Laporan_${startDate}_${endDate}.pdf`);
    } catch (error) {
      alert('Gagal ekspor PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-10 bg-[#F4F7F9] overflow-y-auto no-scrollbar">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analitik Performa</h1>
            <p className="text-slate-500 font-medium">Data dihitung otomatis berdasarkan modal per item saat transaksi.</p>
            
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Dari</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 shadow-sm"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Hingga</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-800 shadow-sm"
                />
              </div>
            </div>
          </div>
          
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center space-x-2 bg-[#4089C9] text-white font-bold px-8 py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            {isExporting ? <Loader2 className="animate-spin" /> : <Download size={20} />}
            <span>EXPORT LAPORAN</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border p-8 rounded-[32px] shadow-sm">
            <div className="bg-blue-50 text-[#4089C9] w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><TrendingUp size={24} /></div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total Omset</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(totalSales)}</p>
          </div>
          <div className="bg-white border p-8 rounded-[32px] shadow-sm">
            <div className="bg-orange-50 text-orange-500 w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><Wallet size={24} /></div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total Modal</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(totalCost)}</p>
          </div>
          <div className="bg-white border-2 border-emerald-100 p-8 rounded-[32px] shadow-sm bg-emerald-50/30">
            <div className="bg-emerald-100 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><ArrowUpRight size={24} /></div>
            <p className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest mb-1">Laba Bersih</p>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(netProfit)}</p>
          </div>
          <div className="bg-white border p-8 rounded-[32px] shadow-sm">
            <div className="bg-purple-50 text-purple-500 w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><Package size={24} /></div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">Total Pesanan</p>
            <p className="text-2xl font-black text-slate-900">{totalOrders}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
          <div className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-sm">
            <h3 className="text-xl font-black mb-10 flex items-center space-x-3 text-slate-800">
              <span className="w-1.5 h-8 bg-[#4089C9] rounded-full"></span>
              <span>Top 5 Menu Terlaris</span>
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} tick={{fontWeight: 700}} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4089C9" radius={[0, 10, 10, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-sm">
            <h3 className="text-xl font-black mb-10 flex items-center space-x-3 text-slate-800">
              <span className="w-1.5 h-8 bg-emerald-500 rounded-full"></span>
              <span>Sumber Pembayaran</span>
            </h3>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={8} dataKey="value" cornerRadius={12}>
                    {paymentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={5} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
