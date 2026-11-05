import { Calendar, Search, FileText, Eye, Download, FileCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { descargarFactura } from '../../utils/facturaProcessor';

const PERIODOS_FACTURAS = [
  { id: 'todos', label: 'Todo el año' },
  { id: '1t', label: '1T (Ene-Mar)' },
  { id: '2t', label: '2T (Abr-Jun)' },
  { id: '3t', label: '3T (Jul-Sep)' },
  { id: '4t', label: '4T (Oct-Dic)' }
];

const ArchivoFacturasTab = ({
  filtroAnoFacturas,
  onChangeAno,
  añosList,
  filtroPeriodoFacturas,
  onChangePeriodo,
  busquedaFacturas,
  onChangeBusqueda,
  facturasFiltradas,
  totalImporteFacturas,
  onVerFactura
}) => {
  return (
    <div>
      {/* Barra de control de período y filtros */}
      <div className="periodo-selector-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Calendar size={18} style={{ color: 'var(--primary-color)' }} />
          <span style={{ fontWeight: 600 }}>Año:</span>
          <select
            value={filtroAnoFacturas}
            onChange={(e) => onChangeAno(Number(e.target.value))}
            style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
          >
            {añosList.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem', flexWrap: 'wrap' }}>
            {PERIODOS_FACTURAS.map(tab => (
              <button
                type="button"
                key={tab.id}
                className={`btn-secondary ${filtroPeriodoFacturas === tab.id ? 'btn-primary' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => onChangePeriodo(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Buscar en facturas..."
            value={busquedaFacturas}
            onChange={(e) => onChangeBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-dark)',
              color: 'var(--text-light)'
            }}
          />
        </div>
      </div>

      {/* KPI Cards de Facturación */}
      <div className="facturas-kpi-grid">
        <div className="facturas-kpi-card">
          <span className="facturas-kpi-title">Facturas y Tickets Justificados</span>
          <span className="facturas-kpi-value" style={{ color: 'var(--primary-color)' }}>
            {facturasFiltradas.length}
          </span>
        </div>
        <div className="facturas-kpi-card">
          <span className="facturas-kpi-title">Importe Total Justificado</span>
          <span className="facturas-kpi-value" style={{ color: 'var(--danger-color)' }}>
            -{formatCurrency(totalImporteFacturas)}
          </span>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Categoría</th>
              <th>Tipo</th>
              <th>Importe</th>
              <th>Documento</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturasFiltradas.map(g => (
              <tr key={g.id}>
                <td>{formatDate(g.fecha)}</td>
                <td><strong>{g.concepto}</strong></td>
                <td>
                  <span className="badge badge-categoria">{g.categoria}</span>
                </td>
                <td>
                  <span
                    className="badge"
                    style={{ background: 'var(--bg-panel)', color: 'var(--text-light)', fontSize: '0.75rem' }}
                  >
                    {g.tipo === 'fijo' ? 'Fijo' : 'Variable'}
                  </span>
                </td>
                <td style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>
                  -{formatCurrency(g.importe)}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {g.factura.tipo === 'pdf' ? (
                      <FileText size={18} style={{ color: 'var(--primary-color)' }} />
                    ) : (
                      <img
                        src={g.factura.archivo}
                        alt=""
                        style={{ width: '24px', height: '24px', borderRadius: '3px', objectFit: 'cover' }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '0.85rem',
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={g.factura.nombre}
                    >
                      {g.factura.nombre || 'Factura'}
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '6px' }}
                    onClick={() => onVerFactura(g)}
                  >
                    <Eye size={14} style={{ marginRight: '4px' }} /> Ver
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    title="Descargar factura"
                    onClick={() => descargarFactura(g.factura, g.concepto)}
                  >
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {facturasFiltradas.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center" style={{ padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <FileCheck size={42} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                    No hay facturas registradas en este período.
                  </p>
                  <p style={{ fontSize: '0.85rem' }}>
                    Puedes adjuntar facturas en formato PDF o foto cada vez que añadas o edites un gasto.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArchivoFacturasTab;

