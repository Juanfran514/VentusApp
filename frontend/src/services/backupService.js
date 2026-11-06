import { supabase, getActiveGimnasioId } from '../supabase';
import { dataEvents } from './dataEvents';
import { db } from '../db/db';

/**
 * Generador de UUID v4 compatible con navegadores antiguos y modernos
 */
const generarUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Divide un array en lotes más pequeños para inserciones seguras por HTTP
 */
const chunkArray = (array, size = 100) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Handlers modulares por entidad siguiendo el Principio de Responsabilidad Única y Abierto/Cerrado (SRP / OCP)
 */
const ENTITY_HANDLERS = {
  grupos: {
    async export(gimnasioId) {
      const { data, error } = await supabase
        .from('grupos')
        .select('*')
        .eq('gimnasio_id', gimnasioId)
        .order('orden', { ascending: true });
      if (error) console.error('Error exportando grupos:', error);
      return data || [];
    },
    async import(items, { gimnasioId, idMap }) {
      if (!items || !items.length) return 0;
      const rows = items.map(g => {
        const newId = (g.id && typeof g.id === 'string' && g.id.includes('-')) ? g.id : generarUUID();
        if (g.id) idMap.grupos[g.id] = newId;

        return {
          id: newId,
          gimnasio_id: gimnasioId,
          nombre: g.nombre || 'Grupo sin nombre',
          actividad: g.actividad || '',
          horarios: g.horarios || '',
          plazas_max: Number(g.plazas_max || g.plazasMax) || 20,
          tarifas: g.tarifas || {},
          orden: Number(g.orden) || 0
        };
      });

      for (const batch of chunkArray(rows)) {
        const { error } = await supabase.from('grupos').upsert(batch);
        if (error) console.error('Error importando grupos:', error);
      }
      return rows.length;
    }
  },

  alumnos: {
    async export(gimnasioId) {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .eq('gimnasio_id', gimnasioId)
        .order('nombre', { ascending: true });
      if (error) console.error('Error exportando alumnos:', error);
      return data || [];
    },
    async import(items, { gimnasioId, idMap }) {
      if (!items || !items.length) return 0;
      const rows = items.map(a => {
        const newId = (a.id && typeof a.id === 'string' && a.id.includes('-')) ? a.id : generarUUID();
        if (a.id) idMap.alumnos[a.id] = newId;

        // Mapear grupo_id si fue reasignado
        let grupoId = a.grupo_id || a.grupoId || null;
        if (grupoId && idMap.grupos[grupoId]) {
          grupoId = idMap.grupos[grupoId];
        }

        // Mapear inscripciones
        let inscripciones = a.inscripciones || [];
        if (Array.isArray(inscripciones)) {
          inscripciones = inscripciones.map(ins => ({
            ...ins,
            grupoId: idMap.grupos[ins.grupoId] || ins.grupoId
          }));
        }

        return {
          id: newId,
          gimnasio_id: gimnasioId,
          nombre: a.nombre || 'Alumno',
          apellidos: a.apellidos || '',
          fecha_nac: a.fecha_nac || a.fechaNac || null,
          telefono: a.telefono || '',
          n_tutor: a.n_tutor || a.nTutor || '',
          grupo_id: grupoId,
          cuota: Number(a.cuota) || 0,
          estado: a.estado || 'activo',
          inscripciones,
          observaciones: a.observaciones || '',
          lesiones: a.lesiones || '',
          cinturon: a.cinturon || '',
          email: a.email || '',
          foto: a.foto || '',
          fecha_alta: a.fecha_alta || a.fechaAlta || new Date().toISOString()
        };
      });

      for (const batch of chunkArray(rows)) {
        const { error } = await supabase.from('alumnos').upsert(batch);
        if (error) console.error('Error importando alumnos:', error);
      }
      return rows.length;
    }
  },

  gastos_fijos: {
    async export(gimnasioId) {
      try {
        const { data, error } = await supabase
          .from('gastos_fijos')
          .select('*')
          .eq('gimnasio_id', gimnasioId)
          .order('dia_mes', { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        console.warn('Tabla gastos_fijos no disponible para export:', e);
      }
      return [];
    },
    async import(items, { gimnasioId, idMap }) {
      if (!items || !items.length) return 0;
      const rows = items.map(gf => {
        const newId = (gf.id && typeof gf.id === 'string' && gf.id.includes('-')) ? gf.id : generarUUID();
        if (gf.id) idMap.gastosFijos[gf.id] = newId;

        return {
          id: newId,
          gimnasio_id: gimnasioId,
          concepto: gf.concepto || 'Gasto Fijo',
          categoria: gf.categoria || 'General',
          importe: Number(gf.importe) || 0,
          dia_mes: Number(gf.dia_mes || gf.diaMes) || 1,
          activo: gf.activo !== false
        };
      });

      try {
        for (const batch of chunkArray(rows)) {
          const { error } = await supabase.from('gastos_fijos').upsert(batch);
          if (error) console.warn('Aviso al importar gastos_fijos:', error);
        }
      } catch (e) {
        console.warn('No se pudo insertar en gastos_fijos:', e);
      }
      return rows.length;
    }
  },

  gastos: {
    async export(gimnasioId) {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .eq('gimnasio_id', gimnasioId)
        .order('fecha', { ascending: false });
      if (error) console.error('Error exportando gastos:', error);
      return data || [];
    },
    async import(items, { gimnasioId, idMap }) {
      if (!items || !items.length) return 0;
      const rows = items.map(g => {
        const newId = (g.id && typeof g.id === 'string' && g.id.includes('-')) ? g.id : generarUUID();

        let gastoFijoId = g.gasto_fijo_id || g.gastoFijoId || null;
        if (gastoFijoId && idMap.gastosFijos[gastoFijoId]) {
          gastoFijoId = idMap.gastosFijos[gastoFijoId];
        }

        const fechaStr = g.fecha || new Date().toISOString();
        const d = new Date(fechaStr);
        const validDate = !isNaN(d.getTime()) ? d : new Date();

        return {
          id: newId,
          gimnasio_id: gimnasioId,
          concepto: g.concepto || 'Gasto',
          categoria: g.categoria || 'General',
          importe: Number(g.importe) || 0,
          fecha: validDate.toISOString(),
          tipo: g.tipo || 'variable',
          mes: g.mes ? Number(g.mes) : validDate.getMonth() + 1,
          año: g.año ? Number(g.año) : validDate.getFullYear(),
          gasto_fijo_id: gastoFijoId,
          factura: g.factura || null,
          factura_url: g.factura_url || null
        };
      });

      for (const batch of chunkArray(rows)) {
        const { error } = await supabase.from('gastos').upsert(batch);
        if (error) console.error('Error importando gastos:', error);
      }
      return rows.length;
    }
  },

  productos: {
    async export(gimnasioId) {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('gimnasio_id', gimnasioId)
        .order('nombre', { ascending: true });
      if (error) console.error('Error exportando productos:', error);
      return data || [];
    },
    async import(items, { gimnasioId, idMap }) {
      if (!items || !items.length) return 0;
      const rows = items.map(p => {
        const newId = (p.id && typeof p.id === 'string' && p.id.includes('-')) ? p.id : generarUUID();
        if (p.id) idMap.productos[p.id] = newId;

        return {
          id: newId,
          gimnasio_id: gimnasioId,
          nombre: p.nombre || 'Producto',
          precio: Number(p.precio) || 0,
          coste: Number(p.coste) || 0,
          beneficio: Number(p.beneficio) || 0,
          colores: p.colores || [],
          tallas: p.tallas || [],
          foto: p.foto || '',
          activo: p.activo !== false
        };
      });

      for (const batch of chunkArray(rows)) {
        const { error } = await supabase.from('productos').upsert(batch);
        if (error) console.error('Error importando productos:', error);
      }
      return rows.length;
    }
  },

  pagos: {
    async export(gimnasioId) {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('gimnasio_id', gimnasioId)
        .order('fecha', { ascending: false });
      if (error) console.error('Error exportando pagos:', error);
      return data || [];
    },
    async import(items, { gimnasioId, idMap }) {
      if (!items || !items.length) return 0;
      const rows = items.map(p => {
        const newId = (p.id && typeof p.id === 'string' && p.id.includes('-')) ? p.id : generarUUID();

        // Mapear alumno_id al nuevo UUID si vino de backup legacy
        let alumnoId = p.alumno_id || p.alumnoId;
        if (alumnoId && idMap.alumnos[alumnoId]) {
          alumnoId = idMap.alumnos[alumnoId];
        }

        // Mapear producto_id
        let productoId = p.producto_id || p.productoId || null;
        if (productoId && idMap.productos[productoId]) {
          productoId = idMap.productos[productoId];
        }

        const fechaStr = p.fecha || new Date().toISOString();
        const d = new Date(fechaStr);
        const validDate = !isNaN(d.getTime()) ? d : new Date();

        return {
          id: newId,
          gimnasio_id: gimnasioId,
          alumno_id: alumnoId,
          tipo: p.tipo || 'cuota',
          mes: p.mes !== null && p.mes !== undefined ? Number(p.mes) : validDate.getMonth() + 1,
          año: p.año !== null && p.año !== undefined ? Number(p.año) : validDate.getFullYear(),
          importe: Number(p.importe) || 0,
          beneficio: Number(p.beneficio) || 0,
          fecha: validDate.toISOString(),
          concepto: p.concepto || '',
          estado: p.estado || 'pagado',
          estado_pedido: p.estado_pedido || p.estadoPedido || null,
          color: p.color || '',
          talla: p.talla || '',
          producto_id: productoId
        };
      }).filter(p => p.alumno_id); // Asegurar que tenga alumno válido

      for (const batch of chunkArray(rows)) {
        const { error } = await supabase.from('pagos').upsert(batch);
        if (error) console.error('Error importando pagos:', error);
      }
      return rows.length;
    }
  }
};

/**
 * Servicio Centralizado de Copias de Seguridad (SOLID: SRP, OCP, DIP)
 */
export const backupService = {
  /**
   * Extrae los datos reales multi-tenant de Supabase y metadatos locales
   */
  async exportarDatos() {
    const gimnasioId = await getActiveGimnasioId();

    // Obtener información del club
    let gimnasioInfo = null;
    try {
      const { data } = await supabase
        .from('gimnasios')
        .select('id, nombre, email, telefono, logo_url, color_primario, color_secundario')
        .eq('id', gimnasioId)
        .maybeSingle();
      gimnasioInfo = data;
    } catch (e) {
      console.warn('No se pudo obtener información del gimnasio para export:', e);
    }

    // Exportar entidades de datos mediante sus handlers
    const [grupos, alumnos, gastosFijos, gastos, productos, pagos] = await Promise.all([
      ENTITY_HANDLERS.grupos.export(gimnasioId),
      ENTITY_HANDLERS.alumnos.export(gimnasioId),
      ENTITY_HANDLERS.gastos_fijos.export(gimnasioId),
      ENTITY_HANDLERS.gastos.export(gimnasioId),
      ENTITY_HANDLERS.productos.export(gimnasioId),
      ENTITY_HANDLERS.pagos.export(gimnasioId)
    ]);

    // Obtener categorías guardadas
    const getCat = (key) => {
      try {
        const raw = localStorage.getItem(`ventus_cat_${key}`);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };

    return {
      app: 'VentusApp',
      version: 5,
      fecha: new Date().toISOString(),
      gimnasioId,
      gimnasio: gimnasioInfo,
      data: {
        grupos,
        alumnos,
        gastosFijos,
        gastos,
        productos,
        pagos,
        categorias: {
          gastos: getCat('gastos'),
          gastos_variables: getCat('gastos_variables'),
          gastos_fijos: getCat('gastos_fijos'),
          grupos: getCat('grupos'),
          material: getCat('material'),
          licencias: getCat('licencias')
        }
      }
    };
  },

  /**
   * Restaura datos en Supabase a partir de un objeto JSON estructurado (soporta v1 a v5)
   */
  async restaurarDatos(backupData, modo = 'reemplazar') {
    if (!backupData?.data) {
      throw new Error('El archivo no contiene un formato de datos válido de VentusApp.');
    }

    const gimnasioId = await getActiveGimnasioId();
    const data = backupData.data;

    // Normalizar datos de entrada (manejo de compatibilidad v1-v4)
    const gruposRaw = data.grupos || [];
    const alumnosRaw = data.alumnos || [];
    const gastosFijosRaw = data.gastosFijos || data.gastos_fijos || [];
    const gastosRaw = data.gastos || [];
    const productosRaw = data.productos || [];
    const pagosRaw = data.pagos || [];
    const categorias = data.categorias || {};

    // Mapa de traducción de IDs numéricos heredados -> nuevos UUIDs
    const idMap = {
      grupos: {},
      alumnos: {},
      gastosFijos: {},
      productos: {}
    };

    // Si el modo es 'reemplazar', limpiamos los datos actuales de este gimnasio
    if (modo === 'reemplazar') {
      try {
        // Borrado ordenado respetando claves foráneas
        await supabase.from('pagos').delete().eq('gimnasio_id', gimnasioId);
        await supabase.from('gastos').delete().eq('gimnasio_id', gimnasioId);
        await supabase.from('alumnos').delete().eq('gimnasio_id', gimnasioId);
        await supabase.from('productos').delete().eq('gimnasio_id', gimnasioId);
        try {
          await supabase.from('gastos_fijos').delete().eq('gimnasio_id', gimnasioId);
        } catch {}
        await supabase.from('grupos').delete().eq('gimnasio_id', gimnasioId);
      } catch (err) {
        console.warn('Aviso durante la limpieza previa de tablas:', err);
      }
    }

    // Importación ordenada para satisfacer integridad referencial:
    // 1. Grupos y Productos
    const gruposCount = await ENTITY_HANDLERS.grupos.import(gruposRaw, { gimnasioId, idMap });
    const productosCount = await ENTITY_HANDLERS.productos.import(productosRaw, { gimnasioId, idMap });

    // 2. Gastos Fijos
    const gastosFijosCount = await ENTITY_HANDLERS.gastos_fijos.import(gastosFijosRaw, { gimnasioId, idMap });

    // 3. Alumnos (pueden referenciar grupos)
    const alumnosCount = await ENTITY_HANDLERS.alumnos.import(alumnosRaw, { gimnasioId, idMap });

    // 4. Pagos y Gastos (referencian alumnos, productos y gastos_fijos)
    const gastosCount = await ENTITY_HANDLERS.gastos.import(gastosRaw, { gimnasioId, idMap });
    const pagosCount = await ENTITY_HANDLERS.pagos.import(pagosRaw, { gimnasioId, idMap });

    // Restaurar categorías en localStorage
    if (categorias && typeof categorias === 'object') {
      Object.entries(categorias).forEach(([key, items]) => {
        if (Array.isArray(items) && items.length) {
          try {
            localStorage.setItem(`ventus_cat_${key}`, JSON.stringify(items));
          } catch (e) {
            console.warn(`Error guardando categoría ${key}:`, e);
          }
        }
      });
    }

    // Si viene información de branding del gimnasio en la copia y estamos en modo reemplazar, restaurarla
    if (backupData.gimnasio && modo === 'reemplazar') {
      try {
        const updates = {};
        if (backupData.gimnasio.logo_url !== undefined) updates.logo_url = backupData.gimnasio.logo_url;
        if (backupData.gimnasio.color_primario) updates.color_primario = backupData.gimnasio.color_primario;
        if (backupData.gimnasio.color_secundario) updates.color_secundario = backupData.gimnasio.color_secundario;
        if (Object.keys(updates).length > 0) {
          await supabase.from('gimnasios').update(updates).eq('id', gimnasioId);
        }
      } catch (e) {
        console.warn('No se pudo restaurar el branding del club:', e);
      }
    }

    // Notificar a toda la interfaz que los datos han sido renovados
    dataEvents.emit('*');

    // Sincronizar también Dexie local como caché si existe la base de datos
    try {
      if (db) {
        const stores = [db.alumnos, db.grupos, db.pagos, db.gastos];
        if (db.gastosFijos) stores.push(db.gastosFijos);
        if (db.productos) stores.push(db.productos);

        await db.transaction('rw', stores, async () => {
          if (modo === 'reemplazar') {
            await db.alumnos.clear();
            await db.grupos.clear();
            await db.pagos.clear();
            await db.gastos.clear();
            if (db.gastosFijos) await db.gastosFijos.clear();
            if (db.productos) await db.productos.clear();
          }
        });
      }
    } catch (e) {
      console.warn('Sincronización opcional de Dexie omitida:', e);
    }

    return {
      alumnos: alumnosCount,
      grupos: gruposCount,
      pagos: pagosCount,
      gastos: gastosCount,
      gastosFijos: gastosFijosCount,
      productos: productosCount
    };
  }
};

