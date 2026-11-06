import { useState, useEffect, useCallback, useRef } from 'react';
import { dataEvents } from '../services/dataEvents';

/**
 * Hook para consultas asíncronas con re-ejecución reactiva ante eventos de datos.
 * Aplica el principio de Inversión de Dependencias (DIP), desacoplando la UI de Dexie/Supabase.
 * 
 * @param {Function} queryFn Función asíncrona que retorna los datos
 * @param {Array} deps Dependencias React que provocan re-ejecución al cambiar
 * @param {string|string[]} events Eventos de datos que invalidan la consulta ('alumnos', 'pagos', etc.)
 * @returns {any} El resultado de la consulta (o undefined mientras carga)
 */
export function useDataQuery(queryFn, deps = [], events = []) {
  const [data, setData] = useState(undefined);
  const isMountedRef = useRef(true);
  const queryFnRef = useRef(queryFn);

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const executeQuery = useCallback(async () => {
    try {
      const result = await queryFnRef.current();
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      console.error('Error en useDataQuery:', err);
      if (isMountedRef.current) {
        setData(prev => prev !== undefined ? prev : null);
      }
    }
  }, []);

  // Re-ejecutar cuando cambien las dependencias
  useEffect(() => {
    isMountedRef.current = true;
    executeQuery();

    return () => {
      isMountedRef.current = false;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-ejecutar cuando se emitan eventos relacionados
  useEffect(() => {
    if (!events || (Array.isArray(events) && events.length === 0)) return;

    const unsubscribe = dataEvents.on(events, () => {
      if (isMountedRef.current) {
        executeQuery();
      }
    });

    return unsubscribe;
  }, [events, executeQuery]);

  return data;
}

export default useDataQuery;

