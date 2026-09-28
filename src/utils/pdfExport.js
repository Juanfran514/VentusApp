import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './formatters';

/**
 * Exporta un informe mensual (o global) a un documento PDF con estilo Ventus App.
 *
 * @param {Object} options
 * @param {string} options.titulo - Título del informe (ej: "Informe de Exámenes", "Equipamiento", "Cuotas")
 * @param {string} options.mesNombre - Nombre del mes o período (ej: "Marzo 2026")
 * @param {Array<string>} options.headers - Cabeceras de la tabla
 * @param {Array<Array>} options.rows - Filas de datos
 * @param {number} options.totalImporte - Importe total acumulado
 * @param {number} options.totalRegistros - Número de registros
 * @param {string} [options.nombreArchivo] - Nombre del archivo a descargar
 * @returns {Promise<{ exito: boolean, metodo: string, cancelado?: boolean }>}
 */
export const exportarMesAPdf = async ({
  titulo = 'Informe Mensual',
  mesNombre = '',
  headers = [],
  rows = [],
  totalImporte = 0,
  totalRegistros = 0,
  nombreArchivo = 'informe.pdf'
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Colores corporativos de Ventus App
  const primaryGreen = [34, 197, 94]; // #22c55e
  const darkBg = [17, 24, 39]; // #111827
  const mutedGray = [107, 114, 128]; // #6b7280

  // 1. Franja superior de marca
  doc.setFillColor(...primaryGreen);
  doc.rect(0, 0, 210, 22, 'F');

  // Logo / Nombre
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('VENTUS APP', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestión Deportiva y Control de Pagos', 196, 14, { align: 'right' });

  // 2. Título del informe y período
  doc.setTextColor(...darkBg);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  const tituloCompleto = mesNombre ? `${titulo} - ${mesNombre}` : titulo;
  doc.text(tituloCompleto, 14, 34);

  // Fecha y hora de generación
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedGray);
  const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Fecha de emisión: ${fechaGeneracion}`, 14, 40);

  // 3. Tarjeta resumen
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 45, 182, 14, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkBg);
  doc.text('Total Registros:', 20, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(String(totalRegistros), 48, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Recaudado:', 110, 54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // verde oscuro para contraste en papel blanco
  doc.text(formatCurrency(totalImporte), 142, 54);

  // 4. Tabla de datos
  const footRow = headers.map((_, idx) => {
    if (idx === 0) return 'TOTAL';
    if (idx === headers.length - 1) return formatCurrency(totalImporte);
    return '';
  });

  autoTable(doc, {
    startY: 64,
    head: [headers],
    body: rows,
    foot: [footRow],
    theme: 'striped',
    headStyles: {
      fillColor: primaryGreen,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'left'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
      textColor: [31, 41, 55],
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      [headers.length - 1]: { halign: 'right', fontStyle: 'bold' }
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      fontSize: 9.5
    },
    didDrawPage: (data) => {
      // Pie de página con numeración
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...mutedGray);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${data.pageNumber} de ${pageCount} • Ventus App`,
        105,
        290,
        { align: 'center' }
      );
    }
  });

  // 5. Descarga directa o Compartir (compatible con iPadOS / AirDrop)
  const blob = doc.output('blob');
  const file = new File([blob], nombreArchivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: nombreArchivo,
        text: `${titulo} - ${mesNombre}`
      });
      return { exito: true, metodo: 'share' };
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        return { exito: false, cancelado: true };
      }
    }
  }

  // Descarga habitual
  doc.save(nombreArchivo);
  return { exito: true, metodo: 'download' };
};
