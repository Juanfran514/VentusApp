import { db, Grupo } from '../db/db';

export const grupoService = {
  /**
   * Obtiene todos los grupos ordenados por la propiedad orden
   */
  async getAll() {
    const grupos = await db.grupos.toArray();
    return grupos.sort((a, b) => {
      const ordenA = a.orden !== undefined ? a.orden : (a.id || 0);
      const ordenB = b.orden !== undefined ? b.orden : (b.id || 0);
      return ordenA - ordenB;
    });
  },

  /**
   * Obtiene un grupo por su ID
   */
  async getById(id) {
    if (!id) return null;
    return db.grupos.get(Number(id));
  },

  /**
   * Crea un nuevo grupo asignándole el siguiente índice de orden
   */
  async create(data) {
    const all = await db.grupos.toArray();
    const maxOrden = all.reduce((max, g) => Math.max(max, g.orden !== undefined ? g.orden : (g.id || 0)), 0);
    const grupoInstance = new Grupo({
      ...data,
      orden: data.orden !== undefined ? data.orden : maxOrden + 1,
      plazasMax: Number(data.plazasMax) || 0
    });
    return db.grupos.add(grupoInstance);
  },

  /**
   * Reordena de forma masiva los grupos en la base de datos
   */
  async reordenarGrupos(items) {
    return db.transaction('rw', db.grupos, async () => {
      for (const item of items) {
        if (item.id) {
          await db.grupos.update(Number(item.id), { orden: Number(item.orden) });
        }
      }
    });
  },

  /**
   * Actualiza un grupo existente
   */
  async update(id, data) {
    return db.grupos.update(Number(id), {
      ...data,
      plazasMax: Number(data.plazasMax) || 0
    });
  },

  /**
   * Elimina un grupo y desinscribe a los alumnos que pertenecían a él
   */
  async delete(id) {
    const numId = Number(id);
    return db.transaction('rw', [db.grupos, db.alumnos], async () => {
      const allAlumnos = await db.alumnos.toArray();
      const allGrupos = await db.grupos.toArray();
      const gruposMap = allGrupos.reduce((acc, g) => { acc[g.id] = g; return acc; }, {});

      for (const alumno of allAlumnos) {
        if (alumno.inscripciones && alumno.inscripciones.some(ins => Number(ins.grupoId) === numId)) {
          const updatedInscripciones = alumno.inscripciones.filter(ins => Number(ins.grupoId) !== numId);
          const newCuota = grupoService.calcularCuotaTotal(updatedInscripciones, gruposMap);
          await db.alumnos.update(alumno.id, {
            inscripciones: updatedInscripciones,
            cuota: newCuota
          });
        }
      }
      await db.grupos.delete(numId);
    });
  },

  /**
   * Calcula las plazas ocupadas en cada grupo según los alumnos activos inscritos
   */
  calcularOcupacion(grupos = [], alumnos = []) {
    if (!grupos) return [];
    const ocupadasPorGrupo = {};

    alumnos.forEach(a => {
      if (a.estado === 'activo' && Array.isArray(a.inscripciones)) {
        a.inscripciones.forEach(ins => {
          const gId = Number(ins.grupoId);
          ocupadasPorGrupo[gId] = (ocupadasPorGrupo[gId] || 0) + 1;
        });
      }
    });

    return grupos.map(g => ({
      ...g,
      plazasOcupadas: ocupadasPorGrupo[g.id] || 0
    }));
  },

  /**
   * Calcula la cuota total de un alumno a partir de sus inscripciones y tarifas de los grupos
   */
  calcularCuotaTotal(inscripciones = [], gruposMap = {}) {
    if (!Array.isArray(inscripciones)) return 0;
    return inscripciones.reduce((total, ins) => {
      if (!ins.grupoId || !ins.dias) return total;
      const grupo = gruposMap[Number(ins.grupoId)];
      if (!grupo || !grupo.tarifas) return total;
      const tarifa = Number(grupo.tarifas[ins.dias]) || 0;
      return total + tarifa;
    }, 0);
  }
};
