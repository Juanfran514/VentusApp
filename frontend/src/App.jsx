import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { DialogProvider } from './context/DialogContext';
import { solicitarPersistenciaAutomatica } from './utils/backup';

// Code Splitting por rutas (React.lazy) para optimizar la carga inicial
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Alumnos = lazy(() => import('./pages/Alumnos'));
const AlumnoDetalle = lazy(() => import('./pages/AlumnoDetalle'));
const Grupos = lazy(() => import('./pages/Grupos'));
const Cobros = lazy(() => import('./pages/Cobros'));
const Examenes = lazy(() => import('./pages/Examenes'));
const Equipamiento = lazy(() => import('./pages/Equipamiento'));
const Licencias = lazy(() => import('./pages/Licencias'));
const Gastos = lazy(() => import('./pages/Gastos'));

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
    <DialogProvider>
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
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
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </DialogProvider>
  );
}

export default App;
