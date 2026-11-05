import { supabase, getActiveGimnasioId } from '../supabase';
import { normalizarCinturon } from '../utils/cinturones';
import { getNombreCompleto } from '../utils/formatters';

// Mapeador de Base de Datos (snake_case) -> Modelo Frontend (camelCase)
const mapFromDb = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    gimnasioId: row.gimnasio_id,
    nombre: row.nombre,
    apellidos: row.apellidos || '',
    fechaNac: row.fecha_nac,
    telefono: row.telefono || '',
    nTutor: row.n_tutor || '',
    grupoId: row.grupo_id,
    cuota: Number(row.cuota) || 0,
    estado: row.estado,
    inscripciones: row.inscripciones || [],
    observaciones: row.observaciones || '',
    lesiones: row.lesiones || '',
    cinturon: row.cinturon || '',
    email: row.email || '',
    foto: row.foto || '',
    fechaAlta: row.fecha_alta,
    nombreCompleto: `${row.nombre} ${row.apellidos || ''}`.trim()
  };
};

// Mapeador de Modelo Frontend (camelCase) -> Base de Datos (snake_case)
const mapToDb = (data) => {
  const row = {};
  if (data.nombre !== undefined) row.nombre = data.nombre.trim();
  if (data.apellidos !== undefined) row.apellidos = (data.apellidos || '').trim();
  if (data.fechaNac !== undefined) row.fecha_nac = data.fechaNac || null;
  if (data.telefono !== undefined) row.telefono = data.telefono;
  if (data.nTutor !== undefined) row.n_tutor = data.nTutor;
  if (data.grupoId !== undefined) row.grupo_id = data.grupoId || null;
  if (data.cuota !== undefined) row.cuota = Number(data.cuota) || 0;
  if (data.estado !== undefined) row.estado = data.estado;
  if (data.inscripciones !== undefined) row.inscripciones = data.inscripciones;
  if (data.observaciones !== undefined) row.observaciones = data.observaciones;
  if (data.lesiones !== undefined) row.lesiones = data.lesiones;
  if (data.cinturon !== undefined) row.cinturon = normalizarCinturon(data.cinturon);
  if (data.email !== undefined) row.email = data.email;
  if (data.foto !== undefined) row.foto = data.foto;
  return row;
};

export const alumnoService = {
  /**
   * Obtiene todos los alumnos con filtro opcional de búsqueda
   */
  async getAll(search = '') {
    let query = supabase.from('alumnos').select('*').order('nombre', { ascending: true });

    const term = search.trim();
    if (term) {
      query = query.or(`nombre.ilike.%${term}%,apellidos.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error en alumnoService.getAll:', error);
      return [];
    }
    return (data || []).map(mapFromDb);
  },

  /**
   * Obtiene solo los alumnos activos
   */
  async getActivos() {
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error en alumnoService.getActivos:', error);
      return [];
    }
    return (data || []).map(mapFromDb);
  },

  /**
   * Obtiene un alumno por su ID
   */
  async getById(id) {
    if (!id) return null;
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error en alumnoService.getById:', error);
      return null;
    }
    return mapFromDb(data);
  },

  /**
   * Crea un nuevo alumno en Supabase
   */
  async create(data) {
    const gimnasioId = await getActiveGimnasioId();
    const payload = {
      ...mapToDb(data),
      gimnasio_id: gimnasioId,
      fecha_alta: data.fechaAlta || new Date().toISOString()
    };

    const { data: inserted, error } = await supabase
      .from('alumnos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return mapFromDb(inserted);
  },

  /**
   * Actualiza un alumno existente
   */
  async update(id, data) {
    const payload = mapToDb(data);

    const { data: updated, error } = await supabase
      .from('alumnos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFromDb(updated);
  },

  /**
   * Elimina un alumno
   */
  async delete(id) {
    const { error } = await supabase
      .from('alumnos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Alterna el estado de un alumno entre 'activo' y 'baja'
   */
  async toggleEstado(alumno) {
    if (!alumno?.id) return;
    const nuevoEstado = alumno.estado === 'activo' ? 'baja' : 'activo';
    await this.update(alumno.id, { estado: nuevoEstado });
    return nuevoEstado;
  },

  /**
   * Actualiza el cinturón de un alumno
   */
  async updateCinturon(id, nuevoCinturon) {
    const cinturonLimpio = normalizarCinturon(nuevoCinturon);
    await this.update(id, { cinturon: cinturonLimpio });
    return cinturonLimpio;
  },

  /**
   * Mapa en memoria ID -> Alumno
   */
  buildAlumnosMap(alumnos = []) {
    if (!alumnos) return {};
    return alumnos.reduce((acc, al) => {
      acc[al.id] = al;
      return acc;
    }, {});
  }
};
