  import React from 'react';
  import { Report } from '../types';
  import { format } from 'date-fns';
  import { es } from 'date-fns/locale';
  import { parseLocalDate } from '../lib/utils';

  interface ReportPreviewProps {
    report: Report;
    isExporting?: boolean;
    id?: string;
  }

  export const ReportPreview: React.FC<ReportPreviewProps> = ({ report, isExporting = false, id }) => {
    return (
      <div
        id={id || `report-preview-${report.id}`}
        className="report-document"
      >
        <style>{`
          .report-document {
            font-family: 'Times New Roman', Times, serif !important;
            width: 210mm;
            min-height: 297mm;
            padding: 20mm 25mm 30mm 25mm;
            box-sizing: border-box;
            background: white !important;
            color: #000000 !important;
            font-size: 12pt;
            line-height: 1.5;
            position: relative;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          }

          .report-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }

          .report-header-left {
            display: flex;
            gap: 24px;
          }

          .report-logo {
            width: 96px;
            height: 96px;
            object-fit: contain;
          }

          .report-header-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .report-header-title-main {
            font-size: 1.25rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #0f172a;
            line-height: 1.2;
            margin: 0;
          }

          .report-header-dept {
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #475569;
            font-family: sans-serif;
            font-weight: 700;
            margin: 0;
          }

          .report-header-slogan {
            font-size: 9pt;
            color: #94a3b8;
            font-family: sans-serif;
            font-style: italic;
            margin: 0;
          }

          .report-header-right {
            text-align: right;
            font-family: sans-serif;
          }

          .report-badge {
            background: #0f172a;
            color: #ffffff;
            padding: 4px 12px;
            font-size: 9pt;
            font-weight: 900;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-bottom: 8px;
            display: inline-block;
          }

          .report-id {
            font-size: 10pt;
            font-family: monospace;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }

          .report-date {
            font-size: 9pt;
            font-weight: 700;
            color: #94a3b8;
            margin: 0;
          }

          .report-header-title {
            font-size: 20pt;
            font-weight: 900;
            text-transform: uppercase;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 12px;
            margin: 20px 0 40px 0;
            text-align: center;
            letter-spacing: 0.05em;
            color: #0f172a;
          }

          .report-section-title {
            font-size: 13pt;
            font-weight: 800;
            text-transform: uppercase;
            color: #1e293b;
            border-left: 4px solid #4f46e5;
            padding-left: 12px;
            margin: 0 0 16px 0;
            font-family: sans-serif;
            display: flex;
            align-items: center;
          }

          .report-label {
            font-size: 8.5pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            font-family: sans-serif;
            letter-spacing: 0.08em;
            margin-bottom: 6px;
          }

          .report-value {
            font-size: 11pt;
            font-weight: 700;
            color: #0f172a;
            font-family: sans-serif;
            margin: 0;
            line-height: 1.2;
          }

          .report-text-container {
            padding: 20px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            min-height: 60px;
          }

          .report-text {
            font-size: 11pt;
            line-height: 1.6;
            text-align: justify;
            font-family: serif;
            margin: 0;
            white-space: pre-wrap;
            color: #1e293b;
          }

          .report-severity {
            display: flex;
            align-items: center;
            gap: 16px;
            margin: 32px 0;
            padding: 12px 20px;
            background: #f1f5f9;
            border-radius: 8px;
          }

          .severity-badge {
            padding: 6px 18px;
            font-size: 10pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            border: 2px solid;
            border-radius: 4px;
            background: white;
          }

          .severity-Leve { border-color: #16a34a; color: #16a34a; }
          .severity-Grave { border-color: #ea580c; color: #ea580c; }
          .severity-MuyGrave { border-color: #dc2626; color: #dc2626; }

          .report-signatures {
            margin-top: 80px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
            text-align: center;
          }

          .signature-box {
            border-bottom: 1px solid #94a3b8;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
          }

          .signature-img {
            max-height: 100%;
            max-width: 100%;
          }

          .signature-label {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            margin: 0;
          }

          .report-footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            text-align: center;
          }

          .footer-text-main {
            font-size: 8.5pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.25em;
            font-weight: 800;
            margin: 0;
          }

          .footer-text-sub {
            font-size: 7.5pt;
            color: #94a3b8;
            margin-top: 6px;
            margin: 0;
            font-style: italic;
          }

          .evidence-container {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            flex: 0 0 180px;
          }

          .evidence-img-box {
            width: 160px;
            height: 160px;
            border: 4px solid #f1f5f9;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          }

          .evidence-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .evidence-placeholder {
            width: 160px;
            height: 160px;
            background: #f8fafc;
            border: 2px dashed #e2e8f0;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #cbd5e1;
            font-style: italic;
            font-size: 10px;
            text-align: center;
            padding: 16px;
          }

          @media print {
            @page {
              size: A4;
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              height: auto !important;
              overflow: visible !important;
            }
            /* Hide everything except the modal we want to print */
            body > *:not(.print-modal-container) {
              display: none !important;
            }
            #root > *:not(.print-modal-container) {
              display: none !important;
            }
            
            .print-modal-container {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
              z-index: 99999 !important;
            }
            /* Reset modal inner structure for print */
            .print-modal-container > div {
              display: block !important;
              position: static !important;
              width: 100% !important;
              max-width: none !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              background: white !important;
            }
            /* Hide modal header/buttons during print */
            .no-print {
              display: none !important;
            }
            .report-preview-container {
              transform: none !important;
              scale: 1 !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              visibility: visible !important;
            }
            .report-document {
              margin: 0 !important;
              box-shadow: none !important;
              width: 210mm !important;
              min-height: 297mm !important;
              padding: 20mm 25mm !important;
              display: block !important;
              visibility: visible !important;
              position: static !important;
              background: white !important;
            }
          }
        `}</style>

        {/* Institutional Header */}
        <div className="report-header">
          <div className="report-header-left">
            <img 
              src="/logo.png" 
              alt="Logo" 
              crossOrigin="anonymous"
              className="report-logo" 
              onError={(e) => (e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Heart_coraz%C3%B3n.svg/1200px-Heart_coraz%C3%B3n.svg.png')}
            />
            <div className="report-header-info">
              <h1 className="report-header-title-main">Politécnico Hermana Rosario Torres<br/>Fe y Alegría</h1>
              <p className="report-header-dept">Departamento de Orientación y Psicología</p>
              <p className="report-header-slogan">"Educación Popular Integral y Promoción Social"</p>
            </div>
          </div>
          <div className="report-header-right">
            <div className="report-badge">
              Expediente Disciplinario
            </div>
            <p className="report-id">#{report.id?.slice(0, 8).toUpperCase()}</p>
            <p className="report-date">{format(parseLocalDate(report.report_date), "dd/MM/yyyy")}</p>
          </div>
        </div>

        <div className="report-header-title">
          ACTA DE REPORTE DISCIPLINARIO
        </div>

        {/* Student Information Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="report-section-title">Información del Estudiante</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p className="report-label">Nombre Completo</p>
                <p className="report-value">{report.student_name.toUpperCase()}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p className="report-label">Matrícula</p>
                  <p className="report-value" style={{ fontFamily: 'monospace' }}>{report.student_id}</p>
                </div>
                <div>
                  <p className="report-label">Grado / Sección</p>
                  <p className="report-value">{report.course}</p>
                </div>
              </div>
              {report.teacher_name && (
                <div>
                  <p className="report-label">Profesor(a) que Reporta</p>
                  <p className="report-value">{report.teacher_name.toUpperCase()}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="evidence-container">
            <p className="report-label" style={{ marginBottom: '8px' }}>Evidencia de Control</p>
            {report.evidence_image_url ? (
              <div className="evidence-img-box">
                <img 
                  src={report.evidence_image_url} 
                  alt="Evidencia" 
                  crossOrigin="anonymous"
                  className="evidence-img" 
                />
              </div>
            ) : (
              <div className="evidence-placeholder">
                Sin fotografía adjunta
              </div>
            )}
          </div>
        </div>

        {/* Severity Indicator */}
        <div className="report-severity">
          <p className="report-label">Calificación de la Falta:</p>
          <div className={`severity-badge severity-${report.offense_type.replace(' ', '')}`}>
            Falta {report.offense_type}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          <section>
            <h3 className="report-section-title">I. Descripción de los Hechos</h3>
            <div className="report-text-container">
              <p className="report-text">{report.reason}</p>
            </div>
          </section>

          <section>
            <h3 className="report-section-title">II. Acuerdos y Medidas</h3>
            <div className="report-text-container" style={{ fontStyle: 'italic' }}>
              <p className="report-text">"{report.agreement}"</p>
            </div>
          </section>
        </div>

        {/* Signatures Section */}
        <div className="report-signatures">
          <div>
            <div className="signature-box">
              {report.director_signature_url && (
                <img src={report.director_signature_url} alt="Firma" crossOrigin="anonymous" className="signature-img" />
              )}
            </div>
            <p className="signature-label">Director(a)</p>
          </div>

          <div>
            <div className="signature-box">
              {report.psychologist_signature_url && (
                <img src={report.psychologist_signature_url} alt="Firma" crossOrigin="anonymous" className="signature-img" />
              )}
            </div>
            <p className="signature-label">Psicólogo(a)</p>
          </div>

          <div>
            <div className="signature-box">
              {report.student_signature_url && (
                <img src={report.student_signature_url} alt="Firma" crossOrigin="anonymous" className="signature-img" />
              )}
            </div>
            <p className="signature-label">Estudiante</p>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="report-footer">
          <p className="footer-text-main">Documento Oficial de Control Interno</p>
          <p className="footer-text-sub">Este reporte es confidencial y forma parte del historial académico.</p>
        </div>
      </div>
    );
  };
