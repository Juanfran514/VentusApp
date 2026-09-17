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

// ==========================================
// FUNCIÓN PARA DATOS DE PRUEBA (SEED)
// ==========================================
export async function seedDatabase() {
  const count = await db.grupos.count();
  if (count === 0) {
    console.log('Insertando datos de prueba (Seed)...');

    const grupoKickboxingId = await db.grupos.add(new Grupo({
      nombre: 'Kickboxing', actividad: 'Kickboxing', horarios: 'L-X 17:00-18:00', plazasMax: 20,
      tarifas: { 1: 25, 2: 40, 3: 50 }
    }));
    const grupoTaekwondoId = await db.grupos.add(new Grupo({
      nombre: 'Taekwondo', actividad: 'Taekwondo', horarios: 'M-J 19:00-20:30', plazasMax: 15,
      tarifas: { 1: 30, 2: 45, 3: 60 }
    }));

    await db.alumnos.bulkAdd([
      new Alumno({ nombre: 'Juan', apellidos: 'Pérez', telefono: '600123456', grupoId: grupoKickboxingId, grupos: [grupoKickboxingId], cuota: 40, estado: 'activo' }),
      new Alumno({ nombre: 'María', apellidos: 'López', telefono: '600987654', grupoId: grupoTaekwondoId, grupos: [grupoTaekwondoId], cuota: 45, estado: 'activo' })
    ]);
  }
}

