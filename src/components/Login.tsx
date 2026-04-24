import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { Loader2, Lock, User, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (userData: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const lowerUsername = username.toLowerCase().trim();

    // Credenciales predeterminadas para las psicólogas (Respaldo)
    const fallbackUsers: Record<string, { display_name: string, password: string }> = {
      'rosalia': { display_name: 'Psic. Rosalía', password: '1234' },
      'alexandra': { display_name: 'Psic. Alexandra', password: '1234' },
    };

    try {
      // 1. Intentar validar con credenciales de respaldo primero para asegurar el acceso en la feria
      if (fallbackUsers[lowerUsername] && fallbackUsers[lowerUsername].password === password) {
        onLogin({
          username: lowerUsername,
          display_name: fallbackUsers[lowerUsername].display_name
        });
        setLoading(false);
        return;
      }

      // 2. Si no es un usuario de respaldo, intentar con la base de datos
      const { data, error: signInError } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', lowerUsername)
        .eq('password', password)
        .maybeSingle();

      if (signInError) throw signInError;

      if (data) {
        onLogin(data);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Error al conectar con el sistema. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
      
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl p-2">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => (e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Heart_coraz%C3%B3n.svg/1200px-Heart_coraz%C3%B3n.svg.png')}
                />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight uppercase leading-none mb-1">Politécnico</h1>
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em]">Gestión Disciplinaria</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nombre de Usuario</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. rosalia"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-900"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-900"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-bold uppercase tracking-tight leading-tight">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Acceder al Sistema</span>
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="px-10 pb-10 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Uso Restringido para Personal Autorizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
