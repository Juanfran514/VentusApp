import GestionCargosTemplate from '../components/cobros/GestionCargosTemplate';
import { DEFAULT_CATEGORIAS_LICENCIAS } from '../utils/categorias';

const Licencias = () => (
  <GestionCargosTemplate
    tipo="licencia"
    pageTitle="Gestión de Licencias Deportivas"
    addButtonLabel="Asignar Licencia"
    modalTitle="Asignar Licencia Deportiva"
    conceptoColumnLabel="Licencia / Concepto"
    conceptoInputLabel="Licencia / Concepto *"
    conceptoPlaceholder="Escribe o selecciona un tipo de licencia"
    fechaColumnLabel="Fecha"
    fechaInputLabel="Fecha de Registro *"
    searchPlaceholder="Buscar por alumno o tipo de licencia..."
    emptyPendientesText="No hay licencias pendientes de cobro."
    emptyPagadosText="No hay registros de licencias pagadas."
    tituloAcordeon="Licencias"
    tipoRegistroLabel="licencias"
    pdfTituloMes="Informe de Licencias Deportivas"
    pdfTituloCompleto="Historial Completo de Licencias"
    pdfFilePrefix="licencias"
    categoriasConfig={{
      storageKey: 'licencias',
      defaults: DEFAULT_CATEGORIAS_LICENCIAS,
      filterPlaceholder: 'Todas las licencias'
    }}
  />
);

export default Licencias;
