import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const ModalPagoAlumno = ({
  isOpen,
  onClose,
  tipo = 'cuota',
  alumno,
  materialesSugeridos = [],
  licenciasSugeridas = [],
  onSave,
  mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
}) => {
  const currentDate = new Date();
  const [formData, setFormData] = useState({
    tipo: 'cuota',
    concepto: '',
    importe: 0,
    mes: currentDate.getMonth() + 1,
    año: currentDate.getFullYear(),
    fecha: currentDate.toISOString().split('T')[0],
    estado: 'pagado'
  });

  useEffect(() => {
    if (isOpen) {
      let importe = 0;
      let concepto = '';
      let estado = 'pagado';

      if (tipo === 'cuota') {
        importe = alumno?.cuota || 0;
        concepto = `Cuota ${mesesNombres[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        estado = 'pagado';
      } else if (tipo === 'examen') {
        concepto = 'Examen de Grado';
        estado = 'pendiente';
      } else if (tipo === 'material') {
        concepto = '';
        estado = 'pendiente';
      } else if (tipo === 'licencia') {
        concepto = 'Licencia Autonómica';
        estado = 'pendiente';
      }

      setFormData({
        tipo,
        concepto,
        importe,
        mes: currentDate.getMonth() + 1,
        año: currentDate.getFullYear(),
        fecha: currentDate.toISOString().split('T')[0],
        estado
      });
    }
  }, [isOpen, tipo, alumno]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const title = `Registrar ${
    tipo === 'cuota' ? 'Cobro de Cuota' : tipo === 'examen' ? 'Examen' : tipo === 'material' ? 'Material' : 'Licencia Deportiva'
  }`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="form-grid">
        {tipo === 'cuota' ? (
          <>
            <div className="form-group">
              <label>Mes *</label>
              <select
                value={formData.mes}
                onChange={(e) => setFormData({ ...formData, mes: Number(e.target.value) })}
                required
              >
                {mesesNombres.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Año *</label>
              <input
                type="number"
                value={formData.año}
                onChange={(e) => setFormData({ ...formData, año: Number(e.target.value) })}
                required
              />
            </div>
          </>
        ) : (
          <div className="form-group full-width">
            <label>Concepto / Detalle *</label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              required
              list={tipo === 'material' ? 'materiales-detalle-list' : tipo === 'licencia' ? 'licencias-detalle-list' : undefined}
              placeholder={tipo === 'examen' ? 'Ej: Cinturón Amarillo' : tipo === 'material' ? 'Escribe o selecciona un material...' : 'Escribe o selecciona una licencia...'}
              autoComplete="off"
            />
            {tipo === 'material' && (
              <datalist id="materiales-detalle-list">
                {materialesSugeridos.map((mat, idx) => (
                  <option key={idx} value={mat} />
                ))}
              </datalist>
            )}
            {tipo === 'licencia' && (
              <datalist id="licencias-detalle-list">
                {licenciasSugeridas.map((lic, idx) => (
                  <option key={idx} value={lic} />
                ))}
              </datalist>
            )}
          </div>
        )}

        <div className="form-group">
          <label>Fecha *</label>
          <input
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Importe (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.importe}
            onChange={(e) => setFormData({ ...formData, importe: Number(e.target.value) })}
            required
          />
        </div>

        <div className="form-group full-width">
          <label>Estado del Pago *</label>
          <select
            value={formData.estado}
            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            required
          >
            <option value="pagado">Pagado (Abonado)</option>
            <option value="pendiente">Pendiente (Adeudo)</option>
          </select>
        </div>

        <div className="form-actions full-width">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Guardar Registro</button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalPagoAlumno;
