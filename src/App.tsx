// src/App.tsx
import React from "react";
// import { Menu } from "lucide-react"; // Removed
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

/* Auth */
import RequireAuth from "./auth/RequireAuth";
import ProtectedRoute from "./auth/ProtectedRoute";
import Login from "./pages/Auth/Login";

/* Páginas base */
import Ayuda from "./pages/Ayuda";
import HomeRedirect from "./pages/HomeRedirect";

/* Camionetas */
import Solicitar from "./pages/Camionetas/Solicitar";
import AdministrarSolicitudes from "./pages/Camionetas/Administrar";
import InventarioMantenedor from "./pages/Camionetas/Inventario";
import RegistrosGastos from "./pages/Camionetas/RegistrosIncidentes";
import RegistrosChecklist from "./pages/Camionetas/RegistrosChecklist";
import Conductores from "./pages/Camionetas/Conductores";
import Garita from "./pages/Camionetas/Garita";
import MiCamioneta from "./pages/Camionetas/MiCamioneta";
import ProgramacionMantenimiento from "./pages/Camionetas/ProgramacionMantenimiento";

/* Pasajes & Hospedaje */
import SolicitarPasaje from "./pages/pasajes/SolicitarView";
import ProveedorPasaje from "./pages/pasajes/ProveedorView";
import GerenciaPasaje from "./pages/pasajes/GerenciaView";
import GestionPasaje from "./pages/pasajes/GestionView";
import ProveedoresPasaje from "./pages/pasajes/ProvidersPage";

/* Telefonia */
import InventarioTelefonia from "./pages/Telefonia/Inventario";
import SolicitarTelefonia from "./pages/Telefonia/Solicitar";
import GestionTelefonia from "./pages/Telefonia/Gestion";
import HistorialTelefonia from "./pages/Telefonia/Historial";
import AprobacionGerencia from "./pages/Telefonia/AprobacionGerencia";
import AprobacionAdmin from "./pages/Telefonia/AprobacionAdmin";
import ModelosTelefonia from "./pages/Telefonia/Catalogos/Modelos";
import PuestosTelefonia from "./pages/Telefonia/Catalogos/Puestos";

import MisEquipos from "./pages/Telefonia/MisEquipos";

/* Configuración */
import PersonalPage from "./pages/configuracion/PersonalPage";
import GerenciasPage from "./pages/configuracion/GerenciasPage";
import SedesPage from "./pages/configuracion/SedesPage";
import CctvCentralesPage from "./pages/configuracion/CctvCentralesPage";
import CoberturaOperadores from "./pages/configuracion/CoberturaOperadores";
import SupervisorST from "./pages/configuracion/SupervisorST";
import AplicativosCelular from "./pages/configuracion/AplicativosCelular";

/* Seguridad */
import ProgramacionPuestos from "./pages/Seguridad/ProgramacionPuestos";
import GestionRecursos from "./pages/Seguridad/GestionRecursos";
import ChecklistCamaras from "./pages/Seguridad/ChecklistCamaras";
import InventarioCamaras from "./pages/Seguridad/InventarioCamaras";
import MonitoreoPT from "./pages/Seguridad/MonitoreoPTScreen";
import { DestinationsTable } from "./pages/Seguridad/DestinationsTable";
import { ReportingManager } from "./pages/Seguridad/ReportingManager";
import { AgentReportView } from "./pages/Seguridad/AgentReportView";
import { TravelTimesTable } from "./pages/Seguridad/TravelTimesTable";
import InventarioSensores from "./pages/Seguridad/InventarioSensores";
import InventarioPantallas from "./pages/Seguridad/InventarioPantallas";
import InventarioNVR from "./pages/Seguridad/InventarioNVR";
import RegistroEventosMayores from "./pages/Seguridad/RegistroEventosMayores";
import DashboardCCTV from "./pages/Seguridad/DashboardCCTV";



/* Errores */
import Forbidden403 from "./pages/Errors/403";

