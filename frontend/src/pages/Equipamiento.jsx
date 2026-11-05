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
import { Plus, Trash2, RotateCcw, Package, ShoppingCart, Truck, Check } from 'lucide-react';
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
    coste: '',
    beneficio: '',
    colores: '',
    tallas: '',
    foto: ''
  });

  const [saleAlumnoId, setSaleAlumnoId] = useState('');
  const [saleFecha, setSaleFecha] = useState(currentDate.toISOString().split('T')[0]);
  const [saleEstado, setSaleEstado] = useState('pendiente');

  const {
    cesta,
    totalCesta,
    totalBeneficio,
    addProduct,
    updateCantidad,
    updatePrecio,
    updateColor,
    updateTalla,
    updateEstadoPedido,
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

  // Lista de materiales que el gimnasio tiene pendiente pedir al proveedor
  const porPedir = useMemo(() => {
    let list = (pagosMaterial || []).filter(p => p.estadoPedido === 'sin_pedir');
    if (filtroMaterial) {
      list = list.filter(p => p.concepto === filtroMaterial);
    }
    if (searchPendientes) {
      const term = searchPendientes.toLowerCase().trim();
      list = list.filter(p => {
        const al = alumnosMap[p.alumnoId];
        const nombreAl = al ? getNombreCompleto(al).toLowerCase() : '';
        const concepto = (p.concepto || '').toLowerCase();
        return nombreAl.includes(term) || concepto.includes(term);
      });
    }
    return list.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [pagosMaterial, filtroMaterial, searchPendientes, alumnosMap]);

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
    setProductForm({
      id: null,
      nombre: '',
      precio: '',
      coste: '',
      beneficio: '',
      colores: '',
      tallas: '',
      foto: ''
    });
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod) => {
    setProductForm({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      coste: prod.coste || '',
      beneficio: prod.beneficio || '',
      colores: Array.isArray(prod.colores) ? prod.colores.join(', ') : (prod.colores || ''),
      tallas: Array.isArray(prod.tallas) ? prod.tallas.join(', ') : (prod.tallas || ''),
      foto: prod.foto || ''
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const nombre = productForm.nombre.trim();
    const precio = Number(productForm.precio);
    const coste = productForm.coste !== '' ? Number(productForm.coste) : 0;
    const beneficio = productForm.beneficio !== '' ? Number(productForm.beneficio) : 0;

    if (!nombre) {
      toast.warning('Introduce el nombre del producto.');
      return;
    }
    if (isNaN(precio) || precio < 0) {
      toast.warning('Introduce un precio válido.');
      return;
    }

    try {
      const payload = {
        nombre,
        precio,
        coste,
        beneficio,
        colores: productForm.colores,
        tallas: productForm.tallas,
        foto: productForm.foto
      };

      if (productForm.id) {
        await productoService.update(productForm.id, payload);
        toast.success('Producto actualizado');
      } else {
        await productoService.create(payload);
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

  // Acciones sobre registros de pago y pedidos
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

  const handleToggleEstadoPedido = async (id, actualEstado) => {
    const nuevo = actualEstado === 'pedido' ? 'sin_pedir' : 'pedido';
    try {
      await pagoService.cambiarEstadoPedido(id, nuevo);
      toast.success(
        nuevo === 'pedido'
          ? 'Material marcado como pedido'
          : 'Material marcado como pendiente de pedir'
      );
    } catch (err) {
      console.error('Error actualizando pedido:', err);
      toast.error('Error al cambiar el estado del pedido.');
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
    const headers = ['Fecha', 'Alumno', 'Material / Concepto', 'PVP', 'Margen'];
    const rows = grupo.items.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe),
      p.beneficio ? `+${formatCurrency(p.beneficio)}` : '-'
    ]);
    const totalMargen = grupo.items.reduce((sum, p) => sum + (Number(p.beneficio) || 0), 0);
    await exportarMesAPdf({
      titulo: 'Informe de Equipamiento',
      mesNombre: grupo.mesNombre,
      headers,
      rows,
      totalImporte: grupo.totalImporte,
      totalMargen,
      totalRegistros: grupo.totalItems,
      nombreArchivo: `equipamiento_${grupo.key}.pdf`
    });
  };

  const handleExportTodoPdf = async () => {
    const headers = ['Fecha', 'Alumno', 'Material / Concepto', 'PVP', 'Margen'];
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
      titulo: 'Historial Completo de Equipamiento',
      mesNombre: 'Todos los períodos',
      headers,
      rows,
      totalImporte: total,
      totalMargen,
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
      id: 'por_pedir',
      label: 'Por Pedir',
      badge: porPedir.length,
      badgeVariant: 'warning',
      icon: <Truck size={18} />
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
            Catálogo de productos con variantes y control de pedidos a proveedores y cobros.
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

        {/* PESTAÑA: CATÁLOGO */}
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

        {/* PESTAÑA: MATERIAL PENDIENTE DE PEDIR A PROVEEDOR */}
        {activeTab === 'por_pedir' && (
          <div>
            <SearchFilterBar
              search={searchPendientes}
              onSearchChange={setSearchPendientes}
              searchPlaceholder="Buscar por alumno o material por pedir..."
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
                    <th>Material y Variantes</th>
                    <th>PVP (Alumno)</th>
                    <th>Estado Pago</th>
                    <th>Logística Pedido</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {porPedir.map(pago => (
                    <tr key={pago.id} style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                      <td>{formatDate(pago.fecha)}</td>
                      <td><strong>{getNombreCompleto(alumnosMap[pago.alumnoId])}</strong></td>
                      <td>
                        <strong>{pago.concepto}</strong>
                        {pago.beneficio > 0 && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#22c55e' }}>
                            Margen gym: +{formatCurrency(pago.beneficio)}
                          </span>
                        )}
                      </td>
                      <td>{formatCurrency(pago.importe)}</td>
                      <td><StatusBadge status={pago.estado} /></td>
                      <td>
                        <button
                          type="button"
                          className="btn-pedido-badge badge-sin-pedir"
                          onClick={() => handleToggleEstadoPedido(pago.id, pago.estadoPedido)}
                          title="Clic para marcar como pedido"
                        >
                          Sin pedir
                        </button>
                      </td>
                      <td>
                        <button
                          className="btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.85em', marginRight: '6px' }}
                          onClick={() => handleToggleEstadoPedido(pago.id, 'sin_pedir')}
                        >
                          <Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Marcar Pedido
                        </button>
                        {pago.estado === 'pendiente' && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.85em', marginRight: '6px' }}
                            onClick={() => handleMarcarPagado(pago.id)}
                            title="Cobrar ahora"
                          >
                            Cobrar
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
                  {porPedir.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center" style={{ padding: '2.5rem' }}>
                        <div style={{ color: 'var(--text-muted)' }}>
                          <Truck size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                          <p>¡Todo al día! No hay material pendiente de pedir al proveedor.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA: PENDIENTES DE COBRO */}
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
                    <th>P.V.P.</th>
                    <th>Logística</th>
                    <th>Estado Cobro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map(pago => (
                    <tr key={pago.id} style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                      <td>{formatDate(pago.fecha)}</td>
                      <td><strong>{getNombreCompleto(alumnosMap[pago.alumnoId])}</strong></td>
                      <td>
                        {pago.concepto}
                        {pago.beneficio > 0 && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#22c55e' }}>
                            Ganancia: +{formatCurrency(pago.beneficio)}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(pago.importe)}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn-pedido-badge ${pago.estadoPedido === 'pedido' ? 'badge-pedido' : 'badge-sin-pedir'}`}
                          onClick={() => handleToggleEstadoPedido(pago.id, pago.estadoPedido)}
                          title="Clic para alternar estado (Sin pedir / Pedido)"
                        >
                          {pago.estadoPedido === 'pedido' ? 'Pedido' : 'Sin pedir'}
                        </button>
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
                          onClick={() => handleDeletePago(pago.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendientes.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center" style={{ padding: '2rem' }}>
                        No hay equipamiento pendiente de cobro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA: HISTORIAL (PAGADOS) */}
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
                      <th>P.V.P.</th>
                      <th>Logística</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(pago => (
                      <tr key={pago.id}>
                        <td>{formatDate(pago.fecha)}</td>
                        <td><strong>{getNombreCompleto(alumnosMap[pago.alumnoId])}</strong></td>
                        <td>
                          {pago.concepto}
                          {pago.beneficio > 0 && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#22c55e' }}>
                              Ganancia: +{formatCurrency(pago.beneficio)}
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>
                          +{formatCurrency(pago.importe)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn-pedido-badge ${pago.estadoPedido === 'pedido' ? 'badge-pedido' : 'badge-sin-pedir'}`}
                            onClick={() => handleToggleEstadoPedido(pago.id, pago.estadoPedido)}
                            title="Clic para alternar estado (Sin pedir / Pedido)"
                          >
                            {pago.estadoPedido === 'pedido' ? 'Pedido' : 'Sin pedir'}
                          </button>
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
        totalBeneficio={totalBeneficio}
        onAddProduct={addProduct}
        onUpdateCantidad={updateCantidad}
        onUpdatePrecio={updatePrecio}
        onUpdateColor={updateColor}
        onUpdateTalla={updateTalla}
        onUpdateEstadoPedido={updateEstadoPedido}
        onRemoveProduct={removeProduct}
        onSubmit={handleSubmitSale}
      />
    </div>
  );
};

export default Equipamiento;
