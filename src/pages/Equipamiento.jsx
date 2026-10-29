import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService, pagoService, productoService } from '../services';
import { formatCurrency, formatDate, getNombreCompleto } from '../utils/formatters';
import { exportarMesAPdf } from '../utils/pdfExport';
import { comprimirImagen } from '../utils/imageCompressor';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/common/StatusBadge';
import SearchFilterBar from '../components/common/SearchFilterBar';
import MonthlyAccordionList from '../components/common/MonthlyAccordionList';
import { 
  Plus, Trash2, Edit2, RotateCcw, Package, ShoppingCart, 
  Image as ImageIcon, Upload, Search 
} from 'lucide-react';
import '../pages/Alumnos.css';
import './Equipamiento.css';

const Equipamiento = () => {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState('catalogo'); // 'catalogo' | 'pendientes' | 'pagados'

  // Filtros de búsqueda
  const [searchCatalogo, setSearchCatalogo] = useState('');
  const [searchPendientes, setSearchPendientes] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState('');

  // Modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  // Formulario Producto
  const [productForm, setProductForm] = useState({
    id: null,
    nombre: '',
    precio: '',
    foto: ''
  });
  const [isCompressingImg, setIsCompressingImg] = useState(false);

  // Formulario Venta Múltiple
  const [saleAlumnoId, setSaleAlumnoId] = useState('');
  const [saleFecha, setSaleFecha] = useState(currentDate.toISOString().split('T')[0]);
  const [saleEstado, setSaleEstado] = useState('pendiente'); // 'pendiente' | 'pagado'
  const [cesta, setCesta] = useState([]); // [{ productoId, nombre, precio, cantidad, foto }]
  const [filtroCestaBusqueda, setFiltroCestaBusqueda] = useState('');

  // Consultas reactivas
  const alumnosRaw = useLiveQuery(() => alumnoService.getAll(), []);
  const productosRaw = useLiveQuery(() => productoService.getAll(), []);
  const pagosMaterialRaw = useLiveQuery(() => pagoService.getByTipo('material'), []);

  const alumnos = useMemo(() => alumnosRaw || [], [alumnosRaw]);
  const productos = useMemo(() => productosRaw || [], [productosRaw]);
  const pagosMaterial = useMemo(() => pagosMaterialRaw || [], [pagosMaterialRaw]);

  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  // Lista de nombres de materiales para el filtro del historial
  const materialesUnicos = useMemo(() => {
    const set = new Set();
    pagosMaterial.forEach(p => {
      if (p.concepto) set.add(p.concepto);
    });
    return Array.from(set).sort();
  }, [pagosMaterial]);

  // Separar pendientes y pagados
  const { pendientes, pagados } = useMemo(() => {
    let baseList = pagosMaterial || [];
    if (filtroMaterial) {
      baseList = baseList.filter(p => p.concepto === filtroMaterial);
    }
    return pagoService.separarPendientesYPagados(baseList, alumnosMap, searchPendientes);
  }, [pagosMaterial, alumnosMap, searchPendientes, filtroMaterial]);

  // Agrupación mensual del historial pagado
  const gruposMensualesPagados = useMemo(() => {
    return pagoService.agruparPagosPorMes(pagados);
  }, [pagados]);

  // Productos filtrados para el catálogo
  const productosFiltrados = useMemo(() => {
    if (!productos) return [];
    if (!searchCatalogo) return productos;
    const term = searchCatalogo.toLowerCase().trim();
    return productos.filter(p => p.nombre.toLowerCase().includes(term));
  }, [productos, searchCatalogo]);

  // ==========================================
  // GESTIÓN DE PRODUCTOS (CATÁLOGO)
  // ==========================================
  const handleOpenNewProduct = () => {
    setProductForm({
      id: null,
      nombre: '',
      precio: '',
      foto: ''
    });
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

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImg(true);
      // Redimensiona y comprime a ~25KB WebP/JPEG
      const dataUrl = await comprimirImagen(file, 320, 0.75);
      setProductForm(prev => ({ ...prev, foto: dataUrl }));
    } catch (err) {
      console.error('Error al procesar la imagen:', err);
      alert('Hubo un error al procesar la imagen. Intenta con otra.');
    } finally {
      setIsCompressingImg(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setProductForm(prev => ({ ...prev, foto: '' }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const nombre = productForm.nombre.trim();
    const precio = Number(productForm.precio);

    if (!nombre) {
      alert('Introduce el nombre del producto.');
      return;
    }
    if (isNaN(precio) || precio < 0) {
      alert('Introduce un precio válido.');
      return;
    }

    try {
      if (productForm.id) {
        await productoService.update(productForm.id, {
          nombre,
          precio,
          foto: productForm.foto
        });
      } else {
        await productoService.create({
          nombre,
          precio,
          foto: productForm.foto
        });
      }
      setIsProductModalOpen(false);
    } catch (err) {
      console.error('Error guardando producto:', err);
      alert('Error al guardar el producto.');
    }
  };

  const handleDeleteProduct = async (id, nombre) => {
    if (window.confirm(`¿Seguro que deseas eliminar "${nombre}" del catálogo?`)) {
      await productoService.delete(id);
    }
  };

  // ==========================================
  // GESTIÓN DE VENTA MÚLTIPLE (CARRITO)
  // ==========================================
  const handleOpenSaleModal = (preselectedAlumnoId = '') => {
    setSaleAlumnoId(preselectedAlumnoId);
    setSaleFecha(new Date().toISOString().split('T')[0]);
    setSaleEstado('pendiente');
    setCesta([]);
    setFiltroCestaBusqueda('');
    setIsSaleModalOpen(true);
  };

  const handleAddProductToCesta = (prod) => {
    setCesta(prev => {
      const existingIndex = prev.findIndex(item => item.productoId === prod.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          cantidad: updated[existingIndex].cantidad + 1
        };
        return updated;
      }
      return [
        ...prev,
        {
          productoId: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad: 1,
          foto: prod.foto || ''
        }
      ];
    });
  };

  const handleUpdateCantidad = (index, delta) => {
    setCesta(prev => {
      const updated = [...prev];
      const newCant = updated[index].cantidad + delta;
      if (newCant <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], cantidad: newCant };
      return updated;
    });
  };

  const handleUpdatePrecioItem = (index, nuevoPrecio) => {
    setCesta(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], precio: nuevoPrecio };
      return updated;
    });
  };

  const handleRemoveFromCesta = (index) => {
    setCesta(prev => prev.filter((_, i) => i !== index));
  };

  const totalCesta = useMemo(() => {
    return cesta.reduce((sum, item) => {
      const prec = Number(item.precio) || 0;
      const cant = Number(item.cantidad) || 1;
      return sum + (prec * cant);
    }, 0);
  }, [cesta]);

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    if (!saleAlumnoId) {
      alert('Debes seleccionar un alumno.');
      return;
    }
    if (cesta.length === 0) {
      alert('Añade al menos un producto a la venta.');
      return;
    }

    try {
      await pagoService.registrarVentaMultiple({
        alumnoId: saleAlumnoId,
        items: cesta,
        fecha: saleFecha,
        estado: saleEstado
      });

      setIsSaleModalOpen(false);
      // Cambiar a la pestaña correspondiente
      if (saleEstado === 'pendiente') {
        setActiveTab('pendientes');
      } else {
        setActiveTab('pagados');
      }
    } catch (err) {
      console.error('Error registrando venta múltiple:', err);
      alert('Error al registrar la venta.');
    }
  };

  // ==========================================
  // ACCIONES SOBRE REGISTROS DE PAGO
  // ==========================================
  const handleMarcarPagado = async (id) => {
    await pagoService.marcarPagado(id);
  };

  const handleRevertirPago = async (id) => {
    if (window.confirm('¿Deshacer el cobro y volver a marcarlo como pendiente?')) {
      await pagoService.revertirPago(id);
    }
  };

  const handleDeletePago = async (id) => {
    if (window.confirm('¿Eliminar este registro de material?')) {
      await pagoService.delete(id);
    }
  };

  // ==========================================
  // EXPORTACIÓN A PDF
  // ==========================================
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

  return (
    <div className="page-container">
      {/* CABECERA PRINCIPAL */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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

      {/* CONTENIDO CON PESTAÑAS */}
      <div className="card">
        <div className="tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <button 
            className={`tab-btn ${activeTab === 'catalogo' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalogo')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.05rem', 
              cursor: 'pointer', 
              color: activeTab === 'catalogo' ? 'var(--primary-color)' : 'var(--text-color)', 
              fontWeight: activeTab === 'catalogo' ? 'bold' : 'normal', 
              borderBottom: activeTab === 'catalogo' ? '2px solid var(--primary-color)' : 'none', 
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Package size={18} />
            <span>Catálogo ({productos.length})</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'pendientes' ? 'active' : ''}`}
            onClick={() => setActiveTab('pendientes')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.05rem', 
              cursor: 'pointer', 
              color: activeTab === 'pendientes' ? 'var(--primary-color)' : 'var(--text-color)', 
              fontWeight: activeTab === 'pendientes' ? 'bold' : 'normal', 
              borderBottom: activeTab === 'pendientes' ? '2px solid var(--primary-color)' : 'none', 
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Pendientes de Cobro</span>
            {pendientes.length > 0 && (
              <span className="badge" style={{ background: 'var(--danger-color)', color: '#fff', fontSize: '0.75rem', padding: '2px 7px', borderRadius: '10px' }}>
                {pendientes.length}
              </span>
            )}
          </button>

          <button 
            className={`tab-btn ${activeTab === 'pagados' ? 'active' : ''}`}
            onClick={() => setActiveTab('pagados')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.05rem', 
              cursor: 'pointer', 
              color: activeTab === 'pagados' ? 'var(--primary-color)' : 'var(--text-color)', 
              fontWeight: activeTab === 'pagados' ? 'bold' : 'normal', 
              borderBottom: activeTab === 'pagados' ? '2px solid var(--primary-color)' : 'none', 
              padding: '6px 12px' 
            }}
          >
            Historial (Pagados)
          </button>
        </div>

        {/* ======================================================== */}
        {/* PESTAÑA 1: CATÁLOGO DE PRODUCTOS */}
        {/* ======================================================== */}
        {activeTab === 'catalogo' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar producto en catálogo..."
                  value={searchCatalogo}
                  onChange={(e) => setSearchCatalogo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 38px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-dark)',
                    color: 'var(--text-light)'
                  }}
                />
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {productosFiltrados.length} {productosFiltrados.length === 1 ? 'producto' : 'productos'} en catálogo
              </div>
            </div>

            {productosFiltrados.length > 0 ? (
              <div className="productos-grid">
                {productosFiltrados.map(prod => (
                  <div key={prod.id} className="producto-card">
                    <div className="producto-img-container">
                      {prod.foto ? (
                        <img src={prod.foto} alt={prod.nombre} className="producto-img" />
                      ) : (
                        <div className="producto-placeholder">
                          <Package size={36} />
                          <span>Sin foto</span>
                        </div>
                      )}
                    </div>
                    <div className="producto-body">
                      <div>
                        <div className="producto-nombre" title={prod.nombre}>{prod.nombre}</div>
                        <div className="producto-precio">{formatCurrency(prod.precio)}</div>
                      </div>
                      <div className="producto-actions">
                        <button 
                          className="btn-icon text-primary" 
                          title="Editar producto" 
                          onClick={() => handleEditProduct(prod)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon text-danger" 
                          title="Eliminar producto" 
                          onClick={() => handleDeleteProduct(prod.id, prod.nombre)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Package size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  {searchCatalogo ? 'No se encontraron productos coincidentes.' : 'Aún no tienes productos en el catálogo.'}
                </p>
                <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Crea productos con nombre y precio para poder asignarlos fácilmente a los alumnos cuando los soliciten.
                </p>
                <button className="btn-primary" onClick={handleOpenNewProduct}>
                  <Plus size={16} style={{ marginRight: '6px' }} />
                  Crear Primer Producto
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: PENDIENTES DE COBRO */}
        {/* ======================================================== */}
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

        {/* ======================================================== */}
        {/* PESTAÑA 3: HISTORIAL (PAGADOS) */}
        {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* MODAL 1: CREAR / EDITAR PRODUCTO */}
      {/* ======================================================== */}
      <Modal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        title={productForm.id ? "Editar Producto" : "Nuevo Producto"}
      >
        <form onSubmit={handleSaveProduct} className="form-grid">
          <div className="form-group full-width">
            <label>Nombre del Producto *</label>
            <input 
              type="text" 
              name="nombre" 
              value={productForm.nombre} 
              onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })} 
              placeholder="Ej: Guantes de Boxeo 12oz, Kimono BJJ, Vendas..." 
              required 
              autoFocus
            />
          </div>

          <div className="form-group full-width">
            <label>Precio de Venta (€) *</label>
            <input 
              type="number" 
              step="0.01" 
              min="0" 
              name="precio" 
              value={productForm.precio} 
              onChange={(e) => setProductForm({ ...productForm, precio: e.target.value })} 
              placeholder="0.00" 
              required 
            />
          </div>

          {/* FOTO DEL PRODUCTO */}
          <div className="form-group full-width">
            <label>Foto del Producto (Opcional)</label>
            <div className="image-upload-container">
              {productForm.foto ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="image-preview-wrapper">
                    <img src={productForm.foto} alt="Vista previa" className="image-preview" />
                  </div>
                  <div className="image-upload-actions">
                    <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                      <Upload size={14} style={{ marginRight: '4px' }} /> Cambiar Foto
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    <button 
                      type="button" 
                      className="btn-icon text-danger" 
                      onClick={handleRemoveImage}
                      title="Quitar foto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="image-preview-wrapper">
                    <ImageIcon size={32} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                      <Upload size={16} style={{ marginRight: '6px' }} /> 
                      {isCompressingImg ? 'Optimizando...' : 'Subir Imagen'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        style={{ display: 'none' }} 
                        disabled={isCompressingImg}
                      />
                    </label>
                    <div className="image-compression-hint">
                      La imagen se comprime automáticamente a miniatura (apenas ~25 KB) para no ocupar almacenamiento local.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsProductModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isCompressingImg}>
              {productForm.id ? "Guardar Cambios" : "Crear Producto"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: VENTA / ASIGNACIÓN MÚLTIPLE */}
      {/* ======================================================== */}
      <Modal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        title="Vender / Asignar Equipamiento"
      >
        <form onSubmit={handleSubmitSale} className="form-grid">
          {/* SELECCIÓN DE ALUMNO */}
          <div className="form-group full-width">
            <label>Alumno *</label>
            <select 
              value={saleAlumnoId} 
              onChange={(e) => setSaleAlumnoId(e.target.value)} 
              required
            >
              <option value="">-- Seleccionar Alumno --</option>
              {alumnos
                .filter(a => a.estado === 'activo')
                .map(al => (
                  <option key={al.id} value={al.id}>{getNombreCompleto(al)}</option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Fecha de Venta *</label>
            <input 
              type="date" 
              value={saleFecha} 
              onChange={(e) => setSaleFecha(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Estado del Cobro *</label>
            <select 
              value={saleEstado} 
              onChange={(e) => setSaleEstado(e.target.value)} 
              required
            >
              <option value="pendiente">Pendiente de cobro (Deuda)</option>
              <option value="pagado">Cobrado al momento (Pagado)</option>
            </select>
          </div>

          {/* SELECTOR DE PRODUCTOS DEL CATÁLOGO */}
          <div className="form-group full-width seccion-catalogo-selector">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Añadir Productos del Catálogo</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Haz clic en un producto para añadirlo</span>
            </label>

            {productos.length > 0 ? (
              <>
                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre..."
                    value={filtroCestaBusqueda}
                    onChange={(e) => setFiltroCestaBusqueda(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '5px 10px 5px 30px',
                      fontSize: '0.85rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-panel)',
                      color: 'var(--text-light)'
                    }}
                  />
                </div>

                <div className="catalogo-pills-list">
                  {productos
                    .filter(p => !filtroCestaBusqueda || p.nombre.toLowerCase().includes(filtroCestaBusqueda.toLowerCase().trim()))
                    .map(prod => (
                      <button
                        type="button"
                        key={prod.id}
                        className="catalogo-pill-item"
                        onClick={() => handleAddProductToCesta(prod)}
                        title={`Añadir ${prod.nombre} (${formatCurrency(prod.precio)})`}
                      >
                        {prod.foto ? (
                          <img src={prod.foto} alt="" className="catalogo-pill-thumb" />
                        ) : (
                          <Package size={14} style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span>{prod.nombre}</span>
                        <strong style={{ color: 'var(--primary-color)' }}>{formatCurrency(prod.precio)}</strong>
                        <Plus size={14} style={{ marginLeft: '2px' }} />
                      </button>
                    ))}
                </div>
              </>
            ) : (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No tienes productos en el catálogo todavía. Puedes crear artículos en la pestaña Catálogo.
              </div>
            )}
          </div>

          {/* CESTA DE LA VENTA */}
          <div className="form-group full-width">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Cesta de Artículos ({cesta.length})</span>
            </label>

            {cesta.length > 0 ? (
              <div>
                <table className="cesta-table">
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Cant.</th>
                      <th style={{ width: '85px' }}>Precio</th>
                      <th style={{ width: '85px' }}>Subtotal</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cesta.map((item, idx) => {
                      const subtotal = (Number(item.precio) || 0) * (Number(item.cantidad) || 1);
                      return (
                        <tr key={idx}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {item.foto ? (
                                <img src={item.foto} alt="" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
                              ) : (
                                <Package size={18} style={{ color: 'var(--text-muted)' }} />
                              )}
                              <strong>{item.nombre}</strong>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="cesta-qty-controls">
                              <button 
                                type="button" 
                                className="cesta-qty-btn" 
                                onClick={() => handleUpdateCantidad(idx, -1)}
                              >
                                -
                              </button>
                              <span className="cesta-qty-val">{item.cantidad}</span>
                              <button 
                                type="button" 
                                className="cesta-qty-btn" 
                                onClick={() => handleUpdateCantidad(idx, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.precio}
                              onChange={(e) => handleUpdatePrecioItem(idx, e.target.value)}
                              style={{ width: '75px', padding: '3px 6px', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ fontWeight: 'bold' }}>
                            {formatCurrency(subtotal)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon text-danger"
                              onClick={() => handleRemoveFromCesta(idx)}
                              title="Quitar de la cesta"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* TOTAL */}
                <div className="cesta-total-box">
                  <span className="cesta-total-label">Total a {saleEstado === 'pendiente' ? 'asiginar (Deuda)' : 'cobrar'}:</span>
                  <span className="cesta-total-amount">{formatCurrency(totalCesta)}</span>
                </div>
              </div>
            ) : (
              <div style={{ 
                border: '1px dashed var(--border-color)', 
                borderRadius: '6px', 
                padding: '1.5rem', 
                textAlign: 'center', 
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
              }}>
                <ShoppingCart size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <div>La cesta está vacía. Selecciona productos arriba para añadirlos a la venta.</div>
              </div>
            )}
          </div>

          {/* BOTONES ACCIÓN */}
          <div className="form-actions full-width" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setIsSaleModalOpen(false)}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={cesta.length === 0 || !saleAlumnoId}
            >
              {saleEstado === 'pendiente' ? 'Asignar Deuda al Alumno' : 'Cobrar y Finalizar Venta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Equipamiento;
