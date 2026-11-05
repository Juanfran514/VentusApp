import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService } from '../services/alumnoService';
import { grupoService } from '../services/grupoService';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/common/StatusBadge';
import AlumnoForm from '../components/alumno/AlumnoForm';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { normalizarCinturon } from '../utils/cinturones';
import { formatCurrency, getNombreCompleto } from '../utils/formatters';
import { useConfirm, useToast } from '../context/DialogContext';
import './Alumnos.css';

const Alumnos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingAlumno, setEditingAlumno] = useState(null);
  const confirm = useConfirm();
  const { toast } = useToast();

  const gruposDisponiblesRaw = useLiveQuery(() => grupoService.getAll());
  const gruposDisponibles = useMemo(() => gruposDisponiblesRaw || [], [gruposDisponiblesRaw]);

  const gruposMap = useMemo(() => {
    return gruposDisponibles.reduce((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});
  }, [gruposDisponibles]);

  const alumnos = useLiveQuery(
    async () => {
      const results = await alumnoService.getAll(search);
      const allGroups = await grupoService.getAll();
      const gMap = allGroups.reduce((acc, g) => { acc[g.id] = g.nombre; return acc; }, {});

      results.forEach(a => {
        if (a.inscripciones && a.inscripciones.length > 0) {
          a.infoGrupos = a.inscripciones.map(ins => {
            const nombre = gMap[ins.grupoId] || 'Grupo desconocido';
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

  const openNewModal = () => {
    setEditingAlumno(null);
    setIsModalOpen(true);
  };

  const openEditModal = (alumno) => {
    setEditingAlumno(alumno);
    setIsModalOpen(true);
  };

  const handleSaveAlumno = async (alumnoData) => {
    try {
      if (editingAlumno?.id) {
        await alumnoService.update(editingAlumno.id, alumnoData);
        toast.success('Alumno actualizado correctamente');
      } else {
        await alumnoService.create(alumnoData);
        toast.success('Alumno creado correctamente');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error guardando alumno', error);
      toast.error('Hubo un error al guardar el alumno.');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar Alumno',
      message: '¿Estás seguro de que deseas eliminar este alumno?',
      confirmText: 'Eliminar',
      variant: 'danger'
    });
    if (ok) {
      await alumnoService.delete(id);
      toast.success('Alumno eliminado');
    }
  };

  const handleToggleEstado = async (alumno) => {
    try {
      await alumnoService.toggleEstado(alumno);
    } catch (error) {
      console.error('Error cambiando estado', error);
      toast.error('No se pudo cambiar el estado del alumno.');
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {alumno.foto ? (
                        <img
                          src={alumno.foto}
                          alt=""
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'var(--bg-panel)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          flexShrink: 0
                        }}>
                          {alumno.nombre?.charAt(0)}{alumno.apellidos ? alumno.apellidos.charAt(0) : ''}
                        </div>
                      )}
                      <div>
                        <Link to={`/alumnos/${alumno.id}`} style={{ color: 'inherit', textDecoration: 'none' }} title="Ver ficha del alumno">
                          <strong style={{ color: 'var(--primary-color)' }}>{getNombreCompleto(alumno)}</strong>
                        </Link>
                        <br />
                        <small className="text-muted">
                          {alumno.telefono || 'Sin teléfono'} {alumno.cinturon ? `• ${normalizarCinturon(alumno.cinturon)}` : ''}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>{alumno.infoGrupos}</td>
                  <td><strong>{formatCurrency(alumno.cuota)}</strong></td>
                  <td>
                    <StatusBadge
                      status={alumno.estado}
                      onClick={() => handleToggleEstado(alumno)}
                      title="Clic para alternar estado"
                    />
                  </td>
                  <td>
                    <Link to={`/alumnos/${alumno.id}`} className="btn-icon text-primary" title="Ver Ficha Detallada">
                      <Eye size={18} />
                    </Link>
                    <button className="btn-icon text-muted" title="Editar" onClick={() => openEditModal(alumno)}>
                      <Edit2 size={18} />
                    </button>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAlumno ? 'Editar Alumno' : 'Nuevo Alumno'}
      >
        {isModalOpen && (
          <AlumnoForm
            key={editingAlumno?.id || 'new'}
            initialData={editingAlumno}
            grupos={gruposDisponibles}
            gruposMap={gruposMap}
            submitLabel={editingAlumno ? 'Actualizar Alumno' : 'Guardar Alumno'}
            onSubmit={handleSaveAlumno}
            onCancel={() => setIsModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Alumnos;
