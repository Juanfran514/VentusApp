import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Pago } from '../db/db';
import Modal from '../components/ui/Modal';
import { Plus, Trash2, Search, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import '../pages/Alumnos.css'; // Reusing table styles

const Cobros = () => {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState('pendientes');
  const [selectedMes, setSelectedMes] = useState(currentDate.getMonth() + 1);
  const [selectedAño, setSelectedAño] = useState(currentDate.getFullYear());
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    alumnoId: '',
    tipo: 'cuota',
    mes: currentDate.getMonth() + 1,
    año: currentDate.getFullYear(),
    importe: 0,
    fecha: currentDate.toISOString().split('T')[0]
  });

  const alumnos = useLiveQuery(() => db.alumnos.where('estado').equals('activo').toArray());
  const pagos = useLiveQuery(() => db.pagos.toArray());

  const alumnosMap = useMemo(() => {
    if (!alumnos) return {};
    return alumnos.reduce((acc, al) => {
      acc[al.id] = al;
      return acc;
    }, {});
  }, [alumnos]);

  // Derived state for 'pendientes' and 'historial'
  const { pendientes, pagadosDelMes } = useMemo(() => {
    if (!alumnos || !pagos) return { pendientes: [], pagadosDelMes: [] };
    
    const pagosCuotaDelMes = pagos.filter(p => 
      p.tipo === 'cuota' && 
      Number(p.mes) === Number(selectedMes) && 
      Number(p.año) === Number(selectedAño)
    );

    const pagadosIds = new Set(pagosCuotaDelMes.map(p => p.alumnoId));

    const pendientesList = [];
    const pagadosList = [];

    alumnos.forEach(al => {
      if (search && !(al.nombre + ' ' + al.apellidos).toLowerCase().includes(search.toLowerCase())) {
        return; // filter by search
      }
      if (pagadosIds.has(al.id)) {
        pagadosList.push(al);
      } else {
        pendientesList.push(al);
      }
    });

    return { pendientes: pendientesList, pagadosDelMes: pagadosList };
  }, [alumnos, pagos, selectedMes, selectedAño, search]);

  const historial = useMemo(() => {
    if (!pagos) return [];
    let filtered = pagos.filter(p => p.tipo === 'cuota');
    if (search) {
      filtered = filtered.filter(p => {
        const al = alumnosMap[p.alumnoId];
        if (!al) return false;
        return (al.nombre + ' ' + al.apellidos).toLowerCase().includes(search.toLowerCase());
      });
    }
    return filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [pagos, alumnosMap, search]);

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
      mes: selectedMes,
      año: selectedAño,
      importe,
      fecha: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-update importe if student or type changes
    if (name === 'alumnoId' && formData.tipo === 'cuota') {
       const al = alumnosMap[value];
       if (al) {
         setFormData(prev => ({ ...prev, [name]: Number(value), importe: al.cuota }));
         return;
       }
    }
    if (name === 'tipo' && value === 'cuota' && formData.alumnoId) {
       const al = alumnosMap[formData.alumnoId];
       if (al) {
         setFormData(prev => ({ ...prev, [name]: value, importe: al.cuota }));
         return;
       }
    }

    setFormData(prev => ({ ...prev, [name]: name === 'importe' || name === 'mes' || name === 'año' || name === 'alumnoId' ? (value ? Number(value) : '') : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.alumnoId) {
      alert("Debes seleccionar un alumno");
      return;
    }
    
    try {
      await db.pagos.add(new Pago({
        alumnoId: formData.alumnoId,
        tipo: formData.tipo,
        mes: formData.mes,
        año: formData.año,
        importe: formData.importe,
        fecha: new Date(formData.fecha).toISOString()
      }));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando pago", error);
    }
  };

  const handleDeletePago = async (id) => {
    if(window.confirm('¿Eliminar este registro por completo?')) {
      await db.pagos.delete(id);
    }
  };

  const handleRevertirPago = async (id) => {
    if(window.confirm('¿Deshacer el pago de esta cuota? El alumno volverá a aparecer como Pendiente.')) {
      await db.pagos.delete(id); // Al borrar el registro de cuota, vuelve automáticamente a pendientes
    }
  };

  const meses = [
    { id: 1, name: 'Enero' }, { id: 2, name: 'Febrero' }, { id: 3, name: 'Marzo' },
    { id: 4, name: 'Abril' }, { id: 5, name: 'Mayo' }, { id: 6, name: 'Junio' },
    { id: 7, name: 'Julio' }, { id: 8, name: 'Agosto' }, { id: 9, name: 'Septiembre' },
    { id: 10, name: 'Octubre' }, { id: 11, name: 'Noviembre' }, { id: 12, name: 'Diciembre' }
  ];

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
            style={{ background: 'none', border: 'none', fontSize: '1.1em', cursor: 'pointer', color: activeTab === 'pendientes' ? 'var(--primary-color)' : 'var(--text-color)', fontWeight: activeTab === 'pendientes' ? 'bold' : 'normal', borderBottom: activeTab === 'pendientes' ? '2px solid var(--primary-color)' : 'none', padding: '5px 10px' }}
          >
            Estado de Cuotas
          </button>
          <button 
            className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
            onClick={() => setActiveTab('historial')}
            style={{ background: 'none', border: 'none', fontSize: '1.1em', cursor: 'pointer', color: activeTab === 'historial' ? 'var(--primary-color)' : 'var(--text-color)', fontWeight: activeTab === 'historial' ? 'bold' : 'normal', borderBottom: activeTab === 'historial' ? '2px solid var(--primary-color)' : 'none', padding: '5px 10px' }}
          >
            Historial
          </button>
        </div>

        <div className="filters" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeTab === 'pendientes' && (
            <>
              <select value={selectedMes} onChange={(e) => setSelectedMes(Number(e.target.value))} className="search-input" style={{ width: 'auto', marginBottom: 0 }}>
                {meses.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select value={selectedAño} onChange={(e) => setSelectedAño(Number(e.target.value))} className="search-input" style={{ width: 'auto', marginBottom: 0 }}>
                {años.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </>
          )}
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
                    <td><strong>{al.nombre} {al.apellidos}</strong></td>
                    <td>{al.cuota} €</td>
                    <td><span className="badge badge-baja flex-center" style={{ width: 'fit-content' }}><Clock size={14} style={{marginRight:'4px'}}/> Pendiente</span></td>
                    <td>
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.9em' }} onClick={() => openModal(al.id, 'cuota')}>
                        Cobrar
                      </button>
                    </td>
                  </tr>
                ))}
                {pagadosDelMes.map(al => (
                  <tr key={al.id} style={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                    <td><strong>{al.nombre} {al.apellidos}</strong></td>
                    <td>{al.cuota} €</td>
                    <td><span className="badge badge-activo flex-center" style={{ width: 'fit-content' }}><CheckCircle size={14} style={{marginRight:'4px'}}/> Pagado</span></td>
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
                {historial.map(pago => (
                  <tr key={pago.id}>
                    <td>{new Date(pago.fecha).toLocaleDateString()}</td>
                    <td><strong>{alumnosMap[pago.alumnoId]?.nombre} {alumnosMap[pago.alumnoId]?.apellidos}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{pago.tipo}</td>
                    <td>{pago.tipo === 'cuota' ? `${meses.find(m => m.id === pago.mes)?.name} ${pago.año}` : '-'}</td>
                    <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>+{pago.importe} €</td>
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
                {historial.length === 0 && (
                  <tr><td colSpan="6" className="text-center">No hay registros de cobros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Cobro">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Alumno *</label>
            <select name="alumnoId" value={formData.alumnoId} onChange={handleInputChange} required>
              <option value="">-- Seleccionar --</option>
              {alumnos?.map(al => <option key={al.id} value={al.id}>{al.nombre} {al.apellidos}</option>)}
            </select>
          </div>
          <div className="form-group" style={{display: 'none'}}>
            <label>Tipo de Cobro *</label>
            <input type="hidden" name="tipo" value="cuota" />
          </div>
          
          <div className="form-group">
            <label>Mes *</label>
            <select name="mes" value={formData.mes} onChange={handleInputChange} required>
              {meses.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
