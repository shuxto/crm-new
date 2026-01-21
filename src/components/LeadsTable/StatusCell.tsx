import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Props {
  currentStatus: string;
  leadId: string;
  options: any[];
  onUpdate: (id: string, status: string) => void;
  rowIndex: number;
  totalRows: number;
}

export default function StatusCell({ currentStatus, leadId, options, onUpdate, rowIndex, totalRows }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 1. INSTANT STATE (Ferrari Mode)
  // We start with the real status, but when you click, we update THIS immediately.
  const [visualStatus, setVisualStatus] = useState(currentStatus);

  const menuRef = useRef<HTMLDivElement>(null);
  const openUpwards = rowIndex > totalRows - 5; 

  // 2. SYNC: If the database sends a Realtime update, we sync our visual state
  useEffect(() => {
    setVisualStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (newStatus: string) => {
    if (newStatus !== visualStatus) {
        // A. UPDATE VISUALLY INSTANTLY (0ms latency)
        setVisualStatus(newStatus); 
        
        // B. SEND TO BACKEND
        onUpdate(leadId, newStatus);
    }
    setIsOpen(false);
  };

  // Find color based on the VISUAL status, not the database status
  const activeDef = options.find((o: any) => o.label === visualStatus);
  const activeColor = activeDef ? activeDef.hex_color : '#64748b';

  return (
    <div className="relative flex justify-center w-full" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 w-32 group hover:brightness-110"
        style={{ backgroundColor: `${activeColor}15`, borderColor: `${activeColor}40`, color: activeColor }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider truncate flex-1 text-center">
            {visualStatus}
        </span>
        <ChevronDown size={10} className={`opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-1/2 -translate-x-1/2 w-48 bg-[#1e293b] border border-gray-600 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto custom-scrollbar ${openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <div className="py-1">
            {options.map((opt: any) => (
              <button key={opt.label} onClick={() => handleSelect(opt.label)} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors">
                <div className="w-2 h-2 rounded-full shadow-[0_0_5px]" style={{ backgroundColor: opt.hex_color, boxShadow: `0 0 5px ${opt.hex_color}` }} />
                <span className={opt.label === visualStatus ? 'text-white font-bold' : ''}>{opt.label}</span>
                {opt.label === visualStatus && <Check size={10} className="ml-auto text-blue-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}