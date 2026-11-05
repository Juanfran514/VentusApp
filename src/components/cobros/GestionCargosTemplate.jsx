import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService, pagoService } from '../../services';
import { formatCurrency, formatDate, getNombreCompleto } from '../../utils/formatters';
import { getStoredCategorias, saveStoredCategoria, mergeCategorias } from '../../utils/categorias';
import { exportarMesAPdf } from '../../utils/pdfExport';
import Modal from '../ui/Modal';
import Tabs from '../common/Tabs';
import StatusBadge from '../common/StatusBadge';
import SearchFilterBar from '../common/SearchFilterBar';
import MonthlyAccordionList from '../common/MonthlyAccordionList';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { useConfirm, useToast } from '../../context/DialogContext';
import '../../pages/Alumnos.css';

/**
 * Plantilla reutilizable y parametrizada para módulos de cargos a alumnos
 * (Exámenes, Licencias, o futuros tipos como Seminarios/Eventos) — OCP / DRY
 */
const GestionCargosTemplate = ({
  tipo,
  pageTitle,
  addButtonLabel,
  modalTitle,
  conceptoColumnLabel = 'Concepto',
  conceptoInputLabel = 'Concepto *',
  conceptoPlaceholder = 'Ej: Concepto',
  fechaColumnLabel = 'Fecha',
  fechaInputLabel = 'Fecha *',
  searchPlaceholder = 'Buscar por alumno o concepto...',
  emptyPendientesText = 'No hay registros pendientes de cobro.',
  emptyPagadosText = 'No hay registros pagados.',
  tituloAcordeon = 'Registros',
  tipoRegistroLabel = 'registros',
  pdfTituloMes = 'Informe Mensual',
  pdfTituloCompleto = 'Historial Completo',
  pdfFilePrefix = 'registros',
  categoriasConfig = null // { storageKey: 'licencias', defaults: DEFAULT_CATEGORIAS_LICENCIAS, filterPlaceholder: 'Todas las licencias' }
}) => {
  const [activeTab, setActiveTab] = useState('pendientes');
  const [search, setSearch] = useState('');
  const [filtroConcepto, setFiltroConcepto] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    alumnoId: '',
    concepto: '',
    importe: '',
    coste: '',
    beneficio: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  const confirm = useConfirm();
  const { toast } = useToast();

  const alumnos = useLiveQuery(() => alumnoService.getAll(), []);
  const registros = useLiveQuery(() => pagoService.getByTipo(tipo), [tipo]);

  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  const categoriasSugeridas = useMemo(() => {
    if (!categoriasConfig) return [];
    const stored = getStoredCategorias(categoriasConfig.storageKey, categoriasConfig.defaults);
    return mergeCategorias(stored, registros, 'concepto');
  }, [categoriasConfig, registros]);

  const { pendientes, pagados } = useMemo(() => {
    let baseList = registros || [];
    if (filtroConcepto) {
      baseList = baseList.filter(p => p.concepto === filtroConcepto);
    }
    return pagoService.separarPendientesYPagados(baseList, alumnosMap, search);
  }, [registros, alumnosMap, search, filtroConcepto]);

  const gruposMensualesPagados = useMemo(() => {
    return pagoService.agruparPagosPorMes(pagados);
  }, [pagados]);

  const pvp = Number(formData.importe) || 0;
  const beneficio = Number(formData.beneficio) || 0;
  const margenPct = pvp > 0 && beneficio > 0 ? Math.round((beneficio / pvp) * 100) : null;

  const handlePvpChange = (val) => {
    const numPvp = Number(val);
    const updates = { importe: val };
    if (!isNaN(numPvp) && val !== '') {
      if (formData.coste !== '' && !isNaN(Number(formData.coste))) {
        updates.beneficio = Math.max(0, numPvp - Number(formData.coste)).toFixed(2);
      } else if (formData.beneficio !== '' && !isNaN(Number(formData.beneficio))) {
        updates.coste = Math.max(0, numPvp - Number(formData.beneficio)).toFixed(2);
      }
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCosteChange = (val) => {
    const numCoste = Number(val);
    const updates = { coste: val };
    if (!isNaN(numCoste) && val !== '' && !isNaN(pvp)) {
      updates.beneficio = Math.max(0, pvp - numCoste).toFixed(2);
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleBeneficioChange = (val) => {
    const numBen = Number(val);
    const updates = { beneficio: val };
    if (!isNaN(numBen) && val !== '' && !isNaN(pvp)) {
      updates.coste = Math.max(0, pvp - numBen).toFixed(2);
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const openModal = () => {
    setFormData({
      alumnoId: '',
      concepto: '',
      importe: '',
      coste: '',
      beneficio: '',
      fecha: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'alumnoId' ? (value ? Number(value) : '') : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.alumnoId) {
      toast.warning('Debes seleccionar un alumno.');
      return;
    }

    try {
      const conceptoTrimmed = (formData.concepto || '').trim();
      await pagoService.create({
        alumnoId: formData.alumnoId,
        concepto: conceptoTrimmed,
        tipo,
        fecha: formData.fecha,
        importe: Number(formData.importe) || 0,
        coste: formData.coste !== '' ? Number(formData.coste) : 0,
        beneficio: formData.beneficio !== '' ? Number(formData.beneficio) : 0,
        estado: 'pendiente'
      });

      if (categoriasConfig) {
        saveStoredCategoria(categoriasConfig.storageKey, conceptoTrimmed, categoriasConfig.defaults);
      }

      toast.success('Cargo registrado correctamente');
      setIsModalOpen(false);
    } catch (error) {
      console.error(`Error asignando ${tipo}:`, error);
      toast.error('Hubo un error al guardar el registro.');
    }
  };

  const handleMarcarPagado = async (id) => {
    await pagoService.marcarPagado(id);
    toast.success('Cobro registrado como pagado');
  };

  const handleRevertirPago = async (id) => {
    const ok = await confirm({
      title: 'Revertir cobro',
      message: '¿Deshacer el cobro y volver a marcarlo como pendiente?',
      confirmText: 'Revertir',
      variant: 'warning'
    });
    if (ok) {
      await pagoService.revertirPago(id);
      toast.info('El registro ha vuelto a estado pendiente');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar registro',
      message: '¿Estás seguro de que deseas eliminar este registro?',
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (ok) {
      await pagoService.delete(id);
      toast.success('Registro eliminado');
    }
  };

  const handleExportPdfMes = async (grupo) => {
    const headers = ['Fecha', 'Alumno', conceptoColumnLabel, 'PVP', 'Margen'];
    const rows = grupo.items.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe),
      p.beneficio ? `+${formatCurrency(p.beneficio)}` : '-'
    ]);
    const totalMargen = grupo.items.reduce((sum, p) => sum + (Number(p.beneficio) || 0), 0);
    await exportarMesAPdf({
      titulo: pdfTituloMes,
      mesNombre: grupo.mesNombre,
      headers,
      rows,
      totalImporte: grupo.totalImporte,
      totalMargen,
      totalRegistros: grupo.totalItems,
      nombreArchivo: `${pdfFilePrefix}_${grupo.key}.pdf`
    });
  };

  const handleExportTodoPdf = async () => {
    const headers = ['Fecha', 'Alumno', conceptoColumnLabel, 'PVP', 'Margen'];
    const rows = pagados.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe),
      p.beneficio ? `+${formatCurrency(p.beneficio)}` : '-'
    ]);
    const total = pagados.reduce((sum, p) => sum + (Number(p.importe) || 0), 0);
    const totalMargen = pagados.reduce((sum, p) => sum + (Number(p.beneficio) || 0), 0);
    await exportarMesAPdf({
      titulo: pdfTituloCompleto,
      mesNombre: 'Todos los períodos',
      headers,
      rows,
      totalImporte: total,
      totalMargen,
      totalRegistros: pagados.length,
      nombreArchivo: `historial_${pdfFilePrefix}_completo.pdf`
    });
  };

  const tabsConfig = [
    {
      id: 'pendientes',
      label: 'Pendientes de Cobro',
      badge: pendientes.length,
      badgeVariant: 'danger'
    },
    {
      id: 'pagados',
      label: 'Historial (Pagados)'
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{pageTitle}</h1>
        <button className="btn-primary flex-center" onClick={openModal}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          {addButtonLabel}
        </button>
      </div>

      <div className="card">
        <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />

        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={searchPlaceholder}
          filterValue={categoriasConfig ? filtroConcepto : undefined}
          onFilterChange={categoriasConfig ? setFiltroConcepto : undefined}
          filterOptions={categoriasConfig ? categoriasSugeridas : []}
          filterPlaceholder={categoriasConfig?.filterPlaceholder}
        />

        {activeTab === 'pendientes' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{fechaColumnLabel}</th>
                  <th>Alumno</th>
                  <th>{conceptoColumnLabel}</th>
                  <th>P.V.P.</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map(pago => (
                  <tr key={pago.id} style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                    <td>{formatDate(pago.fecha)}</td>
                    <td><strong>{getNombreCompleto(alumnosMap[pago.alumnoId])}</strong></td>
                    <td>{pago.concepto}</td>
                    <td>
                      <div>{formatCurrency(pago.importe)}</div>
                      {pago.beneficio > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>
                          +{formatCurrency(pago.beneficio)} ganancia
                        </div>
                      )}
                    </td>
                    <td><StatusBadge status={pago.estado} /></td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.9em', marginRight: '8px' }}
                        onClick={() => handleMarcarPagado(pago.id)}
                      >
                        Cobrar
                      </button>
                      <button
                        className="btn-icon text-danger"
                        title="Eliminar registro"
                        onClick={() => handleDelete(pago.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {pendientes.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center">{emptyPendientesText}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pagados' && (
          <MonthlyAccordionList
            gruposMensuales={gruposMensualesPagados}
            tituloTipo={tituloAcordeon}
            tipoRegistroLabel={tipoRegistroLabel}
            emptyMessage={emptyPagadosText}
            onExportPdf={handleExportPdfMes}
            onExportTodoPdf={handleExportTodoPdf}
            renderTable={(items) => (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{fechaColumnLabel}</th>
                      <th>Alumno</th>
                      <th>{conceptoColumnLabel}</th>
                      <th>P.V.P.</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(pago => (
                      <tr key={pago.id}>
                        <td>{formatDate(pago.fecha)}</td>
                        <td><strong>{getNombreCompleto(alumnosMap[pago.alumnoId])}</strong></td>
                        <td>{pago.concepto}</td>
                        <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>
                          <div>+{formatCurrency(pago.importe)}</div>
                          {pago.beneficio > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 'normal' }}>
                              +{formatCurrency(pago.beneficio)} ganancia
                            </div>
                          )}
                        </td>
                        <td><StatusBadge status={pago.estado} /></td>
                        <td>
                          <button
                            className="btn-icon text-primary"
                            title="Revertir a Pendiente"
                            onClick={() => handleRevertirPago(pago.id)}
                            style={{ marginRight: '8px' }}
                          >
                            <RotateCcw size={18} />
                          </button>
                          <button
                            className="btn-icon text-danger"
                            title="Eliminar registro"
                            onClick={() => handleDelete(pago.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          />
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full-width">
            <label>Alumno *</label>
            <select name="alumnoId" value={formData.alumnoId} onChange={handleInputChange} required>
              <option value="">-- Seleccionar --</option>
              {alumnos?.filter(a => a.estado === 'activo').map(al => (
                <option key={al.id} value={al.id}>{getNombreCompleto(al)}</option>
              ))}
            </select>
          </div>
          <div className="form-group full-width">
            <label>{conceptoInputLabel}</label>
            <input
              type="text"
              name="concepto"
              value={formData.concepto}
              onChange={handleInputChange}
              required
              list={categoriasConfig ? `${tipo}-categorias-list` : undefined}
              placeholder={conceptoPlaceholder}
              autoComplete="off"
            />
            {categoriasConfig && (
              <datalist id={`${tipo}-categorias-list`}>
                {categoriasSugeridas.map((cat, idx) => (
                  <option key={idx} value={cat} />
                ))}
              </datalist>
            )}
          </div>
          <div className="form-group full-width">
            <label>{fechaInputLabel}</label>
            <input type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} required />
          </div>

          {/* Sección de Precio, Coste y Beneficio */}
          <div className="form-group full-width" style={{ marginTop: '0.25rem' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  PRECIO Y MARGEN COMERCIAL
                </span>
                {margenPct !== null && (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    Margen: {margenPct}% (+{formatCurrency(formData.beneficio)})
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px'
                }}
              >
                <div>
                  <label style={{ fontSize: '0.8rem' }}>P.V.P. (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="importe"
                    value={formData.importe}
                    onChange={(e) => handlePvpChange(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    Lo que paga el alumno
                  </small>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem' }}>Precio Coste (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="coste"
                    value={formData.coste}
                    onChange={(e) => handleCosteChange(e.target.value)}
                    placeholder="0.00"
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    Coste federativo / trámite
                  </small>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: '#22c55e' }}>Beneficio Limpio (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="beneficio"
                    value={formData.beneficio}
                    onChange={(e) => handleBeneficioChange(e.target.value)}
                    placeholder="0.00"
                    style={{ borderColor: 'rgba(34, 197, 94, 0.5)' }}
                  />
                  <small style={{ color: '#22c55e', fontSize: '0.7rem' }}>
                    Ganancia para el gimnasio
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Asignar y Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GestionCargosTemplate;
