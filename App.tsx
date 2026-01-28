
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cashier from './pages/Cashier';
import History from './pages/History';
import Reports from './pages/Reports';
import MenuManagement from './pages/MenuManagement';
import { useStore } from './store';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const { currentUser } = useStore();

  if (!currentUser) {
    return (
      <div className="h-screen w-full bg-[#F4F7F9] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-[40px] border border-slate-200 shadow-2xl text-center">
          <div className="w-20 h-20 bg-[#4089C9] rounded-3xl mx-auto mb-8 flex items-center justify-center text-white text-4xl font-black italic shadow-2xl shadow-blue-500/40">A</div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">ANGKRINGAN PRO</h1>
          <p className="text-slate-500 mb-10 font-medium">Sistem Kasir Pintar untuk UMKM Modern</p>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Username / Email" 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4.5 px-6 text-slate-900 focus:ring-2 focus:ring-[#4089C9] outline-none transition-all placeholder:text-slate-400"
            />
            <input 
              type="password" 
              placeholder="PIN Keamanan" 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4.5 px-6 text-slate-900 focus:ring-2 focus:ring-[#4089C9] outline-none transition-all placeholder:text-slate-400"
            />
            <button 
              onClick={() => useStore.getState().setCurrentUser({ id: 'u1', name: 'Alfian Dimas', role: 'ADMIN', outletId: 'o1' })}
              className="w-full py-4.5 bg-[#4089C9] text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all mt-6"
            >
              Masuk Sekarang
            </button>
          </div>
          <p className="text-slate-300 mt-12 text-[10px] font-bold tracking-[0.3em] uppercase">Enterprise Edition v2.1</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'kasir': return <Cashier />;
      case 'history': return <History />;
      case 'reports': return <Reports />;
      case 'menu': return <MenuManagement />;
      case 'settings': return (
        <div className="flex-1 p-10 bg-[#F4F7F9] overflow-y-auto no-scrollbar">
           <div className="max-w-4xl mx-auto space-y-10">
              <div>
                <h1 className="text-3xl font-black text-slate-900">Pengaturan</h1>
                <p className="text-slate-500 font-medium mt-1">Konfigurasi outlet dan preferensi akun Anda secara global.</p>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                 <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-4">Profil Bisnis</p>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-slate-700">Nama Toko</label>
                       <input type="text" defaultValue="Angkringan Pro - Alfian" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4089C9]" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-slate-700">Mata Uang</label>
                       <input type="text" defaultValue="IDR (Rp)" readOnly className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      );
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} onPageChange={setActivePage}>
      {renderPage()}
    </Layout>
  );
};

export default App;
