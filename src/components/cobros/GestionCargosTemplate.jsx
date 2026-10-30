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
    importe: 0,
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

  const openModal = () => {
    setFormData({
      alumnoId: '',
      concepto: '',
      importe: 0,
      fecha: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'importe' || name === 'alumnoId' ? (value ? Number(value) : '') : value
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
        ...formData,
        concepto: conceptoTrimmed,
        tipo,
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
    const headers = ['Fecha', 'Alumno', conceptoColumnLabel, 'Importe'];
    const rows = grupo.items.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe)
    ]);
    await exportarMesAPdf({
      titulo: pdfTituloMes,
      mesNombre: grupo.mesNombre,
      headers,
      rows,
      totalImporte: grupo.totalImporte,
      totalRegistros: grupo.totalItems,
      nombreArchivo: `${pdfFilePrefix}_${grupo.key}.pdf`
    });
  };

  const handleExportTodoPdf = async () => {
    const headers = ['Fecha', 'Alumno', conceptoColumnLabel, 'Importe'];
    const rows = pagados.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe)
    ]);
    const total = pagados.reduce((sum, p) => sum + (Number(p.importe) || 0), 0);
    await exportarMesAPdf({
      titulo: pdfTituloCompleto,
      mesNombre: 'Todos los períodos',
      headers,
      rows,
      totalImporte: total,
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
                  <th>Importe</th>
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
                    <td>{formatCurrency(pago.importe)}</td>
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
                      <th>Importe</th>
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
                          +{formatCurrency(pago.importe)}
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
          <div className="form-group">
            <label>{fechaInputLabel}</label>
            <input type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Importe (€) *</label>
            <input type="number" step="0.01" min="0" name="importe" value={formData.importe} onChange={handleInputChange} required />
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

