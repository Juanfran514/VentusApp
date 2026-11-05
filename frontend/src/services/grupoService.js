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
          const gruposIds = updatedInscripciones.map(ins => Number(ins.grupoId));
          const primaryGrupoId = updatedInscripciones.length > 0 ? Number(updatedInscripciones[0].grupoId) : null;
          await db.alumnos.update(alumno.id, {
            inscripciones: updatedInscripciones,
            grupos: gruposIds,
            grupoId: primaryGrupoId,
            cuota: newCuota
          });
        }
      }
      await db.grupos.delete(numId);
    });
  },

  /**
   * Inscribe o actualiza los días de un alumno en un grupo
   */
  async inscribirAlumno(grupoId, alumnoId, dias = 1) {
    const numGroupId = Number(grupoId);
    const numAlumnoId = Number(alumnoId);
    const numDias = Math.max(1, Number(dias) || 1);

    return db.transaction('rw', [db.grupos, db.alumnos], async () => {
      const alumno = await db.alumnos.get(numAlumnoId);
      if (!alumno) throw new Error('Alumno no encontrado');

      const allGrupos = await db.grupos.toArray();
      const gruposMap = allGrupos.reduce((acc, g) => { acc[g.id] = g; return acc; }, {});

      const currentInscripciones = Array.isArray(alumno.inscripciones) ? [...alumno.inscripciones] : [];
      const existingIndex = currentInscripciones.findIndex(ins => Number(ins.grupoId) === numGroupId);

      if (existingIndex >= 0) {
        currentInscripciones[existingIndex] = { ...currentInscripciones[existingIndex], dias: numDias };
      } else {
        currentInscripciones.push({ grupoId: numGroupId, dias: numDias });
      }

      const prevCalc = grupoService.calcularCuotaTotal(alumno.inscripciones || [], gruposMap);
      const newCalc = grupoService.calcularCuotaTotal(currentInscripciones, gruposMap);
      const shouldAutoUpdate = alumno.cuota === 0 || alumno.cuota === '' || Number(alumno.cuota) === Number(prevCalc);
      const diff = newCalc - prevCalc;
      const newCuota = shouldAutoUpdate ? newCalc : Math.max(0, Number(alumno.cuota || 0) + diff);

      const gruposIds = currentInscripciones.map(ins => Number(ins.grupoId));
      const primaryGrupoId = currentInscripciones.length > 0 ? Number(currentInscripciones[0].grupoId) : null;

      await db.alumnos.update(numAlumnoId, {
        inscripciones: currentInscripciones,
        grupos: gruposIds,
        grupoId: primaryGrupoId,
        cuota: newCuota
      });
    });
  },

  /**
   * Desinscribe a un alumno de un grupo
   */
  async desinscribirAlumno(grupoId, alumnoId) {
    const numGroupId = Number(grupoId);
    const numAlumnoId = Number(alumnoId);

    return db.transaction('rw', [db.grupos, db.alumnos], async () => {
      const alumno = await db.alumnos.get(numAlumnoId);
      if (!alumno) return;

      const allGrupos = await db.grupos.toArray();
      const gruposMap = allGrupos.reduce((acc, g) => { acc[g.id] = g; return acc; }, {});

      const currentInscripciones = Array.isArray(alumno.inscripciones) ? [...alumno.inscripciones] : [];
      const updatedInscripciones = currentInscripciones.filter(ins => Number(ins.grupoId) !== numGroupId);

      const prevCalc = grupoService.calcularCuotaTotal(currentInscripciones, gruposMap);
      const newCalc = grupoService.calcularCuotaTotal(updatedInscripciones, gruposMap);
      const shouldAutoUpdate = alumno.cuota === 0 || alumno.cuota === '' || Number(alumno.cuota) === Number(prevCalc);
      const diff = newCalc - prevCalc;
      const newCuota = shouldAutoUpdate ? newCalc : Math.max(0, Number(alumno.cuota || 0) + diff);

      const gruposIds = updatedInscripciones.map(ins => Number(ins.grupoId));
      const primaryGrupoId = updatedInscripciones.length > 0 ? Number(updatedInscripciones[0].grupoId) : null;

      await db.alumnos.update(numAlumnoId, {
        inscripciones: updatedInscripciones,
        grupos: gruposIds,
        grupoId: primaryGrupoId,
        cuota: newCuota
      });
    });
  },

  /**
   * Sincroniza la lista completa de alumnos asignados a un grupo
   * @param {number} grupoId
   * @param {Array<{alumnoId: number|string, dias: number|string}>} alumnosInscripciones
   */
  async sincronizarAlumnosGrupo(grupoId, alumnosInscripciones = []) {
    const numGroupId = Number(grupoId);

    return db.transaction('rw', [db.grupos, db.alumnos], async () => {
      const allAlumnos = await db.alumnos.toArray();
      const allGrupos = await db.grupos.toArray();
      const gruposMap = allGrupos.reduce((acc, g) => { acc[g.id] = g; return acc; }, {});

      const targetMap = new Map();
      alumnosInscripciones.forEach(item => {
        if (item && item.alumnoId) {
          targetMap.set(Number(item.alumnoId), Math.max(1, Number(item.dias) || 1));
        }
      });

      for (const alumno of allAlumnos) {
        const currentInscripciones = Array.isArray(alumno.inscripciones) ? [...alumno.inscripciones] : [];
        const isCurrentlyIn = currentInscripciones.some(ins => Number(ins.grupoId) === numGroupId);
        const shouldBeIn = targetMap.has(alumno.id);

        if (shouldBeIn) {
          const targetDias = targetMap.get(alumno.id);
          const currentEntry = currentInscripciones.find(ins => Number(ins.grupoId) === numGroupId);
          if (!currentEntry || currentEntry.dias !== targetDias) {
            let nextInscripciones;
            if (currentEntry) {
              nextInscripciones = currentInscripciones.map(ins => 
                Number(ins.grupoId) === numGroupId ? { ...ins, dias: targetDias } : ins
              );
            } else {
              nextInscripciones = [...currentInscripciones, { grupoId: numGroupId, dias: targetDias }];
            }
            const prevCalc = grupoService.calcularCuotaTotal(currentInscripciones, gruposMap);
            const newCalc = grupoService.calcularCuotaTotal(nextInscripciones, gruposMap);
            const shouldAutoUpdate = alumno.cuota === 0 || alumno.cuota === '' || Number(alumno.cuota) === Number(prevCalc);
            const diff = newCalc - prevCalc;
            const newCuota = shouldAutoUpdate ? newCalc : Math.max(0, Number(alumno.cuota || 0) + diff);
            const gruposIds = nextInscripciones.map(ins => Number(ins.grupoId));
            const primaryGrupoId = nextInscripciones.length > 0 ? Number(nextInscripciones[0].grupoId) : null;

            await db.alumnos.update(alumno.id, {
              inscripciones: nextInscripciones,
              grupos: gruposIds,
              grupoId: primaryGrupoId,
              cuota: newCuota
            });
          }
        } else if (isCurrentlyIn) {
          const nextInscripciones = currentInscripciones.filter(ins => Number(ins.grupoId) !== numGroupId);
          const prevCalc = grupoService.calcularCuotaTotal(currentInscripciones, gruposMap);
          const newCalc = grupoService.calcularCuotaTotal(nextInscripciones, gruposMap);
          const shouldAutoUpdate = alumno.cuota === 0 || alumno.cuota === '' || Number(alumno.cuota) === Number(prevCalc);
          const diff = newCalc - prevCalc;
          const newCuota = shouldAutoUpdate ? newCalc : Math.max(0, Number(alumno.cuota || 0) + diff);
          const gruposIds = nextInscripciones.map(ins => Number(ins.grupoId));
          const primaryGrupoId = nextInscripciones.length > 0 ? Number(nextInscripciones[0].grupoId) : null;

          await db.alumnos.update(alumno.id, {
            inscripciones: nextInscripciones,
            grupos: gruposIds,
            grupoId: primaryGrupoId,
            cuota: newCuota
          });
        }
      }
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
