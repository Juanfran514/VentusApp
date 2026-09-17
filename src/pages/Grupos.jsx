import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Grupo } from '../db/db';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, Trash2, X, Users } from 'lucide-react';
import '../pages/Alumnos.css'; // Reusing Alumnos CSS since it has the table and modal styles

const Grupos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListaModalOpen, setIsListaModalOpen] = useState(false);
  const [selectedGroupForLista, setSelectedGroupForLista] = useState(null);

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // tarifas form data will be an array of objects to make it easier to manage dynamically
  // e.g. [{ dias: 1, importe: 30 }, { dias: 2, importe: 45 }]
  const [formData, setFormData] = useState({
    nombre: '',
    actividad: '',
    horariosArray: [],
    plazasMax: 0,
    tarifasArray: [] 
  });

  const alumnosTotales = useLiveQuery(() => db.alumnos.toArray());

  const grupos = useLiveQuery(
    async () => {
      let results = [];
      if (search) {
        results = await db.grupos
          .filter(g => (g.nombre + ' ' + g.actividad).toLowerCase().includes(search.toLowerCase()))
          .toArray();
      } else {
        results = await db.grupos.toArray();
      }

      // Calculate Plazas Ocupadas based on active students
      if (alumnosTotales) {
        results.forEach(grupo => {
          let ocupadas = 0;
          alumnosTotales.forEach(a => {
            if (a.estado === 'activo' && a.inscripciones) {
              if (a.inscripciones.some(ins => Number(ins.grupoId) === grupo.id)) {
                ocupadas++;
              }
            }
          });
          grupo.plazasOcupadas = ocupadas;
        });
      }

      return results;
    },
    [search, alumnosTotales]
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Tarifas dynamic handlers
  const handleAddTarifa = () => {
    setFormData(prev => ({
      ...prev,
      tarifasArray: [...prev.tarifasArray, { dias: 1, importe: 0 }]
    }));
  };

  const handleRemoveTarifa = (index) => {
    setFormData(prev => ({
      ...prev,
      tarifasArray: prev.tarifasArray.filter((_, i) => i !== index)
    }));
  };

  const handleTarifaChange = (index, field, value) => {
    setFormData(prev => {
      const newTarifas = [...prev.tarifasArray];
      newTarifas[index] = { ...newTarifas[index], [field]: value };
      return { ...prev, tarifasArray: newTarifas };
    });
  };

  // Horarios dynamic handlers
  const handleAddHorario = () => {
    setFormData(prev => ({
      ...prev,
      horariosArray: [...prev.horariosArray, { dia: 'Lunes', horaInicio: '17:00', horaFin: '18:00' }]
    }));
  };

  const handleRemoveHorario = (index) => {
    setFormData(prev => ({
      ...prev,
      horariosArray: prev.horariosArray.filter((_, i) => i !== index)
    }));
  };

  const handleHorarioChange = (index, field, value) => {
    setFormData(prev => {
      const newHorarios = [...prev.horariosArray];
      newHorarios[index] = { ...newHorarios[index], [field]: value };
      return { ...prev, horariosArray: newHorarios };
    });
  };

  const openNewModal = () => {
    setFormData({
      nombre: '',
      actividad: '',
      horariosArray: [],
      plazasMax: 20,
      tarifasArray: []
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (grupo) => {
    // Convert the tarifas object { "1": 30, "2": 45 } to an array for the form
    const tarifasArray = [];
    if (grupo.tarifas) {
      for (const [dias, importe] of Object.entries(grupo.tarifas)) {
        tarifasArray.push({ dias: Number(dias), importe: Number(importe) });
      }
    }
    
    setFormData({
      nombre: grupo.nombre || '',
      actividad: grupo.actividad || '',
      horariosArray: Array.isArray(grupo.horarios) ? grupo.horarios : [], // Soporte para strings antiguos
      plazasMax: grupo.plazasMax || 0,
      tarifasArray: tarifasArray
    });
    setEditingId(grupo.id);
    setIsModalOpen(true);
  };

  const openListaModal = (grupo) => {
    setSelectedGroupForLista(grupo);
    setIsListaModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Transform tarifasArray back to object map { "1": 30, "2": 45 }
      const tarifasMap = {};
      formData.tarifasArray.forEach(t => {
        if (t.dias > 0 && t.importe >= 0) {
          tarifasMap[t.dias] = Number(t.importe);
        }
      });

      const grupoData = {
        nombre: formData.nombre,
        actividad: formData.actividad,
        horarios: formData.horariosArray, // Guardamos el array directamente
        plazasMax: Number(formData.plazasMax),
        tarifas: tarifasMap
      };

      if (editingId) {
        await db.grupos.update(editingId, grupoData);
      } else {
        await db.grupos.add(new Grupo(grupoData));
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando grupo", error);
      alert("Hubo un error al guardar el grupo.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Estás seguro de que deseas eliminar este grupo? Se desinscribirá automáticamente a todos los alumnos que estén en él.')) {
      try {
        // Cascade delete: remove this group from all students
        const allAlumnos = await db.alumnos.toArray();
        for (const alumno of allAlumnos) {
          if (alumno.inscripciones && alumno.inscripciones.some(ins => Number(ins.grupoId) === id)) {
            // Remove the inscription
            const updatedInscripciones = alumno.inscripciones.filter(ins => Number(ins.grupoId) !== id);
            
            // Recalculate fee based on the remaining groups
            const gruposDb = await db.grupos.toArray();
            let newCuota = 0;
            updatedInscripciones.forEach(ins => {
              const g = gruposDb.find(gr => gr.id === Number(ins.grupoId));
              if (g && g.tarifas) {
                newCuota += Number(g.tarifas[ins.dias] || 0);
              }
            });

            const updatedGruposIds = updatedInscripciones.map(ins => Number(ins.grupoId));

            await db.alumnos.update(alumno.id, {
              inscripciones: updatedInscripciones,
              grupos: updatedGruposIds,
              cuota: newCuota
            });
          }
        }
        
        // Finally, delete the group
        await db.grupos.delete(id);
      } catch (error) {
         console.error("Error eliminando", error);
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Grupos</h1>
        <button className="btn-primary flex-center" onClick={openNewModal}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          Nuevo Grupo
        </button>
      </div>

      <div className="card">
        <input 
          type="text" 
          placeholder="Buscar grupo por nombre o actividad..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Actividad</th>
                <th>Horarios</th>
                <th>Plazas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grupos?.map(grupo => (
                <tr key={grupo.id}>
                  <td><strong>{grupo.nombre}</strong></td>
                  <td>{grupo.actividad}</td>
                  <td>
                    {Array.isArray(grupo.horarios) 
                      ? grupo.horarios.map((h, i) => <div key={i} style={{fontSize: '0.85em'}}>{h.dia.substring(0,3)} {h.horaInicio}-{h.horaFin}</div>)
                      : grupo.horarios}
                  </td>
                  <td>
                    <span className={`badge ${grupo.plazasOcupadas >= grupo.plazasMax ? 'badge-baja' : 'badge-activo'}`}>
                      {grupo.plazasOcupadas || 0} / {grupo.plazasMax}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon text-primary" title="Ver Alumnos" onClick={() => openListaModal(grupo)}>
                      <Users size={18} />
                    </button>
                    <button className="btn-icon text-muted" title="Editar" onClick={() => openEditModal(grupo)}>
                      <Edit2 size={18} />
                    </button>
                    <button className="btn-icon text-danger" title="Eliminar" onClick={() => handleDelete(grupo.id)}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {grupos?.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">No se encontraron grupos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Grupo" : "Nuevo Grupo"}>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Nombre del Grupo *</label>
            <input name="nombre" value={formData.nombre} onChange={handleInputChange} required placeholder="Ej: Infantil L-X" />
          </div>
          <div className="form-group">
            <label>Actividad *</label>
            <input name="actividad" value={formData.actividad} onChange={handleInputChange} required placeholder="Ej: Kickboxing" />
          </div>
          <div className="form-group full-width">
            <label>Horarios (Días y Horas)</label>
            <div className="inscripciones-list">
              {formData.horariosArray.map((horario, index) => (
                <div key={index} className="inscripcion-row">
                  <select 
                    value={horario.dia} 
                    onChange={(e) => handleHorarioChange(index, 'dia', e.target.value)}
                    required
                  >
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miércoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                  
                  <div className="dias-input" style={{marginLeft: '15px'}}>
                    <span>Inicio:</span>
                    <input 
                      type="time" 
                      value={horario.horaInicio} 
                      onChange={(e) => handleHorarioChange(index, 'horaInicio', e.target.value)}
                      required
                    />
                  </div>
                  <div className="dias-input" style={{marginLeft: '15px'}}>
                    <span>Fin:</span>
                    <input 
                      type="time" 
                      value={horario.horaFin} 
                      onChange={(e) => handleHorarioChange(index, 'horaFin', e.target.value)}
                      required
                    />
                  </div>
                  <button type="button" className="btn-icon text-danger" onClick={() => handleRemoveHorario(index)}>
                    <X size={20} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary add-inscripcion-btn" onClick={handleAddHorario}>
                + Añadir Horario
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Plazas Máximas *</label>
            <input type="number" name="plazasMax" value={formData.plazasMax} onChange={handleInputChange} required min="1" />
          </div>

          <div className="form-group full-width">
            <label>Tarifas de Precios (Días por semana)</label>
            <div className="inscripciones-list">
              {formData.tarifasArray.map((tarifa, index) => (
                <div key={index} className="inscripcion-row">
                  <div className="dias-input">
                    <span>Días/sem:</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="7" 
                      value={tarifa.dias} 
                      onChange={(e) => handleTarifaChange(index, 'dias', e.target.value)}
                      required
                    />
                  </div>
                  <div className="dias-input" style={{marginLeft: '15px'}}>
                    <span>Precio (€):</span>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      value={tarifa.importe} 
                      onChange={(e) => handleTarifaChange(index, 'importe', e.target.value)}
                      required
                    />
                  </div>
                  <button type="button" className="btn-icon text-danger" onClick={() => handleRemoveTarifa(index)}>
                    <X size={20} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary add-inscripcion-btn" onClick={handleAddTarifa}>
                + Añadir Tarifa
              </button>
            </div>
            <small className="text-muted">Ejemplo: 2 días = 40€, 3 días = 50€. Estas tarifas se usarán para calcular la cuota de los alumnos automáticamente.</small>
          </div>
          
          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? "Actualizar Grupo" : "Guardar Grupo"}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Lista de Alumnos */}
      <Modal isOpen={isListaModalOpen} onClose={() => setIsListaModalOpen(false)} title={`Alumnos en: ${selectedGroupForLista?.nombre}`}>
        <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
          <table style={{marginBottom: 0}}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Días Inscriptos</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {alumnosTotales?.filter(a => a.estado === 'activo' && a.inscripciones?.some(ins => Number(ins.grupoId) === selectedGroupForLista?.id)).map(alumno => {
                const ins = alumno.inscripciones.find(i => Number(i.grupoId) === selectedGroupForLista.id);
                return (
                  <tr key={alumno.id}>
                    <td><strong>{alumno.nombre} {alumno.apellidos}</strong></td>
                    <td>{ins?.dias} días/sem</td>
                    <td>{alumno.telefono || '-'}</td>
                  </tr>
                );
              })}
              {alumnosTotales?.filter(a => a.estado === 'activo' && a.inscripciones?.some(ins => Number(ins.grupoId) === selectedGroupForLista?.id)).length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center">No hay alumnos activos inscritos en este grupo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="form-actions full-width" style={{marginTop: '15px'}}>
          <button type="button" className="btn-primary" onClick={() => setIsListaModalOpen(false)}>Cerrar</button>
        </div>
      </Modal>
    </div>
  );
};

export default Grupos;
