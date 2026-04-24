import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { COURSES } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Loader2, BarChart3, TrendingUp, AlertCircle, Users, Calendar, Filter } from 'lucide-react';
import { format, parseISO, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '../lib/utils';

interface CourseData {
  course: string;
  count: number;
  color: string;
}

interface MonthlyData {
  month: string;
  count: number;
}

interface TeacherStats {
  name: string;
  count: number;
}

interface StudentStats {
  name: string;
  id: string;
  course: string;
  count: number;
}

interface ReportChartsProps {
  onStudentClick?: (studentId: string) => void;
}

export const ReportCharts: React.FC<ReportChartsProps> = ({ onStudentClick }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'teachers' | 'monthly'>('overview');
  const [courseData, setCourseData] = useState<CourseData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [teacherChartData, setTeacherChartData] = useState<TeacherStats[]>([]);
  const [showAllTeachers, setShowAllTeachers] = useState(false);
  const [topTeacher, setTopTeacher] = useState<TeacherStats | null>(null);
  const [topStudent, setTopStudent] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalReports, setTotalReports] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);

  const getCourseColor = (course: string) => {
    const [grade, section] = course.split(' ');
    if (grade === '3ro') return '#BAE6FD';
    switch (section) {
      case 'A': return '#38BDF8';
      case 'B': return '#1E3A8A';
      case 'C': return '#EF4444';
      case 'D': return '#22C55E';
      default: return '#94A3B8';
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: reports, error } = await supabase
        .from('reports')
        .select('course, report_date, teacher_name');

      if (error) throw error;

      if (!reports) return;

      // Process Years
      const years = Array.from(new Set(reports.map(r => new Date(r.report_date).getFullYear())));
      if (years.length > 0) setAvailableYears(years.sort((a, b) => b - a));

      // Filter by selected year
      const filteredReports = reports.filter(r => new Date(r.report_date).getFullYear() === selectedYear);

      // 1. Course Distribution
      const courseCounts: Record<string, number> = {};
      COURSES.forEach(course => { courseCounts[course] = 0; });
      filteredReports.forEach(report => {
        if (courseCounts[report.course] !== undefined) courseCounts[report.course]++;
      });
      const cData: CourseData[] = COURSES.map(course => ({
        course,
        count: courseCounts[course],
        color: getCourseColor(course)
      }));
      setCourseData(cData);

      // 2. Monthly Distribution
      const months = eachMonthOfInterval({
        start: startOfYear(new Date(selectedYear, 0, 1)),
        end: endOfYear(new Date(selectedYear, 0, 1))
      });

      const monthCounts: Record<string, number> = {};
      months.forEach(m => {
        monthCounts[format(m, 'MMM', { locale: es })] = 0;
      });

      filteredReports.forEach(report => {
        const mName = format(parseLocalDate(report.report_date), 'MMM', { locale: es });
        if (monthCounts[mName] !== undefined) monthCounts[mName]++;
      });

      const mData: MonthlyData[] = Object.entries(monthCounts).map(([month, count]) => ({
        month: month.charAt(0).toUpperCase() + month.slice(1),
        count
      }));
      setMonthlyData(mData);

      // 3. Teacher Stats (Normalized for case-insensitivity)
      const teacherCounts: Record<string, { name: string, count: number }> = {};
      const studentCounts: Record<string, { name: string, course: string, count: number }> = {};

      filteredReports.forEach(report => {
        if (report.teacher_name) {
          const nameTrimmed = report.teacher_name.trim();
          const normalized = nameTrimmed.toLowerCase();
          const displayTitleCase = nameTrimmed.replace(/\b\w/g, char => char.toUpperCase());
          
          if (!teacherCounts[normalized]) {
            teacherCounts[normalized] = { name: displayTitleCase, count: 0 };
          }
          teacherCounts[normalized].count++;
        }
      });

      // Fetch student names and IDs for top student calculation
      const { data: allReportsForStudents, error: studentError } = await supabase
        .from('reports')
        .select('student_id, student_name, course, report_date');

      if (!studentError && allReportsForStudents) {
        const filteredStudentReports = allReportsForStudents.filter(r => new Date(r.report_date).getFullYear() === selectedYear);
        filteredStudentReports.forEach(report => {
          if (!studentCounts[report.student_id]) {
            studentCounts[report.student_id] = { name: report.student_name, course: report.course, count: 0 };
          }
          studentCounts[report.student_id].count++;
        });
      }

      const sortedTeachers = Object.values(teacherCounts)
        .sort((a, b) => b.count - a.count);

      const sortedStudents = Object.entries(studentCounts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count);

      setTopTeacher(sortedTeachers[0] || null);
      setTeacherChartData(sortedTeachers); 
      setTopStudent(sortedStudents[0] || null);
      setTotalReports(filteredReports.length);

    } catch (err) {
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Generando Análisis Estadístico...</p>
      </div>
    );
  }

  const topCourse = [...courseData].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Filters & Navigation */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Filter className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Período</p>
            <h4 className="text-sm font-black text-slate-900 uppercase">Año Escolar {selectedYear}</h4>
          </div>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="ml-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 overflow-x-auto custom-scrollbar whitespace-nowrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeTab === 'courses' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Cursos
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeTab === 'teachers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Docentes
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeTab === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tendencia
          </button>
        </div>
      </div>

      {/* Header Stats - Always visible as entry points */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`p-6 sm:p-8 rounded-[2rem] border flex items-center gap-4 sm:gap-6 group transition-all duration-500 text-left ${
            activeTab === 'overview' ? 'bg-indigo-600 border-indigo-600 shadow-indigo-200 shadow-xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:border-indigo-200'
          }`}
        >
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
            activeTab === 'overview' ? 'bg-white/20' : 'bg-indigo-50'
          }`}>
            <BarChart3 className={`w-6 h-6 sm:w-7 sm:h-7 ${activeTab === 'overview' ? 'text-white' : 'text-indigo-600'}`} />
          </div>
          <div>
            <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 ${activeTab === 'overview' ? 'text-indigo-100' : 'text-slate-400'}`}>Total Reportes</p>
            <p className={`text-2xl sm:text-3xl font-black tracking-tighter ${activeTab === 'overview' ? 'text-white' : 'text-slate-900'}`}>{totalReports}</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('courses')}
          className={`p-6 sm:p-8 rounded-[2rem] border flex items-center gap-4 sm:gap-6 group transition-all duration-500 text-left ${
            activeTab === 'courses' ? 'bg-emerald-600 border-emerald-600 shadow-emerald-200 shadow-xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:border-emerald-200'
          }`}
        >
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
            activeTab === 'courses' ? 'bg-white/20' : 'bg-emerald-50'
          }`}>
            <TrendingUp className={`w-6 h-6 sm:w-7 sm:h-7 ${activeTab === 'courses' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div>
            <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 ${activeTab === 'courses' ? 'text-emerald-100' : 'text-slate-400'}`}>Curso Crítico</p>
            <p className={`text-xl sm:text-2xl font-black tracking-tighter ${activeTab === 'courses' ? 'text-white' : 'text-slate-900'}`}>{topCourse.count > 0 ? topCourse.course : 'N/A'}</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('teachers')}
          className={`p-6 sm:p-8 rounded-[2rem] border flex items-center gap-4 sm:gap-6 group transition-all duration-500 text-left ${
            activeTab === 'teachers' ? 'bg-amber-600 border-amber-600 shadow-amber-200 shadow-xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:border-amber-200'
          }`}
        >
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
            activeTab === 'teachers' ? 'bg-white/20' : 'bg-amber-50'
          }`}>
            <Users className={`w-6 h-6 sm:w-7 sm:h-7 ${activeTab === 'teachers' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="overflow-hidden">
            <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 ${activeTab === 'teachers' ? 'text-amber-100' : 'text-slate-400'}`}>Docente Líder</p>
            <p className={`text-lg sm:text-xl font-black truncate tracking-tight ${activeTab === 'teachers' ? 'text-white' : 'text-slate-900'}`} title={topTeacher?.name || 'N/A'}>
              {topTeacher ? topTeacher.name : 'N/A'}
            </p>
            {topTeacher && <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter ${activeTab === 'teachers' ? 'text-amber-100' : 'text-amber-600'}`}>{topTeacher.count} reportes</p>}
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('monthly')}
          className={`p-6 sm:p-8 rounded-[2rem] border flex items-center gap-4 sm:gap-6 group transition-all duration-500 text-left ${
            activeTab === 'monthly' ? 'bg-rose-600 border-rose-600 shadow-rose-200 shadow-xl' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:border-rose-200'
          }`}
        >
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
            activeTab === 'monthly' ? 'bg-white/20' : 'bg-rose-50'
          }`}>
            <Calendar className={`w-6 h-6 sm:w-7 sm:h-7 ${activeTab === 'monthly' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div>
            <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 ${activeTab === 'monthly' ? 'text-rose-100' : 'text-slate-400'}`}>Promedio Mensual</p>
            <p className={`text-2xl sm:text-3xl font-black tracking-tighter ${activeTab === 'monthly' ? 'text-white' : 'text-slate-900'}`}>{(totalReports / 12).toFixed(1)}</p>
          </div>
        </button>

        <button 
          onClick={() => topStudent && onStudentClick?.(topStudent.id)}
          className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-4 sm:gap-6 group hover:border-indigo-200 transition-all duration-500 text-left w-full"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estudiante Crítico</p>
            <p className="text-lg sm:text-xl font-black text-slate-900 truncate tracking-tight" title={topStudent?.name || 'N/A'}>
              {topStudent ? topStudent.name : 'N/A'}
            </p>
            {topStudent && (
              <p className="text-[9px] sm:text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">
                {topStudent.count} incidencias • {topStudent.course}
              </p>
            )}
          </div>
        </button>
      </div>

      {/* Content Sections */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 p-12 rounded-[3rem] text-white shadow-2xl shadow-slate-900/20 flex flex-col justify-center">
              <h3 className="text-4xl font-black tracking-tighter uppercase mb-6 leading-none">Resumen Ejecutivo<br/><span className="text-indigo-400">Año {selectedYear}</span></h3>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                Se han registrado un total de <span className="text-white font-black">{totalReports} incidencias</span> disciplinarias. 
                El curso con mayor actividad es <span className="text-white font-black">{topCourse.course}</span> y el docente con más reportes emitidos es <span className="text-white font-black">{topTeacher?.name || 'N/A'}</span>.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setActiveTab('courses')} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all">Ver Cursos</button>
                <button onClick={() => setActiveTab('monthly')} className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all">Ver Tendencias</button>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Distribución Rápida</h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseData.filter(d => d.count > 0).slice(0, 5)}>
                    <XAxis dataKey="course" hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                      {courseData.filter(d => d.count > 0).slice(0, 5).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">Top 5 Cursos con más Reportes</p>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/60">
            <div className="mb-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1">Distribución por Cursos</h3>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Incidencias acumuladas por sección.</p>
            </div>
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseData} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="course" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#0f172a' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={30}>
                    {courseData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    <LabelList dataKey="count" position="top" style={{ fill: '#0f172a', fontSize: 10, fontWeight: 900 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#BAE6FD]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">3ros (Todos)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#38BDF8]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sección A (4to+)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#1E3A8A]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sección B (4to+)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#EF4444]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sección C (4to+)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#22C55E]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sección D (4to+)</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/60">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1">Docentes más Activos</h3>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                  {showAllTeachers ? 'Todos los docentes participantes.' : 'Top 5 docentes por emisión de reportes.'}
                </p>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 h-fit self-start">
                <button
                  onClick={() => setShowAllTeachers(false)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    !showAllTeachers ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Top 5
                </button>
                <button
                  onClick={() => setShowAllTeachers(true)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    showAllTeachers ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Ver Todos
                </button>
              </div>
            </div>
            <div style={{ height: `${showAllTeachers ? Math.max(500, teacherChartData.length * 50) : 500}px` }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={showAllTeachers ? teacherChartData : teacherChartData.slice(0, 5)} 
                  margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#0f172a', fontSize: 10, fontWeight: 900 }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#0f172a' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={30}>
                    <LabelList dataKey="count" position="right" style={{ fill: '#0f172a', fontSize: 10, fontWeight: 900 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/60">
            <div className="mb-8">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-1">Tendencia Mensual</h3>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Evolución de reportes durante el año {selectedYear}.</p>
            </div>
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#0f172a' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#6366f1" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Yearly Summary (Optional) - Moved to bottom for cleaner look */}
      {availableYears.length > 1 && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-wrap gap-8 items-center justify-between shadow-2xl shadow-slate-900/20">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Archivo Histórico</h4>
            <p className="text-lg font-bold text-slate-200">Seleccione un año para ver estadísticas pasadas</p>
          </div>
          <div className="flex gap-4">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                  selectedYear === year 
                    ? 'bg-white text-slate-900 shadow-lg scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                AÑO {year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
