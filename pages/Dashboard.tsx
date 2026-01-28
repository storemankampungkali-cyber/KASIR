
import React from 'react';
import { useStore } from '../store';
import { formatCurrency } from '../utils';
import { Calendar, ChevronRight, TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis
} from 'recharts';

const Dashboard: React.FC = () => {
  const { transactions, products } = useStore();
  
  const completed = transactions.filter(t => t.status === 'COMPLETED');
  const revenue = completed.reduce((acc, t) => acc + t.total, 0);
  const profit = completed.reduce((acc, t) => {
    const cost = t.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    return acc + (t.total - cost);
  }, 0);

  const kpis = [
    { label: 'Total Penjualan', value: formatCurrency(revenue), icon: DollarSign },
    { label: 'Total Keuntungan', value: formatCurrency(profit), icon: TrendingUp },
    { label: 'Jumlah Transaksi', value: completed.length.toString(), icon: Users },
    { label: 'Stok Item Aktif', value: products.filter(p => p.isActive).length.toString(), icon: Package },
  ];

  const chartData = [
    { name: 'Sen', val: 4000 }, { name: 'Sel', val: 3000 }, { name: 'Rab', val: 2000 },
    { name: 'Kam', val: 2780 }, { name: 'Jum', val: 1890 }, { name: 'Sab', val: 2390 },
    { name: 'Min', val: 3490 },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Filter Dashboard</h2>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Mulai Dari:</span>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center space-x-2 text-sm text-slate-600 shadow-sm focus-within:ring-2 focus-within:ring-[#4089C9]/20 transition-all">
                <Calendar size={14} className="text-slate-400" />
                <input type="date" defaultValue="2024-05-30" className="bg-transparent outline-none border-none p-0 cursor-pointer" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Hingga:</span>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center space-x-2 text-sm text-slate-600 shadow-sm focus-within:ring-2 focus-within:ring-[#4089C9]/20 transition-all">
                <Calendar size={14} className="text-slate-400" />
                <input type="date" defaultValue="2024-05-30" className="bg-transparent outline-none border-none p-0 cursor-pointer" />
              </div>
            </div>
            <button className="bg-[#4089C9] hover:bg-[#3476ad] text-white font-bold px-8 py-2.5 rounded-full shadow-lg shadow-blue-500/30 self-end transition-all transform active:scale-95">
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>

      {/* KPI Blue Gradient Box (Paper.id Reference) */}
      <div className="bg-gradient-to-r from-[#4089C9] to-[#59A4DE] rounded-[32px] p-1 shadow-2xl shadow-blue-900/10 overflow-hidden">
        <div className="bg-white/5 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/20">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="p-10 text-center text-white space-y-2 group">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 group-hover:opacity-100 transition-opacity">{kpi.label}</p>
              <h3 className="text-3xl font-black tracking-tight">{kpi.value}</h3>
              <button className="flex items-center justify-center space-x-1 mx-auto text-[10px] font-bold opacity-60 hover:opacity-100 transition-all uppercase tracking-widest pt-2">
                <span>Rincian</span>
                <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-bold text-slate-800 text-lg">Pergerakan Omset</h3>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-[#4089C9]/10 text-[#4089C9] text-xs font-bold rounded-full">Harian</button>
              <button className="px-3 py-1 text-slate-400 text-xs font-bold rounded-full hover:bg-slate-50">Bulanan</button>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4089C9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4089C9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} />
                <Tooltip 
                  cursor={{ stroke: '#4089C9', strokeWidth: 1, strokeDasharray: '5 5' }}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px'}} 
                  itemStyle={{fontWeight: 800, color: '#4089C9'}}
                  labelStyle={{color: '#64748b', marginBottom: '4px', fontWeight: 600}}
                />
                <Area type="monotone" dataKey="val" stroke="#4089C9" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-slate-800 text-lg">Menu Terlaris</h3>
            <button className="text-[#4089C9] text-xs font-bold hover:underline">Semua Produk</button>
          </div>
          <div className="flex-1 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Peringkat & Nama</th>
                  <th className="pb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Unit Terjual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.slice(0, 6).map((p, i) => (
                  <tr key={i} className="group hover:bg-slate-50/80 transition-all">
                    <td className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs group-hover:bg-[#4089C9] group-hover:text-white transition-all">{i+1}</div>
                        <span className="font-bold text-sm text-slate-700">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">{Math.floor(Math.random() * 50) + 10} pcs</span>
                        <span className="text-[10px] text-emerald-500 font-bold">+12% dari kemarin</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
