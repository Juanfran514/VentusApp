import { db, Gasto, GastoFijo } from '../db/db';
import { saveStoredCategoria } from '../utils/categorias';

export const gastoService = {
  /**
   * Obtiene todos los gastos registrados ordenados por fecha descendente
   */
  async getAll() {
    return db.gastos.orderBy('fecha').reverse().toArray();
  },

  /**
   * Obtiene la lista de plantillas de gastos fijos recurrentes
   */
  async getAllFijos() {
    if (!db.gastosFijos) return [];
    return db.gastosFijos.toArray();
  },

  /**
   * Crea una nueva plantilla de gasto fijo recurrente
   */
  async createGastoFijo(data) {
    const catTrimmed = (data.categoria || '').trim();
    const gastoFijoInstance = new GastoFijo({
      concepto: (data.concepto || '').trim(),
      categoria: catTrimmed,
      importe: Number(data.importe) || 0,
      diaMes: Number(data.diaMes) || 1,
      activo: data.activo !== false
    });

    const id = await db.gastosFijos.add(gastoFijoInstance);
    if (catTrimmed) {
      saveStoredCategoria('gastos_fijos', catTrimmed, []);
      saveStoredCategoria('gastos', catTrimmed, []);
    }
    return id;
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
    if (data.diaMes !== undefined) updates.diaMes = Number(data.diaMes) || 1;
    if (data.activo !== undefined) updates.activo = data.activo;

    return db.gastosFijos.update(Number(id), updates);
  },

  /**
   * Elimina una plantilla de gasto fijo recurrente
   */
  async deleteGastoFijo(id) {
    return db.gastosFijos.delete(Number(id));
  },

  /**
   * Calcula el estado de los gastos fijos para un mes y año dados.
   * Si no se ha marcado como pagado este mes, aparece como 'pendiente' (destildado).
   */
  calcularEstadoFijosMes(gastosFijos = [], gastos = [], mes, año) {
    const mesNum = Number(mes);
    const añoNum = Number(año);
    const fijosActivos = (gastosFijos || []).filter(gf => gf.activo !== false);

    const items = fijosActivos.map(gf => {
      // Buscar si ya existe un registro de pago en 'gastos' para este mes y año
      const record = (gastos || []).find(g => 
        g.tipo === 'fijo' && 
        Number(g.gastoFijoId) === Number(gf.id) &&
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
          gastoRegistroId: record.id
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
        gastoRegistroId: null
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
  async tildarGastoFijo({ gastoFijo, mes, año, importe, fecha }) {
    const mesNum = Number(mes);
    const añoNum = Number(año);
    const fechaObj = fecha ? new Date(fecha) : new Date();

    // Comprobar si ya existía para evitar duplicados
    const existente = await db.gastos
      .filter(g => g.tipo === 'fijo' && Number(g.gastoFijoId) === Number(gastoFijo.id) && Number(g.mes) === mesNum && Number(g.año) === añoNum)
      .first();

    const importeFinal = Number(importe !== undefined && importe !== '' ? importe : gastoFijo.importe) || 0;

    if (existente) {
      await db.gastos.update(existente.id, {
        importe: importeFinal,
        fecha: fechaObj.toISOString()
      });
      return existente.id;
    }

    const nuevoGasto = new Gasto({
      concepto: gastoFijo.concepto,
      categoria: gastoFijo.categoria,
      importe: importeFinal,
      fecha: fechaObj.toISOString(),
      tipo: 'fijo',
      mes: mesNum,
      año: añoNum,
      gastoFijoId: gastoFijo.id
    });

    return db.gastos.add(nuevoGasto);
  },

  /**
   * Desmarca un gasto fijo (destildar), eliminando el registro de pago del mes
   */
  async destildarGastoFijo({ gastoFijoId, mes, año }) {
    const mesNum = Number(mes);
    const añoNum = Number(año);

    const existentes = await db.gastos
      .filter(g => g.tipo === 'fijo' && Number(g.gastoFijoId) === Number(gastoFijoId) && Number(g.mes) === mesNum && Number(g.año) === añoNum)
      .toArray();

    for (const g of existentes) {
      await db.gastos.delete(g.id);
    }
  },

  /**
   * Modifica el importe o fecha de un gasto fijo para un mes específico
   */
  async modificarGastoFijoMes({ gastoFijo, mes, año, nuevoImporte, fecha }) {
    const mesNum = Number(mes);
    const añoNum = Number(año);

    const existente = await db.gastos
      .filter(g => g.tipo === 'fijo' && Number(g.gastoFijoId) === Number(gastoFijo.id) && Number(g.mes) === mesNum && Number(g.año) === añoNum)
      .first();

    const importeFinal = Number(nuevoImporte) || 0;
    const fechaISO = fecha ? new Date(fecha).toISOString() : new Date().toISOString();

    if (existente) {
      await db.gastos.update(existente.id, {
        importe: importeFinal,
        fecha: fechaISO
      });
      return existente.id;
    }

    // Si aún no estaba tildado, al modificar su importe del mes lo dejamos registrado como pagado
    const nuevoGasto = new Gasto({
      concepto: gastoFijo.concepto,
      categoria: gastoFijo.categoria,
      importe: importeFinal,
      fecha: fechaISO,
      tipo: 'fijo',
      mes: mesNum,
      año: añoNum,
      gastoFijoId: gastoFijo.id
    });

    return db.gastos.add(nuevoGasto);
  },

  /**
   * Crea un nuevo gasto (variable por defecto) y guarda su categoría
   */
  async create(data) {
    const catTrimmed = (data.categoria || '').trim();
    const tipo = data.tipo || 'variable';
    const d = data.fecha ? new Date(data.fecha) : new Date();

    const gastoInstance = new Gasto({
      concepto: (data.concepto || '').trim(),
      categoria: catTrimmed,
      importe: Number(data.importe) || 0,
      fecha: d.toISOString(),
      tipo,
      mes: data.mes ? Number(data.mes) : d.getMonth() + 1,
      año: data.año ? Number(data.año) : d.getFullYear(),
      gastoFijoId: data.gastoFijoId || null
    });

    const id = await db.gastos.add(gastoInstance);
    if (catTrimmed) {
      if (tipo === 'variable') {
        saveStoredCategoria('gastos_variables', catTrimmed, []);
      } else {
        saveStoredCategoria('gastos_fijos', catTrimmed, []);
      }
      saveStoredCategoria('gastos', catTrimmed, []);
    }
    return id;
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
    return db.gastos.update(Number(id), updates);
  },

  /**
   * Elimina un gasto por ID
   */
  async delete(id) {
    return db.gastos.delete(Number(id));
  },

  /**
   * Extrae los conceptos habituales de gastos variables para permitir recuperarlos fácilmente
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
   * Incluye tanto gastos variables como gastos fijos pagados del mes.
   */
  agruparPorCategoria(gastos = [], mes, año) {
    if (!gastos) return [];
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

