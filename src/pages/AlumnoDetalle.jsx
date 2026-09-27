import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService } from '../services/alumnoService';
import { pagoService } from '../services/pagoService';
import { grupoService } from '../services/grupoService';
import AlumnoHeader from '../components/alumno/AlumnoHeader';
import AlumnoKpiCards from '../components/alumno/AlumnoKpiCards';
import AlumnoPagosTab from '../components/alumno/AlumnoPagosTab';
import AlumnoGruposTab from '../components/alumno/AlumnoGruposTab';
import AlumnoSaludTab from '../components/alumno/AlumnoSaludTab';
import ModalPagoAlumno from '../components/alumno/ModalPagoAlumno';
import ModalEditAlumno from '../components/alumno/ModalEditAlumno';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/common/StatusBadge';
import {
  ArrowLeft, Calendar, AlertTriangle,
  DollarSign, Medal, Edit2, Plus, RotateCcw, Trash2
} from 'lucide-react';
import { DEFAULT_CATEGORIAS_MATERIAL, getStoredCategorias, mergeCategorias } from '../utils/categorias';
import { calculateAge, formatCurrency, formatDate } from '../utils/formatters';
import './AlumnoDetalle.css';
import './Alumnos.css';

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const AlumnoDetalle = () => {
  const { id } = useParams();
  const alumnoId = Number(id);

  // Estados de navegación interna y modales
  const [activeTab, setActiveTab] = useState('historial');
  const [filtroTipoPago, setFiltroTipoPago] = useState('todos');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [isCuotaModalOpen, setIsCuotaModalOpen] = useState(false);
  const [cuotaRapidaInput, setCuotaRapidaInput] = useState('');
  const [tipoNuevoPago, setTipoNuevoPago] = useState('cuota');

  const currentDate = useMemo(() => new Date(), []);

  // Consultas reactivas desacopladas mediante capa de servicios
  const alumno = useLiveQuery(() => alumnoService.getById(alumnoId), [alumnoId]);
  const todosPagos = useLiveQuery(() => pagoService.getAll(), []);
  const grupos = useLiveQuery(() => grupoService.getAll(), []) || [];

  // Materiales sugeridos para autocompletado
  const materialesSugeridos = useMemo(() => {
    const stored = getStoredCategorias('material', DEFAULT_CATEGORIAS_MATERIAL);
    const materialPagos = (todosPagos || []).filter(p => p.tipo === 'material');
    return mergeCategorias(stored, materialPagos, 'concepto');
  }, [todosPagos]);

  // Pagos vinculados a este alumno
  const pagosAlumno = useMemo(() => {
    if (!todosPagos || !alumnoId) return [];
    return todosPagos
      .filter(p => Number(p.alumnoId) === alumnoId)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [todosPagos, alumnoId]);

  // Mapa de grupos por ID para consulta rápida
  const gruposMap = useMemo(() => {
    return grupos.reduce((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});
  }, [grupos]);

  // Cálculo de edad
  const edadCalculada = useMemo(() => {
    return calculateAge(alumno?.fechaNac);
  }, [alumno?.fechaNac]);

  // Tarifa estándar sugerida según grupos inscritos
  const cuotaSugeridaGrupos = useMemo(() => {
    return grupoService.calcularCuotaTotal(alumno?.inscripciones || [], gruposMap);
  }, [alumno?.inscripciones, gruposMap]);

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

    pagosAlumno.forEach(p => {
      if (p.estado === 'pagado') {
        pagado += Number(p.importe || 0);
      } else if (p.estado === 'pendiente') {
        deuda += Number(p.importe || 0);
        pendientes.push(p);
      }
    });

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
      await alumnoService.updateCinturon(alumno.id, nuevoCinturon);
    } catch (err) {
      console.error('Error actualizando cinturón:', err);
    }
  };

  // Manejador de alternar activo / baja
  const handleToggleEstado = async () => {
    if (!alumno) return;
    try {
      await alumnoService.toggleEstado(alumno);
    } catch (err) {
      console.error('Error actualizando estado:', err);
    }
  };

  // Guardar edición completa del alumno
  const handleSaveEdit = async (updatedData) => {
    try {
      await alumnoService.update(alumno.id, updatedData);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error guardando cambios del alumno', error);
      alert('Hubo un error al guardar los cambios.');
    }
  };

  // Guardar modificación directa de cuota
  const handleSaveCuotaRapida = async (e) => {
    e.preventDefault();
    try {
      await alumnoService.update(alumno.id, {
        cuota: Number(cuotaRapidaInput) || 0
      });
      setIsCuotaModalOpen(false);
    } catch (err) {
      console.error('Error guardando cuota:', err);
      alert('Hubo un error al guardar la cuota.');
    }
  };

  // Abrir Modal de Pago
  const openPagoModal = (tipo = 'cuota') => {
    setTipoNuevoPago(tipo);
    setIsPagoModalOpen(true);
  };

  // Guardar nuevo cobro/pago
  const handleSavePago = async (pagoFormData) => {
    try {
      await pagoService.create({
        ...pagoFormData,
        alumnoId: alumno.id
      });
      setIsPagoModalOpen(false);
    } catch (error) {
      console.error('Error registrando pago:', error);
      alert('Hubo un error al registrar el pago.');
    }
  };

  // Acciones sobre pagos
  const handleMarcarPagado = async (pagoId) => {
    await pagoService.marcarPagado(pagoId);
  };

  const handleRevertirPago = async (pagoId) => {
    if (window.confirm('¿Deshacer el pago y volver a marcarlo como pendiente?')) {
      await pagoService.revertirPago(pagoId);
    }
  };

  const handleDeletePago = async (pagoId) => {
    if (window.confirm('¿Eliminar este registro de pago definitivamente?')) {
      await pagoService.delete(pagoId);
    }
  };

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

  return (
    <div className="alumno-detalle-container">
      {/* Barra superior de navegación y acciones */}
      <div className="detalle-top-nav">
        <Link to="/alumnos" className="btn-back">
          <ArrowLeft size={18} /> Volver a Alumnos
        </Link>
        <div className="top-actions">
          <button className="btn-primary flex-center" onClick={() => setIsEditModalOpen(true)}>
            <Edit2 size={18} style={{ marginRight: '6px' }} /> Editar Alumno
          </button>
        </div>
      </div>

      {/* Tarjeta Principal de Perfil */}
      <AlumnoHeader
        alumno={alumno}
        edad={edadCalculada}
        onCambioCinturon={handleCambioCinturon}
        onToggleEstado={handleToggleEstado}
      />

      {/* Métricas / KPIs del Alumno */}
      <AlumnoKpiCards
        cuota={alumno.cuota || 0}
        gruposCount={gruposInscritos.length}
        estadoCuotaMesActual={estadoCuotaMesActual}
        totalDeuda={totalDeuda}
        itemsPendientesCount={itemsPendientes.length}
        totalPagado={totalPagado}
        totalCobrosCount={pagosAlumno.filter(p => p.estado === 'pagado').length}
        currentMonthName={MESES_NOMBRES[currentDate.getMonth()]}
        onEditarCuota={() => {
          setCuotaRapidaInput(alumno.cuota !== undefined ? alumno.cuota : cuotaSugeridaGrupos);
          setIsCuotaModalOpen(true);
        }}
      />

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
        <AlumnoPagosTab
          pagos={pagosFiltrados}
          filtroTipoPago={filtroTipoPago}
          setFiltroTipoPago={setFiltroTipoPago}
          onOpenPagoModal={openPagoModal}
          onMarcarPagado={handleMarcarPagado}
          onRevertirPago={handleRevertirPago}
          onDeletePago={handleDeletePago}
          mesesNombres={MESES_NOMBRES}
        />
      )}

      {/* PESTAÑA: GRUPOS Y HORARIOS */}
      {activeTab === 'grupos' && (
        <AlumnoGruposTab
          gruposInscritos={gruposInscritos}
          onOpenEditModal={() => setIsEditModalOpen(true)}
        />
      )}

      {/* PESTAÑA: SALUD Y NOTAS */}
      {activeTab === 'salud' && (
        <AlumnoSaludTab
          lesiones={alumno.lesiones}
          observaciones={alumno.observaciones}
        />
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
                    <td>{formatDate(p.fecha)}</td>
                    <td><strong>{p.concepto}</strong></td>
                    <td>{formatCurrency(p.importe)}</td>
                    <td>
                      <StatusBadge status={p.estado} />
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

      {/* MODAL RÁPIDO PARA MODIFICAR PRECIO DE CUOTA */}
      <Modal
        isOpen={isCuotaModalOpen}
        onClose={() => setIsCuotaModalOpen(false)}
        title={`Modificar Cuota Mensual: ${alumno.nombreCompleto}`}
      >
        <form onSubmit={handleSaveCuotaRapida} className="form-grid">
          <div className="form-group full-width">
            <label>Cuota Mensual Acordada (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cuotaRapidaInput}
              onChange={(e) => setCuotaRapidaInput(e.target.value)}
              required
              placeholder="0.00"
              autoFocus
            />
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tarifa estándar calculada por grupos: <strong>{formatCurrency(cuotaSugeridaGrupos)}</strong>
              {Number(cuotaRapidaInput) !== Number(cuotaSugeridaGrupos) && (
                <span style={{ color: 'var(--primary-color)', marginLeft: '6px', fontWeight: 600 }}>
                  (Precio personalizado)
                </span>
              )}
            </div>
          </div>

          {Number(cuotaRapidaInput) !== Number(cuotaSugeridaGrupos) && (
            <div className="form-group full-width">
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setCuotaRapidaInput(cuotaSugeridaGrupos)}
              >
                Restablecer a tarifa estándar ({formatCurrency(cuotaSugeridaGrupos)})
              </button>
            </div>
          )}

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsCuotaModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Cuota
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE EDICIÓN COMPLETA */}
      <ModalEditAlumno
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        alumno={alumno}
        grupos={grupos}
        gruposMap={gruposMap}
        onSave={handleSaveEdit}
      />

      {/* MODAL DE NUEVO PAGO / COBRO DIRECTO */}
      <ModalPagoAlumno
        isOpen={isPagoModalOpen}
        onClose={() => setIsPagoModalOpen(false)}
        tipo={tipoNuevoPago}
        alumno={alumno}
        materialesSugeridos={materialesSugeridos}
        onSave={handleSavePago}
        mesesNombres={MESES_NOMBRES}
      />
    </div>
  );
};

export default AlumnoDetalle;

