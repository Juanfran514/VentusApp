import { backupService } from '../services/backupService';

/**
 * Solicita silenciosamente almacenamiento persistente al navegador
 */
export const solicitarPersistenciaAutomatica = async () => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isAlreadyPersisted = await navigator.storage.persisted();
      if (!isAlreadyPersisted) {
        await navigator.storage.persist();
      }
    }
  } catch (err) {
    console.warn('Persistencia de almacenamiento no soportada o denegada:', err);
  }
};

/**
 * Descarga o comparte un archivo JSON en el navegador (Web Share API para iPad / descarga directa)
 */
export const descargarOCompartirArchivo = async (jsonData, nombreArchivoBase = 'copia_seguridad_ventus') => {
  const jsonStr = JSON.stringify(jsonData, null, 2);
  const datePart = new Date().toISOString().split('T')[0];
  const filename = `${nombreArchivoBase}_${datePart}.json`;
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });

  // Si iPadOS / iOS / Android soporta Web Share con archivos (AirDrop, Guardar en Archivos...)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: 'Copia de seguridad de Ventus App'
      });
      return { exito: true, metodo: 'share', filename };
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        return { exito: false, cancelado: true };
      }
    }
  }

  // Descarga directa habitual en navegador
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { exito: true, metodo: 'download', filename };
};

/**
 * Exporta todos los datos del club/gimnasio desde Supabase y los guarda como archivo .json
 */
export const exportarCopiaSeguridad = async () => {
  const backupData = await backupService.exportarDatos();
  return await descargarOCompartirArchivo(backupData);
};

/**
 * Restaura los datos en Supabase desde una estructura JSON válida (soporta versiones v1 a v5)
 */
export const restaurarCopiaSeguridad = async (backupData, modo = 'reemplazar') => {
  return await backupService.restaurarDatos(backupData, modo);
};
