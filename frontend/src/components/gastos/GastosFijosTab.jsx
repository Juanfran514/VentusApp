import SearchFilterBar from '../common/SearchFilterBar';
import { MESES, getNombreMes } from '../../constants/fechas';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Plus, Trash2, Edit2, CheckCircle2, Clock, Calendar, Tag, Paperclip
} from 'lucide-react';

const GastosFijosTab = ({
  selectedMonth,
  onSelectMonth,
  selectedYear,
  onSelectYear,
  añosList,
  currentMes,
  currentAño,
  estadoFijosMes,
  busqueda,
  onBusquedaChange,
  filtroCategoria,
  onFiltroCategoriaChange,
  categoriasSugeridasFijos,
  itemsFijosFiltrados,
  totalPlantillasFijos,
  onToggleTique,
  onVerFactura,
  onOpenModificarMes,
  onOpenEditarPlantilla,
  onDeletePlantilla,
  onOpenNuevoFijo
}) => {
  const mesSeleccionadoNombre = getNombreMes(selectedMonth);

  return (
    <div>
      {/* Barra selectora de mes y año */}
      <div className="periodo-selector-bar">
        <div className="periodo-controles">
          <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} style={{ color: 'var(--primary-color)' }} />
            Período a consultar:
          </span>
          <select
            className="periodo-select"
            value={selectedMonth}
            onChange={(e) => onSelectMonth(Number(e.target.value))}
          >
            {MESES.map(m => (
              <option key={m.num} value={m.num}>{m.nombre}</option>
            ))}
          </select>
          <select
            className="periodo-select"
            value={selectedYear}
            onChange={(e) => onSelectYear(Number(e.target.value))}
          >
            {añosList.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {selectedMonth === currentMes && selectedYear === currentAño && (
            <span className="badge badge-pagado" style={{ marginLeft: '4px' }}>
              Mes en curso
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Cada nuevo mes se destildan automáticamente para su control
        </div>
      </div>

      {/* Tarjetas de estadísticas del mes */}
      <div className="gastos-stats-grid">
        <div className="gastos-stat-card pagados">
          <div className="gastos-stat-label">
            <span>Gastos Tildados (Pagados)</span>
            <span className="gastos-stat-badge badge-pagado">
              {estadoFijosMes.countPagados} pagados
            </span>
          </div>
          <div className="gastos-stat-value" style={{ color: 'var(--primary-color)' }}>
            -{formatCurrency(estadoFijosMes.totalPagado)}
          </div>
        </div>

        <div className="gastos-stat-card pendientes">
          <div className="gastos-stat-label">
            <span>Gastos Fijos Pendientes</span>
            <span className="gastos-stat-badge badge-pendiente">
              {estadoFijosMes.countPendientes} pendientes
            </span>
          </div>
          <div className="gastos-stat-value" style={{ color: '#f59e0b' }}>
            -{formatCurrency(estadoFijosMes.totalPendiente)}
          </div>
        </div>

        <div className="gastos-stat-card total">
          <div className="gastos-stat-label">
            <span>Total Fijos Previstos ({mesSeleccionadoNombre})</span>
          </div>
          <div className="gastos-stat-value" style={{ color: 'var(--text-light)' }}>
            -{formatCurrency(estadoFijosMes.totalPagado + estadoFijosMes.totalPendiente)}
          </div>
        </div>
      </div>

      {/* Filtros de búsqueda */}
      <SearchFilterBar
        search={busqueda}
        onSearchChange={onBusquedaChange}
        searchPlaceholder="Buscar gasto fijo por concepto..."
        filterValue={filtroCategoria}
        onFilterChange={onFiltroCategoriaChange}
        filterOptions={categoriasSugeridasFijos}
        filterPlaceholder="Todas las categorías de fijos"
      />

      {/* Tabla de Gastos Fijos */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '160px' }}>Estado / Control</th>
              <th>Concepto</th>
              <th>Categoría</th>
              <th>Importe ({mesSeleccionadoNombre})</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {itemsFijosFiltrados.map(item => (
              <tr
                key={item.id}
                style={{ backgroundColor: item.pagado ? 'rgba(34, 197, 94, 0.05)' : 'inherit' }}
              >
                <td>
                  <button
                    type="button"
                    className={`btn-toggle-tique ${item.pagado ? 'pagado' : 'pendiente'}`}
                    onClick={() => onToggleTique(item)}
                    title={item.pagado ? 'Haga clic para desmarcar (destildar)' : 'Haga clic para marcar como pagado (tildar)'}
                  >
                    {item.pagado ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Pagado</span>
                      </>
                    ) : (
                      <>
                        <Clock size={16} />
                        <span>Pendiente</span>
                      </>
                    )}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{item.concepto}</span>
                    {item.factura && (
                      <button
                        type="button"
                        className="btn-factura-badge"
                        onClick={() => onVerFactura(item)}
                        title="Ver factura adjunta"
                      >
                        <Paperclip size={12} />
                        <span>{item.factura.tipo === 'pdf' ? 'PDF' : 'Foto'}</span>
                      </button>
                    )}
                  </div>
                  {item.gastoFijo?.diaMes && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Día {item.gastoFijo.diaMes} de cada mes
                    </div>
                  )}
                </td>
                <td>
                  <span className="badge badge-categoria">{item.categoria}</span>
                </td>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: item.pagado ? 'var(--primary-color)' : '#f59e0b' }}>
                      -{formatCurrency(item.importe)}
                    </span>
                    <button
                      type="button"
                      className="btn-link-edit"
                      onClick={() => onOpenModificarMes(item)}
                      title="Modificar importe de este mes"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                  {item.pagado && item.fechaPago && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                      Abonado: {formatDate(item.fechaPago)}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn-icon"
                    title="Modificar importe o fecha de este mes"
                    onClick={() => onOpenModificarMes(item)}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="btn-icon text-muted"
                    title="Editar plantilla fija base"
                    onClick={() => onOpenEditarPlantilla(item.gastoFijo)}
                  >
                    <Tag size={18} />
                  </button>
                  <button
                    className="btn-icon text-danger"
                    title="Eliminar plantilla de gasto fijo"
                    onClick={() => onDeletePlantilla(item.id, item.concepto)}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {itemsFijosFiltrados.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center" style={{ padding: '2rem' }}>
                  {totalPlantillasFijos === 0 ? (
                    <div>
                      <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)' }}>
                        Aún no has configurado ningún gasto fijo recurrente (ej: Alquiler, Luz, Internet, Seguro, Asesoría).
                      </p>
                      <button className="btn-primary" onClick={onOpenNuevoFijo}>
                        <Plus size={16} style={{ marginRight: '6px' }} />
                        Crear primer Gasto Fijo
                      </button>
                    </div>
                  ) : (
                    'No hay gastos fijos que coincidan con la búsqueda.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GastosFijosTab;

