import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  type?: 'danger' | 'success' | 'info';
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function ConfirmationModal({ isOpen, type = 'danger', title, message, onConfirm, onClose, loading }: Props) {
  if (!isOpen) return null;

  const styles = {
    danger: {
      icon: <AlertTriangle className="text-red-500" size={32} />,
      btn: "bg-red-600 hover:bg-red-500 shadow-red-500/20",
      border: "border-red-500/20 bg-red-500/5",
      title: "text-red-500"
    },
    success: {
      icon: <CheckCircle2 className="text-green-500" size={32} />,
      btn: "bg-green-600 hover:bg-green-500 shadow-green-500/20",
      border: "border-green-500/20 bg-green-500/5",
      title: "text-green-500"
    },
    info: {
      icon: <AlertTriangle className="text-blue-500" size={32} />,
      btn: "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20",
      border: "border-blue-500/20 bg-blue-500/5",
      title: "text-blue-500"
    }
  };

  const currentStyle = styles[type];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`p-6 flex flex-col items-center text-center border-b border-gray-700 ${currentStyle.border}`}>
          <div className="mb-4 bg-crm-bg p-4 rounded-full border border-gray-700 shadow-inner">
            {currentStyle.icon}
          </div>
          <h3 className={`text-xl font-bold ${currentStyle.title} mb-2`}>{title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-crm-bg flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition border border-transparent hover:border-gray-600"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${currentStyle.btn}`}
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>

      </div>
    </div>
  );
}