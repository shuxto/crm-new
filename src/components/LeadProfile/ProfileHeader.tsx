import { ArrowLeft, User, Phone, Mail, Globe, ShieldCheck } from 'lucide-react';

interface ProfileHeaderProps {
  lead: any;
  onBack: () => void;
}

export default function ProfileHeader({ lead, onBack }: ProfileHeaderProps) {
  return (
    <div className="glass-panel p-6 rounded-xl border border-white/5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div className="flex items-center gap-6">
        {/* BACK BUTTON */}
        <button 
          onClick={onBack}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>

        {/* AVATAR & NAME */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
            <User size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{lead.name}</h1>
              <span className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase tracking-widest">
                {lead.status}
              </span>
            </div>
            <p className="text-gray-500 text-xs font-mono mt-1">UUID: {lead.id} • Created: {lead.created_at}</p>
          </div>
        </div>
      </div>

      {/* QUICK CONTACT INFO */}
      <div className="flex gap-6 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Contact</span>
          <div className="flex items-center gap-2 text-gray-300">
            <Phone size={14} className="text-blue-500" /> {lead.phone}
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Mail size={14} className="text-blue-500" /> {lead.email}
          </div>
        </div>
        <div className="flex flex-col gap-1 border-l border-white/10 pl-6">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Location</span>
          <div className="flex items-center gap-2 text-gray-300">
            <Globe size={14} className="text-blue-500" /> {lead.country}
          </div>
          <div className="flex items-center gap-2 text-yellow-500">
            <ShieldCheck size={14} /> KYC Pending
          </div>
        </div>
      </div>
    </div>
  );
}