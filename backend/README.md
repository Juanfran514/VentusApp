# VentusApp Backend API (SaaS Multi-tenant)

Servidor backend para la plataforma de gestión de gimnasios VentusApp SaaS.

## Características
* Aislamiento de datos multi-tenant por `gimnasio_id`.
* Control de acceso y autorización mediante Feature Flags y Límites por Plan (`Starter`, `Pro`, `Elite`).
* Endpoints de sincronización y migración desde IndexedDB local (`/api/sync/import-backup`).

## Instalación y Ejecución Local
```bash
npm install
npm run dev
```

El servidor iniciará por defecto en `http://localhost:4000`.
