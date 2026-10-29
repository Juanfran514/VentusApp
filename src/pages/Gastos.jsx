import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { gastoService } from '../services/gastoService';
import Modal from '../components/ui/Modal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { 
  Plus, Trash2, Edit2, RotateCcw, CheckCircle2, Clock, Calendar, Tag,
  FileText, Paperclip, Download, Eye, Upload, Search, FileCheck
} from 'lucide-react';
import { 
  getStoredCategorias, 
  mergeCategorias 
} from '../utils/categorias';
import { formatCurrency, formatDate } from '../utils/formatters';
import { procesarArchivoFactura, descargarFactura } from '../utils/facturaProcessor';
import '../pages/Alumnos.css';
import './Gastos.css';

const MESES = [
  { id: 1, name: 'Enero' }, { id: 2, name: 'Febrero' }, { id: 3, name: 'Marzo' },
  { id: 4, name: 'Abril' }, { id: 5, name: 'Mayo' }, { id: 6, name: 'Junio' },
  { id: 7, name: 'Julio' }, { id: 8, name: 'Agosto' }, { id: 9, name: 'Septiembre' },
  { id: 10, name: 'Octubre' }, { id: 11, name: 'Noviembre' }, { id: 12, name: 'Diciembre' }
];

const Gastos = () => {
  const currentDate = new Date();
  const currentMes = currentDate.getMonth() + 1;
  const currentAño = currentDate.getFullYear();

  // Pestaña activa: 'fijos' | 'variables'
  const [activeTab, setActiveTab] = useState('fijos');

  // Control de período para Gastos Fijos
  const [selectedMonth, setSelectedMonth] = useState(currentMes);
  const [selectedYear, setSelectedYear] = useState(currentAño);

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Modales
  const [isModalVariableOpen, setIsModalVariableOpen] = useState(false);
  const [isModalNuevoFijoOpen, setIsModalNuevoFijoOpen] = useState(false);
  const [isModalModificarFijoMesOpen, setIsModalModificarFijoMesOpen] = useState(false);
  const [isModalEditarPlantillaFijoOpen, setIsModalEditarPlantillaFijoOpen] = useState(false);

  // Formulario Gasto Variable
  const [formDataVariable, setFormDataVariable] = useState({
    id: null,
    concepto: '',
    categoria: '',
    importe: '',
    fecha: currentDate.toISOString().split('T')[0],
    factura: null
  });

  // Formulario Nuevo Gasto Fijo Recurrente
  const [formDataNuevoFijo, setFormDataNuevoFijo] = useState({
    concepto: '',
    categoria: '',
    importe: '',
    diaMes: 1
  });

  // Formulario Modificar Gasto Fijo este mes
  const [fijoMesEditando, setFijoMesEditando] = useState(null);
  const [importeFijoMes, setImporteFijoMes] = useState('');
  const [fechaFijoMes, setFechaFijoMes] = useState(currentDate.toISOString().split('T')[0]);
  const [facturaFijoMes, setFacturaFijoMes] = useState(null);

  // Estados para Archivo y Visualización de Facturas
  const [isProcessingFactura, setIsProcessingFactura] = useState(false);
  const [isModalVerFacturaOpen, setIsModalVerFacturaOpen] = useState(false);
  const [gastoVisualizando, setGastoVisualizando] = useState(null);
  const [facturaVisualizando, setFacturaVisualizando] = useState(null);
  const [filtroAnoFacturas, setFiltroAnoFacturas] = useState(currentAño);
  const [filtroPeriodoFacturas, setFiltroPeriodoFacturas] = useState('todos'); // 'todos' | '1t' | '2t' | '3t' | '4t'
  const [busquedaFacturas, setBusquedaFacturas] = useState('');

  // Formulario Editar Plantilla Gasto Fijo base
  const [fijoPlantillaEditando, setFijoPlantillaEditando] = useState({
    id: null,
    concepto: '',
    categoria: '',
    importe: '',
    diaMes: 1
  });

  // Consultas reactivas de Dexie
  const gastos = useLiveQuery(() => gastoService.getAll(), []) || [];
  const gastosFijos = useLiveQuery(() => gastoService.getAllFijos(), []) || [];

  // Categorías sugeridas para Gastos Variables (únicamente a partir de gastos creados)
  const categoriasSugeridasVariables = useMemo(() => {
    const stored = getStoredCategorias('gastos_variables', []);
    const fromGastos = (gastos || []).filter(g => g.tipo !== 'fijo');
    return mergeCategorias(stored, fromGastos, 'categoria');
  }, [gastos]);

  // Categorías sugeridas para Gastos Fijos (únicamente a partir de gastos fijos creados)
  const categoriasSugeridasFijos = useMemo(() => {
    const stored = getStoredCategorias('gastos_fijos', []);
    return mergeCategorias(stored, gastosFijos, 'categoria');
  }, [gastosFijos]);

  // Conceptos habituales de gastos variables para recuperación rápida
  const conceptosVariablesHabituales = useMemo(() => {
    return gastoService.getConceptosVariablesHabituales(gastos);
  }, [gastos]);

  // Estado calculado de gastos fijos del mes seleccionado
  const estadoFijosMes = useMemo(() => {
    return gastoService.calcularEstadoFijosMes(gastosFijos, gastos, selectedMonth, selectedYear);
  }, [gastosFijos, gastos, selectedMonth, selectedYear]);

  // Filtrado de gastos fijos según búsqueda y categoría
  const itemsFijosFiltrados = useMemo(() => {
    return estadoFijosMes.items.filter(item => {
      const matchBusqueda = !busqueda || item.concepto.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !filtroCategoria || item.categoria === filtroCategoria;
      return matchBusqueda && matchCategoria;
    });
  }, [estadoFijosMes.items, busqueda, filtroCategoria]);

  // Filtrado de gastos variables
  const gastosVariablesFiltrados = useMemo(() => {
    return (gastos || [])
      .filter(g => g.tipo !== 'fijo')
      .filter(g => {
        const matchBusqueda = !busqueda || (g.concepto || '').toLowerCase().includes(busqueda.toLowerCase());
        const matchCategoria = !filtroCategoria || g.categoria === filtroCategoria;
        return matchBusqueda && matchCategoria;
      });
  }, [gastos, busqueda, filtroCategoria]);

  // Gastos con factura adjunta y filtrado para la pestaña de Archivo
  const todosGastosConFactura = useMemo(() => {
    return (gastos || []).filter(g => g.factura && g.factura.archivo);
  }, [gastos]);

  const facturasFiltradas = useMemo(() => {
    return todosGastosConFactura.filter(g => {
      const gAño = g.año || (g.fecha ? new Date(g.fecha).getFullYear() : null);
      const gMes = g.mes || (g.fecha ? new Date(g.fecha).getMonth() + 1 : null);

      if (gAño && Number(gAño) !== Number(filtroAnoFacturas)) return false;

      if (filtroPeriodoFacturas === '1t' && (gMes < 1 || gMes > 3)) return false;
      if (filtroPeriodoFacturas === '2t' && (gMes < 4 || gMes > 6)) return false;
      if (filtroPeriodoFacturas === '3t' && (gMes < 7 || gMes > 9)) return false;
      if (filtroPeriodoFacturas === '4t' && (gMes < 10 || gMes > 12)) return false;

      if (busquedaFacturas) {
        const term = busquedaFacturas.toLowerCase().trim();
        const conceptoMatch = (g.concepto || '').toLowerCase().includes(term);
        const catMatch = (g.categoria || '').toLowerCase().includes(term);
        const fileMatch = (g.factura?.nombre || '').toLowerCase().includes(term);
        if (!conceptoMatch && !catMatch && !fileMatch) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [todosGastosConFactura, filtroAnoFacturas, filtroPeriodoFacturas, busquedaFacturas]);

  const totalImporteFacturas = useMemo(() => {
    return facturasFiltradas.reduce((sum, g) => sum + (Number(g.importe) || 0), 0);
  }, [facturasFiltradas]);

  // Manejador genérico de archivos de factura
  const handleFacturaChange = async (e, setTarget) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFactura(true);
      const facturaObj = await procesarArchivoFactura(file);
      setTarget(facturaObj);
    } catch (err) {
      console.error('Error procesando factura:', err);
      alert(err.message || 'Error al procesar el archivo de la factura.');
    } finally {
      setIsProcessingFactura(false);
      e.target.value = '';
    }
  };

  const handleVerFactura = (gasto) => {
    if (!gasto?.factura) return;
    setGastoVisualizando(gasto);
    setFacturaVisualizando(gasto.factura);
    setIsModalVerFacturaOpen(true);
  };

  // =========================================================================
  // GESTIÓN DE GASTOS FIJOS
  // =========================================================================

  const handleToggleTiqueFijo = async (item) => {
    if (item.pagado) {
      if (window.confirm(`¿Desmarcar "${item.concepto}" de ${MESES.find(m => m.id === selectedMonth)?.name}? Volverá a aparecer como pendiente.`)) {
        await gastoService.destildarGastoFijo({
          gastoFijoId: item.id,
          mes: selectedMonth,
          año: selectedYear
        });
      }
    } else {
      await gastoService.tildarGastoFijo({
        gastoFijo: item.gastoFijo,
        mes: selectedMonth,
        año: selectedYear,
        importe: item.importe,
        fecha: new Date().toISOString()
      });
    }
  };

  const handleOpenModificarFijoMes = (item) => {
    setFijoMesEditando(item);
    setImporteFijoMes(item.importe);
    setFechaFijoMes(item.fechaPago ? item.fechaPago.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFacturaFijoMes(item.factura || null);
    setIsModalModificarFijoMesOpen(true);
  };

  const handleSubmitModificarFijoMes = async (e) => {
    e.preventDefault();
    if (!fijoMesEditando) return;

    try {
      await gastoService.modificarGastoFijoMes({
        gastoFijo: fijoMesEditando.gastoFijo,
        mes: selectedMonth,
        año: selectedYear,
        nuevoImporte: Number(importeFijoMes) || 0,
        fecha: fechaFijoMes,
        factura: facturaFijoMes
      });
      setIsModalModificarFijoMesOpen(false);
      setFijoMesEditando(null);
      setFacturaFijoMes(null);
    } catch (err) {
      console.error('Error al modificar gasto fijo:', err);
      alert('Error al guardar la modificación.');
    }
  };

  const handleOpenEditarPlantillaFijo = (gf) => {
    setFijoPlantillaEditando({
      id: gf.id,
      concepto: gf.concepto,
      categoria: gf.categoria,
      importe: gf.importe,
      diaMes: gf.diaMes || 1
    });
    setIsModalEditarPlantillaFijoOpen(true);
  };

  const handleSubmitEditarPlantillaFijo = async (e) => {
    e.preventDefault();
    try {
      await gastoService.updateGastoFijo(fijoPlantillaEditando.id, {
        concepto: fijoPlantillaEditando.concepto,
        categoria: fijoPlantillaEditando.categoria,
        importe: Number(fijoPlantillaEditando.importe) || 0,
        diaMes: Number(fijoPlantillaEditando.diaMes) || 1
      });
      setIsModalEditarPlantillaFijoOpen(false);
    } catch (err) {
      console.error('Error al editar plantilla de gasto fijo:', err);
      alert('Error al actualizar la plantilla.');
    }
  };

  const handleSubmitNuevoFijo = async (e) => {
    e.preventDefault();
    try {
      await gastoService.createGastoFijo({
        concepto: formDataNuevoFijo.concepto,
        categoria: formDataNuevoFijo.categoria,
        importe: Number(formDataNuevoFijo.importe) || 0,
        diaMes: Number(formDataNuevoFijo.diaMes) || 1
      });
      setIsModalNuevoFijoOpen(false);
      setFormDataNuevoFijo({ concepto: '', categoria: '', importe: '', diaMes: 1 });
    } catch (err) {
      console.error('Error al crear gasto fijo:', err);
      alert('Error al registrar el gasto fijo.');
    }
  };

  const handleDeleteGastoFijo = async (id, concepto) => {
    if (window.confirm(`¿Eliminar la plantilla de gasto fijo "${concepto}"? Ya no aparecerá en los meses venideros.`)) {
      await gastoService.deleteGastoFijo(id);
    }
  };

  // =========================================================================
  // GESTIÓN DE GASTOS VARIABLES & RECUPERACIÓN
  // =========================================================================

  const handleOpenNuevoVariable = () => {
    setFormDataVariable({
      id: null,
      concepto: '',
      categoria: '',
      importe: '',
      fecha: new Date().toISOString().split('T')[0],
      factura: null
    });
    setIsModalVariableOpen(true);
  };

  const handleReutilizarGasto = (gasto) => {
    setFormDataVariable({
      id: null,
      concepto: gasto.concepto,
      categoria: gasto.categoria,
      importe: gasto.importe,
      fecha: new Date().toISOString().split('T')[0],
      factura: null
    });
    setIsModalVariableOpen(true);
  };

  const handleSeleccionarRecuperacion = (item) => {
    setFormDataVariable(prev => ({
      ...prev,
      concepto: item.concepto,
      categoria: item.categoria || prev.categoria,
      importe: item.importe || prev.importe
    }));
  };

  const handleEditVariable = (g) => {
    setFormDataVariable({
      id: g.id,
      concepto: g.concepto,
      categoria: g.categoria,
      importe: g.importe,
      fecha: g.fecha ? g.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      factura: g.factura || null
    });
    setIsModalVariableOpen(true);
  };

  const handleSubmitVariable = async (e) => {
    e.preventDefault();
    try {
      if (formDataVariable.id) {
        await gastoService.update(formDataVariable.id, {
          concepto: formDataVariable.concepto,
          categoria: formDataVariable.categoria,
          importe: Number(formDataVariable.importe) || 0,
          fecha: formDataVariable.fecha,
          tipo: 'variable',
          factura: formDataVariable.factura
        });
      } else {
        await gastoService.create({
          concepto: formDataVariable.concepto,
          categoria: formDataVariable.categoria,
          importe: Number(formDataVariable.importe) || 0,
          fecha: formDataVariable.fecha,
          tipo: 'variable',
          factura: formDataVariable.factura
        });
      }
      setIsModalVariableOpen(false);
    } catch (err) {
      console.error('Error al guardar gasto variable:', err);
      alert('Error al guardar el gasto variable.');
    }
  };

  const handleDeleteVariable = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este gasto del historial?')) {
      await gastoService.delete(id);
    }
  };

  const mesSeleccionadoNombre = MESES.find(m => m.id === selectedMonth)?.name || '';
  const añosList = Array.from(new Array(5), (_, i) => currentAño - 2 + i);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Gestión de Gastos</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Control de gastos fijos mensuales y registro de gastos variables
          </p>
        </div>
        <div>
          {activeTab === 'fijos' ? (
            <button className="btn-primary flex-center" onClick={() => setIsModalNuevoFijoOpen(true)}>
              <Plus size={20} style={{ marginRight: '8px' }} />
              Nuevo Gasto Fijo
            </button>
          ) : activeTab === 'variables' ? (
            <button className="btn-primary flex-center" onClick={handleOpenNuevoVariable}>
              <Plus size={20} style={{ marginRight: '8px' }} />
              Añadir Gasto Variable
            </button>
          ) : (
            <button className="btn-primary flex-center" onClick={handleOpenNuevoVariable}>
              <Plus size={20} style={{ marginRight: '8px' }} />
              Añadir Gasto con Factura
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {/* Pestañas de división entre Fijos, Variables y Facturas */}
        <div className="gastos-tabs">
          <button 
            type="button"
            className={`gastos-tab-btn ${activeTab === 'fijos' ? 'active' : ''}`}
            onClick={() => { setActiveTab('fijos'); setBusqueda(''); setFiltroCategoria(''); }}
          >
            <Clock size={18} />
            Gastos Fijos (Mensuales)
          </button>
          <button 
            type="button"
            className={`gastos-tab-btn ${activeTab === 'variables' ? 'active' : ''}`}
            onClick={() => { setActiveTab('variables'); setBusqueda(''); setFiltroCategoria(''); }}
          >
            <Tag size={18} />
            Gastos Variables e Historial
          </button>
          <button 
            type="button"
            className={`gastos-tab-btn ${activeTab === 'facturas' ? 'active' : ''}`}
            onClick={() => { setActiveTab('facturas'); setBusqueda(''); setFiltroCategoria(''); }}
          >
            <FileText size={18} />
            <span>Archivo de Facturas</span>
            {todosGastosConFactura.length > 0 && (
              <span className="badge" style={{ background: 'var(--primary-color)', color: '#fff', fontSize: '0.75rem', padding: '2px 7px', borderRadius: '10px' }}>
                {todosGastosConFactura.length}
              </span>
            )}
          </button>
        </div>

        {/* =========================================================================
            PESTAÑA 1: GASTOS FIJOS
        ========================================================================= */}
        {activeTab === 'fijos' && (
          <div>
            {/* Barra selectora de mes y año */}
            <div className="periodo-selector-bar">
              <div className="periodo-controles">
                <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={18} style={{ color: 'var(--primary-color)' }} />
                  Período a consultar:
                </span>
                <select 
                  className="periodo-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {MESES.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <select 
                  className="periodo-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {añosList.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                {selectedMonth === currentMes && selectedYear === currentAño && (
                  <span className="badge badge-pagado" style={{ marginLeft: '4px' }}>
                    Mes en curso
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Cada nuevo mes se destildan automáticamente para su control
              </div>
            </div>

            {/* Tarjetas de estadísticas del mes */}
            <div className="gastos-stats-grid">
              <div className="gastos-stat-card pagados">
                <div className="gastos-stat-label">
                  <span>Gastos Tildados (Pagados)</span>
                  <span className="gastos-stat-badge badge-pagado">
                    {estadoFijosMes.countPagados} pagados
                  </span>
                </div>
                <div className="gastos-stat-value" style={{ color: 'var(--primary-color)' }}>
                  -{formatCurrency(estadoFijosMes.totalPagado)}
                </div>
              </div>

              <div className="gastos-stat-card pendientes">
                <div className="gastos-stat-label">
                  <span>Gastos Fijos Pendientes</span>
                  <span className="gastos-stat-badge badge-pendiente">
                    {estadoFijosMes.countPendientes} pendientes
                  </span>
                </div>
                <div className="gastos-stat-value" style={{ color: '#f59e0b' }}>
                  -{formatCurrency(estadoFijosMes.totalPendiente)}
                </div>
              </div>

              <div className="gastos-stat-card total">
                <div className="gastos-stat-label">
                  <span>Total Fijos Previstos ({mesSeleccionadoNombre})</span>
                </div>
                <div className="gastos-stat-value" style={{ color: 'var(--text-light)' }}>
                  -{formatCurrency(estadoFijosMes.totalPagado + estadoFijosMes.totalPendiente)}
                </div>
              </div>
            </div>

            {/* Filtros de búsqueda */}
            <SearchFilterBar
              search={busqueda}
              onSearchChange={setBusqueda}
              searchPlaceholder="Buscar gasto fijo por concepto..."
              filterValue={filtroCategoria}
              onFilterChange={setFiltroCategoria}
              filterOptions={categoriasSugeridasFijos}
              filterPlaceholder="Todas las categorías de fijos"
            />

            {/* Tabla de Gastos Fijos */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '160px' }}>Estado / Control</th>
                    <th>Concepto</th>
                    <th>Categoría</th>
                    <th>Importe ({mesSeleccionadoNombre})</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsFijosFiltrados.map(item => (
                    <tr key={item.id} style={{ backgroundColor: item.pagado ? 'rgba(34, 197, 94, 0.05)' : 'inherit' }}>
                      <td>
                        <button 
                          type="button"
                          className={`btn-toggle-tique ${item.pagado ? 'pagado' : 'pendiente'}`}
                          onClick={() => handleToggleTiqueFijo(item)}
                          title={item.pagado ? 'Haga clic para desmarcar (destildar)' : 'Haga clic para marcar como pagado (tildar)'}
                        >
                          {item.pagado ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>Pagado</span>
                            </>
                          ) : (
                            <>
                              <Clock size={16} />
                              <span>Pendiente</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600 }}>{item.concepto}</span>
                          {item.factura && (
                            <button
                              type="button"
                              className="btn-factura-badge"
                              onClick={() => handleVerFactura(item)}
                              title="Ver factura adjunta"
                            >
                              <Paperclip size={12} />
                              <span>{item.factura.tipo === 'pdf' ? 'PDF' : 'Foto'}</span>
                            </button>
                          )}
                        </div>
                        {item.gastoFijo?.diaMes && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Día {item.gastoFijo.diaMes} de cada mes
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-categoria">
                          {item.categoria}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: item.pagado ? 'var(--primary-color)' : '#f59e0b' }}>
                            -{formatCurrency(item.importe)}
                          </span>
                          <button 
                            type="button" 
                            className="btn-link-edit" 
                            onClick={() => handleOpenModificarFijoMes(item)}
                            title="Modificar importe de este mes"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                        {item.pagado && item.fechaPago && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                            Abonado: {formatDate(item.fechaPago)}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-icon" 
                          title="Modificar importe o fecha de este mes"
                          onClick={() => handleOpenModificarFijoMes(item)}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          className="btn-icon text-muted" 
                          title="Editar plantilla fija base"
                          onClick={() => handleOpenEditarPlantillaFijo(item.gastoFijo)}
                        >
                          <Tag size={18} />
                        </button>
                        <button 
                          className="btn-icon text-danger" 
                          title="Eliminar plantilla de gasto fijo"
                          onClick={() => handleDeleteGastoFijo(item.id, item.concepto)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {itemsFijosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center" style={{ padding: '2rem' }}>
                        {gastosFijos.length === 0 ? (
                          <div>
                            <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)' }}>
                              Aún no has configurado ningún gasto fijo recurrente (ej: Alquiler, Luz, Internet, Seguro, Asesoría).
                            </p>
                            <button className="btn-primary" onClick={() => setIsModalNuevoFijoOpen(true)}>
                              <Plus size={16} style={{ marginRight: '6px' }} />
                              Crear primer Gasto Fijo
                            </button>
                          </div>
                        ) : (
                          'No hay gastos fijos que coincidan con la búsqueda.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 2: GASTOS VARIABLES & HISTORIAL
        ========================================================================= */}
        {activeTab === 'variables' && (
          <div>
            {/* Barra de búsqueda y filtro */}
            <SearchFilterBar
              search={busqueda}
              onSearchChange={setBusqueda}
              searchPlaceholder="Buscar por concepto de gasto variable..."
              filterValue={filtroCategoria}
              onFilterChange={setFiltroCategoria}
              filterOptions={categoriasSugeridasVariables}
              filterPlaceholder="Todas las categorías de variables"
            />

            {/* Tabla de Gastos Variables */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Categoría</th>
                    <th>Factura</th>
                    <th>Importe</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosVariablesFiltrados.map(gasto => (
                    <tr key={gasto.id}>
                      <td>{formatDate(gasto.fecha)}</td>
                      <td><strong>{gasto.concepto}</strong></td>
                      <td>
                        <span className="badge badge-categoria">
                          {gasto.categoria}
                        </span>
                      </td>
                      <td>
                        {gasto.factura ? (
                          <button
                            type="button"
                            className="btn-factura-badge"
                            onClick={() => handleVerFactura(gasto)}
                            title="Ver factura adjunta"
                          >
                            <Paperclip size={12} />
                            <span>{gasto.factura.tipo === 'pdf' ? 'PDF' : 'Foto'}</span>
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>
                        -{formatCurrency(gasto.importe)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {/* Botón Reutilizar / Recuperar gasto en el mes actual */}
                        <button 
                          className="btn-reutilizar" 
                          title="Recuperar y registrar de nuevo en el mes actual"
                          onClick={() => handleReutilizarGasto(gasto)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          <RotateCcw size={14} />
                          <span>Reutilizar</span>
                        </button>
                        <button 
                          className="btn-icon" 
                          title="Editar gasto"
                          onClick={() => handleEditVariable(gasto)}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          className="btn-icon text-danger" 
                          title="Eliminar gasto"
                          onClick={() => handleDeleteVariable(gasto.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {gastosVariablesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center" style={{ padding: '2rem' }}>
                        No hay gastos variables registrados que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 3: ARCHIVO DE FACTURAS Y TICKETS
        ========================================================================= */}
        {activeTab === 'facturas' && (
          <div>
            {/* Barra de control de período y filtros */}
            <div className="periodo-selector-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Calendar size={18} style={{ color: 'var(--primary-color)' }} />
                <span style={{ fontWeight: 600 }}>Año:</span>
                <select 
                  value={filtroAnoFacturas} 
                  onChange={(e) => setFiltroAnoFacturas(Number(e.target.value))}
                  style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
                >
                  {añosList.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'todos', label: 'Todo el año' },
                    { id: '1t', label: '1T (Ene-Mar)' },
                    { id: '2t', label: '2T (Abr-Jun)' },
                    { id: '3t', label: '3T (Jul-Sep)' },
                    { id: '4t', label: '4T (Oct-Dic)' }
                  ].map(tab => (
                    <button
                      type="button"
                      key={tab.id}
                      className={`btn-secondary ${filtroPeriodoFacturas === tab.id ? 'btn-primary' : ''}`}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                      onClick={() => setFiltroPeriodoFacturas(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar en facturas..."
                  value={busquedaFacturas}
                  onChange={(e) => setBusquedaFacturas(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 32px',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-dark)',
                    color: 'var(--text-light)'
                  }}
                />
              </div>
            </div>

            {/* KPI Cards de Facturación */}
            <div className="facturas-kpi-grid">
              <div className="facturas-kpi-card">
                <span className="facturas-kpi-title">Facturas y Tickets Justificados</span>
                <span className="facturas-kpi-value" style={{ color: 'var(--primary-color)' }}>
                  {facturasFiltradas.length}
                </span>
              </div>
              <div className="facturas-kpi-card">
                <span className="facturas-kpi-title">Importe Total Justificado</span>
                <span className="facturas-kpi-value" style={{ color: 'var(--danger-color)' }}>
                  -{formatCurrency(totalImporteFacturas)}
                </span>
              </div>
            </div>

            {/* Tabla de Facturas */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Categoría</th>
                    <th>Tipo</th>
                    <th>Importe</th>
                    <th>Documento</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {facturasFiltradas.map(g => (
                    <tr key={g.id}>
                      <td>{formatDate(g.fecha)}</td>
                      <td><strong>{g.concepto}</strong></td>
                      <td>
                        <span className="badge badge-categoria">{g.categoria}</span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-panel)', color: 'var(--text-light)', fontSize: '0.75rem' }}>
                          {g.tipo === 'fijo' ? 'Fijo' : 'Variable'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>
                        -{formatCurrency(g.importe)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {g.factura.tipo === 'pdf' ? (
                            <FileText size={18} style={{ color: 'var(--primary-color)' }} />
                          ) : (
                            <img src={g.factura.archivo} alt="" style={{ width: '24px', height: '24px', borderRadius: '3px', objectFit: 'cover' }} />
                          )}
                          <span style={{ fontSize: '0.85rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.factura.nombre}>
                            {g.factura.nombre || 'Factura'}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '6px' }}
                          onClick={() => handleVerFactura(g)}
                        >
                          <Eye size={14} style={{ marginRight: '4px' }} /> Ver
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Descargar factura"
                          onClick={() => descargarFactura(g.factura, g.concepto)}
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {facturasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center" style={{ padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                        <FileCheck size={42} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                          No hay facturas registradas en este período.
                        </p>
                        <p style={{ fontSize: '0.85rem' }}>
                          Puedes adjuntar facturas en formato PDF o foto cada vez que añadas o edites un gasto.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: AÑADIR / EDITAR GASTO VARIABLE (con autocompletado y recuperación)
      ========================================================================= */}
      <Modal 
        isOpen={isModalVariableOpen} 
        onClose={() => setIsModalVariableOpen(false)} 
        title={formDataVariable.id ? "Editar Gasto Variable" : "Añadir Gasto Variable"}
      >
        <form onSubmit={handleSubmitVariable} className="form-grid">
          {/* Caja para recuperar un gasto variable anterior si no se está editando */}
          {!formDataVariable.id && conceptosVariablesHabituales.length > 0 && (
            <div className="full-width recuperar-selector-box">
              <label>
                <RotateCcw size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Recuperar de un gasto anterior frecuente:
              </label>
              <div className="recuperar-chips-container">
                {conceptosVariablesHabituales.slice(0, 8).map((hab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="recuperar-chip"
                    onClick={() => handleSeleccionarRecuperacion(hab)}
                  >
                    <span>{hab.concepto}</span>
                    <span style={{ color: 'var(--text-muted)' }}>({formatCurrency(hab.importe)})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group full-width">
            <label>Concepto / Motivo *</label>
            <input 
              type="text" 
              name="concepto" 
              value={formDataVariable.concepto} 
              onChange={(e) => setFormDataVariable(prev => ({ ...prev, concepto: e.target.value }))} 
              required 
              list="conceptos-variables-list"
              placeholder="Ej: Compra de tatami, Botiquín, Reparación..." 
              autoComplete="off"
            />
            <datalist id="conceptos-variables-list">
              {conceptosVariablesHabituales.map((c, idx) => (
                <option key={idx} value={c.concepto} />
              ))}
            </datalist>
          </div>
          
          <div className="form-group full-width">
            <label>Categoría *</label>
            <input 
              type="text" 
              name="categoria" 
              value={formDataVariable.categoria} 
              onChange={(e) => setFormDataVariable(prev => ({ ...prev, categoria: e.target.value }))} 
              required 
              list="categorias-variables-list"
              placeholder="Escribe o selecciona una categoría"
              autoComplete="off"
            />
            <datalist id="categorias-variables-list">
              {categoriasSugeridasVariables.map((cat, idx) => (
                <option key={idx} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Fecha *</label>
            <input 
              type="date" 
              name="fecha" 
              value={formDataVariable.fecha} 
              onChange={(e) => setFormDataVariable(prev => ({ ...prev, fecha: e.target.value }))} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Importe (€) *</label>
            <input 
              type="number" 
              step="0.01" 
              min="0.01" 
              name="importe" 
              value={formDataVariable.importe} 
              onChange={(e) => setFormDataVariable(prev => ({ ...prev, importe: e.target.value ? Number(e.target.value) : '' }))} 
              required 
              placeholder="0.00"
            />
          </div>

          {/* ADJUNTAR FACTURA / TICKET */}
          <div className="form-group full-width">
            <label>Factura / Ticket Justificante (Opcional)</label>
            {formDataVariable.factura ? (
              <div className="factura-adjunta-card">
                <div className="factura-file-info">
                  {formDataVariable.factura.tipo === 'pdf' ? (
                    <FileText size={24} style={{ color: 'var(--primary-color)' }} />
                  ) : (
                    <img 
                      src={formDataVariable.factura.archivo} 
                      alt="" 
                      style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} 
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {formDataVariable.factura.nombre || 'Factura adjunta'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formDataVariable.factura.tipo?.toUpperCase()}
                      {formDataVariable.factura.tamano ? ` • ${(formDataVariable.factura.tamano / 1024).toFixed(1)} KB` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                    onClick={() => handleVerFactura({ concepto: formDataVariable.concepto, importe: formDataVariable.importe, factura: formDataVariable.factura })}
                  >
                    <Eye size={14} style={{ marginRight: '4px' }} /> Ver
                  </button>
                  <button
                    type="button"
                    className="btn-icon text-danger"
                    onClick={() => setFormDataVariable(prev => ({ ...prev, factura: null }))}
                    title="Eliminar factura"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="factura-upload-box">
                <label className="btn-secondary flex-center" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
                  <Upload size={16} style={{ marginRight: '6px' }} />
                  {isProcessingFactura ? 'Procesando archivo...' : 'Adjuntar PDF o Foto de Factura'}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => handleFacturaChange(e, (fac) => setFormDataVariable(prev => ({ ...prev, factura: fac })))}
                    style={{ display: 'none' }}
                    disabled={isProcessingFactura}
                  />
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Formatos admitidos: PDF o Imágenes (JPG, PNG). Las fotos se optimizan automáticamente para no saturar memoria.
                </span>
              </div>
            )}
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalVariableOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">
              {formDataVariable.id ? 'Guardar Cambios' : 'Guardar Gasto Variable'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: NUEVO GASTO FIJO RECURRENTE
      ========================================================================= */}
      <Modal 
        isOpen={isModalNuevoFijoOpen} 
        onClose={() => setIsModalNuevoFijoOpen(false)} 
        title="Crear Nuevo Gasto Fijo Recurrente"
      >
        <form onSubmit={handleSubmitNuevoFijo} className="form-grid">
          <div className="full-width" style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Los gastos fijos se generarán automáticamente cada mes sin tildar para que puedas llevar el control de pago mensual.
          </div>

          <div className="form-group full-width">
            <label>Concepto del Gasto Fijo *</label>
            <input 
              type="text" 
              value={formDataNuevoFijo.concepto} 
              onChange={(e) => setFormDataNuevoFijo(prev => ({ ...prev, concepto: e.target.value }))} 
              required 
              placeholder="Ej: Alquiler del Local, Seguro RC, Cuota Asesoría, Suministro Luz..." 
            />
          </div>

          <div className="form-group full-width">
            <label>Categoría *</label>
            <input 
              type="text" 
              value={formDataNuevoFijo.categoria} 
              onChange={(e) => setFormDataNuevoFijo(prev => ({ ...prev, categoria: e.target.value }))} 
              required 
              list="categorias-fijos-list"
              placeholder="Escribe o selecciona categoría (ej: Alquiler, Suministros, Seguros...)"
              autoComplete="off"
            />
            <datalist id="categorias-fijos-list">
              {categoriasSugeridasFijos.map((cat, idx) => (
                <option key={idx} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Importe Habitual (€) *</label>
            <input 
              type="number" 
              step="0.01" 
              min="0.01" 
              value={formDataNuevoFijo.importe} 
              onChange={(e) => setFormDataNuevoFijo(prev => ({ ...prev, importe: e.target.value ? Number(e.target.value) : '' }))} 
              required 
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label>Día Habitual de Pago</label>
            <input 
              type="number" 
              min="1" 
              max="31" 
              value={formDataNuevoFijo.diaMes} 
              onChange={(e) => setFormDataNuevoFijo(prev => ({ ...prev, diaMes: Number(e.target.value) || 1 }))} 
              placeholder="1"
            />
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalNuevoFijoOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar Gasto Fijo</button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: MODIFICAR GASTO FIJO ESTE MES (cambiar importe o fecha del mes)
      ========================================================================= */}
      <Modal 
        isOpen={isModalModificarFijoMesOpen} 
        onClose={() => setIsModalModificarFijoMesOpen(false)} 
        title={`Modificar Importe en ${mesSeleccionadoNombre} ${selectedYear}`}
      >
        {fijoMesEditando && (
          <form onSubmit={handleSubmitModificarFijoMes} className="form-grid">
            <div className="full-width modal-info-box">
              <div style={{ fontWeight: 600 }}>{fijoMesEditando.concepto}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Categoría: {fijoMesEditando.categoria} | Importe habitual: {formatCurrency(fijoMesEditando.gastoFijo?.importe || 0)}
              </div>
            </div>

            <div className="form-group full-width">
              <label>Importe para {mesSeleccionadoNombre} (€) *</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01" 
                value={importeFijoMes} 
                onChange={(e) => setImporteFijoMes(e.target.value ? Number(e.target.value) : '')} 
                required 
                placeholder="0.00"
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Si este mes el recibo varía (ej. factura de la luz), ajusta aquí el importe específico.
              </span>
            </div>

            <div className="form-group full-width">
              <label>Fecha de Pago *</label>
              <input 
                type="date" 
                value={fechaFijoMes} 
                onChange={(e) => setFechaFijoMes(e.target.value)} 
                required 
              />
            </div>

            {/* ADJUNTAR FACTURA DE ESTE MES */}
            <div className="form-group full-width">
              <label>Factura de este mes (Opcional)</label>
              {facturaFijoMes ? (
                <div className="factura-adjunta-card">
                  <div className="factura-file-info">
                    {facturaFijoMes.tipo === 'pdf' ? (
                      <FileText size={24} style={{ color: 'var(--primary-color)' }} />
                    ) : (
                      <img 
                        src={facturaFijoMes.archivo} 
                        alt="" 
                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} 
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {facturaFijoMes.nombre || 'Factura adjunta'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {facturaFijoMes.tipo?.toUpperCase()}
                        {facturaFijoMes.tamano ? ` • ${(facturaFijoMes.tamano / 1024).toFixed(1)} KB` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                      onClick={() => handleVerFactura({ concepto: fijoMesEditando.concepto, importe: importeFijoMes, factura: facturaFijoMes })}
                    >
                      <Eye size={14} style={{ marginRight: '4px' }} /> Ver
                    </button>
                    <button
                      type="button"
                      className="btn-icon text-danger"
                      onClick={() => setFacturaFijoMes(null)}
                      title="Eliminar factura"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="factura-upload-box">
                  <label className="btn-secondary flex-center" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
                    <Upload size={16} style={{ marginRight: '6px' }} />
                    {isProcessingFactura ? 'Procesando archivo...' : 'Adjuntar Factura de este mes (PDF o Foto)'}
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => handleFacturaChange(e, (fac) => setFacturaFijoMes(fac))}
                      style={{ display: 'none' }}
                      disabled={isProcessingFactura}
                    />
                  </label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Ideal para recibos que varían cada mes (luz, agua, teléfono, suministros).
                  </span>
                </div>
              )}
            </div>

            <div className="form-actions full-width">
              <button type="button" className="btn-secondary" onClick={() => setIsModalModificarFijoMesOpen(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar y Marcar Pagado</button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: EDITAR PLANTILLA DE GASTO FIJO BASE
      ========================================================================= */}
      <Modal 
        isOpen={isModalEditarPlantillaFijoOpen} 
        onClose={() => setIsModalEditarPlantillaFijoOpen(false)} 
        title="Editar Plantilla de Gasto Fijo"
      >
        <form onSubmit={handleSubmitEditarPlantillaFijo} className="form-grid">
          <div className="form-group full-width">
            <label>Concepto *</label>
            <input 
              type="text" 
              value={fijoPlantillaEditando.concepto} 
              onChange={(e) => setFijoPlantillaEditando(prev => ({ ...prev, concepto: e.target.value }))} 
              required 
            />
          </div>

          <div className="form-group full-width">
            <label>Categoría *</label>
            <input 
              type="text" 
              value={fijoPlantillaEditando.categoria} 
              onChange={(e) => setFijoPlantillaEditando(prev => ({ ...prev, categoria: e.target.value }))} 
              required 
              list="categorias-fijos-edit-list"
            />
            <datalist id="categorias-fijos-edit-list">
              {categoriasSugeridasFijos.map((cat, idx) => (
                <option key={idx} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Importe Habitual (€) *</label>
            <input 
              type="number" 
              step="0.01" 
              min="0.01" 
              value={fijoPlantillaEditando.importe} 
              onChange={(e) => setFijoPlantillaEditando(prev => ({ ...prev, importe: e.target.value ? Number(e.target.value) : '' }))} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Día Habitual de Pago</label>
            <input 
              type="number" 
              min="1" 
              max="31" 
              value={fijoPlantillaEditando.diaMes} 
              onChange={(e) => setFijoPlantillaEditando(prev => ({ ...prev, diaMes: Number(e.target.value) || 1 }))} 
            />
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalEditarPlantillaFijoOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar Plantilla</button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: VISUALIZADOR DE FACTURA / TICKET
      ========================================================================= */}
      <Modal
        isOpen={isModalVerFacturaOpen}
        onClose={() => { setIsModalVerFacturaOpen(false); setFacturaVisualizando(null); setGastoVisualizando(null); }}
        title={gastoVisualizando ? `Factura: ${gastoVisualizando.concepto} (${formatCurrency(gastoVisualizando.importe || 0)})` : 'Factura Adjunta'}
      >
        {facturaVisualizando && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="factura-preview-modal-body">
              {facturaVisualizando.tipo === 'pdf' ? (
                <iframe
                  src={facturaVisualizando.archivo}
                  title="Factura PDF"
                  className="factura-preview-iframe"
                />
              ) : (
                <img
                  src={facturaVisualizando.archivo}
                  alt="Factura"
                  className="factura-preview-img"
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {facturaVisualizando.nombre} {facturaVisualizando.tamano ? `(${(facturaVisualizando.tamano / 1024).toFixed(1)} KB)` : ''}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-primary flex-center"
                  onClick={() => descargarFactura(facturaVisualizando, gastoVisualizando?.concepto)}
                >
                  <Download size={16} style={{ marginRight: '6px' }} />
                  Descargar Factura
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setIsModalVerFacturaOpen(false); setFacturaVisualizando(null); setGastoVisualizando(null); }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Gastos;
