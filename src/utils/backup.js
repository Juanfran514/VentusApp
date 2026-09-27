import { db } from '../db/db';

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
 * Exporta todos los datos de Dexie y localStorage como archivo .json
 */
export const exportarCopiaSeguridad = async () => {
  const alumnos = await db.alumnos.toArray();
  const grupos = await db.grupos.toArray();
  const pagos = await db.pagos.toArray();
  const gastos = await db.gastos.toArray();

  const categoriasGastos = localStorage.getItem('ventus_cat_gastos');
  const categoriasGrupos = localStorage.getItem('ventus_cat_grupos');
  const categoriasMaterial = localStorage.getItem('ventus_cat_material');

  const backupData = {
    app: 'VentusApp',
    version: 1,
    fecha: new Date().toISOString(),
    data: {
      alumnos,
      grupos,
      pagos,
      gastos,
      categorias: {
        gastos: categoriasGastos ? JSON.parse(categoriasGastos) : [],
        grupos: categoriasGrupos ? JSON.parse(categoriasGrupos) : [],
        material: categoriasMaterial ? JSON.parse(categoriasMaterial) : []
      }
    }
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const datePart = new Date().toISOString().split('T')[0];
  const filename = `copia_seguridad_ventus_${datePart}.json`;
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });

  // Si iPadOS soporta Web Share con archivos (AirDrop, Guardar en Archivos...)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: 'Copia de seguridad de Ventus App'
      });
      return { exito: true, metodo: 'share' };
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        return { exito: false, cancelado: true };
      }
    }
  }

  // Descarga directa habitual (en iPad va a la app Archivos -> Descargas)
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
 * Restaura los datos desde una estructura JSON válida
 */
export const restaurarCopiaSeguridad = async (backupData, modo = 'reemplazar') => {
  if (!backupData?.data) {
    throw new Error('El archivo no contiene datos válidos de VentusApp.');
  }

  const { alumnos = [], grupos = [], pagos = [], gastos = [], categorias = {} } = backupData.data;

  if (modo === 'reemplazar') {
    await db.transaction('rw', [db.alumnos, db.grupos, db.pagos, db.gastos], async () => {
      await db.alumnos.clear();
      await db.grupos.clear();
      await db.pagos.clear();
      await db.gastos.clear();

      if (alumnos.length) await db.alumnos.bulkAdd(alumnos);
      if (grupos.length) await db.grupos.bulkAdd(grupos);
      if (pagos.length) await db.pagos.bulkAdd(pagos);
      if (gastos.length) await db.gastos.bulkAdd(gastos);
    });
  } else {
    // Modo fusionar
    await db.transaction('rw', [db.alumnos, db.grupos, db.pagos, db.gastos], async () => {
      if (alumnos.length) await db.alumnos.bulkPut(alumnos);
      if (grupos.length) await db.grupos.bulkPut(grupos);
      if (pagos.length) await db.pagos.bulkPut(pagos);
      if (gastos.length) await db.gastos.bulkPut(gastos);
    });
  }

  // Restaurar categorías en localStorage si vienen en la copia
  if (categorias?.gastos && Array.isArray(categorias.gastos)) {
    localStorage.setItem('ventus_cat_gastos', JSON.stringify(categorias.gastos));
  }
  if (categorias?.grupos && Array.isArray(categorias.grupos)) {
    localStorage.setItem('ventus_cat_grupos', JSON.stringify(categorias.grupos));
  }
  if (categorias?.material && Array.isArray(categorias.material)) {
    localStorage.setItem('ventus_cat_material', JSON.stringify(categorias.material));
  }

  return {
    alumnos: alumnos.length,
    grupos: grupos.length,
    pagos: pagos.length,
    gastos: gastos.length
  };
};
