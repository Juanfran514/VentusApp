import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService, pagoService } from '../services';
import { formatCurrency, formatDate, getNombreCompleto } from '../utils/formatters';
import { exportarMesAPdf } from '../utils/pdfExport';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/common/StatusBadge';
import MonthlyAccordionList from '../components/common/MonthlyAccordionList';
import { Plus, Trash2, RotateCcw, Calendar } from 'lucide-react';
import '../pages/Alumnos.css';

const MESES = [
  { id: 1, name: 'Enero' }, { id: 2, name: 'Febrero' }, { id: 3, name: 'Marzo' },
  { id: 4, name: 'Abril' }, { id: 5, name: 'Mayo' }, { id: 6, name: 'Junio' },
  { id: 7, name: 'Julio' }, { id: 8, name: 'Agosto' }, { id: 9, name: 'Septiembre' },
  { id: 10, name: 'Octubre' }, { id: 11, name: 'Noviembre' }, { id: 12, name: 'Diciembre' }
];

const Cobros = () => {
  const currentDate = new Date();
  const currentMes = currentDate.getMonth() + 1;
  const currentAño = currentDate.getFullYear();
  const currentMesNombre = MESES.find(m => m.id === currentMes)?.name || '';

  const [activeTab, setActiveTab] = useState('pendientes');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    alumnoId: '',
    tipo: 'cuota',
    mes: currentMes,
    año: currentAño,
    importe: 0,
    fecha: currentDate.toISOString().split('T')[0]
  });

  // Consultas reactivas desacopladas mediante la capa de servicios (DIP)
  const alumnos = useLiveQuery(() => alumnoService.getActivos(), []);
  const pagos = useLiveQuery(() => pagoService.getAll(), []);

  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  // Estado de cuotas del mes actual (SRP)
  const { pendientes, pagados: pagadosDelMes } = useMemo(() => {
    return pagoService.calcularEstadoCuotasMes(alumnos, pagos, currentMes, currentAño, search);
  }, [alumnos, pagos, currentMes, currentAño, search]);

  const historial = useMemo(() => {
    if (!pagos) return [];
    let filtrados = pagos.filter(p => p.tipo === 'cuota');
    if (search) {
      const term = search.toLowerCase().trim();
      filtrados = filtrados.filter(p => {
        const al = alumnosMap[p.alumnoId];
        return al ? getNombreCompleto(al).toLowerCase().includes(term) : false;
      });
    }
    return filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [pagos, alumnosMap, search]);

  // Agrupación mensual para el historial de cuotas
  const gruposMensualesCuotas = useMemo(() => {
    return pagoService.agruparPagosPorMes(historial);
  }, [historial]);

  const openModal = (alumnoId = '') => {
    let importe = 0;
    if (alumnoId) {
      const al = alumnosMap[alumnoId];
      if (al) {
        importe = al.cuota;
      }
    }

    setFormData({
      alumnoId,
      tipo: 'cuota',
      mes: currentMes,
      año: currentAño,
      importe,
      fecha: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'alumnoId' && formData.tipo === 'cuota') {
      const al = alumnosMap[value];
      if (al) {
        setFormData(prev => ({ ...prev, [name]: Number(value), importe: al.cuota }));
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'importe' || name === 'mes' || name === 'año' || name === 'alumnoId'
        ? (value ? Number(value) : '')
        : value
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
        concepto: `Cuota ${MESES.find(m => m.id === Number(formData.mes))?.name} ${formData.año}`,
        estado: 'pagado'
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error guardando pago:', error);
    }
  };

  const handleDeletePago = async (id) => {
    if (window.confirm('¿Eliminar este registro por completo?')) {
      await pagoService.delete(id);
    }
  };

  const handleRevertirPago = async (id) => {
    if (window.confirm('¿Deshacer el pago de esta cuota? El alumno volverá a aparecer como Pendiente.')) {
      await pagoService.delete(id);
    }
  };

  const handleExportPdfMes = async (grupo) => {
    const headers = ['Fecha', 'Alumno', 'Período', 'Importe'];
    const rows = grupo.items.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto || `Cuota ${MESES.find(m => m.id === p.mes)?.name || ''} ${p.año || ''}`,
      formatCurrency(p.importe)
    ]);
    await exportarMesAPdf({
      titulo: 'Informe de Cuotas',
      mesNombre: grupo.mesNombre,
      headers,
      rows,
      totalImporte: grupo.totalImporte,
      totalRegistros: grupo.totalItems,
      nombreArchivo: `cuotas_${grupo.key}.pdf`
    });
  };

  const handleExportTodoPdf = async () => {
    const headers = ['Fecha', 'Alumno', 'Período', 'Importe'];
    const rows = historial.map(p => [
      formatDate(p.fecha),
      getNombreCompleto(alumnosMap[p.alumnoId]),
      p.concepto || `Cuota ${MESES.find(m => m.id === p.mes)?.name || ''} ${p.año || ''}`,
      formatCurrency(p.importe)
    ]);
    const total = historial.reduce((sum, p) => sum + (Number(p.importe) || 0), 0);
    await exportarMesAPdf({
      titulo: 'Historial Completo de Cuotas',
      mesNombre: 'Todos los períodos',
      headers,
      rows,
      totalImporte: total,
      totalRegistros: historial.length,
      nombreArchivo: 'historial_cuotas_completo.pdf'
    });
  };

  const currentYear = new Date().getFullYear();
  const años = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Cuotas</h1>
        <button className="btn-primary flex-center" onClick={() => openModal()}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Registrar Cuota
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
            Estado de Cuotas
          </button>
          <button 
            className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
            onClick={() => setActiveTab('historial')}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.1em', 
              cursor: 'pointer', 
              color: activeTab === 'historial' ? 'var(--primary-color)' : 'var(--text-color)', 
              fontWeight: activeTab === 'historial' ? 'bold' : 'normal', 
              borderBottom: activeTab === 'historial' ? '2px solid var(--primary-color)' : 'none', 
              padding: '5px 10px' 
            }}
          >
            Historial
          </button>
        </div>

        <div className="filters" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <input 
              type="text" 
              placeholder="Buscar alumno..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          {activeTab === 'pendientes' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Calendar size={16} />
              <span>Mes en curso:</span>
              <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                {currentMesNombre} {currentAño}
              </span>
            </div>
          )}
        </div>

        {activeTab === 'pendientes' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Cuota Asignada</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map(al => (
                  <tr key={al.id} style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                    <td><strong>{getNombreCompleto(al)}</strong></td>
                    <td>{formatCurrency(al.cuota)}</td>
                    <td><StatusBadge status="pendiente" /></td>
                    <td>
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.9em' }} onClick={() => openModal(al.id)}>
                        Cobrar
                      </button>
                    </td>
                  </tr>
                ))}
                {pagadosDelMes.map(al => (
                  <tr key={al.id} style={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                    <td><strong>{getNombreCompleto(al)}</strong></td>
                    <td>{formatCurrency(al.cuota)}</td>
                    <td><StatusBadge status="pagado" /></td>
                    <td>-</td>
                  </tr>
                ))}
                {pendientes.length === 0 && pagadosDelMes.length === 0 && (
                  <tr><td colSpan="4" className="text-center">No hay alumnos activos para mostrar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'historial' && (
          <MonthlyAccordionList
            gruposMensuales={gruposMensualesCuotas}
            tituloTipo="Cuotas"
            tipoRegistroLabel="cuotas"
            emptyMessage="No hay registros de cobros en el historial."
            onExportPdf={handleExportPdfMes}
            onExportTodoPdf={handleExportTodoPdf}
            renderTable={(items) => (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Alumno</th>
                      <th>Tipo</th>
                      <th>Período</th>
                      <th>Importe</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(pago => (
                      <tr key={pago.id}>
                        <td>{formatDate(pago.fecha)}</td>
                        <td><strong>{getNombreCompleto(alumnosMap[pago.alumnoId])}</strong></td>
                        <td style={{ textTransform: 'capitalize' }}>{pago.tipo}</td>
                        <td>{pago.tipo === 'cuota' ? `${MESES.find(m => m.id === pago.mes)?.name || ''} ${pago.año || ''}` : '-'}</td>
                        <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>+{formatCurrency(pago.importe)}</td>
                        <td>
                          <button className="btn-icon text-primary" title="Revertir a Pendiente" onClick={() => handleRevertirPago(pago.id)} style={{ marginRight: '8px' }}>
                            <RotateCcw size={18} />
                          </button>
                          <button className="btn-icon text-danger" title="Eliminar registro" onClick={() => handleDeletePago(pago.id)}>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Cobro">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Alumno *</label>
            <select name="alumnoId" value={formData.alumnoId} onChange={handleInputChange} required>
              <option value="">-- Seleccionar --</option>
              {alumnos?.map(al => <option key={al.id} value={al.id}>{getNombreCompleto(al)}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Mes *</label>
            <select name="mes" value={formData.mes} onChange={handleInputChange} required>
              {MESES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Año *</label>
            <select name="año" value={formData.año} onChange={handleInputChange} required>
              {años.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Fecha de Pago *</label>
            <input type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Importe (€) *</label>
            <input type="number" step="0.01" min="0" name="importe" value={formData.importe} onChange={handleInputChange} required />
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Registrar Pago</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Cobros;
