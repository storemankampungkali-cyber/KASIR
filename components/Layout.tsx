
import React, { useState, useEffect } from 'react';
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
  X,
  Database,
  CloudLightning,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useStore } from '../store';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onPageChange }) => {
  const { currentUser, connectionStatus, setConnectionStatus, checkLatency, latency } = useStore();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kasir', label: 'Kasir (Penjualan)', icon: ShoppingCart },
    { id: 'history', label: 'Riwayat Transaksi', icon: History },
    { id: 'menu', label: 'Produk & Stok', icon: Package },
    { id: 'reports', label: 'Laporan Analitik', icon: PieChart },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  // Monitor online/offline status dan ping server
  useEffect(() => {
    // Handler event browser
    const handleOnline = () => setConnectionStatus('CONNECTED');
    const handleOffline = () => setConnectionStatus('DISCONNECTED');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    checkLatency();

    // Interval ping setiap 10 detik
    const pingInterval = setInterval(() => {
      if (navigator.onLine) {
        checkLatency();
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
    };
  }, [setConnectionStatus, checkLatency]);

  const ConnectionIndicator = () => {
    // Tentukan warna dan status berdasarkan latency atau connectionStatus
    let statusColor = 'bg-red-500';
    let textColor = 'text-red-600';
    let label = 'Offline';
    let Icon = WifiOff;
    let desc = 'Koneksi terputus. Data disimpan di memori lokal.';

    if (connectionStatus === 'CONNECTED' && latency !== null) {
      if (latency < 150) {
        statusColor = 'bg-emerald-500';
        textColor = 'text-emerald-600';
        label = `Excellent (${latency}ms)`;
        Icon = Wifi;
        desc = 'Koneksi sangat cepat. Sinkronisasi real-time.';
      } else if (latency < 400) {
        statusColor = 'bg-amber-500';
        textColor = 'text-amber-600';
        label = `Fair (${latency}ms)`;
        Icon = Wifi;
        desc = 'Koneksi stabil namun sedikit lambat.';
      } else {
        statusColor = 'bg-orange-500';
        textColor = 'text-orange-600';
        label = `Slow (${latency}ms)`;
        Icon = Activity;
        desc = 'Koneksi lambat. Mungkin ada penundaan penyimpanan.';
      }
    } else if (connectionStatus === 'SYNCING') {
      statusColor = 'bg-blue-500';
      textColor = 'text-blue-600';
      label = 'Syncing...';
      Icon = RefreshCw;
      desc = 'Sedang mengirim data ke server...';
    }

    return (
      <div className="relative group flex items-center bg-slate-50 border border-slate-200 py-1.5 pl-3 pr-4 rounded-full transition-all hover:bg-white hover:shadow-md cursor-help select-none">
        <div className="relative flex mr-3">
          {/* Ping Animation: Hanya aktif jika connected */}
          {connectionStatus !== 'DISCONNECTED' && (
             <div className={`w-2.5 h-2.5 rounded-full ${statusColor} absolute animate-ping opacity-75`}></div>
          )}
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor} relative`}></div>
        </div>
        
        <div className="flex flex-col leading-none">
           <span className={`text-[10px] font-black uppercase tracking-widest ${textColor}`}>
             {label}
           </span>
        </div>

        {/* Fancy Tooltip */}
        <div className="absolute top-12 right-0 w-64 bg-[#132B41] text-white p-4 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-[100]">
           <div className="flex items-center space-x-3 mb-2">
              <div className={`p-2 rounded-lg ${statusColor} bg-opacity-20`}>
                <Icon size={16} className={statusColor.replace('bg-', 'text-')} />
              </div>
              <div>
                <p className="font-bold text-xs">{connectionStatus === 'CONNECTED' ? 'Server Online' : 'Terputus'}</p>
                {latency && <p className="text-[10px] text-white/50">Ping: {latency}ms</p>}
              </div>
           </div>
           <p className="text-[10px] text-white/60 leading-relaxed border-t border-white/10 pt-2">{desc}</p>
           <div className="absolute -top-1.5 right-6 w-3 h-3 bg-[#132B41] rotate-45"></div>
        </div>
      </div>
    );
  };

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
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center lg:hidden">
             <button onClick={() => setMobileMenuOpen(true)} className="p-2 mr-4 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                <MenuIcon size={24} />
             </button>
             <h1 className="font-black text-[#4089C9] tracking-tighter text-xl">ANGKRINGAN</h1>
          </div>

          <div className="hidden lg:flex items-center space-x-6">
             <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-800">{currentUser?.name}</span>
                <ChevronDown size={14} className="text-slate-400" />
                <span className="mx-2 text-slate-200">|</span>
                <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Owner Mode</span>
             </div>
             
             {/* Connection Pulse Indicator */}
             <ConnectionIndicator />
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
        <main className="flex-1 overflow-y-auto page-enter no-scrollbar bg-[#F4F7F9]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
