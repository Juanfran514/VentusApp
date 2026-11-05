import SearchFilterBar from '../common/SearchFilterBar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Trash2, Edit2, RotateCcw, Paperclip } from 'lucide-react';

const GastosVariablesTab = ({
  busqueda,
  onBusquedaChange,
  filtroCategoria,
  onFiltroCategoriaChange,
  categoriasSugeridasVariables,
  gastosVariablesFiltrados,
  onVerFactura,
  onReutilizarGasto,
  onEditVariable,
  onDeleteVariable
}) => {
  return (
    <div>
      <SearchFilterBar
        search={busqueda}
        onSearchChange={onBusquedaChange}
        searchPlaceholder="Buscar por concepto de gasto variable..."
        filterValue={filtroCategoria}
        onFilterChange={onFiltroCategoriaChange}
        filterOptions={categoriasSugeridasVariables}
        filterPlaceholder="Todas las categorías de variables"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Categoría</th>
              <th>Factura</th>
              <th>Importe</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {gastosVariablesFiltrados.map(gasto => (
              <tr key={gasto.id}>
                <td>{formatDate(gasto.fecha)}</td>
                <td><strong>{gasto.concepto}</strong></td>
                <td>
                  <span className="badge badge-categoria">{gasto.categoria}</span>
                </td>
                <td>
                  {gasto.factura ? (
                    <button
                      type="button"
                      className="btn-factura-badge"
                      onClick={() => onVerFactura(gasto)}
                      title="Ver factura adjunta"
                    >
                      <Paperclip size={12} />
                      <span>{gasto.factura.tipo === 'pdf' ? 'PDF' : 'Foto'}</span>
                    </button>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>-</span>
                  )}
                </td>
                <td style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>
                  -{formatCurrency(gasto.importe)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn-reutilizar"
                    title="Recuperar y registrar de nuevo en el mes actual"
                    onClick={() => onReutilizarGasto(gasto)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    <RotateCcw size={14} />
                    <span>Reutilizar</span>
                  </button>
                  <button
                    className="btn-icon"
                    title="Editar gasto"
                    onClick={() => onEditVariable(gasto)}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="btn-icon text-danger"
                    title="Eliminar gasto"
                    onClick={() => onDeleteVariable(gasto.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {gastosVariablesFiltrados.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center" style={{ padding: '2rem' }}>
                  No hay gastos variables registrados que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GastosVariablesTab;

