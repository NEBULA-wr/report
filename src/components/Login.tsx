import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { Loader2, Lock, User, ShieldCheck, Users } from 'lucide-react';

interface LoginProps {
  onLogin: (userData: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'parent'>('admin');
  
  // Admin fields
  const [username, setUsername] = useState('rosalia');
  const [password, setPassword] = useState('1234');
  
  // Parent fields
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitAdmin = async (e: React.FormEvent) => {
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
          display_name: fallbackUsers[lowerUsername].display_name,
          role: 'admin'
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
        onLogin({ ...data, role: 'admin' });
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

  const handleSubmitParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedName = studentName.trim().toLowerCase();
    const normalizedId = studentId.trim();

    if (!normalizedName && !normalizedId) {
      setError('Debe proporcionar el nombre o la matrícula del estudiante.');
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('reports').select('student_name, student_id');

      if (normalizedId) {
        // If matricula is provided, use it as the primary search
        query = query.eq('student_id', normalizedId);
      } else {
        // If only name is provided, search by exact match or ilike
        query = query.ilike('student_name', `%${normalizedName}%`);
      }

      const { data, error: fetchError } = await query.limit(1).maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // If they provided a name, we can do a loose validation if we want,
        // but finding by matricula is strong enough.
        // Also if they provided name and name has matching words:
        if (normalizedName && normalizedId) {
          const inputWords = normalizedName.split(' ').filter(w => w.length > 0);
          const dbName = data.student_name.toLowerCase();
          const hasMatch = inputWords.every(word => dbName.includes(word));
          
          if (!hasMatch) {
             // In case the name has absolutely nothing to do with it, but we can be forgiving
             // Let's just log them in anyway since they have the matricula, but maybe warn them?
             // Actually, the prompt says "funcione si pone la matricula", so if matricula matches, it works!
          }
        }

        onLogin({
          username: data.student_id,
          display_name: `Tutor de ${data.student_name}`,
          role: 'parent'
        });
      } else {
        // Fallback: if we searched by matricula and didn't find, try searching by name if provided
        if (normalizedId && normalizedName) {
           const inputWords = normalizedName.split(' ').filter(w => w.length > 0);
           // We can't easily do a multi-word ilike in supabase without multiple ilike conditions
           // Let's just say "not found"
           setError('No se encontraron reportes para los datos proporcionados.');
        } else {
           setError('No se encontraron reportes para los datos proporcionados.');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Error al buscar los datos. Verifique su conexión.');
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
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden pb-8">
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
            
            {/* Tabs */}
            <div className="relative z-10 flex mt-8 bg-slate-800/50 p-1.5 rounded-2xl">
              <button
                onClick={() => { setActiveTab('admin'); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'admin' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => { setActiveTab('parent'); setError(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'parent' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Padres
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-10">
            {activeTab === 'admin' ? (
              <form onSubmit={handleSubmitAdmin} className="space-y-6">
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
            ) : (
              <form onSubmit={handleSubmitParent} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nombre Completo (Opcional si tiene matrícula)</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Matrícula (Opcional si escribe el nombre exacto)</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="Ej. 2023001"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-900"
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
                      <span>Ver Reportes</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-10 pb-10 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {activeTab === 'admin' ? 'Uso Restringido para Personal Autorizado' : 'Portal exclusivo para Padres y Tutores'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
