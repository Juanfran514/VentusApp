import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService, pagoService } from '../services';
import { formatCurrency, formatDate, getNombreCompleto } from '../utils/formatters';
import { exportarMesAPdf } from '../utils/pdfExport';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/common/StatusBadge';
import SearchFilterBar from '../components/common/SearchFilterBar';
import MonthlyAccordionList from '../components/common/MonthlyAccordionList';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import '../pages/Alumnos.css';

const Examenes = () => {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState('pendientes');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    alumnoId: '',
    concepto: '',
    importe: 0,
    fecha: currentDate.toISOString().split('T')[0]
  });

  // Consultas delegadas a la capa de servicios (DIP)
  const alumnos = useLiveQuery(() => alumnoService.getAll(), []);
  const examenes = useLiveQuery(() => pagoService.getByTipo('examen'), []);

  // Mapa de alumnos mediante el servicio (DRY)
  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  // Lógica de filtrado delegada al servicio de pagos (SRP)
  const { pendientes, pagados } = useMemo(() => {
    return pagoService.separarPendientesYPagados(examenes, alumnosMap, search);
  }, [examenes, alumnosMap, search]);

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
      await pagoService.create({
        ...formData,
        tipo: 'examen',
        estado: 'pendiente' // Se crea como deuda
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error asignando examen:', error);
    }
  };

  const handleMarcarPagado = async (id) => {
    await pagoService.marcarPagado(id);
  };

  const handleRevertirPago = async (id) => {
    if (window.confirm('¿Deshacer el pago y volver a marcarlo como pendiente?')) {
      await pagoService.revertirPago(id);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este registro?')) {
      await pagoService.delete(id);
    }
  };

  const handleExportPdfMes = async (grupo) => {
    const headers = ['Fecha', 'Alumno', 'Concepto / Grado', 'Importe'];
    const rows = grupo.items.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe)
    ]);
    await exportarMesAPdf({
      titulo: 'Informe de Exámenes',
      mesNombre: grupo.mesNombre,
      headers,
      rows,
      totalImporte: grupo.totalImporte,
      totalRegistros: grupo.totalItems,
      nombreArchivo: `examenes_${grupo.key}.pdf`
    });
  };

  const handleExportTodoPdf = async () => {
    const headers = ['Fecha', 'Alumno', 'Concepto / Grado', 'Importe'];
    const rows = pagados.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto,
      formatCurrency(p.importe)
    ]);
    const total = pagados.reduce((sum, p) => sum + (Number(p.importe) || 0), 0);
    await exportarMesAPdf({
      titulo: 'Historial Completo de Exámenes',
      mesNombre: 'Todos los períodos',
      headers,
      rows,
      totalImporte: total,
      totalRegistros: pagados.length,
      nombreArchivo: 'historial_examenes_completo.pdf'
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Exámenes</h1>
        <button className="btn-primary flex-center" onClick={openModal}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Asignar Examen
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
            Historial (Pagados)
          </button>
        </div>

        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por alumno o concepto..."
        />

        {activeTab === 'pendientes' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha Examen</th>
                  <th>Alumno</th>
                  <th>Concepto</th>
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
                  <tr><td colSpan="6" className="text-center">No hay exámenes pendientes de cobro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pagados' && (
          <MonthlyAccordionList
            gruposMensuales={gruposMensualesPagados}
            tituloTipo="Exámenes"
            tipoRegistroLabel="exámenes"
            emptyMessage="No hay registros de exámenes pagados."
            onExportPdf={handleExportPdfMes}
            onExportTodoPdf={handleExportTodoPdf}
            renderTable={(items) => (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha Examen</th>
                      <th>Alumno</th>
                      <th>Concepto / Grado</th>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Asignar Examen">
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
            <label>Concepto / Grado *</label>
            <input type="text" name="concepto" value={formData.concepto} onChange={handleInputChange} required placeholder="Ej: Cinturón Amarillo" />
          </div>
          <div className="form-group">
            <label>Fecha del Examen *</label>
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

export default Examenes;
