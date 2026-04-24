import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { COURSES, GRADES, SECTIONS, OffenseType, Report, SystemUser } from '../types';
import { SignaturePad } from './SignaturePad';
import { Button } from './Button';
import { Loader2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReportFormProps {
  onSuccess: () => void;
  user: SystemUser;
}

export const ReportForm: React.FC<ReportFormProps> = ({ onSuccess, user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<Report>>({
    student_name: '',
    course: `${GRADES[0]} ${SECTIONS[0]}`,
    student_id: '',
    reason: '',
    offense_type: 'Leve',
    agreement: '',
    teacher_name: user.display_name,
    report_date: new Date().toISOString().split('T')[0],
  });

  const [selectedGrade, setSelectedGrade] = useState(GRADES[0]);
  const [selectedSection, setSelectedSection] = useState(SECTIONS[0]);
  const [searchingStudent, setSearchingStudent] = useState(false);

  const [signatures, setSignatures] = useState({
    director: '',
    psychologist: '',
    student: '',
  });

  const [evidenceImage, setEvidenceImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  const searchStudent = async (id: string) => {
    if (!id || id.length < 3) {
      setAutoFilled(false);
      return;
    }
    
    setSearchingStudent(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('student_name, course, evidence_image_url')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          student_name: data.student_name,
          course: data.course,
          evidence_image_url: data.evidence_image_url
        }));

        // Parse course to set grade and section selects
        const [grade, section] = data.course.split(' ');
        if (GRADES.includes(grade)) setSelectedGrade(grade);
        if (SECTIONS.includes(section)) setSelectedSection(section);

        // Set preview if image exists
        if (data.evidence_image_url) {
          setPreviewUrl(data.evidence_image_url);
        }
        
        setAutoFilled(true);
        setTimeout(() => setAutoFilled(false), 3000);
      } else {
        setAutoFilled(false);
      }
    } catch (err) {
      console.error('Error searching student:', err);
      setAutoFilled(false);
    } finally {
      setSearchingStudent(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-capitalize names
    let processedValue = value;
    if (name === 'student_name' || name === 'teacher_name') {
      processedValue = value.replace(/\b\w/g, char => char.toUpperCase());
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.student_id && formData.student_id.length >= 4) {
        searchStudent(formData.student_id);
      }
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.student_id]);

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const grade = e.target.value;
    setSelectedGrade(grade);
    setFormData(prev => ({ ...prev, course: `${grade} ${selectedSection}` }));
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const section = e.target.value;
    setSelectedSection(section);
    setFormData(prev => ({ ...prev, course: `${selectedGrade} ${section}` }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEvidenceImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (dataUrl: string, path: string) => {
    const blob = await (await fetch(dataUrl)).blob();
    const { data, error } = await supabase.storage
      .from('report-assets')
      .upload(path, blob, { contentType: 'image/png', upsert: true });

    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('report-assets').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      let directorUrl, psychologistUrl, studentUrl, evidenceUrl;

      // Upload signatures
      if (signatures.director) {
        directorUrl = await uploadImage(signatures.director, `signatures/director_${timestamp}.png`);
      }
      if (signatures.psychologist) {
        psychologistUrl = await uploadImage(signatures.psychologist, `signatures/psychologist_${timestamp}.png`);
      }
      if (signatures.student) {
        studentUrl = await uploadImage(signatures.student, `signatures/student_${timestamp}.png`);
      }

      // Upload evidence image
      if (evidenceImage) {
        const { data, error: uploadError } = await supabase.storage
          .from('report-assets')
          .upload(`evidence/img_${timestamp}_${evidenceImage.name}`, evidenceImage);
        
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('report-assets').getPublicUrl(data.path);
        evidenceUrl = publicUrl;
      }

      const { error: dbError } = await supabase.from('reports').insert({
        ...formData,
        director_signature_url: directorUrl,
        psychologist_signature_url: psychologistUrl,
        student_signature_url: studentUrl,
        evidence_image_url: evidenceUrl || formData.evidence_image_url,
      });

      if (dbError) throw dbError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border border-slate-100 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-8 gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 p-2 shrink-0">
             <img 
               src="/logo.png" 
               alt="Logo Politécnico Hermana Rosario Torres Fe y Alegría" 
               className="w-full h-full object-contain" 
               onError={(e) => (e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Heart_coraz%C3%B3n.svg/1200px-Heart_coraz%C3%B3n.svg.png')} 
             />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">Registro de Incidencia</h2>
            <p className="text-[10px] sm:text-sm text-slate-600 font-bold uppercase tracking-widest">Control Disciplinario Interno</p>
          </div>
        </div>
        <div className="sm:text-right">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Fecha Oficial</label>
          <input
            type="date"
            name="report_date"
            value={formData.report_date}
            onChange={handleInputChange}
            className="w-full sm:w-auto text-lg font-bold text-slate-900 bg-slate-50 px-4 py-2 rounded-xl border-none focus:ring-2 focus:ring-slate-900 transition-all"
            required
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 border-l-4 border-slate-200 pl-3">I. Identificación del Estudiante</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-1">
            <div className="relative group">
              <label className="cursor-pointer block">
                <div className={`w-full aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${previewUrl ? 'border-slate-900' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Estudiante" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Cargar Foto</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => { setEvidenceImage(null); setPreviewUrl(null); }}
                  className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1.5 shadow-xl hover:bg-red-600 transition-colors"
                >
                  <AlertCircle className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</label>
              <input
                type="text"
                name="student_name"
                value={formData.student_name}
                onChange={handleInputChange}
                placeholder="Nombre y Apellidos"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Matrícula</label>
              <div className="relative">
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  placeholder="Matrícula"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-mono font-bold"
                  required
                />
                {searchingStudent && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  </div>
                )}
              </div>
              {autoFilled && (
                <p className="text-[9px] text-indigo-600 font-black uppercase tracking-tighter mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Datos Verificados
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grado / Sección</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedGrade}
                  onChange={handleGradeChange}
                  className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all bg-white font-bold text-sm"
                  required
                >
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={selectedSection}
                  onChange={handleSectionChange}
                  className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all bg-white font-bold text-sm"
                  required
                >
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calificación de Falta</label>
              <select
                name="offense_type"
                value={formData.offense_type}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all bg-white font-bold text-sm"
                required
              >
                <option value="Leve">Leve</option>
                <option value="Grave">Grave</option>
                <option value="Muy Grave">Muy Grave</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Profesor(a) que Reporta</label>
              <input
                type="text"
                name="teacher_name"
                value={formData.teacher_name}
                onChange={handleInputChange}
                placeholder="Nombre del Docente"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 border-l-4 border-slate-200 pl-3">II. Descripción de los Hechos</h3>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            rows={4}
            placeholder="Relate los hechos de manera objetiva..."
            className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all resize-none text-slate-700 leading-relaxed"
            required
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 border-l-4 border-slate-200 pl-3">III. Acuerdos y Compromisos</h3>
          <textarea
            name="agreement"
            value={formData.agreement}
            onChange={handleInputChange}
            rows={4}
            placeholder="Especifique las medidas y compromisos acordados..."
            className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all resize-none text-slate-700 leading-relaxed italic"
            required
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 border-l-4 border-slate-200 pl-3">IV. Validación de Firmas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <SignaturePad
            label="Director(a)"
            onSave={(url) => setSignatures(prev => ({ ...prev, director: url }))}
            onClear={() => setSignatures(prev => ({ ...prev, director: '' }))}
          />
          <SignaturePad
            label="Psicólogo(a)"
            onSave={(url) => setSignatures(prev => ({ ...prev, psychologist: url }))}
            onClear={() => setSignatures(prev => ({ ...prev, psychologist: '' }))}
          />
          <SignaturePad
            label="Estudiante"
            onSave={(url) => setSignatures(prev => ({ ...prev, student: url }))}
            onClear={() => setSignatures(prev => ({ ...prev, student: '' }))}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-slate-100">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onSuccess}
          className="w-full sm:w-auto rounded-xl px-8 uppercase text-[10px] font-black tracking-widest"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || success}
          className="w-full sm:min-w-[200px] rounded-xl bg-slate-900 hover:bg-slate-800 uppercase text-[10px] font-black tracking-widest py-4"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : success ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Registrado
            </div>
          ) : (
            'Finalizar Registro'
          )}
        </Button>
      </div>
    </form>
  );
};
