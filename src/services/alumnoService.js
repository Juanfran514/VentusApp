import { db, Alumno } from '../db/db';
import { normalizarCinturon } from '../utils/cinturones';
import { getNombreCompleto } from '../utils/formatters';

const buildMovimientoAlumno = (alumnoId, tipo, fechaIso, alumnoNombre = '') => {
  const parsed = fechaIso ? new Date(fechaIso) : new Date();
  const fechaValida = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return {
    alumnoId: Number(alumnoId),
    alumnoNombre,
    tipo,
    fecha: fechaValida.toISOString(),
    mes: fechaValida.getMonth() + 1,
    año: fechaValida.getFullYear()
  };
};

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
   * Crea un nuevo alumno en la base de datos y registra su movimiento de alta
   */
  async create(data) {
    const alumnoInstance = new Alumno({
      ...data,
      cinturon: data.cinturon ? normalizarCinturon(data.cinturon) : ''
    });

    return db.transaction('rw', db.alumnos, db.movimientosAlumnos, async () => {
      const id = await db.alumnos.add(alumnoInstance);
      await db.movimientosAlumnos.add(
        buildMovimientoAlumno(
          id,
          'alta',
          alumnoInstance.fechaAlta,
          getNombreCompleto(alumnoInstance)
        )
      );
      return id;
    });
  },

  /**
   * Actualiza un alumno existente
   */
  async update(id, data) {
    const numId = Number(id);
    const updateData = { ...data };
    if (updateData.cinturon !== undefined) {
      updateData.cinturon = updateData.cinturon ? normalizarCinturon(updateData.cinturon) : '';
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
   * Alterna el estado de un alumno entre 'activo' y 'baja' y registra el movimiento.
   * Si ya existe un movimiento opuesto del mismo alumno en el mes actual, lo anula
   * para evitar sumar +1 alta y -1 baja en el mismo mes.
   */
  async toggleEstado(alumno) {
    if (!alumno?.id) return;
    const nuevoEstado = alumno.estado === 'activo' ? 'baja' : 'activo';
    const tipoMovimiento = nuevoEstado === 'activo' ? 'alta' : 'baja';
    const tipoOpuesto = nuevoEstado === 'activo' ? 'baja' : 'alta';

    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const añoActual = ahora.getFullYear();

    await db.transaction('rw', db.alumnos, db.movimientosAlumnos, async () => {
      await db.alumnos.update(alumno.id, { estado: nuevoEstado });

      const opuestosMes = await db.movimientosAlumnos
        .where('alumnoId')
        .equals(Number(alumno.id))
        .filter(
          m =>
            Number(m.mes) === mesActual &&
            Number(m.año) === añoActual &&
            m.tipo === tipoOpuesto
        )
        .toArray();

      if (opuestosMes.length > 0) {
        const ultimoOpuesto = opuestosMes.sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        )[0];
        await db.movimientosAlumnos.delete(ultimoOpuesto.id);
      } else {
        await db.movimientosAlumnos.add(
          buildMovimientoAlumno(
            alumno.id,
            tipoMovimiento,
            ahora.toISOString(),
            getNombreCompleto(alumno)
          )
        );
      }
    });

    return nuevoEstado;
  },

  /**
   * Obtiene los movimientos de altas y bajas de un año concreto
   */
  async getMovimientosByAño(año) {
    return db.movimientosAlumnos.where('año').equals(Number(año)).toArray();
  },

  /**
   * Actualiza rápidamente el cinturón de un alumno
   */
  async updateCinturon(id, nuevoCinturon) {
    const cinturonLimpio = nuevoCinturon ? normalizarCinturon(nuevoCinturon) : '';
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
