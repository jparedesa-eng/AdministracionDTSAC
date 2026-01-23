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
import ProyectosTelefonia from "./pages/Telefonia/Catalogos/Proyectos";

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
/* Seguridad Refactored Routes */
/* Programación Puestos */
import ProgramacionPuestos from "./pages/ProgramacionPuestos/ProgramacionPuestos";
import GestionRecursos from "./pages/ProgramacionPuestos/GestionRecursos";

/* Checklist CCTV */
import ChecklistCamaras from "./pages/ChecklistCCTV/ChecklistCamaras";
import InventarioCamaras from "./pages/ChecklistCCTV/InventarioCamaras";
import DashboardCCTV from "./pages/ChecklistCCTV/DashboardCCTV";
import RegistroEventosMayores from "./pages/ChecklistCCTV/RegistroEventosMayores";
import InventarioPantallas from "./pages/ChecklistCCTV/InventarioPantallas";
import InventarioNVR from "./pages/ChecklistCCTV/InventarioNVR";
import InventarioSensores from "./pages/ChecklistCCTV/InventarioSensores";

/* Monitoreo Unidades */
import MonitoreoPT from "./pages/MonitoreoUnidades/MonitoreoPTScreen"; // Check if this was correct screen
// import MonitoreoPTComponent from "./pages/MonitoreoUnidades/MonitoreoPT"; // This might be the inner component, App used MonitoreoPTScreen usually or MonitoreoPT? 
// Original import was: import MonitoreoPT from "./pages/Seguridad/MonitoreoPTScreen"; 
import { DestinationsTable } from "./pages/MonitoreoUnidades/DestinationsTable";
import { TravelTimesTable } from "./pages/MonitoreoUnidades/TravelTimesTable";

/* Seguimiento Agentes */
import { ReportingManager } from "./pages/SeguimientoAgentes/ReportingManager";
import { AgentReportView } from "./pages/SeguimientoAgentes/AgentReportView";



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
          <Route
            path="/telefonia/proyectos"
            element={
              <ProtectedRoute path="/telefonia/proyectos">
                <ProyectosTelefonia />
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





          {/* SEGURIDAD: Programación de Puestos */}
          <Route
            path="/programacion-puestos"
            element={
              <ProtectedRoute path="/programacion-puestos">
                <div className="px-1">
                  <h1 className="text-xl font-semibold">
                    Programación de Puestos
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Gestión de programación y recursos.
                  </p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/programacion-puestos/programacion"
            element={
              <ProtectedRoute path="/programacion-puestos/programacion">
                <ProgramacionPuestos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/programacion-puestos/recursos"
            element={
              <ProtectedRoute path="/programacion-puestos/recursos">
                <GestionRecursos />
              </ProtectedRoute>
            }
          />

          {/* SEGURIDAD: Checklist CCTV */}
          <Route
            path="/checklist-cctv"
            element={
              <ProtectedRoute path="/checklist-cctv">
                <div className="px-1">
                  <h1 className="text-xl font-semibold">
                    Checklist CCTV
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Dashboard, eventos e inventarios de cámaras.
                  </p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklist-cctv/dashboard"
            element={
              <ProtectedRoute path="/checklist-cctv/dashboard">
                <DashboardCCTV />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklist-cctv/checklist-camaras"
            element={
              <ProtectedRoute path="/checklist-cctv/checklist-camaras">
                <ChecklistCamaras />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklist-cctv/inventario-camaras"
            element={
              <ProtectedRoute path="/checklist-cctv/inventario-camaras">
                <InventarioCamaras />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklist-cctv/pantallas"
            element={
              <ProtectedRoute path="/checklist-cctv/pantallas">
                <InventarioPantallas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklist-cctv/nvr"
            element={
              <ProtectedRoute path="/checklist-cctv/nvr">
                <InventarioNVR />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklist-cctv/sensores"
            element={
              <ProtectedRoute path="/checklist-cctv/sensores">
                <InventarioSensores />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklist-cctv/eventos"
            element={
              <ProtectedRoute path="/checklist-cctv/eventos">
                <RegistroEventosMayores />
              </ProtectedRoute>
            }
          />

          {/* SEGURIDAD: Monitoreo Unidades */}
          <Route
            path="/monitoreo-unidades"
            element={
              <ProtectedRoute path="/monitoreo-unidades">
                <div className="px-1">
                  <h1 className="text-xl font-semibold">
                    Monitoreo de Unidades
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Monitoreo PT, destinos y tiempos de viaje.
                  </p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoreo-unidades/monitoreo-pt"
            element={
              <ProtectedRoute path="/monitoreo-unidades/monitoreo-pt">
                <MonitoreoPT />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoreo-unidades/destinos"
            element={
              <ProtectedRoute path="/monitoreo-unidades/destinos">
                <DestinationsTable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitoreo-unidades/tiempos-viaje"
            element={
              <ProtectedRoute path="/monitoreo-unidades/tiempos-viaje">
                <TravelTimesTable />
              </ProtectedRoute>
            }
          />

          {/* SEGURIDAD: Seguimiento Agentes */}
          <Route
            path="/seguimiento-agentes"
            element={
              <ProtectedRoute path="/seguimiento-agentes/*">
                <div className="px-1">
                  <h1 className="text-xl font-semibold">
                    Seguimiento Agentes
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Reportes y terminal de agente.
                  </p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguimiento-agentes/reporting-manager"
            element={
              <ProtectedRoute path="/seguimiento-agentes/reporting-manager">
                <ReportingManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seguimiento-agentes/agent-report"
            element={
              <ProtectedRoute path="/seguimiento-agentes/agent-report">
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
