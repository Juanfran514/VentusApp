import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { grupoService } from '../services/grupoService';
import { alumnoService } from '../services/alumnoService';
import { useSortableList } from '../hooks/useSortableList';
import ModalGrupoForm from '../components/grupos/ModalGrupoForm';
import ModalInscritosGrupo from '../components/grupos/ModalInscritosGrupo';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { Plus, Edit2, Trash2, Users, GripVertical } from 'lucide-react';
import {
  DEFAULT_CATEGORIAS_GRUPOS,
  getStoredCategorias,
  saveStoredCategoria,
  mergeCategorias
} from '../utils/categorias';
import { getNombreCompleto } from '../utils/formatters';
import { useConfirm, useToast } from '../context/DialogContext';
import '../pages/Alumnos.css';

const Grupos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListaModalOpen, setIsListaModalOpen] = useState(false);
  const [selectedGroupIdForLista, setSelectedGroupIdForLista] = useState(null);
  const [quickAlumnoState, setQuickAlumnoState] = useState({ alumnoId: '', dias: 1 });

  const [search, setSearch] = useState('');
  const [filtroActividad, setFiltroActividad] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    actividad: '',
    horariosArray: [],
    plazasMax: 20,
    tarifasArray: [],
    alumnosInscritos: []
  });

  const confirm = useConfirm();
  const { toast } = useToast();

  const alumnosTotalesRaw = useLiveQuery(() => alumnoService.getAll());
  const gruposRawQuery = useLiveQuery(() => grupoService.getAll());

  const alumnosTotales = useMemo(() => alumnosTotalesRaw || [], [alumnosTotalesRaw]);
  const gruposRaw = useMemo(() => gruposRawQuery || [], [gruposRawQuery]);

  const gruposConOcupacion = useMemo(() => {
    return grupoService.calcularOcupacion(gruposRaw, alumnosTotales);
  }, [gruposRaw, alumnosTotales]);

  const selectedGroup = useMemo(() => {
    return gruposConOcupacion.find(g => g.id === selectedGroupIdForLista) || null;
  }, [gruposConOcupacion, selectedGroupIdForLista]);

  const alumnosInscritosEnGrupo = useMemo(() => {
    if (!selectedGroupIdForLista) return [];
    return alumnosTotales.filter(
      a =>
        a.estado === 'activo' &&
        a.inscripciones?.some(ins => Number(ins.grupoId) === selectedGroupIdForLista)
    );
  }, [alumnosTotales, selectedGroupIdForLista]);

  const alumnosDisponiblesParaInscribir = useMemo(() => {
    if (!selectedGroupIdForLista) return [];
    return alumnosTotales.filter(
      a =>
        a.estado === 'activo' &&
        !a.inscripciones?.some(ins => Number(ins.grupoId) === selectedGroupIdForLista)
    );
  }, [alumnosTotales, selectedGroupIdForLista]);

  const actividadesSugeridas = useMemo(() => {
    const stored = getStoredCategorias('grupos', DEFAULT_CATEGORIAS_GRUPOS);
    return mergeCategorias(stored, gruposRaw, 'actividad');
  }, [gruposRaw]);

  const gruposFiltrados = useMemo(() => {
    return gruposConOcupacion.filter(g => {
      const matchSearch =
        !search ||
        `${g.nombre || ''} ${g.actividad || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchActividad = !filtroActividad || g.actividad === filtroActividad;
      return matchSearch && matchActividad;
    });
  }, [gruposConOcupacion, search, filtroActividad]);

  const { handleTouchStart, getRowDragProps } = useSortableList({
    visibleList: gruposFiltrados,
    fullList: gruposConOcupacion,
    onReorder: (ordered) => grupoService.reordenarGrupos(ordered)
  });

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
      tarifasArray,
      alumnosInscritos: currentAlumnos
    });
    setEditingId(grupo.id);
    setIsModalOpen(true);
  };

  const openListaModal = (grupo) => {
    setSelectedGroupIdForLista(grupo.id);
    const defaultDias =
      grupo.tarifas && Object.keys(grupo.tarifas).length > 0
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
      const defaultDias =
        selectedGroup?.tarifas && Object.keys(selectedGroup.tarifas).length > 0
          ? Number(Object.keys(selectedGroup.tarifas)[0])
          : 1;
      setQuickAlumnoState({ alumnoId: '', dias: defaultDias });
      toast.success('Alumno inscrito en el grupo');
    } catch (err) {
      console.error('Error al inscribir alumno:', err);
      toast.error('Hubo un error al inscribir al alumno en el grupo.');
    }
  };

  const handleQuickDesinscribir = async (alumno) => {
    if (!selectedGroupIdForLista || !alumno) return;
    const ok = await confirm({
      title: 'Desinscribir alumno',
      message: `¿Estás seguro de que deseas desinscribir a ${getNombreCompleto(alumno)} de este grupo? Su cuota mensual se actualizará automáticamente.`,
      confirmText: 'Desinscribir',
      variant: 'warning'
    });
    if (ok) {
      try {
        await grupoService.desinscribirAlumno(selectedGroupIdForLista, alumno.id);
        toast.info('Alumno desinscrito del grupo');
      } catch (err) {
        console.error('Error al desinscribir alumno:', err);
        toast.error('Hubo un error al desinscribir al alumno.');
      }
    }
  };

  const handleUpdateAlumnoDias = async (alumnoId, newDias) => {
    if (!selectedGroupIdForLista || !alumnoId) return;
    try {
      await grupoService.inscribirAlumno(selectedGroupIdForLista, alumnoId, newDias);
    } catch (err) {
      console.error('Error al actualizar días:', err);
      toast.error('Hubo un error al actualizar los días del alumno.');
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
        toast.success('Grupo actualizado correctamente');
      } else {
        const newId = await grupoService.create(grupoData);
        if (validAlumnosInscritos.length > 0) {
          await grupoService.sincronizarAlumnosGrupo(newId, validAlumnosInscritos);
        }
        toast.success('Grupo creado correctamente');
      }

      saveStoredCategoria('grupos', actividadTrimmed, DEFAULT_CATEGORIAS_GRUPOS);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error guardando grupo', error);
      toast.error('Hubo un error al guardar el grupo.');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar grupo',
      message: '¿Estás seguro de que deseas eliminar este grupo? Se desinscribirá automáticamente a todos los alumnos que estén en él.',
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (ok) {
      try {
        await grupoService.delete(id);
        toast.success('Grupo eliminado');
      } catch (error) {
        console.error('Error eliminando grupo', error);
        toast.error('Hubo un error al eliminar el grupo.');
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
                <tr key={grupo.id} {...getRowDragProps(idx)}>
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
                    <span
                      className={`badge ${
                        grupo.plazasOcupadas >= grupo.plazasMax ? 'badge-baja' : 'badge-activo'
                      }`}
                    >
                      {grupo.plazasOcupadas || 0} / {grupo.plazasMax}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-icon text-primary"
                      title="Gestionar Alumnos"
                      onClick={() => openListaModal(grupo)}
                    >
                      <Users size={18} />
                    </button>
                    <button
                      className="btn-icon text-muted"
                      title="Editar"
                      onClick={() => openEditModal(grupo)}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      className="btn-icon text-danger"
                      title="Eliminar"
                      onClick={() => handleDelete(grupo.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {gruposFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center">
                    No se encontraron grupos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalGrupoForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        actividadesSugeridas={actividadesSugeridas}
        alumnosTotales={alumnosTotales}
        onSubmit={handleSubmit}
      />

      <ModalInscritosGrupo
        isOpen={isListaModalOpen}
        onClose={() => setIsListaModalOpen(false)}
        selectedGroup={selectedGroup}
        alumnosTotales={alumnosTotales}
        alumnosInscritos={alumnosInscritosEnGrupo}
        alumnosDisponibles={alumnosDisponiblesParaInscribir}
        quickAlumnoState={quickAlumnoState}
        setQuickAlumnoState={setQuickAlumnoState}
        onQuickInscribir={handleQuickInscribirAlumno}
        onQuickDesinscribir={handleQuickDesinscribir}
        onUpdateDias={handleUpdateAlumnoDias}
      />
    </div>
  );
};

export default Grupos;
