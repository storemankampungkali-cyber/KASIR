
import React from 'react';
import { useStore } from '../store';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-4 bg-white/90 backdrop-blur-xl border border-slate-200/60 p-5 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-80 animate-in slide-in-from-right duration-500 overflow-hidden relative group"
        >
          {/* Status Indicator Line */}
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
            toast.type === 'SUCCESS' ? 'bg-emerald-500' : 
            toast.type === 'ERROR' ? 'bg-red-500' : 'bg-[#4089C9]'
          }`} />

          <div className={`mt-0.5 shrink-0 ${
            toast.type === 'SUCCESS' ? 'text-emerald-500' : 
            toast.type === 'ERROR' ? 'text-red-500' : 'text-[#4089C9]'
          }`}>
            {toast.type === 'SUCCESS' && <CheckCircle size={22} />}
            {toast.type === 'ERROR' && <AlertCircle size={22} />}
            {toast.type === 'INFO' && <Info size={22} />}
          </div>

          <div className="flex-1">
            <h4 className="font-black text-slate-900 text-sm leading-tight">{toast.title}</h4>
            <p className="text-slate-500 text-xs font-medium mt-1 leading-relaxed">{toast.message}</p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-300 hover:text-slate-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
