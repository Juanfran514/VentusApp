import { supabase, getActiveGimnasioId } from '../supabase';
import { saveStoredCategoria } from '../utils/categorias';

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
    return true;
  },

  /**
   * Crea un gasto variable puntual
   */
  async createGastoVariable(data) {
    const gimnasioId = await getActiveGimnasioId();
    const catTrimmed = (data.categoria || '').trim();
    const fechaDate = data.fecha ? new Date(data.fecha) : new Date();

    const payload = {
      gimnasio_id: gimnasioId,
      concepto: (data.concepto || '').trim(),
      categoria: catTrimmed,
      importe: Number(data.importe) || 0,
      fecha: data.fecha || new Date().toISOString(),
      tipo: 'variable',
      mes: fechaDate.getMonth() + 1,
      año: fechaDate.getFullYear(),
      factura: data.factura || null
    };

    const { data: inserted, error } = await supabase
      .from('gastos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    if (catTrimmed) {
      saveStoredCategoria('gastos_variables', catTrimmed, []);
      saveStoredCategoria('gastos', catTrimmed, []);
    }

    return mapGastoFromDb(inserted);
  },

  /**
   * Actualiza un gasto variable existente
   */
  async updateGastoVariable(id, data) {
    const updates = {};
    if (data.concepto !== undefined) updates.concepto = (data.concepto || '').trim();
    if (data.categoria !== undefined) {
      updates.categoria = (data.categoria || '').trim();
      if (updates.categoria) {
        saveStoredCategoria('gastos_variables', updates.categoria, []);
        saveStoredCategoria('gastos', updates.categoria, []);
      }
    }
    if (data.importe !== undefined) updates.importe = Number(data.importe) || 0;
    if (data.fecha !== undefined) {
      updates.fecha = data.fecha;
      const d = new Date(data.fecha);
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
    return mapGastoFromDb(updated);
  },

  /**
   * Elimina un registro de gasto
   */
  async delete(id) {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  agruparPorCategoria(gastos = [], mes, año) {
    if (!gastos || !gastos.length) return [];
    const mesNum = Number(mes);
    const añoNum = Number(año);

    const filtrados = gastos.filter(g => {
      const gMes = g.mes ? Number(g.mes) : new Date(g.fecha).getMonth() + 1;
      const gAño = g.año ? Number(g.año) : new Date(g.fecha).getFullYear();
      return gMes === mesNum && gAño === añoNum;
    });

    const catMap = {};
    filtrados.forEach(g => {
      const cat = g.categoria || 'Otros';
      catMap[cat] = (catMap[cat] || 0) + (Number(g.importe) || 0);
    });

    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }
};
