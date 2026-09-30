import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './formatters';
import logoImg from '../assets/logo.png';

let cachedLogoElement = null;

const getLogoImageElement = () => {
  return new Promise((resolve) => {
    if (cachedLogoElement) {
      return resolve(cachedLogoElement);
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      cachedLogoElement = img;
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = logoImg;
  });
};

const renderPdfHeaderLogo = async (doc) => {
  const logoElement = await getLogoImageElement();
  if (logoElement && logoElement.complete && logoElement.naturalWidth > 0) {
    const aspect = logoElement.naturalWidth / logoElement.naturalHeight;
    const height = 13; // mm de alto dentro de la franja de 22mm
    const width = height * aspect;
    doc.addImage(logoElement, 'PNG', 14, 4.5, width, height);
  } else {
    // Fallback a texto en caso de fallo de carga de imagen
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('VENTUS APP', 14, 14);
  }
};

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

  // Renderizar logo oficial de Ventus App
  await renderPdfHeaderLogo(doc);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
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

/**
 * Exporta un informe financiero completo (Balance de Ingresos por fuentes, Gastos por categorías,
 * Beneficio Neto y listado detallado de transacciones) a PDF.
 *
 * @param {Object} options
 * @param {string} options.mesNombre - Nombre del mes o período (ej: "Marzo 2026")
 * @param {number} options.totalIngresos - Suma total de ingresos abonados
 * @param {number} options.totalGastos - Suma total de gastos
 * @param {number} options.beneficioNeto - Resultado neto (Ingresos - Gastos)
 * @param {Array<{ fuente: string, cantidad: number, total: number }>} options.desgloseIngresos
 * @param {Array<{ categoria: string, total: number }>} options.desgloseGastos
 * @param {Array<Array>} options.filasIngresos - Filas de la tabla detallada de ingresos
 * @param {Array<Array>} options.filasGastos - Filas de la tabla detallada de gastos
 * @param {string} [options.nombreArchivo] - Nombre del archivo a generar
 */
export const exportarBalanceFinancieroPDF = async ({
  mesNombre = '',
  totalIngresos = 0,
  totalGastos = 0,
  beneficioNeto = 0,
  desgloseIngresos = [],
  desgloseGastos = [],
  filasIngresos = [],
  filasGastos = [],
  nombreArchivo = 'balance_financiero.pdf'
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryGreen = [34, 197, 94]; // #22c55e
  const darkBg = [17, 24, 39]; // #111827
  const mutedGray = [107, 114, 128]; // #6b7280
  const dangerRed = [239, 68, 68]; // #ef4444

  // 1. Franja superior corporativa
  doc.setFillColor(...primaryGreen);
  doc.rect(0, 0, 210, 22, 'F');

  // Renderizar logo oficial de Ventus App
  await renderPdfHeaderLogo(doc);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Informe Financiero & Flujo de Caja', 196, 14, { align: 'right' });

  // 2. Título principal
  doc.setTextColor(...darkBg);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(`Balance Financiero - ${mesNombre}`, 14, 33);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedGray);
  const fechaEmision = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Fecha de emisión: ${fechaEmision}`, 14, 39);

  // 3. Tarjeta de resumen ejecutivo (3 columnas: Ingresos, Gastos, Beneficio Neto)
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 43, 182, 18, 2, 2, 'FD');

  // Columna 1: Ingresos
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedGray);
  doc.text('INGRESOS TOTALES', 20, 49);
  doc.setFontSize(11);
  doc.setTextColor(22, 163, 74);
  doc.text(`+${formatCurrency(totalIngresos)}`, 20, 56);

  // Columna 2: Gastos
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedGray);
  doc.text('GASTOS TOTALES', 82, 49);
  doc.setFontSize(11);
  doc.setTextColor(...dangerRed);
  doc.text(`-${formatCurrency(totalGastos)}`, 82, 56);

  // Columna 3: Beneficio Neto
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...mutedGray);
  doc.text('BENEFICIO NETO', 144, 49);
  doc.setFontSize(11);
  if (beneficioNeto >= 0) {
    doc.setTextColor(22, 163, 74);
    doc.text(`+${formatCurrency(beneficioNeto)}`, 144, 56);
  } else {
    doc.setTextColor(...dangerRed);
    doc.text(formatCurrency(beneficioNeto), 144, 56);
  }

  let currentY = 67;

  // 4. Tabla: Desglose de Ingresos por Fuente
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkBg);
  doc.text('1. Fuentes de Ingresos', 14, currentY);

  const rowsFuentes = desgloseIngresos.map(d => [
    d.fuente,
    String(d.cantidad),
    formatCurrency(d.total)
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Fuente de Ingreso', 'Operaciones', 'Total Recaudado']],
    body: rowsFuentes,
    foot: [['TOTAL INGRESOS', '', `+${formatCurrency(totalIngresos)}`]],
    theme: 'striped',
    headStyles: { fillColor: primaryGreen, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [31, 41, 55] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right', fontStyle: 'bold' }
    },
    footStyles: { fillColor: [243, 244, 246], textColor: [22, 163, 74], fontStyle: 'bold', fontSize: 9 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 5. Tabla: Desglose de Gastos por Categoría
  if (desgloseGastos.length > 0) {
    // Si queda poco espacio al final de página, saltar de página
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkBg);
    doc.text('2. Desglose de Gastos por Categoría', 14, currentY);

    const rowsGastosCat = desgloseGastos.map(g => [
      g.categoria,
      formatCurrency(g.total)
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Categoría de Gasto', 'Total Gastado']],
      body: rowsGastosCat,
      foot: [['TOTAL GASTOS', `-${formatCurrency(totalGastos)}`]],
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 3, textColor: [31, 41, 55] },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      },
      footStyles: { fillColor: [243, 244, 246], textColor: dangerRed, fontStyle: 'bold', fontSize: 9 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 6. Tabla: Listado Detallado de Ingresos
  if (filasIngresos.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkBg);
    doc.text('3. Detalle de Cobros e Ingresos del Período', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha', 'Alumno', 'Tipo', 'Concepto / Período', 'Importe']],
      body: filasIngresos,
      theme: 'striped',
      headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [31, 41, 55] },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' }
      }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 7. Tabla: Listado Detallado de Gastos
  if (filasGastos.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkBg);
    doc.text('4. Detalle de Gastos del Período', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha', 'Concepto', 'Categoría', 'Importe']],
      body: filasGastos,
      theme: 'striped',
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [31, 41, 55] },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' }
      }
    });
  }

  // Numeración de páginas en pie de página
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...mutedGray);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${totalPages} • Ventus App - Balance Financiero ${mesNombre}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Descarga directa o compartir Web Share
  const blob = doc.output('blob');
  const file = new File([blob], nombreArchivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: nombreArchivo,
        text: `Balance Financiero - ${mesNombre}`
      });
      return { exito: true, metodo: 'share' };
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        return { exito: false, cancelado: true };
      }
    }
  }

  doc.save(nombreArchivo);
  return { exito: true, metodo: 'download' };
};

