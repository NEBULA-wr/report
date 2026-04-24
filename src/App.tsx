    import React, { useState, useEffect } from 'react';
    import { ReportForm } from './components/ReportForm';
    import { ReportHistory } from './components/ReportHistory';
    import { ReportCharts } from './components/ReportCharts';
    import { Login } from './components/Login';
    import { Button } from './components/Button';
    import { FilePlus2, History, GraduationCap, AlertTriangle, X, ShieldCheck, BarChart3, LogOut, User as UserIcon } from 'lucide-react';
    import { supabase } from './lib/supabase';
    import { SystemUser } from './types';

    interface BlacklistStudent {
      student_id: string;
      student_name: string;
      course: string;
      total_reports: number;
      last_report_at: string;
    }

    export default function App() {
      const [user, setUser] = useState<SystemUser | null>(null);
      const [view, setView] = useState<'form' | 'history' | 'charts'>('form');
      const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
      const [blacklist, setBlacklist] = useState<BlacklistStudent[]>([]);
      const [showAlert, setShowAlert] = useState(false);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const savedUser = localStorage.getItem('disciplina_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        fetchBlacklist();
      }, []);

      const handleLogin = (userData: any) => {
        const userToSave = {
          username: userData.username,
          display_name: userData.display_name
        };
        setUser(userToSave);
        localStorage.setItem('disciplina_user', JSON.stringify(userToSave));
      };

      const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('disciplina_user');
      };

      const handleViewChange = (newView: 'form' | 'history' | 'charts') => {
        if (newView !== 'history') {
          setSelectedStudentId(null);
        }
        setView(newView);
      };

      const handleStudentClick = (studentId: string) => {
        setSelectedStudentId(studentId);
        setView('history');
      };

      const fetchBlacklist = async () => {
        try {
          // Fetch students with 5+ reports
          const { data: students, error: blacklistError } = await supabase
            .from('blacklist')
            .select('*');

          if (blacklistError) throw blacklistError;

          // Fetch penalized students
          const { data: penalties, error: penaltyError } = await supabase
            .from('penalties')
            .select('*');

          if (penaltyError && penaltyError.code !== 'PGRST116') {
            // If table doesn't exist, we'll just show everyone
            console.warn('Penalties table might not exist yet');
          }

          // Filter out students who were penalized AFTER their last report
          const activeBlacklist = (students || []).filter(student => {
            const studentPenalties = (penalties || []).filter(p => p.student_id === student.student_id);
            if (studentPenalties.length === 0) return true;
            
            // Get the most recent penalty for this student
            const latestPenalty = studentPenalties.sort((a, b) => 
              new Date(b.penalized_at).getTime() - new Date(a.penalized_at).getTime()
            )[0];
            
            // If the latest penalty is before the last report, they are still on the blacklist
            return new Date(latestPenalty.penalized_at) < new Date(student.last_report_at);
          });

          if (activeBlacklist.length > 0) {
            setBlacklist(activeBlacklist);
            setShowAlert(true);
          } else {
            setShowAlert(false);
          }
        } catch (err) {
          console.error('Error fetching blacklist:', err);
        } finally {
          setLoading(false);
        }
      };

      if (!user) {
        return <Login onLogin={handleLogin} />;
      }

      return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
          {/* Professional Blacklist Alert Overlay */}
          {showAlert && blacklist.length > 0 && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-6 animate-in fade-in duration-500">
              <div className="max-w-4xl w-full bg-white rounded-[2.5rem] shadow-[0_0_100px_rgba(220,38,38,0.3)] overflow-hidden border border-red-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-red-600 p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/30">
                      <AlertTriangle className="w-12 h-12 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-4xl font-black uppercase tracking-tighter text-white italic">Protocolo de Conducta Crítica</h2>
                      <p className="text-red-100 text-sm font-bold uppercase tracking-widest opacity-80">Alerta de Seguridad Institucional</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                  <div className="text-center mb-8">
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">Se han detectado estudiantes con un historial disciplinario crítico que requieren atención inmediata.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {blacklist.map(student => (
                      <div key={student.student_id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-red-200 transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 font-black text-2xl">
                            {student.total_reports}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-1">{student.course}</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{student.student_name}</h3>
                            <p className="text-xs font-bold text-slate-600">Matrícula: {student.student_id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Estado</p>
                          <p className="text-xs font-black text-red-600 uppercase tracking-tighter mt-1">Requiere Intervención</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    onClick={() => setShowAlert(false)}
                    className="px-12 py-6 text-sm font-black rounded-2xl border-2 border-slate-200 text-slate-500 hover:bg-slate-100 uppercase tracking-widest"
                  >
                    Cerrar Advertencia
                  </Button>
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => {
                      if (blacklist.length > 0) {
                        handleStudentClick(blacklist[0].student_id);
                        setShowAlert(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 text-sm font-black rounded-2xl shadow-xl flex gap-3 transition-transform active:scale-95 uppercase tracking-widest"
                  >
                    Revisar y Penalizar <ShieldCheck className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Bar */}
          <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm p-1 shrink-0">
                    <img 
                      src="/logo.png" 
                      alt="Logo" 
                      className="w-full h-full object-contain" 
                      onError={(e) => (e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Heart_coraz%C3%B3n.svg/1200px-Heart_coraz%C3%B3n.svg.png')} 
                    />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-xl font-black tracking-tight text-slate-900 leading-tight uppercase truncate max-w-[150px] sm:max-w-none">Politécnico Hermana Rosario Torres</h1>
                    <p className="text-[7px] sm:text-[9px] uppercase font-black text-slate-600 tracking-[0.1em] sm:tracking-[0.2em] mt-0.5">Gestión Disciplinaria</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="hidden md:flex items-center gap-3 mr-4 pr-4 border-r border-slate-200">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase text-slate-900 tracking-tighter leading-none">{user.display_name}</p>
                      <p className="text-[8px] font-bold uppercase text-slate-400">Personal Autorizado</p>
                    </div>
                  </div>
                  
                  <Button
                    variant={view === 'form' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('form')}
                    className={`flex gap-2 rounded-xl px-2 sm:px-4 ${view === 'form' ? 'bg-slate-900' : ''}`}
                  >
                    <FilePlus2 className="w-4 h-4" />
                    <span className="hidden lg:inline font-bold uppercase text-[10px] tracking-widest">Nuevo Reporte</span>
                  </Button>
                  <Button
                    variant={view === 'history' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('history')}
                    className={`flex gap-2 rounded-xl px-2 sm:px-4 ${view === 'history' ? 'bg-slate-900' : ''}`}
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden lg:inline font-bold uppercase text-[10px] tracking-widest">Historial</span>
                  </Button>
                  <Button
                    variant={view === 'charts' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('charts')}
                    className={`flex gap-2 rounded-xl px-2 sm:px-4 ${view === 'charts' ? 'bg-slate-900' : ''}`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden lg:inline font-bold uppercase text-[10px] tracking-widest">Gráfico</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="flex gap-2 rounded-xl px-2 sm:px-4 text-red-600 hover:bg-red-50 hover:text-red-700"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {view === 'form' ? (
              <div className="space-y-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                  <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase mb-4">Registro de Incidencias</h2>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-widest px-4">
                    Complete el expediente disciplinario oficial para su procesamiento.
                  </p>
                </div>
                <ReportForm 
                  user={user}
                  onSuccess={() => {
                    setView('history');
                    fetchBlacklist();
                  }} 
                />
              </div>
            ) : view === 'history' ? (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Historial de Reportes</h2>
                    <p className="text-sm font-medium text-slate-600 uppercase tracking-widest mt-1">Archivo de expedientes generados.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setView('form')} 
                    className="flex gap-2 rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest"
                  >
                    <FilePlus2 className="w-4 h-4" /> Crear Nuevo
                  </Button>
                </div>
                <ReportHistory 
                  key={selectedStudentId || 'all'} 
                  onPenaltyUpdate={fetchBlacklist} 
                  initialStudentId={selectedStudentId} 
                />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Análisis de Datos</h2>
                    <p className="text-sm font-medium text-slate-600 uppercase tracking-widest mt-1">Visualización de incidencias por curso.</p>
                  </div>
                </div>
                <ReportCharts onStudentClick={handleStudentClick} />
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-slate-100 p-3 rounded-xl opacity-50">
                  <GraduationCap className="w-8 h-8 text-slate-600" />
                </div>
              </div>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">© {new Date().getFullYear()} Politécnico Hermana Rosario Torres Fe y Alegría.</p>
              <p className="text-slate-300 text-[9px] uppercase font-bold mt-2">Sistema de Gestión de Convivencia Escolar</p>
            </div>
          </footer>
        </div>
      );
    }
