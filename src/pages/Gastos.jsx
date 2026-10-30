import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { gastoService } from '../services/gastoService';
import { getNombreMes, generarRangoAños } from '../constants/fechas';
import { getStoredCategorias, mergeCategorias } from '../utils/categorias';
import GastosFijosTab from '../components/gastos/GastosFijosTab';
import GastosVariablesTab from '../components/gastos/GastosVariablesTab';
import ArchivoFacturasTab from '../components/gastos/ArchivoFacturasTab';
import {
  ModalGastoVariable,
  ModalNuevoGastoFijo,
  ModalModificarFijoMes,
  ModalEditarPlantillaFijo
} from '../components/gastos/GastosModals';
import DocumentViewerModal from '../components/common/DocumentViewerModal';
import { Plus, Clock, Tag, FileText } from 'lucide-react';
import { useConfirm, useToast } from '../context/DialogContext';
import '../pages/Alumnos.css';
import './Gastos.css';

const Gastos = () => {
  const currentDate = new Date();
  const currentMes = currentDate.getMonth() + 1;
  const currentAño = currentDate.getFullYear();

  const [activeTab, setActiveTab] = useState('fijos');
  const [selectedMonth, setSelectedMonth] = useState(currentMes);
  const [selectedYear, setSelectedYear] = useState(currentAño);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Modales
  const [isModalVariableOpen, setIsModalVariableOpen] = useState(false);
  const [isModalNuevoFijoOpen, setIsModalNuevoFijoOpen] = useState(false);
  const [isModalModificarFijoMesOpen, setIsModalModificarFijoMesOpen] = useState(false);
  const [isModalEditarPlantillaFijoOpen, setIsModalEditarPlantillaFijoOpen] = useState(false);

  const [formDataVariable, setFormDataVariable] = useState({
    id: null,
    concepto: '',
    categoria: '',
    importe: '',
    fecha: currentDate.toISOString().split('T')[0],
    factura: null
  });

  const [formDataNuevoFijo, setFormDataNuevoFijo] = useState({
    concepto: '',
    categoria: '',
    importe: '',
    diaMes: 1
  });

  const [fijoMesEditando, setFijoMesEditando] = useState(null);
  const [importeFijoMes, setImporteFijoMes] = useState('');
  const [fechaFijoMes, setFechaFijoMes] = useState(currentDate.toISOString().split('T')[0]);
  const [facturaFijoMes, setFacturaFijoMes] = useState(null);

  const [fijoPlantillaEditando, setFijoPlantillaEditando] = useState({
    id: null,
    concepto: '',
    categoria: '',
    importe: '',
    diaMes: 1
  });

  // Visor y filtros de facturas
  const [isModalVerFacturaOpen, setIsModalVerFacturaOpen] = useState(false);
  const [gastoVisualizando, setGastoVisualizando] = useState(null);
  const [facturaVisualizando, setFacturaVisualizando] = useState(null);
  const [filtroAnoFacturas, setFiltroAnoFacturas] = useState(currentAño);
  const [filtroPeriodoFacturas, setFiltroPeriodoFacturas] = useState('todos');
  const [busquedaFacturas, setBusquedaFacturas] = useState('');

  const confirm = useConfirm();
  const { toast } = useToast();

  const gastosRaw = useLiveQuery(() => gastoService.getAll(), []);
  const gastosFijosRaw = useLiveQuery(() => gastoService.getAllFijos(), []);

  const gastos = useMemo(() => gastosRaw || [], [gastosRaw]);
  const gastosFijos = useMemo(() => gastosFijosRaw || [], [gastosFijosRaw]);

  const categoriasSugeridasVariables = useMemo(() => {
    const stored = getStoredCategorias('gastos_variables', []);
    const fromGastos = (gastos || []).filter(g => g.tipo !== 'fijo');
    return mergeCategorias(stored, fromGastos, 'categoria');
  }, [gastos]);

  const categoriasSugeridasFijos = useMemo(() => {
    const stored = getStoredCategorias('gastos_fijos', []);
    return mergeCategorias(stored, gastosFijos, 'categoria');
  }, [gastosFijos]);

  const conceptosVariablesHabituales = useMemo(() => {
    return gastoService.getConceptosVariablesHabituales(gastos);
  }, [gastos]);

  const estadoFijosMes = useMemo(() => {
    return gastoService.calcularEstadoFijosMes(gastosFijos, gastos, selectedMonth, selectedYear);
  }, [gastosFijos, gastos, selectedMonth, selectedYear]);

  const itemsFijosFiltrados = useMemo(() => {
    return estadoFijosMes.items.filter(item => {
      const matchBusqueda = !busqueda || item.concepto.toLowerCase().includes(busqueda.toLowerCase());
      const matchCategoria = !filtroCategoria || item.categoria === filtroCategoria;
      return matchBusqueda && matchCategoria;
    });
  }, [estadoFijosMes.items, busqueda, filtroCategoria]);

  const gastosVariablesFiltrados = useMemo(() => {
    return (gastos || [])
      .filter(g => g.tipo !== 'fijo')
      .filter(g => {
        const matchBusqueda = !busqueda || (g.concepto || '').toLowerCase().includes(busqueda.toLowerCase());
        const matchCategoria = !filtroCategoria || g.categoria === filtroCategoria;
        return matchBusqueda && matchCategoria;
      });
  }, [gastos, busqueda, filtroCategoria]);

  const todosGastosConFactura = useMemo(() => {
    return (gastos || []).filter(g => g.factura && g.factura.archivo);
  }, [gastos]);

  const facturasFiltradas = useMemo(() => {
    return todosGastosConFactura
      .filter(g => {
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
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [todosGastosConFactura, filtroAnoFacturas, filtroPeriodoFacturas, busquedaFacturas]);

  const totalImporteFacturas = useMemo(() => {
    return facturasFiltradas.reduce((sum, g) => sum + (Number(g.importe) || 0), 0);
  }, [facturasFiltradas]);

  const handleVerFactura = (gasto) => {
    if (!gasto?.factura) return;
    setGastoVisualizando(gasto);
    setFacturaVisualizando(gasto.factura);
    setIsModalVerFacturaOpen(true);
  };

  // Manejadores de Gastos Fijos
  const handleToggleTiqueFijo = async (item) => {
    if (item.pagado) {
      const ok = await confirm({
        title: 'Desmarcar gasto fijo',
        message: `¿Desmarcar "${item.concepto}" de ${getNombreMes(selectedMonth)}? Volverá a aparecer como pendiente.`,
        confirmText: 'Desmarcar',
        variant: 'warning'
      });
      if (ok) {
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
      toast.success(`"${item.concepto}" marcado como pagado`);
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
      toast.success('Gasto fijo mensual actualizado');
      setIsModalModificarFijoMesOpen(false);
      setFijoMesEditando(null);
      setFacturaFijoMes(null);
    } catch (err) {
      console.error('Error al modificar gasto fijo:', err);
      toast.error('Error al guardar la modificación.');
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
      toast.success('Plantilla de gasto fijo actualizada');
      setIsModalEditarPlantillaFijoOpen(false);
    } catch (err) {
      console.error('Error al editar plantilla de gasto fijo:', err);
      toast.error('Error al actualizar la plantilla.');
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
      toast.success('Nuevo gasto fijo creado');
      setIsModalNuevoFijoOpen(false);
      setFormDataNuevoFijo({ concepto: '', categoria: '', importe: '', diaMes: 1 });
    } catch (err) {
      console.error('Error al crear gasto fijo:', err);
      toast.error('Error al registrar el gasto fijo.');
    }
  };

  const handleDeleteGastoFijo = async (id, concepto) => {
    const ok = await confirm({
      title: 'Eliminar plantilla de gasto fijo',
      message: `¿Eliminar la plantilla de gasto fijo "${concepto}"? Ya no aparecerá en los meses venideros.`,
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (ok) {
      await gastoService.deleteGastoFijo(id);
      toast.success('Plantilla eliminada');
    }
  };

  // Manejadores de Gastos Variables
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
      const payload = {
        concepto: formDataVariable.concepto,
        categoria: formDataVariable.categoria,
        importe: Number(formDataVariable.importe) || 0,
        fecha: formDataVariable.fecha,
        tipo: 'variable',
        factura: formDataVariable.factura
      };
      if (formDataVariable.id) {
        await gastoService.update(formDataVariable.id, payload);
        toast.success('Gasto variable actualizado');
      } else {
        await gastoService.create(payload);
        toast.success('Gasto variable registrado');
      }
      setIsModalVariableOpen(false);
    } catch (err) {
      console.error('Error al guardar gasto variable:', err);
      toast.error('Error al guardar el gasto variable.');
    }
  };

  const handleDeleteVariable = async (id) => {
    const ok = await confirm({
      title: 'Eliminar gasto',
      message: '¿Estás seguro de que deseas eliminar este gasto del historial?',
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (ok) {
      await gastoService.delete(id);
      toast.success('Gasto eliminado');
    }
  };

  const añosList = generarRangoAños(currentAño, 2, 2);

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
          ) : (
            <button className="btn-primary flex-center" onClick={handleOpenNuevoVariable}>
              <Plus size={20} style={{ marginRight: '8px' }} />
              {activeTab === 'variables' ? 'Añadir Gasto Variable' : 'Añadir Gasto con Factura'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
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

        {activeTab === 'fijos' && (
          <GastosFijosTab
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            añosList={añosList}
            currentMes={currentMes}
            currentAño={currentAño}
            estadoFijosMes={estadoFijosMes}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            filtroCategoria={filtroCategoria}
            onFiltroCategoriaChange={setFiltroCategoria}
            categoriasSugeridasFijos={categoriasSugeridasFijos}
            itemsFijosFiltrados={itemsFijosFiltrados}
            totalPlantillasFijos={gastosFijos.length}
            onToggleTique={handleToggleTiqueFijo}
            onVerFactura={handleVerFactura}
            onOpenModificarMes={handleOpenModificarFijoMes}
            onOpenEditarPlantilla={handleOpenEditarPlantillaFijo}
            onDeletePlantilla={handleDeleteGastoFijo}
            onOpenNuevoFijo={() => setIsModalNuevoFijoOpen(true)}
          />
        )}

        {activeTab === 'variables' && (
          <GastosVariablesTab
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            filtroCategoria={filtroCategoria}
            onFiltroCategoriaChange={setFiltroCategoria}
            categoriasSugeridasVariables={categoriasSugeridasVariables}
            gastosVariablesFiltrados={gastosVariablesFiltrados}
            onVerFactura={handleVerFactura}
            onReutilizarGasto={handleReutilizarGasto}
            onEditVariable={handleEditVariable}
            onDeleteVariable={handleDeleteVariable}
          />
        )}

        {activeTab === 'facturas' && (
          <ArchivoFacturasTab
            filtroAnoFacturas={filtroAnoFacturas}
            onChangeAno={setFiltroAnoFacturas}
            añosList={añosList}
            filtroPeriodoFacturas={filtroPeriodoFacturas}
            onChangePeriodo={setFiltroPeriodoFacturas}
            busquedaFacturas={busquedaFacturas}
            onChangeBusqueda={setBusquedaFacturas}
            facturasFiltradas={facturasFiltradas}
            totalImporteFacturas={totalImporteFacturas}
            onVerFactura={handleVerFactura}
          />
        )}
      </div>

      <ModalGastoVariable
        isOpen={isModalVariableOpen}
        onClose={() => setIsModalVariableOpen(false)}
        formData={formDataVariable}
        setFormData={setFormDataVariable}
        conceptosHabituales={conceptosVariablesHabituales}
        categoriasSugeridas={categoriasSugeridasVariables}
        onSelectRecuperacion={handleSeleccionarRecuperacion}
        onPreviewFactura={handleVerFactura}
        onSubmit={handleSubmitVariable}
      />

      <ModalNuevoGastoFijo
        isOpen={isModalNuevoFijoOpen}
        onClose={() => setIsModalNuevoFijoOpen(false)}
        formData={formDataNuevoFijo}
        setFormData={setFormDataNuevoFijo}
        categoriasSugeridas={categoriasSugeridasFijos}
        onSubmit={handleSubmitNuevoFijo}
      />

      <ModalModificarFijoMes
        isOpen={isModalModificarFijoMesOpen}
        onClose={() => setIsModalModificarFijoMesOpen(false)}
        fijoMesEditando={fijoMesEditando}
        mesNombre={getNombreMes(selectedMonth)}
        año={selectedYear}
        importe={importeFijoMes}
        setImporte={setImporteFijoMes}
        fecha={fechaFijoMes}
        setFecha={setFechaFijoMes}
        factura={facturaFijoMes}
        setFactura={setFacturaFijoMes}
        onPreviewFactura={handleVerFactura}
        onSubmit={handleSubmitModificarFijoMes}
      />

      <ModalEditarPlantillaFijo
        isOpen={isModalEditarPlantillaFijoOpen}
        onClose={() => setIsModalEditarPlantillaFijoOpen(false)}
        formData={fijoPlantillaEditando}
        setFormData={setFijoPlantillaEditando}
        categoriasSugeridas={categoriasSugeridasFijos}
        onSubmit={handleSubmitEditarPlantillaFijo}
      />

      <DocumentViewerModal
        isOpen={isModalVerFacturaOpen}
        onClose={() => {
          setIsModalVerFacturaOpen(false);
          setFacturaVisualizando(null);
          setGastoVisualizando(null);
        }}
        gasto={gastoVisualizando}
        factura={facturaVisualizando}
      />
    </div>
  );
};

export default Gastos;
