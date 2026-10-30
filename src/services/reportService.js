import { gastoService } from './gastoService';
import { getNombreMes } from '../constants/fechas';
import { formatCurrency, formatDate, getNombreCompleto } from '../utils/formatters';
import { exportarBalanceFinancieroPDF } from '../utils/pdfExport';

/**
 * Servicio encargado de preparar y exportar informes financieros en PDF (SRP / DIP)
 */
export const reportService = {
  async exportarBalanceMensual({
    pagos = [],
    gastos = [],
    alumnosMap = {},
    mes,
    año,
    totalIngresos,
    totalGastos,
    beneficioNeto
  }) {
    const mesLabel = getNombreMes(mes);
    const mesNombre = `${mesLabel} ${año}`;

    const pagosMes = pagos.filter(p => {
      if (p.estado !== 'pagado') return false;
      const pMes = p.mes ? Number(p.mes) : p.fecha ? new Date(p.fecha).getMonth() + 1 : null;
      const pAño = p.año ? Number(p.año) : p.fecha ? new Date(p.fecha).getFullYear() : null;
      return pMes === Number(mes) && pAño === Number(año);
    });

    const gastosMes = gastos.filter(g => {
      if (g.mes && g.año) {
        return Number(g.mes) === Number(mes) && Number(g.año) === Number(año);
      }
      const d = new Date(g.fecha);
      return d.getMonth() + 1 === Number(mes) && d.getFullYear() === Number(año);
    });

    const fuentesMap = {
      cuota: { fuente: 'Cuotas Mensuales', cantidad: 0, total: 0 },
      examen: { fuente: 'Exámenes de Grado', cantidad: 0, total: 0 },
      material: { fuente: 'Venta de Equipamiento', cantidad: 0, total: 0 },
      licencia: { fuente: 'Licencias Deportivas', cantidad: 0, total: 0 }
    };

    pagosMes.forEach(p => {
      const tipoKey = p.tipo || 'cuota';
      if (!fuentesMap[tipoKey]) {
        fuentesMap[tipoKey] = { fuente: `Otros (${tipoKey})`, cantidad: 0, total: 0 };
      }
      fuentesMap[tipoKey].cantidad += 1;
      fuentesMap[tipoKey].total += Number(p.importe) || 0;
    });

    const desgloseIngresos = Object.values(fuentesMap).filter(f => f.cantidad > 0);

    const desgloseGastos = gastoService
      .agruparPorCategoria(gastos, mes, año)
      .map(g => ({ categoria: g.name, total: g.value }));

    const filasIngresos = pagosMes.map(p => {
      const al = alumnosMap[p.alumnoId];
      const nombreAl = al ? getNombreCompleto(al) : 'Alumno sin nombre';
      const tipoLabel = p.tipo ? p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1) : 'Pago';
      const conceptoStr = p.concepto || (p.tipo === 'cuota' ? `Cuota ${mesLabel} ${año}` : '-');
      return [
        formatDate(p.fecha),
        nombreAl,
        tipoLabel,
        conceptoStr,
        `+${formatCurrency(p.importe)}`
      ];
    });

    const filasGastos = gastosMes.map(g => [
      formatDate(g.fecha),
      g.concepto || '-',
      g.tipo === 'fijo'
        ? `${g.categoria || 'Fijo'} (Gasto Fijo)`
        : `${g.categoria || 'Variable'} (Variable)`,
      `-${formatCurrency(g.importe)}`
    ]);

    await exportarBalanceFinancieroPDF({
      mesNombre,
      totalIngresos,
      totalGastos,
      beneficioNeto,
      desgloseIngresos,
      desgloseGastos,
      filasIngresos,
      filasGastos,
      nombreArchivo: `balance_financiero_${año}_${String(mes).padStart(2, '0')}.pdf`
    });
  }
};

