import { supabase, getActiveGimnasioId } from '../supabase';
import { getNombreCompleto } from '../utils/formatters';
import { saveStoredCategoria, DEFAULT_CATEGORIAS_MATERIAL, DEFAULT_CATEGORIAS_LICENCIAS } from '../utils/categorias';
import { MESES_NOMBRES } from '../constants/fechas';
import { dataEvents } from './dataEvents';

const mapFromDb = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    alumnoId: row.alumno_id,
    tipo: row.tipo,
    mes: row.mes,
    año: row.año,
    importe: Number(row.importe) || 0,
    beneficio: Number(row.beneficio) || 0,
    fecha: row.fecha,
    concepto: row.concepto || '',
    estado: row.estado,
    estadoPedido: row.estado_pedido,
    color: row.color || '',
    talla: row.talla || '',
    productoId: row.producto_id
  };
};

const mapToDb = (data, gimnasioId) => {
  const d = data.fecha ? new Date(data.fecha) : new Date();
  const validDate = !isNaN(d.getTime()) ? d : new Date();

  return {
    gimnasio_id: gimnasioId,
    alumno_id: data.alumnoId,
    tipo: data.tipo || 'cuota',
    mes: data.mes !== null && data.mes !== undefined && data.mes !== '' ? Number(data.mes) : validDate.getMonth() + 1,
    año: data.año !== null && data.año !== undefined && data.año !== '' ? Number(data.año) : validDate.getFullYear(),
    importe: Number(data.importe) || 0,
    beneficio: Number(data.beneficio) || 0,
    fecha: data.fecha || validDate.toISOString(),
    concepto: data.concepto || '',
    estado: data.estado || 'pagado',
    estado_pedido: data.tipo === 'material' ? (data.estadoPedido || 'sin_pedir') : null,
    color: data.color || '',
    talla: data.talla || '',
    producto_id: data.productoId || null
  };
};

