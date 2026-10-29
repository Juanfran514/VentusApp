import { db, Producto } from '../db/db';

export const productoService = {
  /**
   * Obtiene todos los productos registrados
   */
  async getAll() {
    return db.productos.toArray();
  },

  /**
   * Obtiene únicamente los productos activos
   */
  async getActivos() {
    const todos = await db.productos.toArray();
    return todos.filter(p => p.activo !== false);
  },

  /**
   * Obtiene un producto por su ID
   */
  async getById(id) {
    if (!id) return null;
    return db.productos.get(Number(id));
  },

  /**
   * Crea un nuevo producto en el catálogo
   */
  async create(data) {
    const producto = new Producto({
      nombre: (data.nombre || '').trim(),
      precio: Number(data.precio) || 0,
      foto: data.foto || '',
      activo: data.activo !== undefined ? data.activo : true,
      fechaCreacion: new Date().toISOString()
    });

    return db.productos.add(producto);
  },

  /**
   * Actualiza los datos de un producto existente
   */
  async update(id, data) {
    const camposActualizar = {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.precio !== undefined && { precio: Number(data.precio) }),
      ...(data.foto !== undefined && { foto: data.foto }),
      ...(data.activo !== undefined && { activo: data.activo })
    };

    return db.productos.update(Number(id), camposActualizar);
  },

  /**
   * Elimina un producto del catálogo
   */
  async delete(id) {
    return db.productos.delete(Number(id));
  }
};

