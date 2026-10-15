import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { grupoService } from '../services/grupoService';
import { alumnoService } from '../services/alumnoService';
import Modal from '../components/ui/Modal';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { Plus, Edit2, Trash2, X, Users, GripVertical } from 'lucide-react';
import { DEFAULT_CATEGORIAS_GRUPOS, getStoredCategorias, saveStoredCategoria, mergeCategorias } from '../utils/categorias';
import { getNombreCompleto, formatCurrency } from '../utils/formatters';
import '../pages/Alumnos.css';

const Grupos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListaModalOpen, setIsListaModalOpen] = useState(false);
  const [selectedGroupIdForLista, setSelectedGroupIdForLista] = useState(null);
  const [quickAlumnoState, setQuickAlumnoState] = useState({ alumnoId: '', dias: 1 });

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
    tarifasArray: [],
    alumnosInscritos: []
  });

  const alumnosTotales = useLiveQuery(() => alumnoService.getAll()) || [];
  const gruposRaw = useLiveQuery(() => grupoService.getAll()) || [];

  // Calcular ocupación de plazas mediante el servicio de grupos
  const gruposConOcupacion = useMemo(() => {
    return grupoService.calcularOcupacion(gruposRaw, alumnosTotales);
  }, [gruposRaw, alumnosTotales]);

  // Grupo seleccionado actualmente para el modal de gestión de alumnos
  const selectedGroup = useMemo(() => {
    return gruposConOcupacion.find(g => g.id === selectedGroupIdForLista) || null;
  }, [gruposConOcupacion, selectedGroupIdForLista]);

  // Alumnos activos inscritos en el grupo seleccionado
  const alumnosInscritosEnGrupo = useMemo(() => {
    if (!selectedGroupIdForLista) return [];
    return alumnosTotales.filter(a => 
      a.estado === 'activo' && 
      a.inscripciones?.some(ins => Number(ins.grupoId) === selectedGroupIdForLista)
    );
  }, [alumnosTotales, selectedGroupIdForLista]);

  // Alumnos activos disponibles para inscribir (que no estén ya en el grupo)
  const alumnosDisponiblesParaInscribir = useMemo(() => {
    if (!selectedGroupIdForLista) return [];
    return alumnosTotales.filter(a => 
      a.estado === 'activo' && 
      !a.inscripciones?.some(ins => Number(ins.grupoId) === selectedGroupIdForLista)
    );
  }, [alumnosTotales, selectedGroupIdForLista]);

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

  // Alumnos inscritos en modal de creación/edición de grupo
  const handleAddAlumnoInscrito = () => {
    const defaultDias = formData.tarifasArray.length > 0 ? Number(formData.tarifasArray[0].dias) : 1;
    setFormData(prev => ({
      ...prev,
      alumnosInscritos: [...prev.alumnosInscritos, { alumnoId: '', dias: defaultDias }]
    }));
  };

  const handleRemoveAlumnoInscrito = (index) => {
    setFormData(prev => ({
      ...prev,
      alumnosInscritos: prev.alumnosInscritos.filter((_, i) => i !== index)
    }));
  };

  const handleAlumnoInscritoChange = (index, field, value) => {
    setFormData(prev => {
      const nextList = [...prev.alumnosInscritos];
      nextList[index] = { ...nextList[index], [field]: value };
      return { ...prev, alumnosInscritos: nextList };
    });
  };

  const openNewModal = () => {
    setFormData({
      nombre: '',
      actividad: '',
      horariosArray: [],
      plazasMax: 20,
      tarifasArray: [],
      alumnosInscritos: []
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

    const currentAlumnos = alumnosTotales
      .filter(a => a.estado === 'activo' && a.inscripciones?.some(ins => Number(ins.grupoId) === grupo.id))
      .map(a => {
        const ins = a.inscripciones.find(i => Number(i.grupoId) === grupo.id);
        return {
          alumnoId: a.id,
          dias: ins?.dias || 1
        };
      });

    setFormData({
      nombre: grupo.nombre || '',
      actividad: grupo.actividad || '',
      horariosArray: Array.isArray(grupo.horarios) ? grupo.horarios : [],
      plazasMax: grupo.plazasMax || 0,
      tarifasArray: tarifasArray,
      alumnosInscritos: currentAlumnos
    });
    setEditingId(grupo.id);
    setIsModalOpen(true);
  };

  const openListaModal = (grupo) => {
    setSelectedGroupIdForLista(grupo.id);
    const defaultDias = grupo.tarifas && Object.keys(grupo.tarifas).length > 0 
      ? Number(Object.keys(grupo.tarifas)[0]) 
      : 1;
    setQuickAlumnoState({ alumnoId: '', dias: defaultDias });
    setIsListaModalOpen(true);
  };

  const handleQuickInscribirAlumno = async () => {
    if (!quickAlumnoState.alumnoId || !selectedGroupIdForLista) return;
    try {
      await grupoService.inscribirAlumno(
        selectedGroupIdForLista,
        quickAlumnoState.alumnoId,
        quickAlumnoState.dias
      );
      const defaultDias = selectedGroup?.tarifas && Object.keys(selectedGroup.tarifas).length > 0
        ? Number(Object.keys(selectedGroup.tarifas)[0])
        : 1;
      setQuickAlumnoState({ alumnoId: '', dias: defaultDias });
    } catch (err) {
      console.error("Error al inscribir alumno:", err);
      alert("Hubo un error al inscribir al alumno en el grupo.");
    }
  };

  const handleQuickDesinscribir = async (alumno) => {
    if (!selectedGroupIdForLista || !alumno) return;
    const confirmMsg = `¿Estás seguro de que deseas desinscribir a ${getNombreCompleto(alumno)} de este grupo? Su cuota mensual se actualizará automáticamente.`;
    if (window.confirm(confirmMsg)) {
      try {
        await grupoService.desinscribirAlumno(selectedGroupIdForLista, alumno.id);
      } catch (err) {
        console.error("Error al desinscribir alumno:", err);
        alert("Hubo un error al desinscribir al alumno.");
      }
    }
  };

  const handleUpdateAlumnoDias = async (alumnoId, newDias) => {
    if (!selectedGroupIdForLista || !alumnoId) return;
    try {
      await grupoService.inscribirAlumno(selectedGroupIdForLista, alumnoId, newDias);
    } catch (err) {
      console.error("Error al actualizar días:", err);
      alert("Hubo un error al actualizar los días del alumno.");
    }
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

      const validAlumnosInscritos = formData.alumnosInscritos
        .filter(item => item.alumnoId !== '')
        .map(item => ({
          alumnoId: Number(item.alumnoId),
          dias: Number(item.dias) || 1
        }));

      if (editingId) {
        await grupoService.update(editingId, grupoData);
        await grupoService.sincronizarAlumnosGrupo(editingId, validAlumnosInscritos);
      } else {
        const newId = await grupoService.create(grupoData);
        if (validAlumnosInscritos.length > 0) {
          await grupoService.sincronizarAlumnosGrupo(newId, validAlumnosInscritos);
        }
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
                    <button className="btn-icon text-primary" title="Gestionar Alumnos" onClick={() => openListaModal(grupo)}>
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
                  <div className="dias-input">
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
                  <div className="dias-input">
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


          {/* Sección de alumnos inscritos en el grupo */}
          <div className="form-group full-width">
            <label>Alumnos Inscritos</label>
            <div className="inscripciones-list">
              {formData.alumnosInscritos.map((item, index) => (
                <div key={index} className="inscripcion-row">
                  <select
                    value={item.alumnoId}
                    onChange={(e) => handleAlumnoInscritoChange(index, 'alumnoId', e.target.value)}
                    required
                  >
                    <option value="">Selecciona un alumno...</option>
                    {alumnosTotales
                      .filter(a => a.estado === 'activo' || Number(a.id) === Number(item.alumnoId))
                      .map(a => (
                        <option 
                          key={a.id} 
                          value={a.id}
                          disabled={formData.alumnosInscritos.some((other, i) => i !== index && Number(other.alumnoId) === Number(a.id))}
                        >
                          {getNombreCompleto(a)}
                        </option>
                      ))}
                  </select>

                  <div className="dias-input">
                    <span>Días/sem:</span>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={item.dias}
                      onChange={(e) => handleAlumnoInscritoChange(index, 'dias', e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-icon text-danger"
                    title="Quitar alumno"
                    onClick={() => handleRemoveAlumnoInscrito(index)}
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="btn-secondary add-inscripcion-btn"
                onClick={handleAddAlumnoInscrito}
              >
                + Añadir Alumno
              </button>
            </div>
            <small className="text-muted">
              {editingId
                ? 'Puedes añadir o quitar alumnos de este grupo. Se actualizarán automáticamente sus cuotas.'
                : 'Puedes inscribir alumnos a este grupo desde su creación. También podrás gestionarlos más adelante.'}
            </small>
          </div>
          

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editingId ? "Actualizar Grupo" : "Guardar Grupo"}</button>
          </div>
        </form>
      </Modal>

      {/* Modal Gestión de Alumnos del Grupo */}
      <Modal 
        isOpen={isListaModalOpen} 
        onClose={() => setIsListaModalOpen(false)} 
        title={`Alumnos en: ${selectedGroup?.nombre || ''}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <strong>Actividad:</strong> {selectedGroup?.actividad || '-'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Plazas:</span>
            <span className={`badge ${(selectedGroup?.plazasOcupadas || 0) >= (selectedGroup?.plazasMax || 0) ? 'badge-baja' : 'badge-activo'}`}>
              {selectedGroup?.plazasOcupadas || 0} / {selectedGroup?.plazasMax || 0} ocupadas
            </span>
          </div>
        </div>

        {/* Formulario rápido para añadir alumno */}
        <div style={{
          backgroundColor: 'var(--bg-dark)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-light)' }}>
            + Inscribir alumno a este grupo
          </label>
          
          {alumnosDisponiblesParaInscribir.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '180px' }}>
                <select
                  value={quickAlumnoState.alumnoId}
                  onChange={(e) => setQuickAlumnoState(prev => ({ ...prev, alumnoId: e.target.value }))}
                >
                  <option value="">Selecciona un alumno...</option>
                  {alumnosDisponiblesParaInscribir.map(a => (
                    <option key={a.id} value={a.id}>
                      {getNombreCompleto(a)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="dias-input" style={{ width: 'auto' }}>
                <span>Días/sem:</span>
                <input
                  type="number"
                  min="1"
                  max="7"
                  style={{ width: '60px' }}
                  value={quickAlumnoState.dias}
                  onChange={(e) => setQuickAlumnoState(prev => ({ ...prev, dias: Number(e.target.value) || 1 }))}
                />
              </div>

              <button
                type="button"
                className="btn-primary flex-center"
                disabled={!quickAlumnoState.alumnoId}
                onClick={handleQuickInscribirAlumno}
                style={{ opacity: !quickAlumnoState.alumnoId ? 0.6 : 1, whiteSpace: 'nowrap' }}
              >
                <Plus size={16} style={{ marginRight: '6px' }} />
                Inscribir
              </button>
            </div>
          ) : (
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
              {alumnosTotales.filter(a => a.estado === 'activo').length === 0
                ? 'No hay alumnos activos registrados en la aplicación.'
                : 'Todos los alumnos activos ya están inscritos en este grupo.'}
            </p>
          )}

          {selectedGroup?.tarifas && Object.keys(selectedGroup.tarifas).length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tarifas: {Object.entries(selectedGroup.tarifas).map(([dias, precio]) => `${dias}d: ${formatCurrency(precio)}`).join(' • ')}
            </div>
          )}
        </div>

        {/* Tabla de alumnos inscritos */}
        <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Días/sem</th>
                <th>Tarifa Est.</th>
                <th>Teléfono</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alumnosInscritosEnGrupo.map(alumno => {
                const ins = alumno.inscripciones?.find(i => Number(i.grupoId) === selectedGroupIdForLista);
                const tarifa = selectedGroup?.tarifas ? selectedGroup.tarifas[ins?.dias] : null;
                return (
                  <tr key={alumno.id}>
                    <td>
                      <strong>{getNombreCompleto(alumno)}</strong>
                    </td>
                    <td>
                      <select
                        value={ins?.dias || 1}
                        onChange={(e) => handleUpdateAlumnoDias(alumno.id, Number(e.target.value))}
                        style={{ width: '85px', padding: '3px 6px', fontSize: '0.85em' }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map(d => (
                          <option key={d} value={d}>
                            {d} {d === 1 ? 'día' : 'días'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {tarifa !== undefined && tarifa !== null ? formatCurrency(tarifa) : '-'}
                    </td>
                    <td>{alumno.telefono || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-icon text-danger"
                        title="Desinscribir del grupo"
                        onClick={() => handleQuickDesinscribir(alumno)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {alumnosInscritosEnGrupo.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '2rem 1rem' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                      No hay alumnos inscritos en este grupo todavía.
                    </p>
                    <small style={{ color: 'var(--text-muted)' }}>
                      Usa el formulario de arriba para añadir alumnos.
                    </small>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="form-actions full-width" style={{ marginTop: '1.25rem' }}>
          <button type="button" className="btn-primary" onClick={() => setIsListaModalOpen(false)}>
            Cerrar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Grupos;
