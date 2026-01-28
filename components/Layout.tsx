
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  History, 
  Package, 
  PieChart, 
  Settings, 
  Bell, 
  ChevronDown, 
  LogOut, 
  Menu as MenuIcon,
  X
} from 'lucide-react';
import { useStore } from '../store';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onPageChange }) => {
  const { currentUser } = useStore();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kasir', label: 'Kasir (Penjualan)', icon: ShoppingCart },
    { id: 'history', label: 'Riwayat Transaksi', icon: History },
    { id: 'menu', label: 'Produk & Stok', icon: Package },
    { id: 'reports', label: 'Laporan Analitik', icon: PieChart },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F4F7F9] font-['Plus_Jakarta_Sans']">
      {/* Sidebar - Paper Style (Navy) */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#132B41] shrink-0 shadow-xl">
        <div className="p-6 flex items-center space-x-3 border-b border-white/5 mb-2">
          <div className="w-9 h-9 bg-[#4089C9] rounded-lg flex items-center justify-center text-white font-black italic shadow-lg">A</div>
          <span className="text-lg font-black tracking-tight text-white uppercase">Angkringan</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                activePage === item.id 
                ? 'bg-[#4089C9] text-white' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {/* Active Indicator Bar */}
              {activePage === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full"></div>
              )}
              <item.icon size={18} className={`${activePage === item.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
              <span className="text-sm font-semibold tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-sm font-bold group">
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - White & Clean */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <div className="flex items-center lg:hidden">
             <button onClick={() => setMobileMenuOpen(true)} className="p-2 mr-4 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                <MenuIcon size={24} />
             </button>
             <h1 className="font-black text-[#4089C9] tracking-tighter text-xl">ANGKRINGAN</h1>
          </div>

          <div className="hidden lg:flex items-center space-x-2">
             <span className="text-sm font-bold text-slate-800">{currentUser?.name}</span>
             <ChevronDown size={14} className="text-slate-400" />
             <span className="mx-2 text-slate-200">|</span>
             <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Verified Account</span>
          </div>

          <div className="flex items-center space-x-5">
            <button className="text-slate-400 hover:text-[#4089C9] p-2 hover:bg-slate-50 rounded-full transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center space-x-3 cursor-pointer group p-1 pr-3 hover:bg-slate-50 rounded-full transition-all">
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-sm">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}`} alt="avatar" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-400 font-medium tracking-tight">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative w-72 bg-[#132B41] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <h1 className="text-white font-black">ANGKRINGAN</h1>
                <button onClick={() => setMobileMenuOpen(false)} className="text-white/60"><X size={24} /></button>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onPageChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl font-bold text-sm transition-all ${
                      activePage === item.id ? 'bg-[#4089C9] text-white shadow-lg' : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Content Section */}
        <main className="flex-1 overflow-y-auto page-enter no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