/* Layout protegido */
function ProtectedLayout() {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsDesktopCollapsed(!isDesktopCollapsed);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* Header (Top bar) */}
      <Header
        sidebarOpen={!isDesktopCollapsed}
        setSidebarOpen={handleToggleSidebar}
        isMobile={false}
      />

      {/* Sidebar + contenido */}
      <Sidebar
        open={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        collapsed={isDesktopCollapsed}
        onToggle={handleToggleSidebar}
      />

      <main className={`transition-all duration-300 ${!isDesktopCollapsed ? "md:pl-72" : "md:pl-20"}`}>
        <div className="min-h-screen flex flex-col bg-slate-50 pt-16">
          <div className="flex-1 p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [schedules, setSchedules] = React.useState<any[]>([]);


  return (
    <Routes>
      {/* RUTAS PÚBLICAS: login en / y /login */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* RUTAS PROTEGIDAS */}
      <Route element={<RequireAuth />}>
        <Route element={<ProtectedLayout />}>
          {/* Dashboard (home después de login) */}
          <Route path="/home" element={<HomeRedirect />} />


          {/* Rutas base */}

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
            path="/camionetas/mi-camioneta"
            element={
              <ProtectedRoute path="/camionetas/mi-camioneta">
                <MiCamioneta />
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
          <Route
            path="/seguridad/tiempos-viaje"
            element={
              <ProtectedRoute path="/seguridad/tiempos-viaje">
                <TravelTimesTable />
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

          {/* Telefonia */}
          <Route
            path="/telefonia"
            element={
              <ProtectedRoute path="/telefonia/*">
                <div className="px-1">
                  <h1 className="text-xl font-semibold">
                    Telefonía
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Selecciona una opción del submenú (Inventario, Solicitar, Gestión).
                  </p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/inventario"
            element={
              <ProtectedRoute path="/telefonia/inventario">
                <InventarioTelefonia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/solicitar"
            element={
              <ProtectedRoute path="/telefonia/solicitar">
                <SolicitarTelefonia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/mis-equipos"
            element={
              <ProtectedRoute path="/telefonia/solicitar">
                <MisEquipos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/gestion"
            element={
              <ProtectedRoute path="/telefonia/gestion">
                <GestionTelefonia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/historial"
            element={
              <ProtectedRoute path="/telefonia/historial">
                <HistorialTelefonia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/aprobacion-gerencia"
            element={
              <ProtectedRoute path="/telefonia/aprobacion-gerencia">
                <AprobacionGerencia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/aprobacion-admin"
            element={
              <ProtectedRoute path="/telefonia/aprobacion-admin">
                <AprobacionAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/modelos"
            element={
              <ProtectedRoute path="/telefonia/modelos">
                <ModelosTelefonia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/telefonia/puestos"
            element={
              <ProtectedRoute path="/telefonia/puestos">
                <PuestosTelefonia />
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
          <Route
            path="/configuracion/sedes"
            element={
              <ProtectedRoute path="/configuracion/sedes">
                <SedesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion/cobertura-operadores"
            element={
              <ProtectedRoute path="/configuracion/cobertura-operadores">
                <CoberturaOperadores />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion/centrales-cctv"
            element={
              <ProtectedRoute path="/configuracion/centrales-cctv">
                <CctvCentralesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion/supervisores"
            element={
              <ProtectedRoute path="/configuracion/supervisores">
                <SupervisorST />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion/aplicativos-celular"
            element={
              <ProtectedRoute path="/configuracion/aplicativos-celular">
                <AplicativosCelular />
              </ProtectedRoute>
            }
          />





          {/* Seguridad */}
          <Route
            path="/seguridad"
            element={
              <ProtectedRoute path="/seguridad/*">
                <div className="px-1">
                  <h1 className="text-xl font-semibold">
                    Seguridad Patrimonial
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Selecciona una opción del submenú.
                  </p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/dashboard"
            element={
              <ProtectedRoute path="/seguridad/dashboard">
                <DashboardCCTV />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/programacion"
            element={
              <ProtectedRoute path="/seguridad/programacion">
                <ProgramacionPuestos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/recursos"
            element={
              <ProtectedRoute path="/seguridad/recursos">
                <GestionRecursos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/checklist-camaras"
            element={
              <ProtectedRoute path="/seguridad/checklist-camaras">
                <ChecklistCamaras />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/inventario-camaras"
            element={
              <ProtectedRoute path="/seguridad/inventario-camaras">
                <InventarioCamaras />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/monitoreo-pt"
            element={
              <ProtectedRoute path="/seguridad/monitoreo-pt">
                <MonitoreoPT />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/destinos"
            element={
              <ProtectedRoute path="/seguridad/monitoreo-pt">
                <DestinationsTable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/sensores"
            element={
              <ProtectedRoute path="/seguridad/sensores">
                <InventarioSensores />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/pantallas"
            element={
              <ProtectedRoute path="/seguridad/pantallas">
                <InventarioPantallas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/nvr"
            element={
              <ProtectedRoute path="/seguridad/nvr">
                <InventarioNVR />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/eventos"
            element={
              <ProtectedRoute path="/seguridad/eventos">
                <RegistroEventosMayores />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/reporting-manager"
            element={
              <ProtectedRoute path="/seguridad/reporting-manager">
                <ReportingManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguridad/agent-report"
            element={
              <ProtectedRoute path="/seguridad/agent-report">
                <AgentReportView
                  schedules={schedules}
                  setSchedules={setSchedules}
                />
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
