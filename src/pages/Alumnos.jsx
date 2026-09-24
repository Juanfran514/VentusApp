import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Alumno } from '../db/db';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, Trash2, X, Eye, Award } from 'lucide-react';
import './Alumnos.css';

const Alumnos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '', apellidos: '', fechaNac: '', telefono: '', nTutor: '', email: '',
    cinturon: 'Blanco', cuota: 0, estado: 'activo', inscripciones: [], observaciones: '', lesiones: ''
  });

  const gruposDisponibles = useLiveQuery(() => db.grupos.toArray());

  const alumnos = useLiveQuery(
    async () => {
      let results = [];
      if (search) {
        results = await db.alumnos
          .filter(a => (a.nombre + ' ' + a.apellidos).toLowerCase().includes(search.toLowerCase()))
          .toArray();
      } else {
        results = await db.alumnos.toArray();
      }

      // Mapear grupos para mostrar información detallada
      const gruposMap = {};
      const allGroups = await db.grupos.toArray();
      allGroups.forEach(g => gruposMap[g.id] = g.nombre);

      results.forEach(a => {
        if (a.inscripciones && a.inscripciones.length > 0) {
          // Genera un string tipo: "Taekwondo (2 días), Kickboxing (3 días)"
          a.infoGrupos = a.inscripciones.map(ins => {
            const nombre = gruposMap[ins.grupoId] || 'Grupo desconocido';
            return `${nombre} (${ins.dias} días)`;
          }).join(', ');
        } else {
          a.infoGrupos = '-';
        }
      });

      return results;
    },
    [search]
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddInscripcion = () => {
    setFormData(prev => ({
      ...prev,
      inscripciones: [...prev.inscripciones, { grupoId: '', dias: 1 }]
    }));
  };

  const handleRemoveInscripcion = (index) => {
    setFormData(prev => ({
      ...prev,
      inscripciones: prev.inscripciones.filter((_, i) => i !== index)
    }));
  };

  const handleInscripcionChange = (index, field, value) => {
    setFormData(prev => {
      const newInscripciones = [...prev.inscripciones];
      newInscripciones[index] = { ...newInscripciones[index], [field]: value };
      return { ...prev, inscripciones: newInscripciones };
    });
  };

  const openNewModal = () => {
    setFormData({
      nombre: '', apellidos: '', fechaNac: '', telefono: '', nTutor: '', email: '',
      cinturon: 'Blanco', estado: 'activo', inscripciones: [], observaciones: '', lesiones: ''
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (alumno) => {
    setFormData({
      nombre: alumno.nombre || '',
      apellidos: alumno.apellidos || '',
      fechaNac: alumno.fechaNac || '',
      telefono: alumno.telefono || '',
      nTutor: alumno.nTutor || '',
      email: alumno.email || '',
      cinturon: alumno.cinturon || 'Blanco',
      estado: alumno.estado || 'activo',
      inscripciones: alumno.inscripciones || [],
      observaciones: alumno.observaciones || '',
      lesiones: alumno.lesiones || ''
    });
    setEditingId(alumno.id);
    setIsModalOpen(true);
  };

  // Cálculo de cuota en tiempo real basado en grupos y días
  const cuotaCalculada = formData.inscripciones.reduce((total, ins) => {
    if (!ins.grupoId || !ins.dias) return total;
    const grupo = gruposDisponibles?.find(g => g.id === Number(ins.grupoId));
    if (grupo && grupo.tarifas) {
      // Tomamos la tarifa por esos días. Si no existe exactamente, tomamos 0 por seguridad (hasta configurar bien el grupo)
      const tarifa = grupo.tarifas[ins.dias] || 0;
      return total + Number(tarifa);
    }
    return total;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Filtrar inscripciones vacías o sin grupo seleccionado
      const inscripcionesValidas = formData.inscripciones.filter(ins => ins.grupoId !== '');
      
      // Asegurarnos de guardar los tipos correctos (IDs numéricos si así lo usa Dexie)
      const inscripcionesMapeadas = inscripcionesValidas.map(ins => ({
        grupoId: Number(ins.grupoId),
        dias: Number(ins.dias)
      }));

      // Extraer el array de IDs para la propiedad "grupos" que usa el índice de Dexie para buscar rápido
      const gruposIds = inscripcionesMapeadas.map(ins => ins.grupoId);

      if (editingId) {
        await db.alumnos.update(editingId, {
          ...formData,
          cuota: cuotaCalculada,
          inscripciones: inscripcionesMapeadas,
          grupos: gruposIds
        });
      } else {
        const nuevoAlumno = new Alumno({
          ...formData,
          cuota: cuotaCalculada,
          inscripciones: inscripcionesMapeadas,
          grupos: gruposIds
        });
        await db.alumnos.add(nuevoAlumno);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando alumno", error);
      alert("Hubo un error al guardar el alumno.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Estás seguro de que deseas eliminar este alumno?')) {
      await db.alumnos.delete(id);
    }
  };

  const handleToggleEstado = async (alumno) => {
    const nuevoEstado = alumno.estado === 'activo' ? 'baja' : 'activo';
    try {
      await db.alumnos.update(alumno.id, { estado: nuevoEstado });
    } catch (error) {
      console.error("Error cambiando estado", error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Alumnos</h1>
        <button className="btn-primary flex-center" onClick={openNewModal}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Nuevo Alumno
        </button>
      </div>

      <div className="card">
        <input 
          type="text" 
          placeholder="Buscar alumno por nombre o apellidos..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Inscripciones (Días)</th>
                <th>Cuota Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alumnos?.map(alumno => (
                <tr key={alumno.id}>
                  <td>
                    <Link to={`/alumnos/${alumno.id}`} style={{ color: 'inherit', textDecoration: 'none' }} title="Ver ficha del alumno">
                      <strong style={{ color: 'var(--primary-color)' }}>{alumno.nombreCompleto}</strong>
                    </Link>
                    <br/>
                    <small className="text-muted">
                      {alumno.telefono || 'Sin teléfono'} {alumno.cinturon ? `• ${alumno.cinturon}` : ''}
                    </small>
                  </td>
                  <td>{alumno.infoGrupos}</td>
                  <td>{alumno.cuota} €</td>
                  <td>
                    <span 
                      className={`badge badge-${alumno.estado}`}
                      onClick={() => handleToggleEstado(alumno)}
                      style={{ cursor: 'pointer' }}
                      title="Clic para cambiar estado"
                    >
                      {alumno.estado.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <Link to={`/alumnos/${alumno.id}`} className="btn-icon text-primary" title="Ver Ficha Detallada">
                      <Eye size={18} />
                    </Link>
                    <button className="btn-icon text-muted" title="Editar" onClick={() => openEditModal(alumno)}><Edit2 size={18} /></button>
                    <button className="btn-icon text-danger" title="Eliminar" onClick={() => handleDelete(alumno.id)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {alumnos?.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">No se encontraron alumnos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Alumno" : "Nuevo Alumno"}>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Nombre *</label>
            <input name="nombre" value={formData.nombre} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Apellidos *</label>
            <input name="apellidos" value={formData.apellidos} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label>Fecha Nacimiento</label>
            <input type="date" name="fechaNac" value={formData.fechaNac} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Teléfono (Alumno o Tutor)</label>
            <input name="telefono" value={formData.telefono} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Nombre del Tutor (si es menor)</label>
            <input name="nTutor" value={formData.nTutor} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Cinturón / Grado Actual</label>
            <select name="cinturon" value={formData.cinturon || 'Blanco'} onChange={handleInputChange}>
              <option value="Blanco">Blanco</option>
              <option value="Blanco-Amarillo">Blanco-Amarillo</option>
              <option value="Amarillo">Amarillo</option>
              <option value="Amarillo-Naranja">Amarillo-Naranja</option>
              <option value="Naranja">Naranja</option>
              <option value="Naranja-Verde">Naranja-Verde</option>
              <option value="Verde">Verde</option>
              <option value="Verde-Azul">Verde-Azul</option>
              <option value="Azul">Azul</option>
              <option value="Azul-Marrón">Azul-Marrón</option>
              <option value="Marrón">Marrón</option>
              <option value="Negro 1º Dan">Negro 1º Dan</option>
              <option value="Negro 2º Dan">Negro 2º Dan</option>
              <option value="Negro 3º Dan">Negro 3º Dan</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select name="estado" value={formData.estado} onChange={handleInputChange}>
              <option value="activo">Activo</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          {/* Sección de Inscripciones a Grupos */}
          <div className="form-group full-width">
            <label>Inscripciones a Grupos y Días</label>
            <div className="inscripciones-list">
              {formData.inscripciones.map((ins, index) => (
                <div key={index} className="inscripcion-row">
                  <select 
                    value={ins.grupoId} 
                    onChange={(e) => handleInscripcionChange(index, 'grupoId', e.target.value)}
                    required
                  >
                    <option value="">Selecciona un grupo...</option>
                    {gruposDisponibles?.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre} ({g.actividad})</option>
                    ))}
                  </select>
                  
                  <div className="dias-input">
                    <span>Días/sem:</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="7" 
                      value={ins.dias} 
                      onChange={(e) => handleInscripcionChange(index, 'dias', e.target.value)}
                      required
                    />
                  </div>
                  
                  <button type="button" className="btn-icon text-danger" onClick={() => handleRemoveInscripcion(index)}>
                    <X size={20} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary add-inscripcion-btn" onClick={handleAddInscripcion}>
                + Añadir Grupo
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Cuota Mensual Automática (€)</label>
            <div className="cuota-display">
              {cuotaCalculada} €
            </div>
            <small className="text-muted">Se calcula según las tarifas de los grupos seleccionados.</small>
          </div>
          
          <div className="form-group full-width">
            <label>Lesiones o Información médica</label>
            <textarea name="lesiones" value={formData.lesiones} onChange={handleInputChange} rows="2"></textarea>
          </div>
          <div className="form-group full-width">
            <label>Otras observaciones</label>
            <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} rows="2"></textarea>
          </div>
          
          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? "Actualizar Alumno" : "Guardar Alumno"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Alumnos;
