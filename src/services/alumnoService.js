import { db, Alumno } from '../db/db';
import { normalizarCinturon } from '../utils/cinturones';
import { getNombreCompleto } from '../utils/formatters';

export const alumnoService = {
  /**
   * Obtiene todos los alumnos con filtro opcional por nombre/apellidos
   */
  async getAll(search = '') {
    const term = search.toLowerCase().trim();
    if (!term) {
      return db.alumnos.toArray();
    }
    return db.alumnos
      .filter(a => getNombreCompleto(a).toLowerCase().includes(term))
      .toArray();
  },

  /**
   * Obtiene los alumnos con estado 'activo'
   */
  async getActivos() {
    return db.alumnos.where('estado').equals('activo').toArray();
  },

  /**
   * Obtiene un alumno por su ID
   */
  async getById(id) {
    if (!id) return null;
    return db.alumnos.get(Number(id));
  },

  /**
   * Crea un nuevo alumno en la base de datos
   */
  async create(data) {
    const alumnoInstance = new Alumno({
      ...data,
      cinturon: normalizarCinturon(data.cinturon) || 'Blanco'
    });
    return db.alumnos.add(alumnoInstance);
  },

  /**
   * Actualiza un alumno existente
   */
  async update(id, data) {
    const numId = Number(id);
    const updateData = { ...data };
    if (updateData.cinturon) {
      updateData.cinturon = normalizarCinturon(updateData.cinturon);
    }
    return db.alumnos.update(numId, updateData);
  },

  /**
   * Elimina un alumno por su ID
   */
  async delete(id) {
    return db.alumnos.delete(Number(id));
  },

  /**
   * Alterna el estado de un alumno entre 'activo' y 'baja'
   */
  async toggleEstado(alumno) {
    if (!alumno?.id) return;
    const nuevoEstado = alumno.estado === 'activo' ? 'baja' : 'activo';
    await db.alumnos.update(alumno.id, { estado: nuevoEstado });
    return nuevoEstado;
  },

  /**
   * Actualiza rápidamente el cinturón de un alumno
   */
  async updateCinturon(id, nuevoCinturon) {
    const cinturonLimpio = normalizarCinturon(nuevoCinturon);
    await db.alumnos.update(Number(id), { cinturon: cinturonLimpio });
    return cinturonLimpio;
  },

  /**
   * Construye un mapa ID -> Alumno a partir de una lista
   */
  buildAlumnosMap(alumnos = []) {
    if (!alumnos) return {};
    return alumnos.reduce((acc, al) => {
      acc[al.id] = al;
      return acc;
    }, {});
  }
};
