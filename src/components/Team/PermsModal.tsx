import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Key, X, Loader2 } from 'lucide-react';
import type { CRMUser } from './types';

interface Props {
  manager: CRMUser;
  folders: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function PermsModal({ manager, folders, onClose, onSuccess }: Props) {
  const [selectedFolders, setSelectedFolders] = useState<string[]>(
    manager.allowed_sources ? manager.allowed_sources.split(',') : []
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('crm_users')
      .update({ allowed_sources: selectedFolders.join(',') })
      .eq('id', manager.id);
    
    setSaving(false);
    if (error) alert('Error saving permissions');
    else onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1e293b] border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Key className="text-purple-400" /> Folder Access</h3>
            <p className="text-sm text-gray-400">Manager: <span className="text-white font-bold">{manager.real_name}</span></p>
          </div>
          <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
        </div>
        
        {/* FOLDER LIST */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          {folders.length === 0 ? (
            <div className="col-span-2 text-center text-gray-500 py-10 italic">
                No folders found in CRM Leads yet. <br/>Upload some leads to see folders here.
            </div>
          ) : (
             folders.map(folder => (
                <label key={folder} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${selectedFolders.includes(folder) ? 'bg-purple-500/20 border-purple-500/50' : 'bg-crm-bg border-gray-700 hover:border-gray-500'}`}>
                <input type="checkbox" className="w-5 h-5 rounded bg-gray-800 border-gray-600 accent-purple-500"
                    checked={selectedFolders.includes(folder)}
                    onChange={(e) => {
                    if(e.target.checked) setSelectedFolders([...selectedFolders, folder]);
                    else setSelectedFolders(selectedFolders.filter(f => f !== folder));
                    }}
                />
                <span className="text-sm font-mono text-gray-300 truncate">📁 {folder}</span>
                </label>
            ))
          )}
        </div>
        
        <div className="p-6 border-t border-gray-700 bg-crm-bg">
          <button onClick={handleSave} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold shadow-lg transition flex justify-center items-center gap-2">
            {saving && <Loader2 className="animate-spin" size={16} />}
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
}