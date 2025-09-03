import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
      <div className="bg-[#222] text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 max-w-md pointer-events-auto animate-fade-in border border-white/20">
        <span className="text-sm">{message}</span>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}