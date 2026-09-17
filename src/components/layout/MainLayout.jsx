import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Users, BookOpen, CreditCard, Receipt, Medal, Package } from 'lucide-react';

const MainLayout = () => {
  return (
    <div className="layout-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          Ventus App
        </div>
        <div className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            <span className="nav-text">Dashboard</span>
          </NavLink>
          <NavLink to="/cobros" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <CreditCard size={20} />
            <span className="nav-text">Cuotas</span>
          </NavLink>
          <NavLink to="/examenes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Medal size={20} />
            <span className="nav-text">Exámenes</span>
          </NavLink>
          <NavLink to="/equipamiento" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span className="nav-text">Equipamiento</span>
          </NavLink>
          <NavLink to="/alumnos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span className="nav-text">Alumnos</span>
          </NavLink>
          <NavLink to="/grupos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BookOpen size={20} />
            <span className="nav-text">Grupos</span>
          </NavLink>
          <NavLink to="/gastos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Receipt size={20} />
            <span className="nav-text">Gastos</span>
          </NavLink>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
