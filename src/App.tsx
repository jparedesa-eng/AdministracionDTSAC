// src/App.tsx
import React from "react";
import { Menu } from "lucide-react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";

/* Auth */
import RequireAuth from "./auth/RequireAuth";
import ProtectedRoute from "./auth/ProtectedRoute";
import Login from "./pages/Auth/Login";

/* Páginas base */
import Dashboard from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Compras from "./pages/Compras";
import Logistica from "./pages/Logistica";
import Config from "./pages/Config";
import Ayuda from "./pages/Ayuda";

/* Camionetas */
import Solicitar from "./pages/Camionetas/Solicitar";
import AdministrarSolicitudes from "./pages/Camionetas/Administrar";
import InventarioMantenedor from "./pages/Camionetas/Inventario";
import RegistrosGastos from "./pages/Camionetas/RegistrosIncidentes";
import RegistrosChecklist from "./pages/Camionetas/RegistrosChecklist";
import Conductores from "./pages/Camionetas/Conductores";
import Garita from "./pages/Camionetas/Garita";

/* Programación de mantenimiento */
import ProgramacionMantenimiento from "./pages/Camionetas/ProgramacionMantenimiento";

/* Pasajes & Hospedaje */
import SolicitarPasaje from "./pages/pasajes/SolicitarView";
import ProveedorPasaje from "./pages/pasajes/ProveedorView";
import GerenciaPasaje from "./pages/pasajes/GerenciaView";
import GestionPasaje from "./pages/pasajes/GestionView";
import ProveedoresPasaje from "./pages/pasajes/ProvidersPage";

/* Configuración */
import PersonalPage from "./pages/configuracion/PersonalPage";
import GerenciasPage from "./pages/configuracion/GerenciasPage";

/* Errores */
import Forbidden403 from "./pages/Errors/403";

/* Layout protegido */
function ProtectedLayout() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar (móvil) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white px-3 py-2 md:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setIsOpen(true)}
          className="
            inline-flex h-10 w-10 items-center justify-center
            rounded-full
            bg-transparent
            border border-transparent
            transition-colors
            hover:border-gray-300 hover:bg-gray-50
            active:bg-gray-100
          "
        >
          <Menu className="h-5 w-5 text-gray-800" />
        </button>

        <span className="font-semibold">Administración</span>
      </header>

      {/* Sidebar + contenido */}
      <Sidebar open={isOpen} onClose={() => setIsOpen(false)} />

      <main className="md:pl-72">
        <div className="min-h-[calc(100vh-48px)] md:min-h-screen flex flex-col bg-gray-50">
          <div className="h-6 md:h-12" />
          <div className="flex-1 p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* RUTAS PÚBLICAS: login en / y /login */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* RUTAS PROTEGIDAS */}
      <Route element={<RequireAuth />}>
        <Route element={<ProtectedLayout />}>
          {/* Dashboard (home después de login) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute path="/dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Rutas base */}
          <Route
            path="/inventario"
            element={
              <ProtectedRoute path="/inventario">
                <Inventario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compras"
            element={
              <ProtectedRoute path="/compras">
                <Compras />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistica"
            element={
              <ProtectedRoute path="/logistica">
                <Logistica />
              </ProtectedRoute>
            }
          />
          <Route
            path="/config"
            element={
              <ProtectedRoute path="/config">
                <Config />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ayuda"
            element={
              <ProtectedRoute path="/ayuda">
                <Ayuda />
              </ProtectedRoute>
            }
          />

          {/* Camionetas */}
          <Route
            path="/camionetas"
            element={
              <ProtectedRoute path="/camionetas/*">
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h1 className="text-xl font-semibold">Camionetas</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Selecciona una opción del submenú (Solicitar, Administrar,
                    Inventario, Registros, Conductores).
                  </p>
                </section>
              </ProtectedRoute>
            }
          />
          <Route
            path="/camionetas/solicitar"
            element={
              <ProtectedRoute path="/camionetas/solicitar">
                <Solicitar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camionetas/administrar"
            element={
              <ProtectedRoute path="/camionetas/administrar">
                <AdministrarSolicitudes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camionetas/inventario"
            element={
              <ProtectedRoute path="/camionetas/inventario">
                <InventarioMantenedor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camionetas/garita"
            element={
              <ProtectedRoute path="/camionetas/garita">
                <Garita />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camionetas/mantenimiento"
            element={
              <ProtectedRoute path="/camionetas/mantenimiento">
                <ProgramacionMantenimiento />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camionetas/registros/gastos"
            element={
              <ProtectedRoute path="/camionetas/registros/gastos">
                <RegistrosGastos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camionetas/registros/checklist"
            element={
              <ProtectedRoute path="/camionetas/registros/checklist">
                <RegistrosChecklist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camionetas/conductores"
            element={
              <ProtectedRoute path="/camionetas/conductores">
                <Conductores />
              </ProtectedRoute>
            }
          />

          {/* Pasajes & Hospedaje */}
          <Route
            path="/pasajes"
            element={
              <ProtectedRoute path="/pasajes/*">
                <div className="px-1">
                  <h1 className="text-xl font-semibold">
                    Pasajes &amp; Hospedaje
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Selecciona una opción del submenú (Solicitar, Proveedor,
                    Gerencia, Gestión, Proveedores).
                  </p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pasajes/solicitar"
            element={
              <ProtectedRoute path="/pasajes/solicitar">
                <SolicitarPasaje />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pasajes/proveedor"
            element={
              <ProtectedRoute path="/pasajes/proveedor">
                <ProveedorPasaje />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pasajes/gerencia"
            element={
              <ProtectedRoute path="/pasajes/gerencia">
                <GerenciaPasaje />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pasajes/gestion"
            element={
              <ProtectedRoute path="/pasajes/gestion">
                <GestionPasaje />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pasajes/proveedores"
            element={
              <ProtectedRoute path="/pasajes/proveedores">
                <ProveedoresPasaje />
              </ProtectedRoute>
            }
          />

          {/* Configuración */}
          <Route
            path="/configuracion/personal"
            element={
              <ProtectedRoute path="/configuracion/personal">
                <PersonalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion/gerencias"
            element={
              <ProtectedRoute path="/configuracion/gerencias">
                <GerenciasPage />
              </ProtectedRoute>
            }
          />

          {/* 403 (protegido) */}
          <Route
            path="/403"
            element={
              <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <Forbidden403 />
              </section>
            }
          />

          {/* 404 protegido */}
          <Route
            path="/app-not-found"
            element={
              <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <h1 className="text-xl font-semibold">404</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Ruta no encontrada.
                </p>
              </section>
            }
          />
        </Route>
      </Route>

      {/* Fallback GLOBAL: cualquier otra ruta → /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
