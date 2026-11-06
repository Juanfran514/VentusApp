/**
 * Bus de eventos reactivo para sincronización desacoplada entre servicios y la UI (Observer Pattern)
 * Cumple con el Principio de Responsabilidad Única (SRP) y de Inversión de Dependencias (DIP).
 */
class DataEventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Suscribe una función callback a uno o más eventos
   * @param {string|string[]} events Nombre o lista de nombres del evento ('alumnos', 'pagos', etc.)
   * @param {Function} callback Función a ejecutar al emitirse el evento
   * @returns {Function} Función de desuscripción limpia
   */
  on(events, callback) {
    const eventList = Array.isArray(events) ? events : [events];
    eventList.forEach(event => {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
    });

    return () => this.off(events, callback);
  }

  /**
   * Cancela la suscripción de un callback a uno o más eventos
   */
  off(events, callback) {
    const eventList = Array.isArray(events) ? events : [events];
    eventList.forEach(event => {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    });
  }

  /**
   * Emite un evento notificando a todos los observadores registrados
   * @param {string} event Nombre del evento emitido
   * @param {any} payload Datos opcionales asociados
   */
  emit(event, payload) {
    // Notificar a los observadores específicos del evento
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(payload, event);
        } catch (err) {
          console.error(`Error en listener de evento ${event}:`, err);
        }
      });
    }

    // Notificar a los observadores globales ('*')
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => {
        try {
          cb(payload, event);
        } catch (err) {
          console.error(`Error en listener global ante evento ${event}:`, err);
        }
      });
    }
  }
}

export const dataEvents = new DataEventBus();

