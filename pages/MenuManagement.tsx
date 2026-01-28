
import React, { useState } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, Search, X } from 'lucide-react';
import { useStore } from '../store';
import { Category, Product } from '../types';
import { formatCurrency } from '../utils';

const MenuManagement: React.FC = () => {
  const { products, addProduct, updateProduct, addToast } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    price: 0,
    costPrice: 0,
    category: Category.MAKANAN,
    isActive: true,
    outletId: 'o1'
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct({ ...formData, id: editingProduct.id });
      addToast('SUCCESS', 'Menu Diperbarui', `Perubahan pada ${formData.name} berhasil disimpan.`);
    } else {
      addProduct(formData);
      addToast('SUCCESS', 'Menu Ditambahkan', `${formData.name} sekarang tersedia di katalog.`);
    }
    closeModal();
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price,
        costPrice: product.costPrice || 0,
        category: product.category,
        isActive: product.isActive,
        outletId: product.outletId
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: 0,
        costPrice: 0,
        category: Category.MAKANAN,
        isActive: true,
        outletId: 'o1'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const toggleActive = (p: Product) => {
    updateProduct({ ...p, isActive: !p.isActive });
    addToast('INFO', p.isActive ? 'Menu Dinonaktifkan' : 'Menu Diaktifkan', `${p.name} telah diupdate statusnya.`);
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] overflow-hidden">
      {/* STICKY HEADER SECTION */}
      <div className="bg-[#F4F7F9]/95 backdrop-blur-sm z-20 shrink-0 sticky top-0 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-10 py-6 lg:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Katalog Menu</h1>
              <p className="text-slate-500 font-medium">Atur daftar menu jualan dan sesuaikan stok ketersediaan.</p>
            </div>
            <button 
              onClick={() => openModal()}
              className="flex items-center space-x-3 bg-[#4089C9] hover:bg-[#3476ad] text-white font-black py-4.5 px-10 rounded-[28px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-lg"
            >
              <Plus size={24} />
              <span>TAMBAH MENU</span>
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4089C9]" size={22} />
            <input
              type="text"
              placeholder="Cari nama menu..."
              className="w-full bg-white border border-slate-200 rounded-[24px] py-4.5 pl-16 pr-6 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-[#4089C9]/5 shadow-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT SECTION */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-6xl mx-auto px-4 lg:px-10 py-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProducts.map((p) => (
              <div key={p.id} className={`flex items-center justify-between p-6 bg-white border rounded-[32px] transition-all shadow-sm group hover:shadow-xl hover:border-[#4089C9]/20 ${
                !p.isActive && 'opacity-60 grayscale bg-slate-50'
              }`}>
                <div className="flex items-center space-x-6">
                  <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center font-black text-2xl ${
                    p.isActive ? 'bg-blue-50 text-[#4089C9]' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{p.name}</h3>
                    <div className="flex items-center space-x-4 mt-1.5">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">{p.category}</span>
                      <span className="text-[#4089C9] font-black text-lg">{formatCurrency(p.price)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => toggleActive(p)}
                    className={`p-2 transition-all ${p.isActive ? 'text-emerald-500' : 'text-slate-300'}`}
                  >
                    {p.isActive ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                  </button>
                  <button 
                    onClick={() => openModal(p)}
                    className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-[#4089C9]/10 hover:text-[#4089C9] active:scale-90 transition-all shadow-sm"
                  >
                    <Edit2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={closeModal}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[44px] overflow-hidden border border-slate-100 shadow-2xl animate-in zoom-in">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingProduct ? 'Ubah Menu' : 'Menu Baru'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500 p-2"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] ml-2">Nama Menu Produk</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-[24px] p-6 text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#4089C9]/10 font-bold text-lg transition-all"
                  placeholder="Contoh: Nasi Kucing Teri"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] ml-2">Harga Jual (IDR)</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] p-6 text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#4089C9]/10 font-black text-2xl transition-all"
                    placeholder="3000"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({...formData, price: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] ml-2">Harga Modal (IDR)</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] p-6 text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-2xl transition-all"
                    placeholder="1800"
                    value={formData.costPrice || ''}
                    onChange={(e) => setFormData({...formData, costPrice: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] ml-2">Kategori Menu</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-[24px] p-6 text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#4089C9]/10 font-bold text-lg appearance-none transition-all"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                >
                  {Object.values(Category).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4 pt-6">
                <button type="button" onClick={closeModal} className="flex-1 py-5 bg-slate-100 text-slate-400 font-black rounded-[24px] active:scale-95 transition-all uppercase text-sm tracking-widest">BATAL</button>
                <button type="submit" className="flex-[2] py-5 bg-[#4089C9] text-white font-black text-xl rounded-[24px] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all">SIMPAN PERUBAHAN</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
