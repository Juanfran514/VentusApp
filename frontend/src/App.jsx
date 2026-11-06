import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { DialogProvider } from './context/DialogContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { solicitarPersistenciaAutomatica } from './utils/backup';

// Code Splitting por rutas (React.lazy) para optimizar la carga inicial
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Alumnos = lazy(() => import('./pages/Alumnos'));
const AlumnoDetalle = lazy(() => import('./pages/AlumnoDetalle'));
const Grupos = lazy(() => import('./pages/Grupos'));
const Cobros = lazy(() => import('./pages/Cobros'));
const Examenes = lazy(() => import('./pages/Examenes'));
const Equipamiento = lazy(() => import('./pages/Equipamiento'));
const Licencias = lazy(() => import('./pages/Licencias'));
const Gastos = lazy(() => import('./pages/Gastos'));
const Ajustes = lazy(() => import('./pages/Ajustes'));

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      color: 'var(--text-muted)',
      fontSize: '0.95rem'
    }}
  >
    Cargando módulo...
  </div>
);

function App() {
  // Solicita silenciosamente persistencia al navegador/iPad para evitar borrado de datos
  useEffect(() => {
    solicitarPersistenciaAutomatica();
  }, []);

  return (
    <AuthProvider>
      <DialogProvider>
        <HashRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Ruta pública de Autenticación (Login / Registro de Gimnasio) */}
              <Route path="/login" element={<Auth />} />

              {/* Rutas Privadas / Protegidas por Gimnasio (Multi-tenant) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="alumnos" element={<Alumnos />} />
                  <Route path="alumnos/:id" element={<AlumnoDetalle />} />
                  <Route path="grupos" element={<Grupos />} />
                  <Route path="cobros" element={<Cobros />} />
                  <Route path="examenes" element={<Examenes />} />
                  <Route path="equipamiento" element={<Equipamiento />} />
                  <Route path="licencias" element={<Licencias />} />
                  <Route path="gastos" element={<Gastos />} />
                  <Route path="ajustes" element={<Ajustes />} />
                </Route>
              </Route>

              {/* Redirección por defecto */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;
