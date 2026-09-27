import { db, Gasto } from '../db/db';
import { saveStoredCategoria, DEFAULT_CATEGORIAS_GASTOS } from '../utils/categorias';

export const gastoService = {
  /**
   * Obtiene todos los gastos ordenados por fecha descendente
   */
  async getAll() {
    return db.gastos.orderBy('fecha').reverse().toArray();
  },

  /**
   * Crea un nuevo gasto y guarda su categoría para persistencia
   */
  async create(data) {
    const catTrimmed = (data.categoria || '').trim();
    const gastoInstance = new Gasto({
      concepto: (data.concepto || '').trim(),
      categoria: catTrimmed,
      importe: Number(data.importe) || 0,
      fecha: data.fecha ? new Date(data.fecha).toISOString() : new Date().toISOString()
    });

    const id = await db.gastos.add(gastoInstance);
    if (catTrimmed) {
      saveStoredCategoria('gastos', catTrimmed, DEFAULT_CATEGORIAS_GASTOS);
    }
    return id;
  },

  /**
   * Elimina un gasto por ID
   */
  async delete(id) {
    return db.gastos.delete(Number(id));
  },

  /**
   * Agrupa gastos por categoría para gráficos y resúmenes
   */
  agruparPorCategoria(gastos = [], mes, año) {
    if (!gastos) return [];
    const mesNum = Number(mes);
    const añoNum = Number(año);

    const filtrados = gastos.filter(g => {
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
