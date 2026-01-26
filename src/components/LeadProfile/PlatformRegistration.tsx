import { useState, useEffect } from 'react';
import { Server, Key, Plus, Shield, User, Loader2, CheckCircle, X, Lock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

// ✅ USE YOUR EXISTING KEYS
const DB_URL = import.meta.env.VITE_SUPABASE_URL;
const DB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safety Check
if (!DB_URL || !DB_KEY) {
  console.error("CRITICAL ERROR: Keys are missing from .env");
}

// ⚡ CLEAN CLIENT: Uses unique storageKey to isolate registration session
const registrationClient = createClient(DB_URL || '', DB_KEY || '', {
  auth: {
    persistSession: false, 
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'crm-platform-registration-client' // Unique key prevents conflict
  }
});

interface Props {
  lead: any;
}

export default function PlatformRegistration({ lead }: Props) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Checks if user is already registered (from DB or local state)
  const [isRegistered, setIsRegistered] = useState(!!lead.trading_account_id);

  const [formData, setFormData] = useState({
    login: lead.email || '', 
    password: '',
  });

  // Auto-hide popup
  useEffect(() => {
    if (successMsg) {
        const timer = setTimeout(() => setSuccessMsg(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password: pass });
  };

  const handleRegister = async () => {
    if (!formData.login || !formData.password) {
        setSuccessMsg("Error: Please fill in login and password"); 
        alert("Please fill in both Login and Password fields.");
        return;
    }

    setLoading(true);

    try {
        // 1. Create User in Auth System
        const { data, error } = await registrationClient.auth.signUp({
            email: formData.login,
            password: formData.password,
            options: {
                data: {
                    role: 'user',        
                    balance: 10000,      
                    source: 'crm',
                    full_name: lead.name || '' 
                }
            }
        });

        if (error) throw error;
        if (!data.user?.id) throw new Error("No User ID returned");

        // 2. IMPORTANT: Save the new Trading ID to the CRM Lead
        await supabase
            .from('crm_leads')
            .update({ trading_account_id: data.user.id })
            .eq('id', lead.id);

        // 3. Update UI State
        setIsRegistered(true);
        setSuccessMsg(`Trading Account Created Successfully! ID: ${data.user.id.slice(0, 8)}...`);

    } catch (err: any) {
        console.error("Registration Error:", err);
        alert("Registration Failed: " + (err.message || "Unknown error"));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
      
      {/* --- AMAZING SUCCESS POPUP --- */}
      {successMsg && (
        <div className="fixed top-10 right-10 z-50 animate-in slide-in-from-top-10 fade-in duration-300">
            <div className="bg-crm-bg border border-green-500/30 rounded-2xl shadow-2xl shadow-green-500/20 p-5 flex items-center gap-4 min-w-75 relative overflow-hidden">
                {/* Fixed: bg-linear-to-b */}
                <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-green-400 to-emerald-600"></div>
                <div className="p-3 bg-green-500/10 rounded-full text-green-400">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm">System Success</h4>
                    <p className="text-gray-400 text-xs mt-0.5">{successMsg}</p>
                </div>
                <button onClick={() => setSuccessMsg(null)} className="ml-auto text-gray-500 hover:text-white transition cursor-pointer">
                    <X size={16} />
                </button>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center justify-between relative overflow-hidden">
        <div className="flex items-center gap-5 relative z-10">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${isRegistered ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-blue-500/20 bg-blue-500/10 text-blue-400'}`}>
                {isRegistered ? <CheckCircle size={24} /> : <Server size={24} />}
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Platform Access</h2>
                {isRegistered && <span className="text-xs text-green-400 font-bold uppercase tracking-widest">Active & Connected</span>}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="col-span-12 lg:col-span-7">
              
              {/* CONDITION: IF REGISTERED -> SHOW LOCKED CARD */}
              {isRegistered ? (
                  // Fixed: min-h-75
                  <div className="p-8 rounded-2xl border border-green-500/20 bg-green-500/5 text-center flex flex-col items-center justify-center h-full min-h-75">
                      <div className="p-4 rounded-full bg-green-500/10 text-green-400 mb-4 shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                          <CheckCircle size={48} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Registration Complete</h3>
                      <p className="text-gray-400 text-sm max-w-xs mx-auto mb-6">
                          This client already has a connected Trading Account. You cannot create a duplicate account.
                      </p>
                      <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-lg border border-white/10">
                          <Lock size={14} className="text-gray-500" />
                          <span className="text-xs text-gray-400 font-mono">ID: {lead.trading_account_id || 'LINKED'}</span>
                      </div>
                  </div>
              ) : (
                  // ELSE -> SHOW REGISTRATION FORM
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5 space-y-6">
                     <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Plus size={16} className="text-blue-400"/> Create New Account
                     </h3>

                     {/* Login */}
                     <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Login / Username</label>
                        <div className="relative">
                            <User size={14} className="absolute left-3 top-2.5 text-gray-500" />
                            <input 
                                type="text" 
                                value={formData.login} 
                                onChange={(e) => setFormData({...formData, login: e.target.value})}
                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition placeholder:text-gray-600"
                                placeholder="Enter Login"
                            />
                        </div>
                     </div>

                     {/* Password */}
                     <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Master Password</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Key size={14} className="absolute left-3 top-2.5 text-gray-500" />
                                <input 
                                    type="text" 
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition"
                                    placeholder="Enter or Generate"
                                />
                            </div>
                            <button 
                                onClick={generatePassword}
                                className="cursor-pointer px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-blue-400 hover:bg-white/10 transition"
                            >
                                GEN
                            </button>
                        </div>
                     </div>

                     {/* Create Button */}
                     <button 
                        onClick={handleRegister}
                        disabled={loading || !formData.password || !formData.login}
                        // Fixed: bg-linear-to-r
                        className="cursor-pointer w-full bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm shadow-lg shadow-blue-500/20 mt-4 flex items-center justify-center gap-2"
                     >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                        {loading ? 'Creating in Database...' : 'CREATE TRADING ACCOUNT'}
                     </button>
                  </div>
              )}
          </div>

          {/* RIGHT: INFO */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
                  <div className="flex items-start gap-3">
                      <Shield className="text-yellow-400 shrink-0" size={20} />
                      <div>
                          <h4 className="text-sm font-bold text-yellow-400 mb-1">Live Connection</h4>
                          <p className="text-xs text-yellow-200/70 leading-relaxed">
                              This form connects directly to your <b>Trading Database</b>. Users created here can log in to the trading platform immediately.
                          </p>
                          <div className="h-px bg-yellow-500/20 my-3"></div>
                          <p className="text-xs text-yellow-200/70 leading-relaxed">
                              After registration, you need to complete KYC and then make the profile Verified.
                          </p>
                      </div>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}