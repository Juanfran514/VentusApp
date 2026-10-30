import Dexie from 'dexie';

export class VentusDatabase extends Dexie {
  constructor() {
    super('VentusAppDB');

    this.version(1).stores({
      alumnos: '++id, nombre, fechaNac, telefono, nTutor, grupoId, cuota, estado',
      grupos: '++id, nombre, actividad, horarios, plazasMax',
      pagos: '++id, alumnoId, tipo, mes, año, importe, fecha',
      gastos: '++id, concepto, categoria, importe, fecha'
    });

    this.version(2).stores({
      gastos: '++id, concepto, categoria, importe, fecha, tipo, mes, año, gastoFijoId',
      gastosFijos: '++id, concepto, categoria, importe, diaMes, activo'
    });

    this.version(3).stores({
      productos: '++id, nombre, precio, activo'
    });
  }
}

export const db = new VentusDatabase();

// ==========================================
// CLASES / MODELOS DE DATOS
// ==========================================

export class Alumno {
  constructor({
    nombre = '',
    apellidos = '',
    fechaNac = '',
    telefono = '',
    nTutor = '',
    grupoId = null,
    cuota = 0,
    estado = 'activo', // 'activo' o 'baja'
    inscripciones = [], // Array de { grupoId: X, dias: Y }
    observaciones = '',
    lesiones = '',
    cinturon = '',
    email = '',
    foto = '',
    fechaAlta = new Date().toISOString()
  } = {}) {
    this.nombre = nombre;
    this.apellidos = apellidos;
    this.fechaNac = fechaNac;
    this.telefono = telefono;
    this.nTutor = nTutor;
    this.grupoId = grupoId;
    this.cuota = cuota;
    this.estado = estado;
    this.inscripciones = inscripciones;
    this.observaciones = observaciones;
    this.lesiones = lesiones;
    this.cinturon = cinturon;
    this.email = email;
    this.foto = foto;
    this.fechaAlta = fechaAlta;
  }

  get isActivo() {
    return this.estado === 'activo';
  }

  get nombreCompleto() {
    return `${this.nombre} ${this.apellidos}`.trim();
  }
}

export class Grupo {
  constructor({ nombre = '', actividad = '', horarios = '', plazasMax = 0, tarifas = {}, orden = 0 } = {}) {
    this.nombre = nombre;
    this.actividad = actividad;
    this.horarios = horarios;
    this.plazasMax = plazasMax;
    this.tarifas = tarifas; // { "1": 30, "2": 45 }
    this.orden = orden;
  }
}

export class Pago {
  constructor({
    alumnoId,
    tipo = 'cuota',
    mes = null,
    año = null,
    importe = 0,
    fecha = new Date().toISOString(),
    concepto = '',
    estado = 'pagado'
  } = {}) {
    const d = fecha ? new Date(fecha) : new Date();
    const validDate = !isNaN(d.getTime()) ? d : new Date();

    this.alumnoId = alumnoId;
    this.tipo = tipo; // 'cuota', 'material', 'examen', 'licencia'
    this.mes = mes !== null && mes !== undefined && mes !== '' ? Number(mes) : validDate.getMonth() + 1;
    this.año = año !== null && año !== undefined && año !== '' ? Number(año) : validDate.getFullYear();
    this.importe = Number(importe) || 0;
    this.fecha = fecha;
    this.concepto = concepto;
    this.estado = estado; // 'pagado' o 'pendiente'
  }
}

export class Gasto {
  constructor({
    concepto = '',
    categoria = '',
    importe = 0,
    fecha = new Date().toISOString(),
    tipo = 'variable', // 'variable' o 'fijo'
    mes = null,
    año = null,
    gastoFijoId = null,
    factura = null
  } = {}) {
    const d = fecha ? new Date(fecha) : new Date();
    const validDate = !isNaN(d.getTime()) ? d : new Date();

    this.concepto = concepto;
    this.categoria = categoria;
    this.importe = Number(importe) || 0;
    this.fecha = fecha;
    this.tipo = tipo;
    this.mes = mes !== null && mes !== undefined && mes !== '' ? Number(mes) : validDate.getMonth() + 1;
    this.año = año !== null && año !== undefined && año !== '' ? Number(año) : validDate.getFullYear();
    this.gastoFijoId = gastoFijoId;
    this.factura = factura;
  }
}

export class GastoFijo {
  constructor({
    concepto = '',
    categoria = '',
    importe = 0,
    diaMes = 1,
    activo = true
  } = {}) {
    this.concepto = concepto;
    this.categoria = categoria;
    this.importe = importe;
    this.diaMes = diaMes;
    this.activo = activo;
  }
}

export class Producto {
  constructor({
    nombre = '',
    precio = 0,
    foto = '',
    activo = true,
    fechaCreacion = new Date().toISOString()
  } = {}) {
    this.nombre = nombre;
    this.precio = precio;
    this.foto = foto;
    this.activo = activo;
    this.fechaCreacion = fechaCreacion;
  }
}

// ==========================================
// TABLAS A CLASES
// ==========================================
db.alumnos.mapToClass(Alumno);
db.grupos.mapToClass(Grupo);
db.pagos.mapToClass(Pago);
db.gastos.mapToClass(Gasto);
db.gastosFijos.mapToClass(GastoFijo);
db.productos.mapToClass(Producto);

