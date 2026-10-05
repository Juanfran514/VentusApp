import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { grupoService } from '../services/grupoService';
import { alumnoService } from '../services/alumnoService';
import Modal from '../components/ui/Modal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { Plus, Edit2, Trash2, X, Users, GripVertical } from 'lucide-react';
import { DEFAULT_CATEGORIAS_GRUPOS, getStoredCategorias, saveStoredCategoria, mergeCategorias } from '../utils/categorias';
import { getNombreCompleto } from '../utils/formatters';
import '../pages/Alumnos.css';

const Grupos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListaModalOpen, setIsListaModalOpen] = useState(false);
  const [selectedGroupForLista, setSelectedGroupForLista] = useState(null);

  const [search, setSearch] = useState('');
  const [filtroActividad, setFiltroActividad] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    actividad: '',
    horariosArray: [],
    plazasMax: 20,
    tarifasArray: []
  });

  const alumnosTotales = useLiveQuery(() => alumnoService.getAll()) || [];
  const gruposRaw = useLiveQuery(() => grupoService.getAll()) || [];

  // Calcular ocupación de plazas mediante el servicio de grupos
  const gruposConOcupacion = useMemo(() => {
    return grupoService.calcularOcupacion(gruposRaw, alumnosTotales);
  }, [gruposRaw, alumnosTotales]);

  // Categorías/actividades sugeridas persistentes combinadas con las existentes en la BD
  const actividadesSugeridas = useMemo(() => {
    const stored = getStoredCategorias('grupos', DEFAULT_CATEGORIAS_GRUPOS);
    return mergeCategorias(stored, gruposRaw, 'actividad');
  }, [gruposRaw]);

  // Filtrado reactivo por texto y categoría de actividad
  const gruposFiltrados = useMemo(() => {
    return gruposConOcupacion.filter(g => {
      const matchSearch = !search || `${g.nombre || ''} ${g.actividad || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchActividad = !filtroActividad || g.actividad === filtroActividad;
      return matchSearch && matchActividad;
    });
  }, [gruposConOcupacion, search, filtroActividad]);

  const handleDropSwap = async (fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    if (fromIdx < 0 || fromIdx >= gruposFiltrados.length) return;
    if (toIdx < 0 || toIdx >= gruposFiltrados.length) return;

    const grupoA = gruposFiltrados[fromIdx];
    const grupoB = gruposFiltrados[toIdx];

    const currentList = gruposConOcupacion.map((g, idx) => ({
      id: g.id,
      orden: g.orden !== undefined ? g.orden : idx + 1
    }));

    const idxA = currentList.findIndex(g => g.id === grupoA.id);
    const idxB = currentList.findIndex(g => g.id === grupoB.id);

    if (idxA !== -1 && idxB !== -1) {
      const [movedItem] = currentList.splice(idxA, 1);
      currentList.splice(idxB, 0, movedItem);

      currentList.forEach((g, i) => {
        g.orden = i + 1;
      });

      await grupoService.reordenarGrupos(currentList);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleTouchStart = (idx) => {
    setDraggedIndex(idx);
    setDragOverIndex(idx);
  };

  const handleTouchMove = (e) => {
    if (draggedIndex === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetEl) return;
    const rowEl = targetEl.closest('[data-row-index]');
    if (rowEl) {
      const targetIdx = Number(rowEl.getAttribute('data-row-index'));
      if (!isNaN(targetIdx) && targetIdx !== dragOverIndex) {
        setDragOverIndex(targetIdx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      handleDropSwap(draggedIndex, dragOverIndex);
    } else {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

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
    const tarifasArray = [];
    if (grupo.tarifas) {
      for (const [dias, importe] of Object.entries(grupo.tarifas)) {
        tarifasArray.push({ dias: Number(dias), importe: Number(importe) });
      }
    }

    setFormData({
      nombre: grupo.nombre || '',
      actividad: grupo.actividad || '',
      horariosArray: Array.isArray(grupo.horarios) ? grupo.horarios : [],
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
      const tarifasMap = {};
      formData.tarifasArray.forEach(t => {
        if (t.dias > 0 && t.importe >= 0) {
          tarifasMap[t.dias] = Number(t.importe);
        }
      });

      const actividadTrimmed = formData.actividad.trim();
      const grupoData = {
        nombre: formData.nombre.trim(),
        actividad: actividadTrimmed,
        horarios: formData.horariosArray,
        plazasMax: Number(formData.plazasMax),
        tarifas: tarifasMap
      };

      if (editingId) {
        await grupoService.update(editingId, grupoData);
      } else {
        await grupoService.create(grupoData);
      }

      saveStoredCategoria('grupos', actividadTrimmed, DEFAULT_CATEGORIAS_GRUPOS);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando grupo", error);
      alert("Hubo un error al guardar el grupo.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este grupo? Se desinscribirá automáticamente a todos los alumnos que estén en él.')) {
      try {
        await grupoService.delete(id);
      } catch (error) {
        console.error("Error eliminando grupo", error);
        alert("Hubo un error al eliminar el grupo.");
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
        {/* Barra de búsqueda y filtro unificada */}
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar grupo por nombre o actividad..."
          filterValue={filtroActividad}
          onFilterChange={setFiltroActividad}
          filterOptions={actividadesSugeridas}
          filterPlaceholder="Todas las actividades"
        />

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}></th>
                <th>Nombre</th>
                <th>Actividad</th>
                <th>Horarios</th>
                <th>Plazas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gruposFiltrados.map((grupo, idx) => (
                <tr
                  key={grupo.id}
                  data-row-index={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(idx));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedIndex(idx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== idx) {
                      setDragOverIndex(idx);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                    handleDropSwap(isNaN(fromIdx) || fromIdx < 0 ? draggedIndex : fromIdx, idx);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    opacity: draggedIndex === idx ? 0.4 : 1,
                    backgroundColor: dragOverIndex === idx && draggedIndex !== idx ? 'rgba(79, 70, 229, 0.1)' : undefined,
                    borderTop: dragOverIndex === idx && draggedIndex !== idx && idx < draggedIndex ? '2px solid var(--primary-color)' : undefined,
                    borderBottom: dragOverIndex === idx && draggedIndex !== idx && idx > draggedIndex ? '2px solid var(--primary-color)' : undefined,
                    transition: 'background-color 0.15s ease, opacity 0.15s ease'
                  }}
                >
                  <td style={{ textAlign: 'center', width: '40px', padding: '8px 4px' }}>
                    <div
                      title="Mantén pulsado y arrastra para reordenar"
                      onTouchStart={() => handleTouchStart(idx)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        cursor: 'grab',
                        touchAction: 'none',
                        color: 'var(--text-muted)',
                        borderRadius: '4px'
                      }}
                    >
                      <GripVertical size={20} />
                    </div>
                  </td>
                  <td><strong>{grupo.nombre}</strong></td>
                  <td>{grupo.actividad}</td>
                  <td>
                    {Array.isArray(grupo.horarios)
                      ? grupo.horarios.map((h, i) => (
                        <div key={i} style={{ fontSize: '0.85em' }}>
                          {h.dia.substring(0, 3)} {h.horaInicio}-{h.horaFin}
                        </div>
                      ))
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
              {gruposFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center">No se encontraron grupos.</td>
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
            <input name="nombre" value={formData.nombre} onChange={handleInputChange} required placeholder="Ej: Infantil" />
          </div>
          <div className="form-group">
            <label>Actividad / Categoría *</label>
            <input
              name="actividad"
              value={formData.actividad}
              onChange={handleInputChange}
              required
              list="actividades-list"
              placeholder="Escribe o selecciona una actividad"
              autoComplete="off"
            />
            <datalist id="actividades-list">
              {actividadesSugeridas.map((act, idx) => (
                <option key={idx} value={act} />
              ))}
            </datalist>
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

                  <div className="dias-input" style={{ marginLeft: '15px' }}>
                    <span>Inicio:</span>
                    <input
                      type="time"
                      value={horario.horaInicio}
                      onChange={(e) => handleHorarioChange(index, 'horaInicio', e.target.value)}
                      required
                    />
                  </div>
                  <div className="dias-input" style={{ marginLeft: '15px' }}>
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
                  <div className="dias-input" style={{ marginLeft: '15px' }}>
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
      <Modal isOpen={isListaModalOpen} onClose={() => setIsListaModalOpen(false)} title={`Alumnos en: ${selectedGroupForLista?.nombre || ''}`}>
        <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Días Inscriptos</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {alumnosTotales.filter(a => a.estado === 'activo' && a.inscripciones?.some(ins => Number(ins.grupoId) === selectedGroupForLista?.id)).map(alumno => {
                const ins = alumno.inscripciones.find(i => Number(i.grupoId) === selectedGroupForLista.id);
                return (
                  <tr key={alumno.id}>
                    <td><strong>{getNombreCompleto(alumno)}</strong></td>
                    <td>{ins?.dias} días/sem</td>
                    <td>{alumno.telefono || '-'}</td>
                  </tr>
                );
              })}
              {alumnosTotales.filter(a => a.estado === 'activo' && a.inscripciones?.some(ins => Number(ins.grupoId) === selectedGroupForLista?.id)).length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center">No hay alumnos activos inscritos en este grupo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="form-actions full-width" style={{ marginTop: '15px' }}>
          <button type="button" className="btn-primary" onClick={() => setIsListaModalOpen(false)}>Cerrar</button>
        </div>
      </Modal>
    </div>
  );
};

export default Grupos;
