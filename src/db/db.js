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
    lesiones = ''
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
  }

  get isActivo() {
    return this.estado === 'activo';
  }

  get nombreCompleto() {
    return `${this.nombre} ${this.apellidos}`.trim();
  }
}

export class Grupo {
  constructor({ nombre = '', actividad = '', horarios = '', plazasMax = 0, tarifas = {} } = {}) {
    this.nombre = nombre;
    this.actividad = actividad;
    this.horarios = horarios;
    this.plazasMax = plazasMax;
    this.tarifas = tarifas; // { "1": 30, "2": 45 }
  }
}

export class Pago {
  constructor({ alumnoId, tipo = 'cuota', mes = new Date().getMonth() + 1, año = new Date().getFullYear(), importe = 0, fecha = new Date().toISOString(), concepto = '', estado = 'pagado' } = {}) {
    this.alumnoId = alumnoId;
    this.tipo = tipo; // 'cuota', 'material', 'examen' 
    this.mes = mes;
    this.año = año;
    this.importe = importe;
    this.fecha = fecha;
    this.concepto = concepto; // ej: "Cinturón blanco", "Examen 1º Dan"
    this.estado = estado; // 'pagado' o 'pendiente'
  }
}

export class Gasto {
  constructor({ concepto = '', categoria = '', importe = 0, fecha = new Date().toISOString() } = {}) {
    this.concepto = concepto;
    this.categoria = categoria;
    this.importe = importe;
    this.fecha = fecha;
  }
}

// ==========================================
// TABLAS A CLASES
// ==========================================
db.alumnos.mapToClass(Alumno);
db.grupos.mapToClass(Grupo);
db.pagos.mapToClass(Pago);
db.gastos.mapToClass(Gasto);

