import { useState, useMemo, useCallback } from 'react';

/**
 * Custom Hook para gestionar la lógica de la cesta de venta múltiple (SRP)
 */
export const useCarritoVenta = () => {
  const [cesta, setCesta] = useState([]);

  const addProduct = useCallback((prod, options = {}) => {
    const coloresList = Array.isArray(prod.colores)
      ? prod.colores
      : (prod.colores ? prod.colores.split(',').map(s => s.trim()).filter(Boolean) : []);
    const tallasList = Array.isArray(prod.tallas)
      ? prod.tallas
      : (prod.tallas ? prod.tallas.split(',').map(s => s.trim()).filter(Boolean) : []);

    const selectedColor = options.selectedColor !== undefined 
      ? options.selectedColor 
      : (coloresList.length === 1 ? coloresList[0] : '');

    const selectedTalla = options.selectedTalla !== undefined 
      ? options.selectedTalla 
      : (tallasList.length === 1 ? tallasList[0] : '');

    const estadoPedido = options.estadoPedido || 'sin_pedir';

    setCesta(prev => {
      const existingIndex = prev.findIndex(item =>
        item.productoId === prod.id &&
        item.selectedColor === selectedColor &&
        item.selectedTalla === selectedTalla &&
        item.estadoPedido === estadoPedido
      );

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
          precio: Number(prod.precio) || 0,
          beneficio: Number(prod.beneficio) || 0,
          coste: Number(prod.coste) || 0,
          colores: coloresList,
          tallas: tallasList,
          selectedColor,
          selectedTalla,
          estadoPedido,
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

  const updateBeneficio = useCallback((index, nuevoBeneficio) => {
    setCesta(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], beneficio: nuevoBeneficio };
      return updated;
    });
  }, []);

  const updateColor = useCallback((index, color) => {
    setCesta(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selectedColor: color };
      return updated;
    });
  }, []);

  const updateTalla = useCallback((index, talla) => {
    setCesta(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selectedTalla: talla };
      return updated;
    });
  }, []);

  const updateEstadoPedido = useCallback((index, estadoPedido) => {
    setCesta(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], estadoPedido };
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

  const totalBeneficio = useMemo(() => {
    return cesta.reduce((sum, item) => {
      const ben = Number(item.beneficio) || 0;
      const cant = Number(item.cantidad) || 1;
      return sum + ben * cant;
    }, 0);
  }, [cesta]);

  return {
    cesta,
    totalCesta,
    totalBeneficio,
    addProduct,
    updateCantidad,
    updatePrecio,
    updateBeneficio,
    updateColor,
    updateTalla,
    updateEstadoPedido,
    removeProduct,
    clearCesta
  };
};
