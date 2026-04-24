import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (reportId: string, elementId?: string, customFilename?: string) => {
  console.log('Iniciando generación de PDF para:', reportId);
  const targetId = elementId || `report-preview-${reportId}`;
  const element = document.getElementById(targetId);
  
  if (!element) {
    const errorMsg = `No se encontró el elemento para generar el PDF: ${targetId}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // 1. Asegurarse de que el elemento sea visible y tenga dimensiones
    const originalStyle = {
      display: element.style.display,
      visibility: element.style.visibility,
      opacity: element.style.opacity,
    };
    
    // Forzar visibilidad temporal para la captura
    element.style.display = 'block';
    element.style.visibility = 'visible';
    element.style.opacity = '1';
    
    // 2. Esperar a que todas las imágenes carguen
    const images = Array.from(element.getElementsByTagName('img'));
    console.log(`Esperando a que ${images.length} imágenes carguen...`);
    
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        // Timeout for image loading
        setTimeout(resolve, 5000);
      });
    }));

    // Espera extra para renderizado final
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Capturando con html2canvas...');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: true,
      // Usar el tamaño del elemento
      width: 794, // 210mm at 96dpi
      height: 1123, // 297mm at 96dpi
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(targetId);
        if (clonedElement) {
          // 1. Capture the report's internal style tag
          const reportStyles = clonedElement.querySelector('style');
          
          // 2. Hide everything else instead of clearing innerHTML to avoid removeChild errors
          const allElements = Array.from(clonedDoc.body.children);
          allElements.forEach(el => {
            if (el !== clonedElement && !el.contains(clonedElement)) {
              (el as HTMLElement).style.display = 'none';
            }
          });

          // 3. Clean up the body styles
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.backgroundColor = '#ffffff';
          
          // 4. Remove ALL external stylesheets from head to avoid oklch parsing errors in html2canvas
          const head = clonedDoc.head;
          const stylesheets = Array.from(head.querySelectorAll('link[rel="stylesheet"], style:not(.report-internal-style)'));
          stylesheets.forEach(s => s.remove());
          
          // 5. Ensure the report's own styles are preserved
          if (reportStyles) {
            reportStyles.classList.add('report-internal-style');
          }

          // 6. Style the element for capture
          clonedElement.style.display = 'block';
          clonedElement.style.visibility = 'visible';
          clonedElement.style.opacity = '1';
          clonedElement.style.position = 'absolute';
          clonedElement.style.left = '0';
          clonedElement.style.top = '0';
          clonedElement.style.margin = '0';
          clonedElement.style.padding = '20mm 25mm';
          clonedElement.style.width = '210mm';
          clonedElement.style.minHeight = '297mm';
          clonedElement.style.transform = 'none';
          clonedElement.style.boxShadow = 'none';
        }
      }
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('El canvas generado está vacío. Verifique que el elemento tenga contenido visible.');
    }

    console.log('Canvas creado:', canvas.width, 'x', canvas.height);
    
    // Restaurar estilos
    Object.assign(element.style, originalStyle);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Ajustar imagen al tamaño A4
    pdf.addImage(canvas, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    
    const finalFilename = customFilename || `Reporte_Disciplinario_${reportId.slice(0, 8)}.pdf`;
    pdf.save(finalFilename);
    
    console.log('PDF generado con éxito');
  } catch (error) {
    console.error('Error detallado generando PDF:', error);
    throw error;
  }
};
