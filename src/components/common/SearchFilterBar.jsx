import React from 'react';
import { FilterX } from 'lucide-react';

/**
 * Barra unificada de búsqueda y filtro desplegable (Interface Segregation / DRY)
 */
const SearchFilterBar = ({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filterValue = '',
  onFilterChange,
  filterOptions = [],
  filterPlaceholder = 'Todos',
  style = {}
}) => {
  return (
    <div
      className="filters"
      style={{
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap',
        ...style
      }}
    >
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-input"
        style={{ minWidth: '240px', flex: 1, marginBottom: 0 }}
      />

      {onFilterChange && (
        <>
          <select
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            style={{ minWidth: '200px', width: 'auto' }}
          >
            <option value="">{filterPlaceholder}</option>
            {filterOptions.map((opt, idx) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const label = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={idx} value={val}>
                  {label}
                </option>
              );
            })}
          </select>

          {filterValue && (
            <button
              type="button"
              className="btn-secondary flex-center"
              onClick={() => onFilterChange('')}
              style={{ padding: '8px 15px' }}
              title="Limpiar filtro"
            >
              <FilterX size={18} style={{ marginRight: '6px' }} />
              Limpiar
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default SearchFilterBar;
