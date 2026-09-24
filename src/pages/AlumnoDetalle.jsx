import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Alumno, Pago } from '../db/db';
import Modal from '../components/ui/Modal';
import {
  ArrowLeft, Phone, Calendar, Award, AlertTriangle,
  FileText, CheckCircle, Clock, DollarSign, Package, Medal,
  Edit2, Plus, RotateCcw, Trash2, User, Mail, ShieldCheck, X
} from 'lucide-react';
import './AlumnoDetalle.css';
import './Alumnos.css';

// Lista de cinturones estándar con clases CSS asociadas
const CINTURONES_DISPONIBLES = [
  { nombre: 'Blanco', cssClass: 'belt-blanco' },
  { nombre: 'Blanco-Amarillo', cssClass: 'belt-blanco-amarillo' },
  { nombre: 'Amarillo', cssClass: 'belt-amarillo' },
  { nombre: 'Amarillo-Naranja', cssClass: 'belt-amarillo-naranja' },
  { nombre: 'Naranja', cssClass: 'belt-naranja' },
  { nombre: 'Naranja-Verde', cssClass: 'belt-naranja-verde' },
  { nombre: 'Verde', cssClass: 'belt-verde' },
  { nombre: 'Verde-Azul', cssClass: 'belt-verde-azul' },
  { nombre: 'Azul', cssClass: 'belt-azul' },
  { nombre: 'Azul-Marrón', cssClass: 'belt-azul-marron' },
  { nombre: 'Marrón', cssClass: 'belt-marron' },
  { nombre: 'Negro 1º Dan', cssClass: 'belt-negro' },
  { nombre: 'Negro 2º Dan', cssClass: 'belt-negro' },
  { nombre: 'Negro 3º Dan', cssClass: 'belt-negro' }
];

const AlumnoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const alumnoId = Number(id);

  // Estados de navegación interna y modales
  const [activeTab, setActiveTab] = useState('historial');
  const [filtroTipoPago, setFiltroTipoPago] = useState('todos'); // 'todos', 'cuota', 'examen', 'material', 'pendientes'

  // Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [tipoNuevoPago, setTipoNuevoPago] = useState('cuota'); // 'cuota', 'examen', 'material'

  // Formularios
  const currentDate = new Date();
  const [editFormData, setEditFormData] = useState({
    nombre: '', apellidos: '', fechaNac: '', telefono: '', nTutor: '',
    email: '', cinturon: 'Blanco', estado: 'activo', inscripciones: [], observaciones: '', lesiones: ''
  });

  const [pagoFormData, setPagoFormData] = useState({
    tipo: 'cuota',
    concepto: '',
    importe: 0,
    mes: currentDate.getMonth() + 1,
    año: currentDate.getFullYear(),
    fecha: currentDate.toISOString().split('T')[0],
    estado: 'pagado'
  });

  // Consultas reactivas con Dexie
  const alumno = useLiveQuery(() => db.alumnos.get(alumnoId), [alumnoId]);
  const todosPagos = useLiveQuery(() => db.pagos.toArray(), []);
  const grupos = useLiveQuery(() => db.grupos.toArray(), []);

  // Pagos vinculados a este alumno
  const pagosAlumno = useMemo(() => {
    if (!todosPagos || !alumnoId) return [];
    return todosPagos
      .filter(p => Number(p.alumnoId) === alumnoId)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [todosPagos, alumnoId]);

  // Mapa de grupos por ID para consulta rápida
  const gruposMap = useMemo(() => {
    if (!grupos) return {};
    return grupos.reduce((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});
  }, [grupos]);

  // Cálculo de edad
  const edadCalculada = useMemo(() => {
    if (!alumno?.fechaNac) return null;
    const diff = Date.now() - new Date(alumno.fechaNac).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }, [alumno?.fechaNac]);

  // Cuota del mes actual pagada o pendiente
  const estadoCuotaMesActual = useMemo(() => {
    if (!pagosAlumno || !alumno) return { pagada: false, registro: null };
    const mesActual = currentDate.getMonth() + 1;
    const añoActual = currentDate.getFullYear();
    const pago = pagosAlumno.find(p => 
      p.tipo === 'cuota' && 
      Number(p.mes) === mesActual && 
      Number(p.año) === añoActual &&
      p.estado === 'pagado'
    );
    return {
      pagada: !!pago,
      registro: pago || null
    };
  }, [pagosAlumno, alumno, currentDate]);

  // Totales financieros
  const { totalPagado, totalDeuda, itemsPendientes } = useMemo(() => {
    if (!pagosAlumno) return { totalPagado: 0, totalDeuda: 0, itemsPendientes: [] };

    let pagado = 0;
    let deuda = 0;
    const pendientes = [];

    // Pagos registrados
    pagosAlumno.forEach(p => {
      if (p.estado === 'pagado') {
        pagado += Number(p.importe || 0);
      } else if (p.estado === 'pendiente') {
        deuda += Number(p.importe || 0);
        pendientes.push(p);
      }
    });

    // Si la cuota del mes en curso no está pagada y el alumno está activo con cuota > 0
    if (alumno?.estado === 'activo' && alumno.cuota > 0 && !estadoCuotaMesActual.pagada) {
      deuda += Number(alumno.cuota);
    }

    return { totalPagado: pagado, totalDeuda: deuda, itemsPendientes: pendientes };
  }, [pagosAlumno, alumno, estadoCuotaMesActual]);

  // Pagos filtrados para la tabla
  const pagosFiltrados = useMemo(() => {
    if (!pagosAlumno) return [];
    if (filtroTipoPago === 'todos') return pagosAlumno;
    if (filtroTipoPago === 'pendientes') return pagosAlumno.filter(p => p.estado === 'pendiente');
    return pagosAlumno.filter(p => p.tipo === filtroTipoPago);
  }, [pagosAlumno, filtroTipoPago]);

  // Información de grupos inscritos con horarios detallados
  const gruposInscritos = useMemo(() => {
    if (!alumno?.inscripciones || !gruposMap) return [];
    return alumno.inscripciones.map(ins => {
      const g = gruposMap[ins.grupoId];
      const tarifa = g?.tarifas ? g.tarifas[ins.dias] || 0 : 0;
      return {
        grupoId: ins.grupoId,
        nombre: g ? g.nombre : 'Grupo desconocido',
        actividad: g ? g.actividad : 'Sin actividad',
        horarios: g ? g.horarios : [],
        dias: ins.dias,
        tarifa
      };
    });
  }, [alumno, gruposMap]);

  // Manejador de cambio rápido de cinturón
  const handleCambioCinturon = async (nuevoCinturon) => {
    if (!alumno) return;
    try {
      await db.alumnos.update(alumno.id, { cinturon: nuevoCinturon });
    } catch (err) {
      console.error('Error actualizando cinturón:', err);
    }
  };

  // Manejador de alternar activo / baja
  const handleToggleEstado = async () => {
    if (!alumno) return;
    const nuevo = alumno.estado === 'activo' ? 'baja' : 'activo';
    try {
      await db.alumnos.update(alumno.id, { estado: nuevo });
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  // Abrir Modal de Edición
  const openEditModal = () => {
    if (!alumno) return;
    setEditFormData({
      nombre: alumno.nombre || '',
      apellidos: alumno.apellidos || '',
      fechaNac: alumno.fechaNac || '',
      telefono: alumno.telefono || '',
      nTutor: alumno.nTutor || '',
      email: alumno.email || '',
      cinturon: alumno.cinturon || 'Blanco',
      estado: alumno.estado || 'activo',
      inscripciones: alumno.inscripciones || [],
      observaciones: alumno.observaciones || '',
      lesiones: alumno.lesiones || ''
    });
    setIsEditModalOpen(true);
  };

  // Manejo de inscripciones dentro de la edición
  const handleAddInscripcion = () => {
    setEditFormData(prev => ({
      ...prev,
      inscripciones: [...prev.inscripciones, { grupoId: '', dias: 1 }]
    }));
  };

  const handleRemoveInscripcion = (index) => {
    setEditFormData(prev => ({
      ...prev,
      inscripciones: prev.inscripciones.filter((_, i) => i !== index)
    }));
  };

  const handleInscripcionChange = (index, field, value) => {
    setEditFormData(prev => {
      const newIns = [...prev.inscripciones];
      newIns[index] = { ...newIns[index], [field]: value };
      return { ...prev, inscripciones: newIns };
    });
  };

  // Cálculo de cuota en formulario de edición
  const cuotaCalculadaEdicion = editFormData.inscripciones.reduce((total, ins) => {
    if (!ins.grupoId || !ins.dias) return total;
    const g = grupos?.find(gr => gr.id === Number(ins.grupoId));
    if (g && g.tarifas) {
      return total + Number(g.tarifas[ins.dias] || 0);
    }
    return total;
  }, 0);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const inscripcionesValidas = editFormData.inscripciones
        .filter(ins => ins.grupoId !== '')
        .map(ins => ({
          grupoId: Number(ins.grupoId),
          dias: Number(ins.dias)
        }));
      const gruposIds = inscripcionesValidas.map(ins => ins.grupoId);

      await db.alumnos.update(alumno.id, {
        ...editFormData,
        cuota: cuotaCalculadaEdicion,
        inscripciones: inscripcionesValidas,
        grupos: gruposIds
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error guardando cambios del alumno', error);
      alert('Hubo un error al guardar los cambios.');
    }
  };

  // Abrir Modal de Nuevo Pago / Cobro rápido
  const openPagoModal = (tipo = 'cuota') => {
    setTipoNuevoPago(tipo);
    let importe = 0;
    let concepto = '';
    let estado = 'pagado';

    if (tipo === 'cuota') {
      importe = alumno?.cuota || 0;
      concepto = `Cuota ${mesesNombres[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      estado = 'pagado';
    } else if (tipo === 'examen') {
      concepto = 'Examen de Grado';
      estado = 'pendiente';
    } else if (tipo === 'material') {
      concepto = 'Material Deportivo';
      estado = 'pendiente';
    }

    setPagoFormData({
      tipo,
      concepto,
      importe,
      mes: currentDate.getMonth() + 1,
      año: currentDate.getFullYear(),
      fecha: currentDate.toISOString().split('T')[0],
      estado
    });
    setIsPagoModalOpen(true);
  };

  const handleSavePago = async (e) => {
    e.preventDefault();
    try {
      await db.pagos.add(new Pago({
        alumnoId: alumno.id,
        tipo: pagoFormData.tipo,
        mes: Number(pagoFormData.mes),
        año: Number(pagoFormData.año),
        importe: Number(pagoFormData.importe),
        fecha: new Date(pagoFormData.fecha).toISOString(),
        concepto: pagoFormData.concepto,
        estado: pagoFormData.estado
      }));
      setIsPagoModalOpen(false);
    } catch (error) {
      console.error('Error registrando pago:', error);
    }
  };

  // Acciones sobre pagos en la tabla
  const handleMarcarPagado = async (pagoId) => {
    await db.pagos.update(pagoId, { estado: 'pagado' });
  };

  const handleRevertirPago = async (pagoId) => {
    if (window.confirm('¿Deshacer el pago y volver a marcarlo como pendiente?')) {
      await db.pagos.update(pagoId, { estado: 'pendiente' });
    }
  };

  const handleDeletePago = async (pagoId) => {
    if (window.confirm('¿Eliminar este registro de pago definitivamente?')) {
      await db.pagos.delete(pagoId);
    }
  };

  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  if (!alumno) {
    return (
      <div className="alumno-detalle-container">
        <div className="card text-center" style={{ padding: '3rem' }}>
          <h2>Alumno no encontrado</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            El alumno solicitado no existe o ha sido eliminado.
          </p>
          <Link to="/alumnos" className="btn-primary">
            Volver a la lista de alumnos
          </Link>
        </div>
      </div>
    );
  }

  // Clase del cinturón actual
  const beltObj = CINTURONES_DISPONIBLES.find(c => c.nombre.toLowerCase() === (alumno.cinturon || '').toLowerCase());
  const beltClass = beltObj ? beltObj.cssClass : 'belt-blanco';

  return (
    <div className="alumno-detalle-container">
      {/* Barra superior de navegación y acciones */}
      <div className="detalle-top-nav">
        <Link to="/alumnos" className="btn-back">
          <ArrowLeft size={18} /> Volver a Alumnos
        </Link>
        <div className="top-actions">
          <button className="btn-primary flex-center" onClick={openEditModal}>
            <Edit2 size={18} style={{ marginRight: '6px' }} /> Editar Alumno
          </button>
        </div>
      </div>

      {/* Tarjeta Principal de Perfil */}
      <div className="profile-card">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar">
            {alumno.nombre.charAt(0)}{alumno.apellidos ? alumno.apellidos.charAt(0) : ''}
          </div>
          <span
            className={`badge badge-${alumno.estado}`}
            onClick={handleToggleEstado}
            style={{ cursor: 'pointer' }}
            title="Clic para alternar estado"
          >
            {alumno.estado.toUpperCase()}
          </span>
        </div>

        <div className="profile-main-info">
          <div className="profile-name-row">
            <h1 className="profile-name">{alumno.nombreCompleto}</h1>
            
            {/* Grado / Cinturón con selector rápido */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`belt-tag ${beltClass}`}>
                <Award size={16} /> {alumno.cinturon || 'Blanco'}
              </span>
              <select
                value={alumno.cinturon || 'Blanco'}
                onChange={(e) => handleCambioCinturon(e.target.value)}
                style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                title="Cambiar grado/cinturón"
              >
                {CINTURONES_DISPONIBLES.map(c => (
                  <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="profile-meta-grid">
            <div className="profile-meta-item">
              <Phone size={16} />
              {alumno.telefono ? (
                <a href={`tel:${alumno.telefono}`}>{alumno.telefono}</a>
              ) : (
                <span className="text-muted">Sin teléfono</span>
              )}
            </div>

            {alumno.nTutor && (
              <div className="profile-meta-item">
                <User size={16} />
                <span>Tutor: <strong>{alumno.nTutor}</strong></span>
              </div>
            )}

            <div className="profile-meta-item">
              <Calendar size={16} />
              <span>
                {alumno.fechaNac ? (
                  <>
                    {new Date(alumno.fechaNac).toLocaleDateString()} {edadCalculada !== null && `(${edadCalculada} años)`}
                  </>
                ) : (
                  <span className="text-muted">Sin fecha nacimiento</span>
                )}
              </span>
            </div>

            {alumno.email && (
              <div className="profile-meta-item">
                <Mail size={16} />
                <a href={`mailto:${alumno.email}`}>{alumno.email}</a>
              </div>
            )}
          </div>
        </div>

        {/* Acciones directas de contacto */}
        {alumno.telefono && (
          <div className="profile-actions-bar">
            <a href={`tel:${alumno.telefono}`} className="btn-secondary flex-center" style={{ textDecoration: 'none' }}>
              <Phone size={16} style={{ marginRight: '6px' }} /> Llamar
            </a>
          </div>
        )}
      </div>

      {/* Métricas / KPIs del Alumno */}
      <div className="student-kpi-grid">
        <div className="student-kpi-card">
          <div className="student-kpi-title">
            <DollarSign size={16} /> Cuota Mensual
          </div>
          <div className="student-kpi-value">{alumno.cuota || 0} €</div>
          <div className="student-kpi-sub">
            {gruposInscritos.length} grupo(s) asignado(s)
          </div>
        </div>

        <div className="student-kpi-card">
          <div className="student-kpi-title">
            <Clock size={16} /> Cuota {mesesNombres[currentDate.getMonth()]}
          </div>
          <div className={`student-kpi-value ${estadoCuotaMesActual.pagada ? 'kpi-success' : 'kpi-danger'}`}>
            {estadoCuotaMesActual.pagada ? 'PAGADA' : 'PENDIENTE'}
          </div>
          <div className="student-kpi-sub">
            {estadoCuotaMesActual.pagada 
              ? `Abonada el ${new Date(estadoCuotaMesActual.registro.fecha).toLocaleDateString()}` 
              : 'Requiere cobro este mes'}
          </div>
        </div>

        <div className="student-kpi-card">
          <div className="student-kpi-title">
            <AlertTriangle size={16} /> Saldo Adeudado
          </div>
          <div className={`student-kpi-value ${totalDeuda > 0 ? 'kpi-danger' : 'kpi-success'}`}>
            {totalDeuda.toFixed(2)} €
          </div>
          <div className="student-kpi-sub">
            {totalDeuda > 0 ? `${itemsPendientes.length} concepto(s) pendientes` : 'Al corriente de pagos'}
          </div>
        </div>

        <div className="student-kpi-card">
          <div className="student-kpi-title">
            <ShieldCheck size={16} /> Total Pagado Histórico
          </div>
          <div className="student-kpi-value kpi-success">
            {totalPagado.toFixed(2)} €
          </div>
          <div className="student-kpi-sub">
            {pagosAlumno.filter(p => p.estado === 'pagado').length} cobro(s) registrados
          </div>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="tabs-navigation">
        <button
          className={`tab-button ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          <DollarSign size={18} /> Historial Financiero ({pagosAlumno.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'grupos' ? 'active' : ''}`}
          onClick={() => setActiveTab('grupos')}
        >
          <Calendar size={18} /> Grupos y Horarios ({gruposInscritos.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'salud' ? 'active' : ''}`}
          onClick={() => setActiveTab('salud')}
        >
          <AlertTriangle size={18} /> Salud y Notas
        </button>
        <button
          className={`tab-button ${activeTab === 'examenes' ? 'active' : ''}`}
          onClick={() => setActiveTab('examenes')}
        >
          <Medal size={18} /> Exámenes y Grados
        </button>
      </div>

      {/* PESTAÑA: HISTORIAL FINANCIERO */}
      {activeTab === 'historial' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                className={`btn-secondary ${filtroTipoPago === 'todos' ? 'btn-primary' : ''}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setFiltroTipoPago('todos')}
              >
                Todos
              </button>
              <button 
                className={`btn-secondary ${filtroTipoPago === 'pendientes' ? 'btn-primary' : ''}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setFiltroTipoPago('pendientes')}
              >
                Solo Pendientes
              </button>
              <button 
                className={`btn-secondary ${filtroTipoPago === 'cuota' ? 'btn-primary' : ''}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setFiltroTipoPago('cuota')}
              >
                Cuotas
              </button>
              <button 
                className={`btn-secondary ${filtroTipoPago === 'examen' ? 'btn-primary' : ''}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setFiltroTipoPago('examen')}
              >
                Exámenes
              </button>
              <button 
                className={`btn-secondary ${filtroTipoPago === 'material' ? 'btn-primary' : ''}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setFiltroTipoPago('material')}
              >
                Material
              </button>
            </div>

            {/* Acciones directas para añadir cobro */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary flex-center" onClick={() => openPagoModal('cuota')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Cobrar Cuota
              </button>
              <button className="btn-secondary flex-center" onClick={() => openPagoModal('examen')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <Medal size={16} style={{ marginRight: '4px' }} /> Examen
              </button>
              <button className="btn-secondary flex-center" onClick={() => openPagoModal('material')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <Package size={16} style={{ marginRight: '4px' }} /> Material
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Concepto / Período</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.map(pago => (
                  <tr key={pago.id} style={{ background: pago.estado === 'pendiente' ? 'rgba(239, 68, 68, 0.06)' : undefined }}>
                    <td>{new Date(pago.fecha).toLocaleDateString()}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <span className="badge" style={{ background: 'var(--bg-dark)', color: 'var(--text-light)' }}>
                        {pago.tipo}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {pago.tipo === 'cuota' 
                          ? `${mesesNombres[pago.mes - 1]} ${pago.año}` 
                          : (pago.concepto || pago.tipo)}
                      </strong>
                    </td>
                    <td style={{ fontWeight: 'bold', color: pago.estado === 'pagado' ? 'var(--primary-color)' : 'var(--danger-color)' }}>
                      {pago.estado === 'pagado' ? `+${pago.importe} €` : `${pago.importe} €`}
                    </td>
                    <td>
                      {pago.estado === 'pagado' ? (
                        <span className="badge badge-activo flex-center" style={{ width: 'fit-content' }}>
                          <CheckCircle size={14} style={{ marginRight: '4px' }} /> Pagado
                        </span>
                      ) : (
                        <span className="badge badge-baja flex-center" style={{ width: 'fit-content' }}>
                          <Clock size={14} style={{ marginRight: '4px' }} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td>
                      {pago.estado === 'pendiente' ? (
                        <button
                          className="btn-primary"
                          style={{ padding: '3px 8px', fontSize: '0.8rem', marginRight: '6px' }}
                          onClick={() => handleMarcarPagado(pago.id)}
                        >
                          Cobrar
                        </button>
                      ) : (
                        <button
                          className="btn-icon text-primary"
                          title="Revertir a Pendiente"
                          onClick={() => handleRevertirPago(pago.id)}
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      <button
                        className="btn-icon text-danger"
                        title="Eliminar registro"
                        onClick={() => handleDeletePago(pago.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {pagosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center" style={{ padding: '2rem' }}>
                      No hay registros de pago en esta categoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: GRUPOS Y HORARIOS */}
      {activeTab === 'grupos' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Grupos en los que participa</h2>
            <button className="btn-secondary flex-center" onClick={openEditModal}>
              <Plus size={16} style={{ marginRight: '6px' }} /> Gestionar Inscripciones
            </button>
          </div>

          <div className="groups-grid">
            {gruposInscritos.map((item, idx) => (
              <div key={idx} className="student-group-card">
                <div className="group-card-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{item.nombre}</h3>
                    <span className="group-activity-badge">{item.actividad}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      {item.tarifa} €
                    </span>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {item.dias} día(s) / sem
                    </div>
                  </div>
                </div>

                <div className="group-schedule-list">
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    Horarios de clase:
                  </span>
                  {Array.isArray(item.horarios) && item.horarios.length > 0 ? (
                    item.horarios.map((h, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{h.dia}</span>
                        <strong>{h.horaInicio} - {h.horaFin}</strong>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted">Sin horarios específicos configurados</span>
                  )}
                </div>
              </div>
            ))}

            {gruposInscritos.length === 0 && (
              <div className="full-width text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                El alumno no está inscrito en ningún grupo actualmente.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA: SALUD Y NOTAS */}
      {activeTab === 'salud' && (
        <div className="health-notes-grid">
          <div className="note-card medical">
            <div className="note-card-title">
              <AlertTriangle size={18} /> Información Médica y Lesiones
            </div>
            <div className="note-content">
              {alumno.lesiones && alumno.lesiones.trim() !== '' ? (
                alumno.lesiones
              ) : (
                <span className="text-muted">No hay información médica ni lesiones registradas para este alumno.</span>
              )}
            </div>
          </div>

          <div className="note-card general">
            <div className="note-card-title">
              <FileText size={18} /> Observaciones Generales
            </div>
            <div className="note-content">
              {alumno.observaciones && alumno.observaciones.trim() !== '' ? (
                alumno.observaciones
              ) : (
                <span className="text-muted">Sin observaciones adicionales.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: EXÁMENES Y GRADOS */}
      {activeTab === 'examenes' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2>Historial de Exámenes y Grados</h2>
            <button className="btn-primary flex-center" onClick={() => openPagoModal('examen')}>
              <Plus size={16} style={{ marginRight: '6px' }} /> Asignar Nuevo Examen
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha de Examen</th>
                  <th>Grado / Concepto</th>
                  <th>Importe</th>
                  <th>Estado del Pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagosAlumno.filter(p => p.tipo === 'examen').map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.fecha).toLocaleDateString()}</td>
                    <td><strong>{p.concepto}</strong></td>
                    <td>{p.importe} €</td>
                    <td>
                      {p.estado === 'pagado' ? (
                        <span className="badge badge-activo flex-center" style={{ width: 'fit-content' }}>
                          <CheckCircle size={14} style={{ marginRight: '4px' }} /> Pagado
                        </span>
                      ) : (
                        <span className="badge badge-baja flex-center" style={{ width: 'fit-content' }}>
                          <Clock size={14} style={{ marginRight: '4px' }} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td>
                      {p.estado === 'pendiente' ? (
                        <button
                          className="btn-primary"
                          style={{ padding: '3px 8px', fontSize: '0.8rem', marginRight: '6px' }}
                          onClick={() => handleMarcarPagado(p.id)}
                        >
                          Cobrar
                        </button>
                      ) : (
                        <button
                          className="btn-icon text-primary"
                          title="Revertir"
                          onClick={() => handleRevertirPago(p.id)}
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      <button
                        className="btn-icon text-danger"
                        title="Eliminar"
                        onClick={() => handleDeletePago(p.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {pagosAlumno.filter(p => p.tipo === 'examen').length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2rem' }}>
                      No hay exámenes registrados para este alumno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN COMPLETA */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Editar Alumno: ${alumno.nombreCompleto}`}>
        <form onSubmit={handleSaveEdit} className="form-grid">
          <div className="form-group">
            <label>Nombre *</label>
            <input
              name="nombre"
              value={editFormData.nombre}
              onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Apellidos *</label>
            <input
              name="apellidos"
              value={editFormData.apellidos}
              onChange={(e) => setEditFormData({ ...editFormData, apellidos: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Fecha de Nacimiento</label>
            <input
              type="date"
              name="fechaNac"
              value={editFormData.fechaNac}
              onChange={(e) => setEditFormData({ ...editFormData, fechaNac: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              name="telefono"
              value={editFormData.telefono}
              onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Tutor (si es menor)</label>
            <input
              name="nTutor"
              value={editFormData.nTutor}
              onChange={(e) => setEditFormData({ ...editFormData, nTutor: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Cinturón / Grado Actual</label>
            <select
              value={editFormData.cinturon}
              onChange={(e) => setEditFormData({ ...editFormData, cinturon: e.target.value })}
            >
              {CINTURONES_DISPONIBLES.map(c => (
                <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select
              value={editFormData.estado}
              onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })}
            >
              <option value="activo">Activo</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          {/* Inscripciones a Grupos */}
          <div className="form-group full-width">
            <label>Inscripciones a Grupos y Días</label>
            <div className="inscripciones-list">
              {editFormData.inscripciones.map((ins, index) => (
                <div key={index} className="inscripcion-row">
                  <select
                    value={ins.grupoId}
                    onChange={(e) => handleInscripcionChange(index, 'grupoId', e.target.value)}
                    required
                  >
                    <option value="">Selecciona un grupo...</option>
                    {grupos?.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre} ({g.actividad})</option>
                    ))}
                  </select>
                  <div className="dias-input">
                    <span>Días/sem:</span>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={ins.dias}
                      onChange={(e) => handleInscripcionChange(index, 'dias', e.target.value)}
                      required
                    />
                  </div>
                  <button type="button" className="btn-icon text-danger" onClick={() => handleRemoveInscripcion(index)}>
                    <X size={20} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary add-inscripcion-btn" onClick={handleAddInscripcion}>
                + Añadir Grupo
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Cuota Mensual Resultante (€)</label>
            <div className="cuota-display">{cuotaCalculadaEdicion} €</div>
          </div>

          <div className="form-group full-width">
            <label>Información Médica o Lesiones</label>
            <textarea
              name="lesiones"
              value={editFormData.lesiones}
              onChange={(e) => setEditFormData({ ...editFormData, lesiones: e.target.value })}
              rows="2"
            />
          </div>
          <div className="form-group full-width">
            <label>Observaciones</label>
            <textarea
              name="observaciones"
              value={editFormData.observaciones}
              onChange={(e) => setEditFormData({ ...editFormData, observaciones: e.target.value })}
              rows="2"
            />
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE NUEVO PAGO / COBRO DIRECTO */}
      <Modal isOpen={isPagoModalOpen} onClose={() => setIsPagoModalOpen(false)} title={`Registrar ${tipoNuevoPago === 'cuota' ? 'Cobro de Cuota' : tipoNuevoPago === 'examen' ? 'Examen' : 'Material'}`}>
        <form onSubmit={handleSavePago} className="form-grid">
          {tipoNuevoPago === 'cuota' ? (
            <>
              <div className="form-group">
                <label>Mes *</label>
                <select
                  value={pagoFormData.mes}
                  onChange={(e) => setPagoFormData({ ...pagoFormData, mes: Number(e.target.value) })}
                  required
                >
                  {mesesNombres.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Año *</label>
                <input
                  type="number"
                  value={pagoFormData.año}
                  onChange={(e) => setPagoFormData({ ...pagoFormData, año: Number(e.target.value) })}
                  required
                />
              </div>
            </>
          ) : (
            <div className="form-group full-width">
              <label>Concepto / Detalle *</label>
              <input
                type="text"
                value={pagoFormData.concepto}
                onChange={(e) => setPagoFormData({ ...pagoFormData, concepto: e.target.value })}
                required
                placeholder={tipoNuevoPago === 'examen' ? 'Ej: Cinturón Naranja 6º Kyu' : 'Ej: Guantes 12oz, Espinilleras...'}
              />
            </div>
          )}

          <div className="form-group">
            <label>Fecha *</label>
            <input
              type="date"
              value={pagoFormData.fecha}
              onChange={(e) => setPagoFormData({ ...pagoFormData, fecha: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Importe (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pagoFormData.importe}
              onChange={(e) => setPagoFormData({ ...pagoFormData, importe: Number(e.target.value) })}
              required
            />
          </div>

          <div className="form-group full-width">
            <label>Estado del Pago *</label>
            <select
              value={pagoFormData.estado}
              onChange={(e) => setPagoFormData({ ...pagoFormData, estado: e.target.value })}
              required
            >
              <option value="pagado">Pagado (Abonado)</option>
              <option value="pendiente">Pendiente (Adeudo)</option>
            </select>
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsPagoModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar Registro</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AlumnoDetalle;
