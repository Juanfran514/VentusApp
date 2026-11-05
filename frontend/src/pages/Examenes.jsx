import GestionCargosTemplate from '../components/cobros/GestionCargosTemplate';

const Examenes = () => (
  <GestionCargosTemplate
    tipo="examen"
    pageTitle="Gestión de Exámenes"
    addButtonLabel="Asignar Examen"
    modalTitle="Asignar Examen"
    conceptoColumnLabel="Concepto / Grado"
    conceptoInputLabel="Concepto / Grado *"
    conceptoPlaceholder="Ej: Cinturón Amarillo"
    fechaColumnLabel="Fecha Examen"
    fechaInputLabel="Fecha del Examen *"
    searchPlaceholder="Buscar por alumno o concepto..."
    emptyPendientesText="No hay exámenes pendientes de cobro."
    emptyPagadosText="No hay registros de exámenes pagados."
    tituloAcordeon="Exámenes"
    tipoRegistroLabel="exámenes"
    pdfTituloMes="Informe de Exámenes"
    pdfTituloCompleto="Historial Completo de Exámenes"
    pdfFilePrefix="examenes"
  />
);

export default Examenes;
