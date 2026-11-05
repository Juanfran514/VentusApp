# VentusApp Monorepo (SaaS Multi-tenant)

Sistema de gestión para gimnasios, dojos de artes marciales y academias deportivas adaptado a arquitectura SaaS multi-tenant con Feature Flags.

## Estructura del Proyecto

* **[`frontend/`](./frontend)**: Aplicación web React (Vite, PWA, Tailwind/CSS, Lucide) con soporte offline y adaptación a planes de suscripción.
* **[`backend/`](./backend)**: API REST Node.js/Express con middleware de autorización por planes/flags y soporte multi-tenant.
* **[`shared/`](./shared)**: Constantes compartidas, catálogo de Feature Flags (`Starter`, `Pro`, `Elite`) y límites de uso.

## Scripts Disponibles

* `npm run dev:frontend` - Inicia el servidor de desarrollo del frontend (Vite).
* `npm run dev:backend` - Inicia el servidor de desarrollo del backend API.
* `npm run build:frontend` - Compila la versión de producción del frontend.
