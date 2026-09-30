import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService, pagoService } from '../services';
import { formatCurrency, formatDate, getNombreCompleto } from '../utils/formatters';
import { DEFAULT_CATEGORIAS_LICENCIAS, getStoredCategorias, saveStoredCategoria, mergeCategorias } from '../utils/categorias';
import { exportarMesAPdf } from '../utils/pdfExport';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/common/StatusBadge';
import SearchFilterBar from '../components/common/SearchFilterBar';
import MonthlyAccordionList from '../components/common/MonthlyAccordionList';
import { Plus, Trash2, RotateCcw, IdCard } from 'lucide-react';
import '../pages/Alumnos.css';

const Licencias = () => {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState('pendientes');
  const [search, setSearch] = useState('');
  const [filtroLicencia, setFiltroLicencia] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    alumnoId: '',
    concepto: '',
    importe: 0,
    fecha: currentDate.toISOString().split('T')[0]
  });

  // Consultas delegadas a servicios (DIP)
  const alumnos = useLiveQuery(() => alumnoService.getAll(), []);
  const licencias = useLiveQuery(() => pagoService.getByTipo('licencia'), []);

  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  // Licencias sugeridas persistentes
  const licenciasSugeridas = useMemo(() => {
    const stored = getStoredCategorias('licencias', DEFAULT_CATEGORIAS_LICENCIAS);
    return mergeCategorias(stored, licencias, 'concepto');
  }, [licencias]);

  // Filtrado delegado al servicio de pagos (SRP)
  const { pendientes, pagados } = useMemo(() => {
    let baseList = licencias || [];
    if (filtroLicencia) {
      baseList = baseList.filter(p => p.concepto === filtroLicencia);
    }
    return pagoService.separarPendientesYPagados(baseList, alumnosMap, search);
  }, [licencias, alumnosMap, search, filtroLicencia]);

  // Agrupación mensual del historial pagado
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
      alert('Debes seleccionar un alumno');
      return;
    }

    try {
      const conceptoTrimmed = (formData.concepto || '').trim();
      await pagoService.create({
        ...formData,
        concepto: conceptoTrimmed,
        tipo: 'licencia',
        estado: 'pendiente' // Se crea como deuda pendiente de cobro
      });
      // Guardar categoría de licencia para que persista
      saveStoredCategoria('licencias', conceptoTrimmed, DEFAULT_CATEGORIAS_LICENCIAS);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error asignando licencia:', error);
    }
  };

  const handleMarcarPagado = async (id) => {
    await pagoService.marcarPagado(id);
  };

  const handleRevertirPago = async (id) => {
    if (window.confirm('¿Deshacer el cobro y volver a marcarlo como pendiente?')) {
      await pagoService.revertirPago(id);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este registro de licencia?')) {
      await pagoService.delete(id);
    }
  };

  const handleExportPdfMes = async (grupo) => {
    const headers = ['Fecha', 'Alumno', 'Licencia / Concepto', 'Importe'];
    const rows = grupo.items.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe)
    ]);
    await exportarMesAPdf({
      titulo: 'Informe de Licencias Deportivas',
      mesNombre: grupo.mesNombre,
      headers,
      rows,
      totalImporte: grupo.totalImporte,
      totalRegistros: grupo.totalItems,
      nombreArchivo: `licencias_${grupo.key}.pdf`
    });
  };

  const handleExportTodoPdf = async () => {
    const headers = ['Fecha', 'Alumno', 'Licencia / Concepto', 'Importe'];
    const rows = pagados.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe)
    ]);
    const total = pagados.reduce((sum, p) => sum + (Number(p.importe) || 0), 0);
    await exportarMesAPdf({
      titulo: 'Historial Completo de Licencias',
      mesNombre: 'Todos los períodos',
      headers,
      rows,
      totalImporte: total,
      totalRegistros: pagados.length,
      nombreArchivo: 'historial_licencias_completo.pdf'
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Licencias Deportivas</h1>
        <button className="btn-primary flex-center" onClick={openModal}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Asignar Licencia
        </button>
      </div>

      <div className="card">
        <div className="tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <button 
            className={`tab-btn ${activeTab === 'pendientes' ? 'active' : ''}`}
            onClick={() => setActiveTab('pendientes')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.1em', 
              cursor: 'pointer', 
              color: activeTab === 'pendientes' ? 'var(--primary-color)' : 'var(--text-color)', 
              fontWeight: activeTab === 'pendientes' ? 'bold' : 'normal', 
              borderBottom: activeTab === 'pendientes' ? '2px solid var(--primary-color)' : 'none', 
              padding: '5px 10px' 
            }}
          >
            Pendientes de Cobro
          </button>
          <button 
            className={`tab-btn ${activeTab === 'pagados' ? 'active' : ''}`}
            onClick={() => setActiveTab('pagados')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.1em', 
              cursor: 'pointer', 
              color: activeTab === 'pagados' ? 'var(--primary-color)' : 'var(--text-color)', 
              fontWeight: activeTab === 'pagados' ? 'bold' : 'normal', 
              borderBottom: activeTab === 'pagados' ? '2px solid var(--primary-color)' : 'none', 
              padding: '5px 10px' 
            }}
          >
            Historial (Pagadas)
          </button>
        </div>

        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por alumno o tipo de licencia..."
          filterValue={filtroLicencia}
          onFilterChange={setFiltroLicencia}
          filterOptions={licenciasSugeridas}
          filterPlaceholder="Todas las licencias"
        />

        {activeTab === 'pendientes' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Alumno</th>
                  <th>Licencia / Concepto</th>
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
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.9em', marginRight: '8px' }} onClick={() => handleMarcarPagado(pago.id)}>
                        Cobrar
                      </button>
                      <button className="btn-icon text-danger" title="Eliminar registro" onClick={() => handleDelete(pago.id)}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {pendientes.length === 0 && (
                  <tr><td colSpan="6" className="text-center">No hay licencias pendientes de cobro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pagados' && (
          <MonthlyAccordionList
            gruposMensuales={gruposMensualesPagados}
            tituloTipo="Licencias"
            tipoRegistroLabel="licencias"
            emptyMessage="No hay registros de licencias pagadas."
            onExportPdf={handleExportPdfMes}
            onExportTodoPdf={handleExportTodoPdf}
            renderTable={(items) => (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Alumno</th>
                      <th>Licencia / Concepto</th>
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
                        <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>+{formatCurrency(pago.importe)}</td>
                        <td><StatusBadge status={pago.estado} /></td>
                        <td>
                          <button className="btn-icon text-primary" title="Revertir a Pendiente" onClick={() => handleRevertirPago(pago.id)} style={{ marginRight: '8px' }}>
                            <RotateCcw size={18} />
                          </button>
                          <button className="btn-icon text-danger" title="Eliminar registro" onClick={() => handleDelete(pago.id)}>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Asignar Licencia Deportiva">
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
            <label>Licencia / Concepto *</label>
            <input 
              type="text" 
              name="concepto" 
              value={formData.concepto} 
              onChange={handleInputChange} 
              required 
              list="licencias-list"
              placeholder="Escribe o selecciona un tipo de licencia"
              autoComplete="off"
            />
            <datalist id="licencias-list">
              {licenciasSugeridas.map((lic, idx) => (
                <option key={idx} value={lic} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label>Fecha de Registro *</label>
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

export default Licencias;
