import { supabase, getActiveGimnasioId } from '../supabase';
import { dataEvents } from './dataEvents';

const mapFromDb = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    gimnasioId: row.gimnasio_id,
    nombre: row.nombre,
    actividad: row.actividad || '',
    horarios: row.horarios || '',
    plazasMax: Number(row.plazas_max) || 0,
    tarifas: row.tarifas || {},
    orden: Number(row.orden) || 0,
    createdAt: row.created_at
  };
};

const mapToDb = (data, gimnasioId) => {
  const row = {};
  if (gimnasioId) row.gimnasio_id = gimnasioId;
  if (data.nombre !== undefined) row.nombre = data.nombre.trim();
  if (data.actividad !== undefined) row.actividad = (data.actividad || '').trim();
  if (data.horarios !== undefined) row.horarios = data.horarios;
  if (data.plazasMax !== undefined) row.plazas_max = Number(data.plazasMax) || 0;
  if (data.tarifas !== undefined) row.tarifas = data.tarifas;
  if (data.orden !== undefined) row.orden = Number(data.orden) || 0;
  return row;
};

export const grupoService = {
  /**
   * Obtiene todos los grupos ordenados por orden
   */
  async getAll() {
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error en grupoService.getAll:', error);
      return [];
    }
    return (data || []).map(mapFromDb);
  },

  /**
   * Obtiene un grupo por su ID
   */
  async getById(id) {
    if (!id) return null;
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error en grupoService.getById:', error);
      return null;
    }
    return mapFromDb(data);
  },

  /**
   * Crea un nuevo grupo
   */
  async create(data) {
    const gimnasioId = await getActiveGimnasioId();
    const all = await this.getAll();
    const maxOrden = all.reduce((max, g) => Math.max(max, g.orden || 0), 0);

    const payload = mapToDb({
      ...data,
      orden: data.orden !== undefined ? data.orden : maxOrden + 1
    }, gimnasioId);

    const { data: inserted, error } = await supabase
      .from('grupos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('grupos', inserted);
    return mapFromDb(inserted);
  },

  /**
   * Reordena de forma masiva los grupos
   */
  async reordenarGrupos(items) {
    for (const item of items) {
      if (item.id) {
        await supabase
          .from('grupos')
          .update({ orden: Number(item.orden) })
          .eq('id', item.id);
      }
    }
    dataEvents.emit('grupos');
    return true;
  },

  /**
   * Actualiza un grupo existente
   */
  async update(id, data) {
    const payload = mapToDb(data);
    const { data: updated, error } = await supabase
      .from('grupos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('grupos', updated);
    return mapFromDb(updated);
  },

  /**
   * Elimina un grupo por su ID
   */
  async delete(id) {
    const { error } = await supabase
      .from('grupos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    dataEvents.emit('grupos', { id });
    return true;
  },

  /**
   * Calcula la ocupación actual de los grupos
   */
  calcularOcupacion(grupos = [], alumnos = []) {
    if (!grupos || grupos.length === 0) return [];
    const alumnosActivos = alumnos.filter(a => a.estado === 'activo');

    return grupos.map(g => {
      const inscritos = alumnosActivos.filter(a =>
        a.inscripciones?.some(ins => String(ins.grupoId) === String(g.id))
      );
      const ocupadas = inscritos.length;
      const max = Number(g.plazasMax) || 0;
      const porcentaje = max > 0 ? Math.min(100, Math.round((ocupadas / max) * 100)) : 0;

      return {
        ...g,
        plazasOcupadas: ocupadas,
        porcentajeOcupacion: porcentaje,
        disponibles: max > 0 ? Math.max(0, max - ocupadas) : null
      };
    });
  },

  /**
   * Calcula la cuota sugerida total de un alumno
   */
  calcularCuotaTotal(inscripciones = [], gruposMap = {}) {
    if (!inscripciones || !inscripciones.length) return 0;
    let total = 0;

    inscripciones.forEach(ins => {
      const g = gruposMap[ins.grupoId];
      if (g && g.tarifas && g.tarifas[ins.dias] !== undefined) {
        total += Number(g.tarifas[ins.dias]);
      }
    });

    return total;
  }
};
