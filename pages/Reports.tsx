
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
  
  // Default range: last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.createdAt).toISOString().split('T')[0];
      return t.status === 'COMPLETED' && txDate >= startDate && txDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  const totalSales = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
  const totalCost = filteredTransactions.reduce((acc, t) => {
    const transactionCost = t.items.reduce((itemAcc, item) => itemAcc + (item.costPrice * item.quantity), 0);
    return acc + transactionCost;
  }, 0);
  const netProfit = totalSales - totalCost;
  const totalOrders = filteredTransactions.length;

  const paymentData = [
    { name: 'Tunai', value: filteredTransactions.filter(t => t.paymentMethod === 'Tunai').reduce((a, b) => a + b.total, 0) },
    { name: 'QRIS', value: filteredTransactions.filter(t => t.paymentMethod === 'QRIS').reduce((a, b) => a + b.total, 0) },
    { name: 'Hutang', value: filteredTransactions.filter(t => t.paymentMethod === 'Hutang').reduce((a, b) => a + b.total, 0) },
  ].filter(d => d.value > 0);

  const itemCounts: Record<string, number> = {};
  filteredTransactions.forEach(t => {
    t.items.forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });

  const topItemsData = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const COLORS = ['#4089C9', '#10b981', '#f59e0b', '#ef4444'];

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const primaryColor = [64, 137, 201]; // #4089C9
      const dateStr = new Date().toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      
      const formatPeriod = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

      // --- HEADER ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('ANGKRINGAN PRO', 20, 22);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('LAPORAN PERFORMA BISNIS TERKONSOLIDASI', 20, 29);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Periode: ${formatPeriod(startDate)} - ${formatPeriod(endDate)}`, 20, 37);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Dicetak: ${dateStr}`, 190, 37, { align: 'right' });

      // --- SUMMARY CARDS ---
      let currentY = 60;
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Ringkasan Finansial', 20, currentY);
      
      currentY += 10;
      const boxWidth = 42;
      const boxHeight = 25;
      const metrics = [
        { label: 'OMSET KOTOR', val: formatCurrency(totalSales) },
        { label: 'TOTAL MODAL', val: formatCurrency(totalCost) },
        { label: 'LABA BERSIH', val: formatCurrency(netProfit) },
        { label: 'TOTAL ORDER', val: totalOrders.toString() }
      ];

      metrics.forEach((m, i) => {
        const xPos = 20 + (i * (boxWidth + 5));
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(xPos, currentY, boxWidth, boxHeight, 3, 3, 'FD');
        
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(m.label, xPos + boxWidth / 2, currentY + 8, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(64, 137, 201);
        doc.setFont('helvetica', 'bold');
        doc.text(m.val, xPos + boxWidth / 2, currentY + 18, { align: 'center' });
      });

      // --- TOP PRODUCTS TABLE ---
      currentY += 45;
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(12);
      doc.text('Daftar Produk Terlaris (Top 10)', 20, currentY);
      
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Peringkat', 'Nama Menu', 'Kuantitas Terjual']],
        body: topItemsData.map((item, index) => [index + 1, item.name, `${item.count} Unit`]),
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
          0: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 50, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // --- PAYMENT SUMMARY TABLE ---
      doc.text('Analisis Metode Pembayaran', 20, currentY);
      
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Metode Pembayaran', 'Persentase', 'Total Nominal']],
        body: paymentData.map(d => {
          const percentage = ((d.value / totalSales) * 100).toFixed(1);
          return [d.name, `${percentage}%`, formatCurrency(d.value)];
        }),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      });

      // --- FOOTER ---
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
        doc.text('Dokumen ini sah dihasilkan oleh Sistem Angkringan Pro POS.', 105, 290, { align: 'center' });
      }

      doc.save(`Laporan_Bisnis_${startDate}_sd_${endDate}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Gagal mengekspor PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-10 bg-[#F4F7F9] overflow-y-auto no-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analitik Bisnis</h1>
            <p className="text-slate-500 font-medium mt-1">Lacak performa keuangan dan inventaris Anda secara presisi.</p>
            
            {/* Date Filters UI */}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Mulai Tanggal:</span>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-sm text-slate-600 shadow-sm focus-within:ring-2 focus-within:ring-[#4089C9]/20 transition-all">
                  <Calendar size={16} className="text-[#4089C9]" />
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent outline-none border-none p-0 cursor-pointer font-bold text-slate-800" 
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Hingga Tanggal:</span>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center space-x-3 text-sm text-slate-600 shadow-sm focus-within:ring-2 focus-within:ring-[#4089C9]/20 transition-all">
                  <Calendar size={16} className="text-[#4089C9]" />
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent outline-none border-none p-0 cursor-pointer font-bold text-slate-800" 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center space-x-3 bg-[#4089C9] hover:bg-[#3476ad] disabled:bg-slate-300 text-white font-black py-4.5 px-10 rounded-[28px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            {isExporting ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <Download size={22} />
            )}
            <span>{isExporting ? 'MENGEKSPOR...' : 'EXPORT PDF'}</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Omset Kotor', value: formatCurrency(totalSales), icon: TrendingUp, color: 'text-[#4089C9]', bg: 'bg-blue-50' },
            { label: 'Total Modal', value: formatCurrency(totalCost), icon: Wallet, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Laba Bersih', value: formatCurrency(netProfit), icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50', highlight: true },
            { label: 'Pesanan Selesai', value: totalOrders.toString(), icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
          ].map((stat, i) => (
            <div key={i} className={`bg-white border p-8 rounded-[32px] shadow-sm transition-all hover:shadow-lg ${stat.highlight ? 'border-emerald-200 ring-4 ring-emerald-50' : 'border-slate-100'}`}>
              <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm`}>
                <stat.icon size={28} />
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-2">{stat.label}</p>
              <p className={`text-3xl font-black tracking-tighter ${stat.highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Chart Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
          <div className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-sm">
            <h3 className="text-xl font-black mb-10 flex items-center space-x-3 text-slate-800">
              <span className="w-2 h-8 bg-[#4089C9] rounded-full"></span>
              <span>Produk Terlaris</span>
            </h3>
            {topItemsData.length > 0 ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topItemsData.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={110} tick={{fontWeight: 700}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                    <Bar dataKey="count" fill="#4089C9" radius={[0, 12, 12, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-slate-300 font-bold italic">Tidak ada data untuk rentang ini</div>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-[40px] p-10 shadow-sm">
            <h3 className="text-xl font-black mb-10 flex items-center space-x-3 text-slate-800">
              <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
              <span>Distribusi Pembayaran</span>
            </h3>
            {paymentData.length > 0 ? (
              <div className="h-[320px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value" cornerRadius={14}>
                      {paymentData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={6} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-slate-300 font-bold italic">Tidak ada data pembayaran</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
