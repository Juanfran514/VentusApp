import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Pago } from '../db/db';
import Modal from '../components/ui/Modal';
import { Plus, Trash2, CheckCircle, Clock, RotateCcw, FilterX } from 'lucide-react';
import { DEFAULT_CATEGORIAS_MATERIAL, getStoredCategorias, saveStoredCategoria, mergeCategorias } from '../utils/categorias';
import '../pages/Alumnos.css'; 

const Equipamiento = () => {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState('pendientes');
  const [search, setSearch] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    alumnoId: '',
    concepto: '',
    importe: 0,
    fecha: currentDate.toISOString().split('T')[0]
  });

  const alumnos = useLiveQuery(() => db.alumnos.toArray());
  const equipamiento = useLiveQuery(() => db.pagos.where('tipo').equals('material').toArray());

  const alumnosMap = useMemo(() => {
    if (!alumnos) return {};
    return alumnos.reduce((acc, al) => {
      acc[al.id] = al;
      return acc;
    }, {});
  }, [alumnos]);

  // Materiales sugeridos persistentes combinados con los existentes en la BD
  const materialesSugeridos = useMemo(() => {
    const stored = getStoredCategorias('material', DEFAULT_CATEGORIAS_MATERIAL);
    return mergeCategorias(stored, equipamiento, 'concepto');
  }, [equipamiento]);

  const { pendientes, pagados } = useMemo(() => {
    if (!equipamiento) return { pendientes: [], pagados: [] };
    
    let filtered = equipamiento;
    if (search) {
      filtered = equipamiento.filter(p => {
        const al = alumnosMap[p.alumnoId];
        if (!al) return false;
        return (al.nombre + ' ' + al.apellidos).toLowerCase().includes(search.toLowerCase()) || 
               (p.concepto || '').toLowerCase().includes(search.toLowerCase());
      });
    }

    if (filtroMaterial) {
      filtered = filtered.filter(p => p.concepto === filtroMaterial);
    }

    const pendientesList = filtered.filter(p => p.estado === 'pendiente').sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const pagadosList = filtered.filter(p => p.estado === 'pagado').sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return { pendientes: pendientesList, pagados: pagadosList };
  }, [equipamiento, alumnosMap, search, filtroMaterial]);

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
    setFormData(prev => ({ ...prev, [name]: name === 'importe' || name === 'alumnoId' ? (value ? Number(value) : '') : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.alumnoId) {
      alert("Debes seleccionar un alumno");
      return;
    }
    
    try {
      const conceptoTrimmed = formData.concepto.trim();
      await db.pagos.add(new Pago({
        alumnoId: formData.alumnoId,
        tipo: 'material',
        importe: formData.importe,
        fecha: new Date(formData.fecha).toISOString(),
        concepto: conceptoTrimmed,
        estado: 'pendiente' // Se crea como deuda
      }));
      // Guardar categoría/material para que persista para siempre
      saveStoredCategoria('material', conceptoTrimmed, DEFAULT_CATEGORIAS_MATERIAL);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error asignando material", error);
    }
  };

  const handleMarcarPagado = async (id) => {
    await db.pagos.update(id, { estado: 'pagado' });
  };

  const handleRevertirPago = async (id) => {
    if(window.confirm('¿Deshacer el cobro y volver a marcarlo como pendiente?')) {
      await db.pagos.update(id, { estado: 'pendiente' });
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Eliminar este registro?')) {
      await db.pagos.delete(id);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Equipamiento</h1>
        <button className="btn-primary flex-center" onClick={openModal}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Vender / Asignar
        </button>
      </div>

      <div className="card">
        <div className="tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <button 
            className={`tab-btn ${activeTab === 'pendientes' ? 'active' : ''}`}
            onClick={() => setActiveTab('pendientes')}
            style={{ background: 'none', border: 'none', fontSize: '1.1em', cursor: 'pointer', color: activeTab === 'pendientes' ? 'var(--primary-color)' : 'var(--text-color)', fontWeight: activeTab === 'pendientes' ? 'bold' : 'normal', borderBottom: activeTab === 'pendientes' ? '2px solid var(--primary-color)' : 'none', padding: '5px 10px' }}
          >
            Pendientes de Cobro
          </button>
          <button 
            className={`tab-btn ${activeTab === 'pagados' ? 'active' : ''}`}
            onClick={() => setActiveTab('pagados')}
            style={{ background: 'none', border: 'none', fontSize: '1.1em', cursor: 'pointer', color: activeTab === 'pagados' ? 'var(--primary-color)' : 'var(--text-color)', fontWeight: activeTab === 'pagados' ? 'bold' : 'normal', borderBottom: activeTab === 'pagados' ? '2px solid var(--primary-color)' : 'none', padding: '5px 10px' }}
          >
            Historial (Pagados)
          </button>
        </div>

        {/* Barra de búsqueda y filtro por categoría/material */}
        <div className="filters" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Buscar por alumno o material..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ minWidth: '240px', flex: 1, marginBottom: 0 }}
          />
          <select 
            value={filtroMaterial} 
            onChange={(e) => setFiltroMaterial(e.target.value)}
            style={{ minWidth: '200px', width: 'auto' }}
          >
            <option value="">Todos los materiales</option>
            {materialesSugeridos.map((mat, idx) => (
              <option key={idx} value={mat}>{mat}</option>
            ))}
          </select>
          {filtroMaterial && (
            <button 
              className="btn-secondary flex-center" 
              onClick={() => setFiltroMaterial('')}
              style={{ padding: '8px 15px' }}
              title="Limpiar filtro"
            >
              <FilterX size={18} style={{ marginRight: '6px' }} />
              Limpiar
            </button>
          )}
        </div>

        {activeTab === 'pendientes' && (
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
                    <td>{new Date(pago.fecha).toLocaleDateString()}</td>
                    <td><strong>{alumnosMap[pago.alumnoId]?.nombre} {alumnosMap[pago.alumnoId]?.apellidos}</strong></td>
                    <td>{pago.concepto}</td>
                    <td>{pago.importe} €</td>
                    <td><span className="badge badge-baja flex-center" style={{ width: 'fit-content' }}><Clock size={14} style={{marginRight:'4px'}}/> Pendiente</span></td>
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
                  <tr><td colSpan="6" className="text-center">No hay material pendiente de cobro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pagados' && (
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
                {pagados.map(pago => (
                  <tr key={pago.id}>
                    <td>{new Date(pago.fecha).toLocaleDateString()}</td>
                    <td><strong>{alumnosMap[pago.alumnoId]?.nombre} {alumnosMap[pago.alumnoId]?.apellidos}</strong></td>
                    <td>{pago.concepto}</td>
                    <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>+{pago.importe} €</td>
                    <td><span className="badge badge-activo flex-center" style={{ width: 'fit-content' }}><CheckCircle size={14} style={{marginRight:'4px'}}/> Pagado</span></td>
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
                {pagados.length === 0 && (
                  <tr><td colSpan="6" className="text-center">No hay registros de material pagado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Asignar Material">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full-width">
            <label>Alumno *</label>
            <select name="alumnoId" value={formData.alumnoId} onChange={handleInputChange} required>
              <option value="">-- Seleccionar --</option>
              {alumnos?.filter(a => a.estado === 'activo').map(al => <option key={al.id} value={al.id}>{al.nombre} {al.apellidos}</option>)}
            </select>
          </div>
          <div className="form-group full-width">
            <label>Concepto / Material *</label>
            <input 
              type="text" 
              name="concepto" 
              value={formData.concepto} 
              onChange={handleInputChange} 
              required 
              list="materiales-list"
              placeholder="Escribe o selecciona un material"
              autoComplete="off"
            />
            <datalist id="materiales-list">
              {materialesSugeridos.map((mat, idx) => (
                <option key={idx} value={mat} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label>Fecha de Venta *</label>
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

export default Equipamiento;
