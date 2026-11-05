-- =======================================================
-- VENTUSAPP SAAS - ESQUEMA MULTI-TENANT POSTGRESQL / SUPABASE
-- =======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Gimnasios / Clientes (Tenants)
CREATE TABLE IF NOT EXISTS gimnasios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(50),
    plan VARCHAR(50) DEFAULT 'pro',
    estado_suscripcion VARCHAR(30) DEFAULT 'trialing' CHECK (estado_suscripcion IN ('trialing', 'active', 'past_due', 'canceled')),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    fecha_fin_periodo TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Usuarios del Gimnasio (Entrenadores, Recepción, Administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gimnasio_id UUID NOT NULL REFERENCES gimnasios(id) ON DELETE CASCADE,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(50) DEFAULT 'admin' CHECK (rol IN ('owner', 'admin', 'coach', 'reception')),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Grupos / Clases
CREATE TABLE IF NOT EXISTS grupos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gimnasio_id UUID NOT NULL REFERENCES gimnasios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    actividad VARCHAR(100),
    horarios TEXT,
    plazas_max INT DEFAULT 20,
    tarifas JSONB DEFAULT '{}'::jsonb,
    orden INT DEFAULT 0,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alumnos
CREATE TABLE IF NOT EXISTS alumnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gimnasio_id UUID NOT NULL REFERENCES gimnasios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) DEFAULT '',
    fecha_nac DATE,
    telefono VARCHAR(50),
    n_tutor VARCHAR(100),
    grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL,
    cuota NUMERIC(10, 2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'baja')),
    inscripciones JSONB DEFAULT '[]'::jsonb,
    observaciones TEXT,
    lesiones TEXT,
    cinturon VARCHAR(50),
    email VARCHAR(150),
    foto TEXT,
    fecha_alta TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Cobros y Pagos
CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gimnasio_id UUID NOT NULL REFERENCES gimnasios(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) DEFAULT 'cuota' CHECK (tipo IN ('cuota', 'material', 'examen', 'licencia')),
    mes INT,
    año INT,
    importe NUMERIC(10, 2) DEFAULT 0,
    beneficio NUMERIC(10, 2) DEFAULT 0,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    concepto TEXT,
    estado VARCHAR(20) DEFAULT 'pagado' CHECK (estado IN ('pagado', 'pendiente')),
    estado_pedido VARCHAR(30) CHECK (estado_pedido IN ('sin_pedir', 'pedido', 'recibido', 'entregado', NULL)),
    color VARCHAR(50),
    talla VARCHAR(50),
    producto_id UUID
);

-- 6. Gastos (Fijos y Variables)
CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gimnasio_id UUID NOT NULL REFERENCES gimnasios(id) ON DELETE CASCADE,
    concepto VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    importe NUMERIC(10, 2) NOT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    tipo VARCHAR(20) DEFAULT 'variable' CHECK (tipo IN ('variable', 'fijo')),
    mes INT,
    año INT,
    factura_url TEXT
);

-- 7. Catálogo de Productos / Equipamiento
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gimnasio_id UUID NOT NULL REFERENCES gimnasios(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    precio NUMERIC(10, 2) DEFAULT 0,
    coste NUMERIC(10, 2) DEFAULT 0,
    beneficio NUMERIC(10, 2) DEFAULT 0,
    colores JSONB DEFAULT '[]'::jsonb,
    tallas JSONB DEFAULT '[]'::jsonb,
    foto TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- =======================================================
-- ÍNDICES DE ALTO RENDIMIENTO MULTI-TENANT
-- =======================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_gimnasio ON usuarios(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_gimnasio ON alumnos(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_grupos_gimnasio ON grupos(gimnasio_id);
CREATE INDEX IF NOT EXISTS idx_pagos_gimnasio_mes ON pagos(gimnasio_id, mes, año);
CREATE INDEX IF NOT EXISTS idx_gastos_gimnasio_mes ON gastos(gimnasio_id, mes, año);
CREATE INDEX IF NOT EXISTS idx_productos_gimnasio ON productos(gimnasio_id);

