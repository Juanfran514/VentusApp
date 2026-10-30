import { useState, useMemo, useCallback } from 'react';

/**
 * Custom Hook para gestionar la lógica de la cesta de venta múltiple (SRP)
 */
export const useCarritoVenta = () => {
  const [cesta, setCesta] = useState([]);

  const addProduct = useCallback((prod) => {
    setCesta(prev => {
      const existingIndex = prev.findIndex(item => item.productoId === prod.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          cantidad: updated[existingIndex].cantidad + 1
        };
        return updated;
      }
      return [
        ...prev,
        {
          productoId: prod.id,
          nombre: prod.nombre,
          precio: prod.precio,
          cantidad: 1,
          foto: prod.foto || ''
        }
      ];
    });
  }, []);

  const updateCantidad = useCallback((index, delta) => {
    setCesta(prev => {
      const updated = [...prev];
      const newCant = updated[index].cantidad + delta;
      if (newCant <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], cantidad: newCant };
      return updated;
    });
  }, []);

  const updatePrecio = useCallback((index, nuevoPrecio) => {
    setCesta(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], precio: nuevoPrecio };
      return updated;
    });
  }, []);

  const removeProduct = useCallback((index) => {
    setCesta(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCesta = useCallback(() => {
    setCesta([]);
  }, []);

  const totalCesta = useMemo(() => {
    return cesta.reduce((sum, item) => {
      const prec = Number(item.precio) || 0;
      const cant = Number(item.cantidad) || 1;
      return sum + prec * cant;
    }, 0);
  }, [cesta]);

  return {
    cesta,
    totalCesta,
    addProduct,
    updateCantidad,
    updatePrecio,
    removeProduct,
    clearCesta
  };
};