export const pagoService = {
  /**
   * Obtiene todos los pagos ordenados por fecha descendente
   */
  async getAll() {
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error en pagoService.getAll:', error);
      return [];
    }
    return (data || []).map(mapFromDb);
  },

  /**
   * Obtiene todos los pagos de un alumno específico
   */
  async getByAlumno(alumnoId) {
    if (!alumnoId) return [];
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error en pagoService.getByAlumno:', error);
      return [];
    }
    return (data || []).map(mapFromDb);
  },

  /**
   * Obtiene los pagos de un tipo ('cuota', 'examen', 'material', 'licencia')
   */
  async getByTipo(tipo) {
    let query = supabase.from('pagos').select('*').order('fecha', { ascending: false });
    if (tipo) {
      query = query.eq('tipo', tipo);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error en pagoService.getByTipo:', error);
      return [];
    }
    return (data || []).map(mapFromDb);
  },

  /**
   * Crea un nuevo registro de pago
   */
  async create(data) {
    const gimnasioId = await getActiveGimnasioId();
    const payload = mapToDb(data, gimnasioId);

    const { data: inserted, error } = await supabase
      .from('pagos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    if (data.tipo === 'material' && data.concepto) {
      saveStoredCategoria('material', data.concepto.trim(), DEFAULT_CATEGORIAS_MATERIAL);
    } else if (data.tipo === 'licencia' && data.concepto) {
      saveStoredCategoria('licencias', data.concepto.trim(), DEFAULT_CATEGORIAS_LICENCIAS);
    }

    dataEvents.emit('pagos', inserted);
    return mapFromDb(inserted);
  },

  /**
   * Registra una venta múltiple insertando varios registros en un solo lote
   */
  async registrarVentaMultiple({ alumnoId, items = [], fecha = new Date().toISOString(), estado = 'pendiente' }) {
    if (!alumnoId) throw new Error('Se requiere el ID del alumno.');
    if (!items || !items.length) throw new Error('Debe incluir al menos un producto en la venta.');

    const gimnasioId = await getActiveGimnasioId();
    const fechaIso = fecha ? new Date(fecha).toISOString() : new Date().toISOString();

    const rowsToInsert = items.map(item => {
      const cantidad = Math.max(1, Number(item.cantidad) || 1);
      const precioUnitario = Number(item.precio) || 0;
      const totalLinea = Number((precioUnitario * cantidad).toFixed(2));
      const beneficioUnitario = Number(item.beneficio) || 0;
      const totalBeneficio = Number((beneficioUnitario * cantidad).toFixed(2));

      const variantParts = [];
      if (item.selectedColor) variantParts.push(item.selectedColor);
      if (item.selectedTalla) variantParts.push(item.selectedTalla);
      const variantStr = variantParts.length > 0 ? ` (${variantParts.join(' / ')})` : '';

      const baseName = item.nombre || 'Material';
      const concepto = cantidad > 1 
        ? `${baseName}${variantStr} (x${cantidad})` 
        : `${baseName}${variantStr}`;

      return mapToDb({
        alumnoId,
        tipo: 'material',
        concepto,
        importe: totalLinea,
        beneficio: totalBeneficio,
        fecha: fechaIso,
        estado,
        estadoPedido: item.estadoPedido || 'sin_pedir',
        color: item.selectedColor || '',
        talla: item.selectedTalla || '',
        productoId: item.productoId || null
      }, gimnasioId);
    });

    const { data: insertedRows, error } = await supabase
      .from('pagos')
      .insert(rowsToInsert)
      .select();

    if (error) throw error;
    dataEvents.emit('pagos', insertedRows);
    return (insertedRows || []).map(mapFromDb);
  },

  /**
   * Cambia el estado logístico del pedido ('sin_pedir' | 'pedido' | 'recibido' | 'entregado')
   */
  async cambiarEstadoPedido(id, nuevoEstadoPedido) {
    const { data, error } = await supabase
      .from('pagos')
      .update({ estado_pedido: nuevoEstadoPedido })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('pagos', data);
    return mapFromDb(data);
  },

  /**
   * Marca un pago como 'pagado'
   */
  async marcarPagado(id) {
    const { data, error } = await supabase
      .from('pagos')
      .update({ estado: 'pagado' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('pagos', data);
    return mapFromDb(data);
  },

  /**
   * Revierte un pago a 'pendiente'
   */
  async revertirPago(id) {
    const { data, error } = await supabase
      .from('pagos')
      .update({ estado: 'pendiente' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('pagos', data);
    return mapFromDb(data);
  },

  /**
   * Elimina un registro de pago
   */
  async delete(id) {
    const { error } = await supabase
      .from('pagos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    dataEvents.emit('pagos', { id });
    return true;
  },

  separarPendientesYPagados(pagos = [], alumnosMap = {}, search = '') {
    if (!pagos) return { pendientes: [], pagados: [] };
    const term = search.toLowerCase().trim();
    let filtrados = pagos;

    if (term) {
      filtrados = pagos.filter(p => {
        const al = alumnosMap[p.alumnoId];
        const nombreAl = al ? getNombreCompleto(al).toLowerCase() : '';
        const concepto = (p.concepto || '').toLowerCase();
        return nombreAl.includes(term) || concepto.includes(term);
      });
    }

    const pendientes = filtrados
      .filter(p => p.estado === 'pendiente')
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const pagados = filtrados
      .filter(p => p.estado === 'pagado')
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return { pendientes, pagados };
  },

  calcularEstadoCuotasMes(alumnos = [], pagos = [], mes, año, search = '') {
    if (!alumnos || !pagos) return { pendientes: [], pagados: [] };
    const mesNum = Number(mes);
    const añoNum = Number(año);
    const term = search.toLowerCase().trim();

    const pagosCuotaMes = pagos.filter(p => {
      if (p.tipo !== 'cuota') return false;
      const pMes = p.mes ? Number(p.mes) : (p.fecha ? new Date(p.fecha).getMonth() + 1 : null);
      const pAño = p.año ? Number(p.año) : (p.fecha ? new Date(p.fecha).getFullYear() : null);
      return pMes === mesNum && pAño === añoNum;
    });

    const alumnosPagadosIds = new Set(pagosCuotaMes.map(p => p.alumnoId));
    const pendientes = [];
    const pagados = [];

    alumnos.forEach(al => {
      if (term && !getNombreCompleto(al).toLowerCase().includes(term)) {
        return;
      }
      if (alumnosPagadosIds.has(al.id)) {
        pagados.push(al);
      } else {
        pendientes.push(al);
      }
    });

    return { pendientes, pagados };
  },

  agruparPagosPorMes(pagos = []) {
    if (!pagos || !pagos.length) return [];
    const gruposMap = {};

    pagos.forEach(p => {
      let año = null;
      let mes = null;

      if (p.tipo === 'cuota' && p.año && p.mes) {
        año = Number(p.año);
        mes = Number(p.mes);
      } else if (p.fecha) {
        const d = new Date(p.fecha);
        if (!isNaN(d.getTime())) {
          año = d.getFullYear();
          mes = d.getMonth() + 1;
        }
      }

      if (!año || !mes) {
        const now = new Date();
        año = now.getFullYear();
        mes = now.getMonth() + 1;
      }

      const key = `${año}-${String(mes).padStart(2, '0')}`;
      if (!gruposMap[key]) {
        gruposMap[key] = {
          key,
          año,
          mes,
          mesNombre: `${MESES_NOMBRES[mes - 1] || 'Mes'} ${año}`,
          totalImporte: 0,
          totalItems: 0,
          items: []
        };
      }

      gruposMap[key].items.push(p);
      gruposMap[key].totalImporte += Number(p.importe) || 0;
      gruposMap[key].totalItems += 1;
    });

    const gruposOrdenados = Object.values(gruposMap).sort((a, b) => b.key.localeCompare(a.key));
    gruposOrdenados.forEach(grupo => {
      grupo.items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    });

    return gruposOrdenados;
  }
};
