import Modal from '../ui/Modal';
import { getNombreCompleto } from '../../utils/formatters';
import AlumnoForm from './AlumnoForm';

const ModalEditAlumno = ({
  isOpen,
  onClose,
  alumno,
  grupos = [],
  gruposMap = {},
  onSave
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Alumno: ${getNombreCompleto(alumno)}`}
    >
      {isOpen && (
        <AlumnoForm
          key={alumno?.id || 'edit'}
          initialData={alumno}
          grupos={grupos}
          gruposMap={gruposMap}
          submitLabel="Guardar Cambios"
          onSubmit={onSave}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
};

export default ModalEditAlumno;
