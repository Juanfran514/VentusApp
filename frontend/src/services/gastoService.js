import { supabase, getActiveGimnasioId } from '../supabase';
import { saveStoredCategoria } from '../utils/categorias';
import { dataEvents } from './dataEvents';

const mapGastoFromDb = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    gimnasioId: row.gimnasio_id,
    concepto: row.concepto,
    categoria: row.categoria,
    importe: Number(row.importe) || 0,
    fecha: row.fecha,
    tipo: row.tipo,
    mes: row.mes,
    año: row.año,
    gastoFijoId: row.gasto_fijo_id,
    factura: row.factura
  };
};

const mapGastoFijoFromDb = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    gimnasioId: row.gimnasio_id,
    concepto: row.concepto,
    categoria: row.categoria,
    importe: Number(row.importe) || 0,
    diaMes: Number(row.dia_mes) || 1,
    activo: row.activo !== false
  };
};

export const gastoService = {
  /**
   * Obtiene todos los gastos registrados ordenados por fecha descendente
   */
  async getAll() {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error en gastoService.getAll:', error);
      return [];
    }
    return (data || []).map(mapGastoFromDb);
  },

  /**
   * Obtiene la lista de plantillas de gastos fijos recurrentes
   */
  async getAllFijos() {
    const { data, error } = await supabase
      .from('gastos_fijos')
      .select('*')
      .order('dia_mes', { ascending: true });

    if (error) {
      console.error('Error en gastoService.getAllFijos:', error);
      return [];
    }
    return (data || []).map(mapGastoFijoFromDb);
  },

  /**
   * Crea una nueva plantilla de gasto fijo recurrente
   */
  async createGastoFijo(data) {
    const gimnasioId = await getActiveGimnasioId();
    const catTrimmed = (data.categoria || '').trim();

    const payload = {
      gimnasio_id: gimnasioId,
      concepto: (data.concepto || '').trim(),
      categoria: catTrimmed,
      importe: Number(data.importe) || 0,
      dia_mes: Number(data.diaMes) || 1,
      activo: data.activo !== false
    };

    const { data: inserted, error } = await supabase
      .from('gastos_fijos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    if (catTrimmed) {
      saveStoredCategoria('gastos_fijos', catTrimmed, []);
      saveStoredCategoria('gastos', catTrimmed, []);
    }

    dataEvents.emit('gastos_fijos', inserted);
    return mapGastoFijoFromDb(inserted);
  },

  /**
   * Actualiza una plantilla de gasto fijo recurrente
   */
  async updateGastoFijo(id, data) {
    const updates = {};
    if (data.concepto !== undefined) updates.concepto = (data.concepto || '').trim();
    if (data.categoria !== undefined) {
      updates.categoria = (data.categoria || '').trim();
      if (updates.categoria) {
        saveStoredCategoria('gastos_fijos', updates.categoria, []);
        saveStoredCategoria('gastos', updates.categoria, []);
      }
    }
    if (data.importe !== undefined) updates.importe = Number(data.importe) || 0;
    if (data.diaMes !== undefined) updates.dia_mes = Number(data.diaMes) || 1;
    if (data.activo !== undefined) updates.activo = data.activo;

    const { data: updated, error } = await supabase
      .from('gastos_fijos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('gastos_fijos', updated);
    return mapGastoFijoFromDb(updated);
  },

  /**
   * Elimina una plantilla de gasto fijo
   */
  async deleteGastoFijo(id) {
    const { error } = await supabase
      .from('gastos_fijos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    dataEvents.emit('gastos_fijos', { id });
    return true;
  },

  /**
   * Calcula el estado de los gastos fijos para un mes y año dados.
   * Si no se ha marcado como pagado este mes, aparece como 'pendiente'.
   */
  calcularEstadoFijosMes(gastosFijos = [], gastos = [], mes, año) {
    const mesNum = Number(mes);
    const añoNum = Number(año);
    const fijosActivos = (gastosFijos || []).filter(gf => gf.activo !== false);

    const items = fijosActivos.map(gf => {
      const record = (gastos || []).find(g => 
        g.tipo === 'fijo' && 
        String(g.gastoFijoId) === String(gf.id) &&
        Number(g.mes) === mesNum &&
        Number(g.año) === añoNum
      );

      if (record) {
        return {
          id: gf.id,
          gastoFijo: gf,
          concepto: record.concepto || gf.concepto,
          categoria: record.categoria || gf.categoria,
          importe: Number(record.importe),
          fechaPago: record.fecha,
          pagado: true,
          gastoRegistroId: record.id,
          factura: record.factura || null
        };
      }

      return {
        id: gf.id,
        gastoFijo: gf,
        concepto: gf.concepto,
        categoria: gf.categoria,
        importe: Number(gf.importe),
        fechaPago: null,
        pagado: false,
        gastoRegistroId: null,
        factura: null
      };
    });

    const pagados = items.filter(i => i.pagado);
    const pendientes = items.filter(i => !i.pagado);

    const totalPagado = pagados.reduce((sum, i) => sum + i.importe, 0);
    const totalPendiente = pendientes.reduce((sum, i) => sum + i.importe, 0);

    return {
      items,
      pagados,
      pendientes,
      totalPagado,
      totalPendiente,
      countPagados: pagados.length,
      countPendientes: pendientes.length
    };
  },

  /**
   * Marca un gasto fijo como pagado (tildado) en el mes/año indicado.
   */
  async tildarGastoFijo({ gastoFijo, mes, año, importe, fecha, factura = null }) {
    const gimnasioId = await getActiveGimnasioId();
    const mesNum = Number(mes);
    const añoNum = Number(año);
    const fechaObj = fecha ? new Date(fecha) : new Date();

    // Comprobar si ya existe
    const { data: existentes } = await supabase
      .from('gastos')
      .select('id')
      .eq('tipo', 'fijo')
      .eq('gasto_fijo_id', gastoFijo.id)
      .eq('mes', mesNum)
      .eq('año', añoNum);

    const existente = existentes?.[0];
    const importeFinal = Number(importe !== undefined && importe !== '' ? importe : gastoFijo.importe) || 0;

    if (existente) {
      const updateData = {
        importe: importeFinal,
        fecha: fechaObj.toISOString()
      };
      if (factura !== undefined) updateData.factura = factura;

      await supabase
        .from('gastos')
        .update(updateData)
        .eq('id', existente.id);

      dataEvents.emit('gastos', { id: existente.id });
      return existente.id;
    }

    const payload = {
      gimnasio_id: gimnasioId,
      concepto: gastoFijo.concepto,
      categoria: gastoFijo.categoria,
      importe: importeFinal,
      fecha: fechaObj.toISOString(),
      tipo: 'fijo',
      mes: mesNum,
      año: añoNum,
      gasto_fijo_id: gastoFijo.id,
      factura: factura || null
    };

    const { data: inserted, error } = await supabase
      .from('gastos')
      .insert([payload])
      .select('id')
      .single();

    if (error) throw error;
    dataEvents.emit('gastos', inserted);
    return inserted.id;
  },

  /**
   * Desmarca un gasto fijo (destildar), eliminando el registro de pago del mes
   */
  async destildarGastoFijo({ gastoFijoId, mes, año }) {
    const mesNum = Number(mes);
    const añoNum = Number(año);

    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('tipo', 'fijo')
      .eq('gasto_fijo_id', gastoFijoId)
      .eq('mes', mesNum)
      .eq('año', añoNum);

    if (error) throw error;
    dataEvents.emit('gastos', { gastoFijoId });
    return true;
  },

  /**
   * Modifica el importe, fecha o factura de un gasto fijo para un mes específico
   */
  async modificarGastoFijoMes({ gastoFijo, mes, año, nuevoImporte, fecha, factura = undefined }) {
    const gimnasioId = await getActiveGimnasioId();
    const mesNum = Number(mes);
    const añoNum = Number(año);
    const importeFinal = Number(nuevoImporte) || 0;
    const fechaISO = fecha ? new Date(fecha).toISOString() : new Date().toISOString();

    const { data: existentes } = await supabase
      .from('gastos')
      .select('id')
      .eq('tipo', 'fijo')
      .eq('gasto_fijo_id', gastoFijo.id)
      .eq('mes', mesNum)
      .eq('año', añoNum);

    const existente = existentes?.[0];

    const updates = {
      importe: importeFinal,
      fecha: fechaISO
    };
    if (factura !== undefined) updates.factura = factura;

    if (existente) {
      await supabase
        .from('gastos')
        .update(updates)
        .eq('id', existente.id);
      dataEvents.emit('gastos', { id: existente.id });
      return existente.id;
    }

    const payload = {
      gimnasio_id: gimnasioId,
      concepto: gastoFijo.concepto,
      categoria: gastoFijo.categoria,
      importe: importeFinal,
      fecha: fechaISO,
      tipo: 'fijo',
      mes: mesNum,
      año: añoNum,
      gasto_fijo_id: gastoFijo.id,
      factura: factura || null
    };

    const { data: inserted, error } = await supabase
      .from('gastos')
      .insert([payload])
      .select('id')
      .single();

    if (error) throw error;
    dataEvents.emit('gastos', inserted);
    return inserted.id;
  },

  /**
   * Crea un nuevo gasto (variable por defecto)
   */
  async create(data) {
    const gimnasioId = await getActiveGimnasioId();
    const catTrimmed = (data.categoria || '').trim();
    const tipo = data.tipo || 'variable';
    const d = data.fecha ? new Date(data.fecha) : new Date();

    const payload = {
      gimnasio_id: gimnasioId,
      concepto: (data.concepto || '').trim(),
      categoria: catTrimmed,
      importe: Number(data.importe) || 0,
      fecha: d.toISOString(),
      tipo,
      mes: data.mes ? Number(data.mes) : d.getMonth() + 1,
      año: data.año ? Number(data.año) : d.getFullYear(),
      gasto_fijo_id: data.gastoFijoId || null,
      factura: data.factura || null
    };

    const { data: inserted, error } = await supabase
      .from('gastos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    if (catTrimmed) {
      if (tipo === 'variable') {
        saveStoredCategoria('gastos_variables', catTrimmed, []);
      } else {
        saveStoredCategoria('gastos_fijos', catTrimmed, []);
      }
      saveStoredCategoria('gastos', catTrimmed, []);
    }
    dataEvents.emit('gastos', inserted);
    return mapGastoFromDb(inserted);
  },

  /**
   * Actualiza un gasto existente
   */
  async update(id, data) {
    const updates = {};
    if (data.concepto !== undefined) updates.concepto = (data.concepto || '').trim();
    if (data.categoria !== undefined) {
      updates.categoria = (data.categoria || '').trim();
      if (updates.categoria) {
        if (data.tipo === 'variable') {
          saveStoredCategoria('gastos_variables', updates.categoria, []);
        }
        saveStoredCategoria('gastos', updates.categoria, []);
      }
    }
    if (data.importe !== undefined) updates.importe = Number(data.importe) || 0;
    if (data.fecha !== undefined) {
      const d = new Date(data.fecha);
      updates.fecha = d.toISOString();
      updates.mes = d.getMonth() + 1;
      updates.año = d.getFullYear();
    }
    if (data.factura !== undefined) updates.factura = data.factura;

    const { data: updated, error } = await supabase
      .from('gastos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('gastos', updated);
    return mapGastoFromDb(updated);
  },

  /**
   * Adjunta una factura a un gasto existente
   */
  async adjuntarFactura(gastoId, factura) {
    const { data, error } = await supabase
      .from('gastos')
      .update({ factura })
      .eq('id', gastoId)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('gastos', data);
    return mapGastoFromDb(data);
  },

  /**
   * Elimina la factura de un gasto
   */
  async eliminarFactura(gastoId) {
    const { data, error } = await supabase
      .from('gastos')
      .update({ factura: null })
      .eq('id', gastoId)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('gastos', data);
    return mapGastoFromDb(data);
  },

  /**
   * Elimina un gasto por ID
   */
  async delete(id) {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    dataEvents.emit('gastos', { id });
    return true;
  },

  /**
   * Extrae los conceptos habituales de gastos variables
   */
  getConceptosVariablesHabituales(gastos = []) {
    const map = new Map();
    (gastos || [])
      .filter(g => g.tipo !== 'fijo')
      .forEach(g => {
        const c = (g.concepto || '').trim();
        if (!c) return;
        const key = c.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            concepto: c,
            categoria: g.categoria || '',
            importe: Number(g.importe) || 0,
            fechaUltima: g.fecha
          });
        }
      });

    return Array.from(map.values()).sort((a, b) => a.concepto.localeCompare(b.concepto));
  },

  /**
   * Agrupa gastos por categoría para gráficos y resúmenes del mes y año seleccionados.
   */
  agruparPorCategoria(gastos = [], mes, año) {
    if (!gastos || !gastos.length) return [];
    const mesNum = Number(mes);
    const añoNum = Number(año);

    const filtrados = gastos.filter(g => {
      if (g.mes && g.año) {
        return Number(g.mes) === mesNum && Number(g.año) === añoNum;
      }
      const d = new Date(g.fecha);
      return (d.getMonth() + 1) === mesNum && d.getFullYear() === añoNum;
    });

    const categoryMap = {};
    filtrados.forEach(g => {
      const cat = g.categoria || 'Otros';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(g.importe);
    });

    return Object.keys(categoryMap)
      .map(key => ({ name: key, value: categoryMap[key] }))
      .sort((a, b) => b.value - a.value);
  }
};
