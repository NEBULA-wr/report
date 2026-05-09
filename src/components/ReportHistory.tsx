  import React, { useEffect, useState } from 'react';
  import { supabase } from '../lib/supabase';
  import { Report } from '../types';
  import { Button } from './Button';
  import { FileText, Download, Search, Filter, Loader2, Calendar, User, BarChart3, AlertTriangle, AlertCircle, Trash2, ShieldCheck, X, Printer, ArrowLeft, ChevronDown, Check } from 'lucide-react';
  import { format } from 'date-fns';
  import { es } from 'date-fns/locale';
  import { generatePDF } from '../lib/pdf';
  import { ReportPreview } from './ReportPreview';
  import { ConfirmModal } from './ConfirmModal';
  import { parseLocalDate } from '../lib/utils';

  interface ReportHistoryProps {
    onPenaltyUpdate?: () => void;
    initialStudentId?: string | null;
    isParentMode?: boolean;
  }

  export const ReportHistory: React.FC<ReportHistoryProps> = ({ onPenaltyUpdate, initialStudentId, isParentMode }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [viewingStudentId, setViewingStudentId] = useState<string | null>(initialStudentId || null);
    const [sortBy, setSortBy] = useState<'date' | 'severity'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [penalizingId, setPenalizingId] = useState<string | null>(null);
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    
    // Bulk and profile actions
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [showProfileDeleteConfirm, setShowProfileDeleteConfirm] = useState<boolean>(false);

    useEffect(() => {
      fetchReports();
    }, []);

    const fetchReports = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (isParentMode && initialStudentId) {
          query = query.eq('student_id', initialStudentId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setReports(data || []);
      } catch (error) {
        console.error('Error fetching reports:', error);
        showStatus('error', 'Error al cargar los reportes');
      } finally {
        setLoading(false);
      }
    };

    const showStatus = (type: 'success' | 'error', text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 5000);
    };

    const handleMarkAsPenalized = async (studentId: string) => {
      setPenalizingId(studentId);
      try {
        const { error } = await supabase
          .from('penalties')
          .upsert({ 
            student_id: studentId, 
            penalized_at: new Date().toISOString() 
          }, { onConflict: 'student_id' });

        if (error) throw error;
        
        showStatus('success', 'Estudiante marcado como penalizado correctamente');
        if (onPenaltyUpdate) onPenaltyUpdate();
      } catch (error) {
        console.error('Error penalizing student:', error);
        showStatus('error', 'Error al penalizar al estudiante. Asegúrese de que la tabla "penalties" existe.');
      } finally {
        setPenalizingId(null);
      }
    };

    const handleDelete = async (id: string) => {
      setDeletingId(id);
      try {
        const { error } = await supabase
          .from('reports')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        setReports(prev => prev.filter(r => r.id !== id));
        showStatus('success', 'Reporte eliminado correctamente');
        if (onPenaltyUpdate) onPenaltyUpdate();
      } catch (error) {
        console.error('Error deleting report:', error);
        showStatus('error', 'Error al eliminar el reporte');
      } finally {
        setDeletingId(null);
        setShowDeleteConfirm(null);
      }
    };

    const handleDeleteProfile = async () => {
      if (!viewingStudentId) return;
      setBulkActionLoading(true);
      try {
        const { error } = await supabase
          .from('reports')
          .delete()
          .eq('student_id', viewingStudentId);

        if (error) throw error;
        
        setReports(prev => prev.filter(r => r.student_id !== viewingStudentId));
        showStatus('success', 'Perfil y reportes eliminados correctamente');
        if (onPenaltyUpdate) onPenaltyUpdate();
        setViewingStudentId(null);
      } catch (error) {
        console.error('Error deleting profile:', error);
        showStatus('error', 'Error al eliminar el perfil');
      } finally {
        setBulkActionLoading(false);
        setShowProfileDeleteConfirm(false);
      }
    };

    const toggleReportSelection = (reportId: string) => {
      const newSet = new Set(selectedReportIds);
      if (newSet.has(reportId)) newSet.delete(reportId);
      else newSet.add(reportId);
      setSelectedReportIds(newSet);
    };

    const toggleAllSelection = () => {
      if (!viewingStudentId) return;
      const studentReports = groupedReports[viewingStudentId] || [];
      if (selectedReportIds.size === studentReports.length) {
        setSelectedReportIds(new Set());
      } else {
        setSelectedReportIds(new Set(studentReports.map(r => r.id!)));
      }
    };

    const handleDownloadSelected = async () => {
      if (selectedReportIds.size === 0) return;
      setBulkActionLoading(true);
      
      try {
        const idsArray = Array.from(selectedReportIds);
        for (const reportId of idsArray) {
          const report = reports.find(r => r.id === reportId);
          if (report) {
            await handleDownloadPDF(report);
            await new Promise(r => setTimeout(r, 500));
          }
        }
        showStatus('success', 'Descarga de reportes seleccionados completada');
      } catch (err) {
        showStatus('error', 'Error durante la descarga múltiple');
      } finally {
        setBulkActionLoading(false);
        setSelectedReportIds(new Set());
      }
    };

    const filteredReports = reports.filter(r => 
      r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const severityScore = (type: string) => {
      switch (type) {
        case 'Muy Grave': return 3;
        case 'Grave': return 2;
        case 'Leve': return 1;
        default: return 0;
      }
    };

    const sortedReports = [...filteredReports].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.report_date).getTime();
        const dateB = new Date(b.report_date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const scoreA = severityScore(a.offense_type);
        const scoreB = severityScore(b.offense_type);
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      }
    });

    const groupedReports = sortedReports.reduce((acc, report) => {
      if (!acc[report.student_id]) {
        acc[report.student_id] = [];
      }
      acc[report.student_id].push(report);
      return acc;
    }, {} as Record<string, Report[]>);

    // Get unique student IDs in the order they appear in sorted reports
    const studentIds = Array.from(new Set(sortedReports.map(r => r.student_id)));

    // Calculate stats for the current search/filter
    const getStats = () => {
      const stats = {
        total: filteredReports.length,
        leve: filteredReports.filter(r => r.offense_type === 'Leve').length,
        grave: filteredReports.filter(r => r.offense_type === 'Grave').length,
        muyGrave: filteredReports.filter(r => r.offense_type === 'Muy Grave').length,
      };
      return stats;
    };

    const stats = getStats();

    // Get student info for the search term if it matches exactly one student or mostly one
    const searchStudentInfo = searchTerm.length >= 3 ? filteredReports[0] : null;

    const handleDownloadPDF = async (report: Report) => {
      if (!report.id) return;
      setGeneratingPdfId(report.id);
      try {
        const dateStr = report.report_date;
        const studentName = report.student_name.trim().replace(/\s+/g, '_');
        const matricula = report.student_id.trim();
        const filename = `Reporte_${dateStr}_${studentName}_${matricula}.pdf`;

        // Wait for the hidden export container to render and images to be ready
        await new Promise(resolve => setTimeout(resolve, 1500));
        const elementId = `report-export-target-${report.id}`;
        await generatePDF(report.id, elementId, filename);
      } catch (err) {
        console.error('Error in handleDownloadPDF:', err);
        showStatus('error', 'Error al generar el PDF. Intente de nuevo.');
      } finally {
        setGeneratingPdfId(null);
      }
    };

    const handlePrint = () => {
      window.print();
    };

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium">Cargando historial de reportes...</p>
        </div>
      );
    }

    if (viewingStudentId) {
      const studentReports = groupedReports[viewingStudentId];
      if (!studentReports) {
        setViewingStudentId(null);
        return null;
      }
      const firstReport = studentReports[0];
      const totalReports = studentReports.length;

      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
          {/* Top Navigation Bar */}
          {!isParentMode && (
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <button 
                onClick={() => setViewingStudentId(null)}
                className="flex items-center gap-3 text-slate-500 hover:text-indigo-600 font-bold uppercase text-[10px] tracking-[0.2em] transition-all group"
              >
                <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-indigo-50 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                Volver al Listado General
              </button>
              <div className="flex items-center gap-4">
                <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Expediente Activo:</span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">{viewingStudentId}</span>
                </div>
              </div>
            </div>
          )}

          {/* Student Profile Header - Clean Light Professional Design */}
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="relative bg-white p-8 md:p-12 text-slate-900">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full -mr-64 -mt-64 blur-[100px]" />
              <div className="absolute bottom-0 left-0 w-full h-full opacity-[0.02] pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 relative z-10 text-center lg:text-left">
                {/* Profile Image with Technical Border */}
                <div className="relative group shrink-0">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-teal-500 rounded-[2.5rem] opacity-10 blur group-hover:opacity-20 transition-opacity duration-500" />
                  {firstReport.evidence_image_url ? (
                    <img src={firstReport.evidence_image_url} alt="" className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-[2.2rem] object-cover border-4 border-white shadow-2xl" />
                  ) : (
                    <div className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-[2.2rem] bg-slate-100 flex items-center justify-center border-4 border-white shadow-2xl">
                      <User className="w-20 h-20 text-slate-300" />
                    </div>
                  )}
                  {totalReports >= 5 && (
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white p-3 rounded-2xl shadow-xl animate-bounce">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-6 w-full">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                      <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-slate-900 leading-tight">{firstReport.student_name}</h2>
                      {totalReports >= 5 && (
                        <span className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">
                          Riesgo Crítico
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-slate-600 font-mono text-xs sm:text-sm tracking-widest uppercase">
                      <span>{firstReport.course}</span>
                      <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-200" />
                      <span>Matrícula: {viewingStudentId}</span>
                    </div>
                  </div>
                  
                  {/* Stats Grid - Technical Style */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                      <p className="text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-1">Total Incidencias</p>
                      <div className="flex items-baseline justify-center lg:justify-start gap-2">
                        <span className="text-3xl font-black text-slate-900">{totalReports}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Registros</span>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                      <p className="text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-1">Última Actividad</p>
                      <div className="flex items-baseline justify-center lg:justify-start gap-2">
                        <span className="text-xl font-bold text-slate-900">{format(parseLocalDate(firstReport.report_date), "dd MMM", { locale: es })}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{format(parseLocalDate(firstReport.report_date), "yyyy")}</span>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                      <p className="text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-1">Estado Disciplinario</p>
                      <div className="flex items-center justify-center lg:justify-start gap-2">
                        <div className={`w-2 h-2 rounded-full ${totalReports >= 5 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`} />
                        <span className={`text-sm font-bold uppercase tracking-widest ${totalReports >= 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {totalReports >= 5 ? 'Bajo Observación' : 'Regular'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isParentMode && (
                  <div className="w-full lg:w-auto flex flex-col gap-3">
                    <Button 
                      variant="primary" 
                      onClick={() => handleMarkAsPenalized(viewingStudentId)}
                      disabled={penalizingId === viewingStudentId}
                      className="w-full lg:w-auto bg-slate-900 text-white hover:bg-slate-800 border-none rounded-2xl px-10 py-5 font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all hover:-translate-y-1 active:translate-y-0"
                    >
                      {penalizingId === viewingStudentId ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      Penalizar Estudiante
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowProfileDeleteConfirm(true)}
                      className="w-full lg:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar Perfil Completo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 md:p-12 bg-[#F8FAFC]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex flex-col gap-2">
                  <div className="space-y-1 flex items-center gap-4">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-200">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      Historial de Incidencias
                    </h3>
                  </div>
                  <p className="text-slate-600 text-xs font-medium uppercase tracking-[0.1em] ml-13">Cronología completa de reportes registrados</p>
                  
                  {!isParentMode && selectedReportIds.size > 0 && (
                    <div className="ml-13 mt-2">
                      <Button 
                        variant="primary"
                        size="sm"
                        onClick={handleDownloadSelected}
                        disabled={bulkActionLoading}
                        className="bg-cyan-600 hover:bg-cyan-700 flex items-center gap-2 tracking-widest uppercase text-[10px] rounded-xl px-4 py-2"
                      >
                        {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Descargar {selectedReportIds.size} Seleccionados
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  {!isParentMode && (
                    <button
                      onClick={toggleAllSelection}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-600 transition-colors"
                    >
                      {selectedReportIds.size === studentReports.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
                    </button>
                  )}
                  <div className="relative group" translate="no">
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [newSortBy, newSortOrder] = e.target.value.split('-') as [any, any];
                        setSortBy(newSortBy);
                        setSortOrder(newSortOrder);
                      }}
                      className="appearance-none bg-white pl-5 pr-12 py-2.5 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:ring-2 focus:ring-cyan-600 outline-none cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-100/50"
                    >
                      <option value="date-desc">Más Nuevos</option>
                      <option value="date-asc">Más Viejos</option>
                      <option value="severity-desc">Más Graves</option>
                      <option value="severity-asc">Más Leves</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-cyan-600 transition-colors" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {studentReports.map((report) => (
                  <div 
                    key={report.id}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-cyan-100/50 transition-all duration-500 group flex flex-col"
                  >
                    <div className="p-8 flex-1 flex flex-col space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {!isParentMode && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReportSelection(report.id!);
                              }}
                              className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors border ${
                                selectedReportIds.has(report.id!) 
                                  ? 'bg-cyan-600 border-cyan-600 text-white shadow-md' 
                                  : 'border-slate-300 hover:border-cyan-500 bg-white shadow-sm'
                              }`}
                            >
                              {selectedReportIds.has(report.id!) && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          )}
                          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-sm ${
                            report.offense_type === 'Leve' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            report.offense_type === 'Grave' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                            'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                            Falta {report.offense_type}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-300 group-hover:text-cyan-300 transition-colors">#{report.id?.slice(0, 8).toUpperCase()}</span>
                      </div>

                      <div className="space-y-3 flex-1">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-200" />
                          Descripción del Hecho
                        </div>
                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 group-hover:bg-cyan-50/30 group-hover:border-cyan-100 transition-all duration-500">
                          <p className="text-sm text-slate-600 leading-relaxed font-serif italic">"{report.reason}"</p>
                          {report.teacher_name && (
                            <div className="mt-4 pt-4 border-t border-slate-100/50">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reportado por:</p>
                              <p className="text-[11px] font-bold text-slate-700">{report.teacher_name}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-cyan-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{format(parseLocalDate(report.report_date), "dd MMM", { locale: es })}</span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase">{format(parseLocalDate(report.report_date), "yyyy")}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setSelectedReport(report)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all"
                            title="Ver Vista Previa"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          {!isParentMode && (
                            <>
                              <button 
                                onClick={() => handleDownloadPDF(report)}
                                className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all"
                                disabled={generatingPdfId === report.id}
                                title="Descargar PDF"
                              >
                                {generatingPdfId === report.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm(report.id!)}
                                className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                disabled={deletingId === report.id}
                                title="Eliminar Reporte"
                              >
                                {deletingId === report.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal for Preview */}
          {selectedReport && (
            <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto print-modal-container">
              <div className="relative bg-white rounded-3xl shadow-2xl max-w-5xl w-full my-4 overflow-hidden flex flex-col max-h-[95vh]">
                {/* Sticky Header */}
                <div className="sticky top-0 z-20 flex items-center justify-between p-5 bg-white border-b border-slate-100 shadow-sm no-print">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-lg">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest">Vista Previa Oficial</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Expediente: {selectedReport.id?.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isParentMode && (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleDownloadPDF(selectedReport)}
                        disabled={generatingPdfId === selectedReport.id}
                        className="flex gap-2 rounded-xl px-6 bg-slate-900 hover:bg-slate-800"
                      >
                        {generatingPdfId === selectedReport.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {generatingPdfId === selectedReport.id ? 'Generando...' : 'Descargar Reporte PDF'}
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedReport(null)}
                      className="rounded-xl px-4 hover:bg-red-50 hover:text-red-600"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-10 custom-scrollbar">
                  <div className="flex justify-center min-h-full">
                    <div className="report-preview-container transform scale-[0.6] sm:scale-[0.75] md:scale-[0.85] lg:scale-100 origin-top transition-transform duration-300">
                      <ReportPreview report={selectedReport} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <ConfirmModal
            isOpen={!!showDeleteConfirm}
            title="¿Eliminar Reporte?"
            message="Esta acción es permanente y el reporte desaparecerá del historial oficial."
            confirmText="Sí, Eliminar"
            cancelText="Cancelar"
            onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            onCancel={() => setShowDeleteConfirm(null)}
            variant="danger"
          />

          {/* Dedicated Hidden Container for PDF Generation (Off-screen but visible to capture tools) */}
          <div 
            className="fixed pointer-events-none bg-white z-[-100] overflow-hidden pdf-export-container" 
            aria-hidden="true"
            style={{ 
              width: '210mm', 
              height: '297mm', 
              left: '-10000px', 
              top: '0',
              visibility: 'visible',
              opacity: 1
            }}
          >
            {generatingPdfId && reports.find(r => r.id === generatingPdfId) && (
              <ReportPreview 
                report={reports.find(r => r.id === generatingPdfId)!} 
                isExporting={true} 
                id={`report-export-target-${generatingPdfId}`}
              />
            )}
          </div>
        </div>
      );
    }

    if (!viewingStudentId && isParentMode) {
      return (
        <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-in zoom-in duration-500">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registro Limpio</h3>
          <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">No se han encontrado reportes disciplinarios para este estudiante o han sido removidos.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Status Message */}
        {message && (
          <div className={`fixed top-20 right-4 z-[110] p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300 ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <p className="text-xs font-black uppercase tracking-tight">{message.text}</p>
              <button onClick={() => setMessage(null)} className="ml-4 opacity-50 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordenar por:</span>
              <div className="relative group" translate="no">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-') as [any, any];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="appearance-none bg-slate-100 pl-4 pr-10 py-2 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-tight text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer transition-all hover:bg-white hover:shadow-md"
                >
                  <option value="date-desc">Más Nuevos</option>
                  <option value="date-asc">Más Viejos</option>
                  <option value="severity-desc">Más Graves</option>
                  <option value="severity-asc">Más Leves</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none group-hover:text-slate-900 transition-colors" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-tight bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <Filter className="w-3.5 h-3.5" />
              <span>{filteredReports.length} reportes encontrados</span>
            </div>
          </div>
        </div>

        {searchTerm && filteredReports.length > 0 && (
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="flex items-center gap-6 relative z-10">
              {searchStudentInfo?.evidence_image_url ? (
                <img 
                  src={searchStudentInfo.evidence_image_url} 
                  alt="Estudiante" 
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-slate-50 shadow-xl"
                />
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <BarChart3 className="w-10 h-10 text-slate-400" />
                </div>
              )}
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3 text-slate-900">
                  {searchStudentInfo ? searchStudentInfo.student_name : 'Resumen de Incidencias'}
                  {stats.total >= 5 && (
                    <div className="flex items-center gap-2">
                      <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter animate-pulse shadow-lg">
                        Lista Negra
                      </span>
                      {searchStudentInfo && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleMarkAsPenalized(searchStudentInfo.student_id)}
                          disabled={penalizingId === searchStudentInfo.student_id}
                          className="bg-slate-900 text-white hover:bg-slate-800 border-none rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest shadow-xl flex gap-2"
                        >
                          {penalizingId === searchStudentInfo.student_id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          Marcar Penalización
                        </Button>
                      )}
                    </div>
                  )}
                </h3>
                <p className="text-slate-600 text-sm font-medium">
                  {searchStudentInfo ? `Matrícula: ${searchStudentInfo.student_id} • ${searchStudentInfo.course}` : 'Estadísticas para la búsqueda actual'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto relative z-10">
              <div className="bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-1">Total</p>
                <p className="text-3xl font-black text-slate-900">{stats.total}</p>
              </div>
              <div className="bg-green-50 px-5 py-3 rounded-xl border border-green-100 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-black text-green-600 tracking-widest mb-1">Leves</p>
                <p className="text-3xl font-black text-green-700">{stats.leve}</p>
              </div>
              <div className="bg-orange-50 px-5 py-3 rounded-xl border border-orange-100 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-black text-orange-600 tracking-widest mb-1">Graves</p>
                <p className="text-3xl font-black text-orange-700">{stats.grave}</p>
              </div>
              <div className="bg-red-50 px-5 py-3 rounded-xl border border-red-100 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-black text-red-600 tracking-widest mb-1">Críticas</p>
                <p className="text-3xl font-black text-red-700">{stats.muyGrave}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {studentIds.map((studentId) => {
            const studentReports = groupedReports[studentId];
            const firstReport = studentReports[0];
            const totalReports = studentReports.length;

            return (
              <div 
                key={studentId}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all"
              >
                {/* Student Header / Summary Card */}
                <div 
                  className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setViewingStudentId(studentId)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {firstReport.evidence_image_url ? (
                        <img src={firstReport.evidence_image_url} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm">
                          <User className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight flex items-center gap-2">
                          {firstReport.student_name}
                          {totalReports >= 5 && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                              Lista Negra
                            </span>
                          )}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {firstReport.course} • {studentId}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                            {totalReports} {totalReports === 1 ? 'Reporte' : 'Reportes'}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                            Último: {format(parseLocalDate(firstReport.report_date), "dd MMM, yyyy", { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {studentReports.slice(0, 3).map((r, i) => (
                          <div 
                            key={r.id} 
                            className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm ${
                              r.offense_type === 'Leve' ? 'bg-green-500' :
                              r.offense_type === 'Grave' ? 'bg-orange-500' :
                              'bg-red-600'
                            }`}
                            title={`Falta ${r.offense_type}`}
                          >
                            {r.offense_type[0]}
                          </div>
                        ))}
                        {totalReports > 3 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm">
                            +{totalReports - 3}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-xl">
                        Ver Perfil Completo
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {studentIds.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border-4 border-dashed border-slate-100">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No se encontraron reportes</h3>
              <p className="text-slate-400 font-medium">Intenta con otros términos de búsqueda.</p>
            </div>
          )}
        </div>

        {/* Modal for Preview */}
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto print-modal-container">
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-5xl w-full my-4 overflow-hidden flex flex-col max-h-[95vh]">
              {/* Sticky Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between p-5 bg-white border-b border-slate-100 shadow-sm no-print">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest">Vista Previa Oficial</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Expediente: {selectedReport.id?.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isParentMode && (
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => handleDownloadPDF(selectedReport)}
                      disabled={generatingPdfId === selectedReport.id}
                      className="flex gap-2 rounded-xl px-6 bg-slate-900 hover:bg-slate-800"
                    >
                      {generatingPdfId === selectedReport.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {generatingPdfId === selectedReport.id ? 'Generando...' : 'Descargar Reporte PDF'}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedReport(null)}
                    className="rounded-xl px-4 hover:bg-red-50 hover:text-red-600"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-10 custom-scrollbar">
                <div className="flex justify-center min-h-full">
                  <div className="report-preview-container transform scale-[0.6] sm:scale-[0.75] md:scale-[0.85] lg:scale-100 origin-top transition-transform duration-300">
                    <ReportPreview report={selectedReport} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!showDeleteConfirm}
          title="¿Eliminar Reporte?"
          message="Esta acción es permanente y el reporte desaparecerá del historial oficial."
          confirmText="Sí, Eliminar"
          cancelText="Cancelar"
          onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
          variant="danger"
        />

        <ConfirmModal
          isOpen={showProfileDeleteConfirm}
          title="¿Eliminar Perfil Completo?"
          message={`Esta acción eliminará de forma permanente TODOS los reportes y el expediente disciplinario completo del estudiante ${viewingStudentId}. Esta acción no se puede deshacer.`}
          confirmText={bulkActionLoading ? 'Eliminando...' : 'Sí, Eliminar Todo'}
          cancelText="Cancelar"
          onConfirm={handleDeleteProfile}
          onCancel={() => !bulkActionLoading && setShowProfileDeleteConfirm(false)}
          variant="danger"
        />

        {/* Dedicated Hidden Container for PDF Generation (Off-screen but visible to capture tools) */}
        <div 
          className="fixed pointer-events-none bg-white z-[-100] overflow-hidden pdf-export-container" 
          aria-hidden="true"
          style={{ 
            width: '210mm', 
            height: '297mm', 
            left: '-10000px', 
            top: '0',
            visibility: 'visible',
            opacity: 1
          }}
        >
          {generatingPdfId && reports.find(r => r.id === generatingPdfId) && (
            <ReportPreview 
              report={reports.find(r => r.id === generatingPdfId)!} 
              isExporting={true} 
              id={`report-export-target-${generatingPdfId}`}
            />
          )}
        </div>
      </div>
    );
  };
