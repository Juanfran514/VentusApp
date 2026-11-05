import { useState, useCallback } from 'react';

/**
 * Custom Hook para gestionar Drag & Drop tanto con ratón como táctil (móvil/tablet) — SRP
 */
export const useSortableList = ({ visibleList = [], fullList = [], onReorder }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDropSwap = useCallback(
    async (fromIdx, toIdx) => {
      if (fromIdx === null || toIdx === null || fromIdx === toIdx) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }
      if (fromIdx < 0 || fromIdx >= visibleList.length) return;
      if (toIdx < 0 || toIdx >= visibleList.length) return;

      const itemA = visibleList[fromIdx];
      const itemB = visibleList[toIdx];

      const currentList = fullList.map((item, idx) => ({
        id: item.id,
        orden: item.orden !== undefined ? item.orden : idx + 1
      }));

      const idxA = currentList.findIndex(item => item.id === itemA.id);
      const idxB = currentList.findIndex(item => item.id === itemB.id);

      if (idxA !== -1 && idxB !== -1) {
        const [movedItem] = currentList.splice(idxA, 1);
        currentList.splice(idxB, 0, movedItem);

        currentList.forEach((item, i) => {
          item.orden = i + 1;
        });

        await onReorder(currentList);
      }

      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [visibleList, fullList, onReorder]
  );

  const handleTouchStart = useCallback((idx) => {
    setDraggedIndex(idx);
    setDragOverIndex(idx);
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (draggedIndex === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!targetEl) return;
      const rowEl = targetEl.closest('[data-row-index]');
      if (rowEl) {
        const targetIdx = Number(rowEl.getAttribute('data-row-index'));
        if (!isNaN(targetIdx) && targetIdx !== dragOverIndex) {
          setDragOverIndex(targetIdx);
        }
      }
    },
    [draggedIndex, dragOverIndex]
  );

  const handleTouchEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      handleDropSwap(draggedIndex, dragOverIndex);
    } else {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [draggedIndex, dragOverIndex, handleDropSwap]);

  const getRowDragProps = useCallback(
    (idx) => ({
      'data-row-index': idx,
      draggable: true,
      onDragStart: (e) => {
        e.dataTransfer.setData('text/plain', String(idx));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedIndex(idx);
      },
      onDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== idx) {
          setDragOverIndex(idx);
        }
      },
      onDrop: (e) => {
        e.preventDefault();
        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
        handleDropSwap(isNaN(fromIdx) || fromIdx < 0 ? draggedIndex : fromIdx, idx);
      },
      onDragEnd: () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
      },
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      style: {
        opacity: draggedIndex === idx ? 0.4 : 1,
        backgroundColor:
          dragOverIndex === idx && draggedIndex !== idx ? 'rgba(79, 70, 229, 0.1)' : undefined,
        borderTop:
          dragOverIndex === idx && draggedIndex !== idx && idx < draggedIndex
            ? '2px solid var(--primary-color)'
            : undefined,
        borderBottom:
          dragOverIndex === idx && draggedIndex !== idx && idx > draggedIndex
            ? '2px solid var(--primary-color)'
            : undefined,
        transition: 'background-color 0.15s ease, opacity 0.15s ease'
      }
    }),
    [draggedIndex, dragOverIndex, handleDropSwap, handleTouchMove, handleTouchEnd]
  );

  return {
    draggedIndex,
    dragOverIndex,
    handleTouchStart,
    getRowDragProps
  };
};

