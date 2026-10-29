/**
 * Procesador de facturas y tickets adjuntos (PDFs e Imágenes)
 * - Las imágenes se comprimen con alta definición (máx. 1280px, calidad 0.82) para que el texto
 *   y las cifras se lean a la perfección ocupando apenas ~60-120 KB.
 * - Los PDFs se leen y validan en Base64 hasta 4 MB para preservar su formato vectorial original.
 */

export const procesarArchivoFactura = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No se ha proporcionado ningún archivo.'));
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      return reject(new Error('El archivo debe ser una imagen (JPG, PNG) o un documento PDF.'));
    }

    // 1. PROCESADO DE PDF
    if (isPdf) {
      const maxPdfSize = 4 * 1024 * 1024; // 4 MB
      if (file.size > maxPdfSize) {
        return reject(new Error('El PDF es demasiado grande. El límite recomendado para almacenamiento local es 4 MB.'));
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Error al leer el archivo PDF.'));
      reader.onload = (e) => {
        resolve({
          archivo: e.target.result,
          nombre: file.name,
          tipo: 'pdf',
          tamano: file.size,
          fechaSubida: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // 2. PROCESADO Y COMPRESIÓN DE IMÁGENES (Alta nitidez para texto legible)
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer la imagen de la factura.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para procesarla.'));
      img.onload = () => {
        const maxDimension = 1280; // Alta resolución suficiente para leer importes y NIFs
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo inicializar el Canvas 2D.'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        resolve({
          archivo: dataUrl,
          nombre: file.name,
          tipo: 'imagen',
          tamano: Math.round((dataUrl.length * 3) / 4),
          fechaSubida: new Date().toISOString()
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Descarga una factura adjunta al dispositivo
 */
export const descargarFactura = (factura, concepto = 'factura') => {
  if (!factura?.archivo) return;

  const defaultExt = factura.tipo === 'pdf' ? 'pdf' : 'jpg';
  const cleanConcepto = (concepto || 'factura').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = factura.nombre || `factura_${cleanConcepto}.${defaultExt}`;

  const a = document.createElement('a');
  a.href = factura.archivo;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

