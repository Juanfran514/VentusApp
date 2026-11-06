import { supabase, getActiveGimnasioId } from '../supabase';
import { dataEvents } from './dataEvents';

const mapFromDb = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    gimnasioId: row.gimnasio_id,
    nombre: row.nombre,
    precio: Number(row.precio) || 0,
    coste: Number(row.coste) || 0,
    beneficio: Number(row.beneficio) || 0,
    colores: row.colores || [],
    tallas: row.tallas || [],
    foto: row.foto || '',
    activo: row.activo !== false,
    fechaCreacion: row.created_at
  };
};

const mapToDb = (data, gimnasioId) => {
  const row = {};
  if (gimnasioId) row.gimnasio_id = gimnasioId;
  if (data.nombre !== undefined) row.nombre = (data.nombre || '').trim();
  if (data.precio !== undefined) row.precio = Number(data.precio) || 0;
  if (data.coste !== undefined) row.coste = Number(data.coste) || 0;
  if (data.beneficio !== undefined) row.beneficio = Number(data.beneficio) || 0;
  if (data.foto !== undefined) row.foto = data.foto;
  if (data.activo !== undefined) row.activo = data.activo;

  if (data.colores !== undefined) {
    row.colores = Array.isArray(data.colores)
      ? data.colores
      : typeof data.colores === 'string'
      ? data.colores.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  }

  if (data.tallas !== undefined) {
    row.tallas = Array.isArray(data.tallas)
      ? data.tallas
      : typeof data.tallas === 'string'
      ? data.tallas.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  }

  return row;
};

export const productoService = {
  /**
   * Obtiene todos los productos registrados
   */
  async getAll() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error en productoService.getAll:', error);
      return [];
    }
    return (data || []).map(mapFromDb);
  },

  /**
   * Obtiene únicamente los productos activos
   */
  async getActivos() {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error en productoService.getActivos:', error);
      return [];
    }
    return (data || []).map(mapFromDb);
  },

  /**
   * Obtiene un producto por su ID
   */
  async getById(id) {
    if (!id) return null;
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error en productoService.getById:', error);
      return null;
    }
    return mapFromDb(data);
  },

  /**
   * Crea un nuevo producto en el catálogo
   */
  async create(data) {
    const gimnasioId = await getActiveGimnasioId();
    const payload = mapToDb(data, gimnasioId);

    const { data: inserted, error } = await supabase
      .from('productos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('productos', inserted);
    return mapFromDb(inserted);
  },

  /**
   * Actualiza un producto existente
   */
  async update(id, data) {
    const payload = mapToDb(data);
    const { data: updated, error } = await supabase
      .from('productos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    dataEvents.emit('productos', updated);
    return mapFromDb(updated);
  },

  /**
   * Alterna el estado activo/inactivo de un producto
   */
  async toggleActivo(producto) {
    if (!producto?.id) return;
    const nuevoEstado = !producto.activo;
    await this.update(producto.id, { activo: nuevoEstado });
    return nuevoEstado;
  },

  /**
   * Elimina un producto por su ID
   */
  async delete(id) {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    dataEvents.emit('productos', { id });
    return true;
  }
};
