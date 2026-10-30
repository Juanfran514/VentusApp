import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService, pagoService, productoService } from '../services';
import { formatCurrency, formatDate, getNombreCompleto } from '../utils/formatters';
import { exportarMesAPdf } from '../utils/pdfExport';
import { useCarritoVenta } from '../hooks/useCarritoVenta';
import CatalogoProductosTab from '../components/equipamiento/CatalogoProductosTab';
import ModalProductoForm from '../components/equipamiento/ModalProductoForm';
import ModalVentaMultiple from '../components/equipamiento/ModalVentaMultiple';
import Tabs from '../components/common/Tabs';
import StatusBadge from '../components/common/StatusBadge';
import SearchFilterBar from '../components/common/SearchFilterBar';
import MonthlyAccordionList from '../components/common/MonthlyAccordionList';
import { Plus, Trash2, RotateCcw, Package, ShoppingCart } from 'lucide-react';
import { useConfirm, useToast } from '../context/DialogContext';
import '../pages/Alumnos.css';
import './Equipamiento.css';

const Equipamiento = () => {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState('catalogo');

  const [searchCatalogo, setSearchCatalogo] = useState('');
  const [searchPendientes, setSearchPendientes] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState('');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  const [productForm, setProductForm] = useState({
    id: null,
    nombre: '',
    precio: '',
    foto: ''
  });

  const [saleAlumnoId, setSaleAlumnoId] = useState('');
  const [saleFecha, setSaleFecha] = useState(currentDate.toISOString().split('T')[0]);
  const [saleEstado, setSaleEstado] = useState('pendiente');

  const {
    cesta,
    totalCesta,
    addProduct,
    updateCantidad,
    updatePrecio,
    removeProduct,
    clearCesta
  } = useCarritoVenta();

  const confirm = useConfirm();
  const { toast } = useToast();

  const alumnosRaw = useLiveQuery(() => alumnoService.getAll(), []);
  const productosRaw = useLiveQuery(() => productoService.getAll(), []);
  const pagosMaterialRaw = useLiveQuery(() => pagoService.getByTipo('material'), []);

  const alumnos = useMemo(() => alumnosRaw || [], [alumnosRaw]);
  const productos = useMemo(() => productosRaw || [], [productosRaw]);
  const pagosMaterial = useMemo(() => pagosMaterialRaw || [], [pagosMaterialRaw]);

  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  const materialesUnicos = useMemo(() => {
    const set = new Set();
    pagosMaterial.forEach(p => {
      if (p.concepto) set.add(p.concepto);
    });
    return Array.from(set).sort();
  }, [pagosMaterial]);

  const { pendientes, pagados } = useMemo(() => {
    let baseList = pagosMaterial || [];
    if (filtroMaterial) {
      baseList = baseList.filter(p => p.concepto === filtroMaterial);
    }
    return pagoService.separarPendientesYPagados(baseList, alumnosMap, searchPendientes);
  }, [pagosMaterial, alumnosMap, searchPendientes, filtroMaterial]);

  const gruposMensualesPagados = useMemo(() => {
    return pagoService.agruparPagosPorMes(pagados);
  }, [pagados]);

  const productosFiltrados = useMemo(() => {
    if (!productos) return [];
    if (!searchCatalogo) return productos;
    const term = searchCatalogo.toLowerCase().trim();
    return productos.filter(p => p.nombre.toLowerCase().includes(term));
  }, [productos, searchCatalogo]);

  // Gestión de Productos (Catálogo)
  const handleOpenNewProduct = () => {
    setProductForm({ id: null, nombre: '', precio: '', foto: '' });
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod) => {
    setProductForm({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      foto: prod.foto || ''
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const nombre = productForm.nombre.trim();
    const precio = Number(productForm.precio);

    if (!nombre) {
      toast.warning('Introduce el nombre del producto.');
      return;
    }
    if (isNaN(precio) || precio < 0) {
      toast.warning('Introduce un precio válido.');
      return;
    }

    try {
      if (productForm.id) {
        await productoService.update(productForm.id, { nombre, precio, foto: productForm.foto });
        toast.success('Producto actualizado');
      } else {
        await productoService.create({ nombre, precio, foto: productForm.foto });
        toast.success('Producto añadido al catálogo');
      }
      setIsProductModalOpen(false);
    } catch (err) {
      console.error('Error guardando producto:', err);
      toast.error('Error al guardar el producto.');
    }
  };

  const handleDeleteProduct = async (id, nombre) => {
    const ok = await confirm({
      title: 'Eliminar producto',
      message: `¿Seguro que deseas eliminar "${nombre}" del catálogo?`,
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (ok) {
      await productoService.delete(id);
      toast.success('Producto eliminado del catálogo');
    }
  };

  // Gestión de Venta Múltiple
  const handleOpenSaleModal = (preselectedAlumnoId = '') => {
    setSaleAlumnoId(preselectedAlumnoId);
    setSaleFecha(new Date().toISOString().split('T')[0]);
    setSaleEstado('pendiente');
    clearCesta();
    setIsSaleModalOpen(true);
  };

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    if (!saleAlumnoId) {
      toast.warning('Debes seleccionar un alumno.');
      return;
    }
    if (cesta.length === 0) {
      toast.warning('Añade al menos un producto a la venta.');
      return;
    }

    try {
      await pagoService.registrarVentaMultiple({
        alumnoId: saleAlumnoId,
        items: cesta,
        fecha: saleFecha,
        estado: saleEstado
      });

      toast.success(
        saleEstado === 'pendiente'
          ? 'Equipamiento asignado como pendiente de cobro'
          : 'Venta cobrada y registrada correctamente'
      );
      setIsSaleModalOpen(false);
      setActiveTab(saleEstado === 'pendiente' ? 'pendientes' : 'pagados');
    } catch (err) {
      console.error('Error registrando venta múltiple:', err);
      toast.error('Error al registrar la venta.');
    }
  };

  // Acciones sobre registros de pago
  const handleMarcarPagado = async (id) => {
    await pagoService.marcarPagado(id);
    toast.success('Equipamiento marcado como cobrado');
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
      toast.info('El cargo ha vuelto a estado pendiente');
    }
  };

  const handleDeletePago = async (id) => {
    const ok = await confirm({
      title: 'Eliminar registro',
      message: '¿Eliminar este registro de material?',
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (ok) {
      await pagoService.delete(id);
      toast.success('Registro eliminado');
    }
  };

  // Exportación a PDF
  const handleExportPdfMes = async (grupo) => {
    const headers = ['Fecha', 'Alumno', 'Material / Concepto', 'Importe'];
    const rows = grupo.items.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe)
    ]);
    await exportarMesAPdf({
      titulo: 'Informe de Equipamiento',
      mesNombre: grupo.mesNombre,
      headers,
      rows,
      totalImporte: grupo.totalImporte,
      totalRegistros: grupo.totalItems,
      nombreArchivo: `equipamiento_${grupo.key}.pdf`
    });
  };

  const handleExportTodoPdf = async () => {
    const headers = ['Fecha', 'Alumno', 'Material / Concepto', 'Importe'];
    const rows = pagados.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe)
    ]);
    const total = pagados.reduce((sum, p) => sum + (Number(p.importe) || 0), 0);
    await exportarMesAPdf({
      titulo: 'Historial Completo de Equipamiento',
      mesNombre: 'Todos los períodos',
      headers,
      rows,
      totalImporte: total,
      totalRegistros: pagados.length,
      nombreArchivo: 'historial_equipamiento_completo.pdf'
    });
  };

  const tabsConfig = [
    {
      id: 'catalogo',
      label: `Catálogo (${productos.length})`,
      icon: <Package size={18} />
    },
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
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1>Gestión de Equipamiento</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-0.5rem' }}>
            Catálogo de productos bajo demanda, asignación rápida y control de cobros.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary flex-center" onClick={handleOpenNewProduct}>
            <Plus size={18} style={{ marginRight: '6px' }} />
            Añadir Producto
          </button>
          <button className="btn-primary flex-center" onClick={() => handleOpenSaleModal()}>
            <ShoppingCart size={18} style={{ marginRight: '6px' }} />
            Vender / Asignar
          </button>
        </div>
      </div>

      <div className="card">
        <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'catalogo' && (
          <CatalogoProductosTab
            searchCatalogo={searchCatalogo}
            onSearchChange={setSearchCatalogo}
            productosFiltrados={productosFiltrados}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onOpenNewProduct={handleOpenNewProduct}
          />
        )}

        {activeTab === 'pendientes' && (
          <div>
            <SearchFilterBar
              search={searchPendientes}
              onSearchChange={setSearchPendientes}
              searchPlaceholder="Buscar por alumno o material..."
              filterValue={filtroMaterial}
              onFilterChange={setFiltroMaterial}
              filterOptions={materialesUnicos}
              filterPlaceholder="Todos los materiales"
            />

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Alumno</th>
                    <th>Material / Concepto</th>
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
                          onClick={() => handleDeletePago(pago.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendientes.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center" style={{ padding: '2rem' }}>
                        No hay equipamiento pendiente de cobro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pagados' && (
          <MonthlyAccordionList
            gruposMensuales={gruposMensualesPagados}
            tituloTipo="Equipamiento"
            tipoRegistroLabel="artículos"
            emptyMessage="No hay registros de equipamiento cobrado."
            onExportPdf={handleExportPdfMes}
            onExportTodoPdf={handleExportTodoPdf}
            renderTable={(items) => (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Alumno</th>
                      <th>Material / Concepto</th>
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
                            onClick={() => handleDeletePago(pago.id)}
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

      <ModalProductoForm
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productForm={productForm}
        setProductForm={setProductForm}
        onSubmit={handleSaveProduct}
      />

      <ModalVentaMultiple
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        alumnos={alumnos}
        productos={productos}
        saleAlumnoId={saleAlumnoId}
        setSaleAlumnoId={setSaleAlumnoId}
        saleFecha={saleFecha}
        setSaleFecha={setSaleFecha}
        saleEstado={saleEstado}
        setSaleEstado={setSaleEstado}
        cesta={cesta}
        totalCesta={totalCesta}
        onAddProduct={addProduct}
        onUpdateCantidad={updateCantidad}
        onUpdatePrecio={updatePrecio}
        onRemoveProduct={removeProduct}
        onSubmit={handleSubmitSale}
      />
    </div>
  );
};

export default Equipamiento;
