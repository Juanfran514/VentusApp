/**
 * Utilidad de compresión y redimensionado de imágenes en el cliente mediante HTML5 Canvas.
 * Reduce drásticamente el peso de fotos de cámara o archivos pesados (de 5-10 MB a ~20-30 KB)
 * usando un tamaño miniatura y formato WebP/JPEG para evitar saturar IndexedDB o el almacenamiento local.
 */
export const comprimirImagen = (file, maxDimension = 320, calidad = 0.75) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No se ha proporcionado ningún archivo.'));
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para procesarla.'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular escalado manteniendo aspect ratio
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

        // Crear canvas para el reescalado
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo obtener el contexto 2D del Canvas.'));
        }

        // Dibujar con suavizado
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Intentar compresión a WebP (muy ligero), con fallback a JPEG
        try {
          let dataUrl = canvas.toDataURL('image/webp', calidad);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', calidad);
          }
          resolve(dataUrl);
        } catch {
          try {
            const fallbackUrl = canvas.toDataURL('image/jpeg', calidad);
            resolve(fallbackUrl);
          } catch (fallbackErr) {
            reject(fallbackErr);
          }
        }
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
};
