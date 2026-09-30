import React from 'react';
import { Plus, Medal, Package, IdCard, RotateCcw, Trash2 } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AlumnoPagosTab = ({
  pagos = [],
  filtroTipoPago = 'todos',
  setFiltroTipoPago,
  onOpenPagoModal,
  onMarcarPagado,
  onRevertirPago,
  onDeletePago,
  mesesNombres = []
}) => {
  const filterButtons = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendientes', label: 'Solo Pendientes' },
    { id: 'cuota', label: 'Cuotas' },
    { id: 'examen', label: 'Exámenes' },
    { id: 'material', label: 'Material' },
    { id: 'licencia', label: 'Licencias' }
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {filterButtons.map(btn => (
            <button
              key={btn.id}
              className={`btn-secondary ${filtroTipoPago === btn.id ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              onClick={() => setFiltroTipoPago(btn.id)}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Acciones directas para añadir cobro */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn-primary flex-center"
            onClick={() => onOpenPagoModal('cuota')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} style={{ marginRight: '4px' }} /> Cobrar Cuota
          </button>
          <button
            className="btn-secondary flex-center"
            onClick={() => onOpenPagoModal('examen')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Medal size={16} style={{ marginRight: '4px' }} /> Examen
          </button>
          <button
            className="btn-secondary flex-center"
            onClick={() => onOpenPagoModal('material')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Package size={16} style={{ marginRight: '4px' }} /> Material
          </button>
          <button
            className="btn-secondary flex-center"
            onClick={() => onOpenPagoModal('licencia')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <IdCard size={16} style={{ marginRight: '4px' }} /> Licencia
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Concepto / Período</th>
              <th>Importe</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map(pago => (
              <tr key={pago.id} style={{ background: pago.estado === 'pendiente' ? 'rgba(239, 68, 68, 0.06)' : undefined }}>
                <td>{formatDate(pago.fecha)}</td>
                <td style={{ textTransform: 'capitalize' }}>
                  <span className="badge" style={{ background: 'var(--bg-dark)', color: 'var(--text-light)' }}>
                    {pago.tipo}
                  </span>
                </td>
                <td>
                  <strong>
                    {pago.tipo === 'cuota' 
                      ? `${mesesNombres[pago.mes - 1] || ''} ${pago.año}` 
                      : (pago.concepto || pago.tipo)}
                  </strong>
                </td>
                <td style={{ fontWeight: 'bold', color: pago.estado === 'pagado' ? 'var(--primary-color)' : 'var(--danger-color)' }}>
                  {pago.estado === 'pagado' ? `+${formatCurrency(pago.importe)}` : formatCurrency(pago.importe)}
                </td>
                <td>
                  <StatusBadge status={pago.estado} />
                </td>
                <td>
                  {pago.estado === 'pendiente' ? (
                    <button
                      className="btn-primary"
                      style={{ padding: '3px 8px', fontSize: '0.8rem', marginRight: '6px' }}
                      onClick={() => onMarcarPagado(pago.id)}
                    >
                      Cobrar
                    </button>
                  ) : (
                    <button
                      className="btn-icon text-primary"
                      title="Revertir a Pendiente"
                      onClick={() => onRevertirPago(pago.id)}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  <button
                    className="btn-icon text-danger"
                    title="Eliminar registro"
                    onClick={() => onDeletePago(pago.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center" style={{ padding: '2rem' }}>
                  No hay registros de pago en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlumnoPagosTab;
