import React from 'react';

/**
 * Isotipo e Identidad Neutral de VentusApp
 * Se utiliza en pantallas públicas previas al login y como fallback cuando un club no tiene logo propio.
 */
export const VentusIcon = ({ size = 48, color = 'var(--primary-color, #22c55e)' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 54 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="ventusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--primary-dark, #16a34a)" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      
      {/* Contenedor redondeado con borde tecnológico */}
      <rect
        x="2"
        y="2"
        width="50"
        height="50"
        rx="14"
        fill="url(#bgGlow)"
        stroke={color}
        strokeWidth="2"
      />
      
      {/* V estilizada aerodinámica / crest */}
      <path
        d="M15 17L27 37L39 17"
        stroke="url(#ventusGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 21L27 31L33 21"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
      
      {/* Detalle sutil de viento/velocidad */}
      <circle cx="27" cy="16" r="2" fill={color} />
    </svg>
  );
};

export const VentusBrand = ({ size = 40, showText = true, subtitle = 'Gestión Deportiva' }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
      <VentusIcon size={size} />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <span
            style={{
              fontSize: `${Math.max(1.15, size * 0.035)}rem`,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-light, #f3f4f6)',
              lineHeight: 1.15
            }}
          >
            Ventus<span style={{ color: 'var(--primary-color, #22c55e)' }}>App</span>
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted, #9ca3af)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default VentusBrand;

