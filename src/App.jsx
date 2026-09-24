import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Alumnos from './pages/Alumnos';
import AlumnoDetalle from './pages/AlumnoDetalle';
import Grupos from './pages/Grupos';
import Cobros from './pages/Cobros';
import Examenes from './pages/Examenes';
import Equipamiento from './pages/Equipamiento';
import Gastos from './pages/Gastos';

function App() {
  return (
    <HashRouter>
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
          <Route path="gastos" element={<Gastos />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
