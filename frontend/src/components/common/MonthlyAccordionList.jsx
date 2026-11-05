import { useState, useMemo } from 'react';
import { ChevronRight, FileDown, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import './MonthlyAccordionList.css';

const MonthlyAccordionList = ({
  gruposMensuales = [],
  renderTable,
  onExportPdf,
  onExportTodoPdf,
  tipoRegistroLabel = 'registros',
  emptyMessage = 'No hay registros para mostrar en el historial.'
}) => {
  // null = estado inicial (abre automáticamente el mes más reciente disponible)
  const [openMonthsState, setOpenMonthsState] = useState(null);

  const effectiveOpenMonths = useMemo(() => {
    if (openMonthsState !== null) return openMonthsState;
    if (gruposMensuales.length > 0) {
      return new Set([gruposMensuales[0].key]);
    }
    return new Set();
  }, [openMonthsState, gruposMensuales]);

  const { totalGlobalImporte, totalGlobalRegistros } = useMemo(() => {
    let imp = 0;
    let reg = 0;
    gruposMensuales.forEach(g => {
      imp += g.totalImporte;
      reg += g.totalItems;
    });
    return { totalGlobalImporte: imp, totalGlobalRegistros: reg };
  }, [gruposMensuales]);

  const toggleMonth = (key) => {
    setOpenMonthsState(prev => {
      const current = prev !== null
        ? prev
        : gruposMensuales.length > 0
        ? new Set([gruposMensuales[0].key])
        : new Set();
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenMonthsState(new Set(gruposMensuales.map(g => g.key)));
  };

  const collapseAll = () => {
    setOpenMonthsState(new Set());
  };

  if (gruposMensuales.length === 0) {
    return (
      <div className="monthly-accordion-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="monthly-accordion-container">
      {/* Barra de control y resumen superior */}
      <div className="monthly-accordion-summary-bar">
        <div className="monthly-accordion-summary-text">
          Historial de <strong>{gruposMensuales.length}</strong>{' '}
          {gruposMensuales.length === 1 ? 'mes' : 'meses'} •{' '}
          <strong>{totalGlobalRegistros}</strong> {tipoRegistroLabel} • Total acumulado:{' '}
          <span className="highlight-amount">+{formatCurrency(totalGlobalImporte)}</span>
        </div>

        <div className="monthly-accordion-global-actions">
          <button
            type="button"
            className="btn-accordion-control"
            onClick={expandAll}
            title="Abrir todos los meses"
          >
            <Layers size={14} /> Expandir todos
          </button>
          <button
            type="button"
            className="btn-accordion-control"
            onClick={collapseAll}
            title="Cerrar todos los meses"
          >
            Colapsar
          </button>
          {onExportTodoPdf && (
            <button
              type="button"
              className="btn-accordion-export-all"
              onClick={onExportTodoPdf}
              title="Exportar todo el historial actual a un único PDF"
            >
              <FileDown size={15} /> Exportar Todo a PDF
            </button>
          )}
        </div>
      </div>

      {/* Lista de acordeones por mes */}
      {gruposMensuales.map(grupo => {
        const isOpen = effectiveOpenMonths.has(grupo.key);

        return (
          <div key={grupo.key} className={`monthly-accordion-item ${isOpen ? 'is-open' : ''}`}>
            <div
              className="monthly-accordion-header"
              onClick={() => toggleMonth(grupo.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleMonth(grupo.key);
                }
              }}
            >
              <div className="monthly-accordion-header-left">
                <span className={`monthly-accordion-chevron ${isOpen ? 'rotate' : ''}`}>
                  <ChevronRight size={18} />
                </span>
                <h3 className="monthly-accordion-title">{grupo.mesNombre}</h3>
                <div className="monthly-accordion-badges">
                  <span className="badge-items-count">
                    {grupo.totalItems}{' '}
                    {grupo.totalItems === 1
                      ? tipoRegistroLabel.replace(/es$|s$/, '')
                      : tipoRegistroLabel}
                  </span>
                  <span className="badge-month-total">+{formatCurrency(grupo.totalImporte)}</span>
                </div>
              </div>

              <div className="monthly-accordion-header-right">
                {onExportPdf && (
                  <button
                    type="button"
                    className="btn-export-pdf-month"
                    title={`Descargar informe en PDF de ${grupo.mesNombre}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportPdf(grupo);
                    }}
                  >
                    <FileDown size={14} />
                    <span>Exportar PDF</span>
                  </button>
                )}
              </div>
            </div>

            {isOpen && (
              <div className="monthly-accordion-content">
                {renderTable ? renderTable(grupo.items, grupo) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MonthlyAccordionList;
