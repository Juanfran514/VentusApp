import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Gasto } from '../db/db';
import Modal from '../components/ui/Modal';
import { Plus, Trash2, FilterX } from 'lucide-react';
import '../pages/Alumnos.css'; 

const Gastos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  
  const [formData, setFormData] = useState({
    concepto: '',
    categoria: '',
    importe: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Obtenemos los gastos de la BD ordenados por fecha
  const gastos = useLiveQuery(() => db.gastos.orderBy('fecha').reverse().toArray());

  // Extraemos las categorías únicas existentes para el filtro y el formulario
  const categoriasSugeridas = useMemo(() => {
    if (!gastos) return [];
    const uniqueCats = new Set(gastos.map(g => g.categoria).filter(c => c && c.trim() !== ''));
    return Array.from(uniqueCats).sort();
  }, [gastos]);

  // Aplicar el filtro de categoría seleccionada
  const gastosFiltrados = useMemo(() => {
    if (!gastos) return [];
    if (!filtroCategoria) return gastos;
    return gastos.filter(g => g.categoria === filtroCategoria);
  }, [gastos, filtroCategoria]);

  const openModal = () => {
    setFormData({
      concepto: '',
      categoria: '',
      importe: '',
      fecha: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'importe' ? (value ? Number(value) : '') : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await db.gastos.add(new Gasto({
        concepto: formData.concepto.trim(),
        categoria: formData.categoria.trim(), 
        importe: Number(formData.importe),
        fecha: new Date(formData.fecha).toISOString()
      }));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al guardar el gasto:", error);
      alert("Hubo un error al guardar el gasto.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro de gasto?')) {
      await db.gastos.delete(id);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Registro de Gastos</h1>
        <button className="btn-primary flex-center" onClick={openModal}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Añadir Gasto
        </button>
      </div>

      <div className="card">
        {/* Barra de filtros */}
        <div className="filters" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={filtroCategoria} 
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{ minWidth: '220px', width: 'auto' }}
          >
            <option value="">Todas las categorías</option>
            {categoriasSugeridas.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          {filtroCategoria && (
            <button 
              className="btn-secondary flex-center" 
              onClick={() => setFiltroCategoria('')}
              style={{ padding: '8px 15px' }}
              title="Limpiar filtro"
            >
              <FilterX size={18} style={{ marginRight: '6px' }} />
              Limpiar
            </button>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Importe</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map(gasto => (
                <tr key={gasto.id}>
                  <td>{new Date(gasto.fecha).toLocaleDateString()}</td>
                  <td><strong>{gasto.concepto}</strong></td>
                  <td>
                    <span className="badge flex-center" style={{ width: 'fit-content', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                      {gasto.categoria}
                    </span>
                  </td>
                  <td style={{ color: 'var(--danger-color, #ef4444)', fontWeight: 'bold' }}>-{gasto.importe} €</td>
                  <td>
                    <button className="btn-icon text-danger" title="Eliminar gasto" onClick={() => handleDelete(gasto.id)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {gastosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">No hay gastos que coincidan con el filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Añadir Nuevo Gasto">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full-width">
            <label>Concepto / Motivo *</label>
            <input 
              type="text" 
              name="concepto" 
              value={formData.concepto} 
              onChange={handleInputChange} 
              required 
              placeholder="Ej: Recibo de luz enero" 
            />
          </div>
          
          <div className="form-group full-width">
            <label>Categoría *</label>
            <input 
              type="text" 
              name="categoria" 
              value={formData.categoria} 
              onChange={handleInputChange} 
              required 
              list="categorias-list"
              placeholder="Escribe o selecciona una categoría"
              autoComplete="off"
            />
            <datalist id="categorias-list">
              {categoriasSugeridas.map((cat, idx) => (
                <option key={idx} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Fecha *</label>
            <input 
              type="date" 
              name="fecha" 
              value={formData.fecha} 
              onChange={handleInputChange} 
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
              value={formData.importe} 
              onChange={handleInputChange} 
              required 
              placeholder="0.00"
            />
          </div>

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar Gasto</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Gastos;
