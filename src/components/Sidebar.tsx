// src/components/Sidebar.tsx
import React from "react";
import {
  Home,
  Truck,
  Settings,
  HelpCircle,
  X,
  ChevronRight,
  ChevronDown,
  FilePlus2,
  ListChecks,
  Wrench,
  DollarSign,
  ClipboardList,
  Users,
  Plane,
  CalendarDays,
  Smartphone,
  ShieldCheck,
  MapPin, // For Sedes
  Building2,
  Briefcase,
  PanelLeft,
  Monitor
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface SidebarProps {
  open?: boolean; // Drawer en móvil
  onClose?: () => void; // Cerrar drawer en móvil
  collapsed?: boolean; // Desktop collapsed state
  onToggle?: () => void; // Toggle desktop sidebar
}

export default function Sidebar({ open, onClose, collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();
  const { profile } = useAuth();


  // ======= PERMISOS desde profiles.allowed_views =======
  //
  const isAdmin = profile?.rol === "admin";
  const views = Array.isArray(profile?.allowed_views)
    ? (profile!.allowed_views as string[])
    : [];

  // DEBUG: Verificar permisos en consola
  console.log("[Sidebar] Profile:", { role: profile?.rol, views, isAdmin });

  const hasAccess = (path: string) => {
    if (isAdmin) return true; // admin ve todo
    return views.some(
      (p) =>
        p === path ||
        (typeof p === "string" &&
          p.endsWith("/*") &&
          path.startsWith(p.slice(0, -2)))
    );
  };

  const showAny = (...paths: string[]) => paths.some((p) => hasAccess(p));

  // ======= Visibilidad por ítem =======

  const canSeeDashboard = hasAccess("/");

  // Camionetas
  const canSeeCam_Solicitar = hasAccess("/camionetas/solicitar");
  const canSeeCam_Admin = hasAccess("/camionetas/administrar");
  const canSeeCam_Inventario = hasAccess("/camionetas/inventario");
  const canSeeCam_Conductores = hasAccess("/camionetas/conductores");
  const canSeeCam_RegGastos = hasAccess("/camionetas/registros/gastos");
  const canSeeCam_RegChecklist = hasAccess("/camionetas/registros/checklist");
  const canSeeCam_Mantenimiento = hasAccess("/camionetas/mantenimiento");
  const canSeeCam_Garita = hasAccess("/camionetas/garita");
  const canSeeCam_MiCamioneta = hasAccess("/camionetas/mi-camioneta");

  // Pasajes & Hospedaje
  const canSeePas_Solicitar = hasAccess("/pasajes/solicitar");
  const canSeePas_Proveedor = hasAccess("/pasajes/proveedor");
  const canSeePas_Gerencia = hasAccess("/pasajes/gerencia");
  const canSeePas_Gestion = hasAccess("/pasajes/gestion");
  const canSeePas_Proveedores = hasAccess("/pasajes/proveedores");

  // Telefonia
  const canSeeTel_Solicitar = hasAccess("/telefonia/solicitar");
  const canSeeTel_Inventario = hasAccess("/telefonia/inventario");
  const canSeeTel_Gestion = hasAccess("/telefonia/gestion");
  const canSeeTel_AprobIT = hasAccess("/telefonia/aprobacion-it");
  const canSeeTel_AprobGerencia = hasAccess("/telefonia/aprobacion-gerencia");
  const canSeeTel_AprobAdmin = hasAccess("/telefonia/aprobacion-admin");

  // Configuración / Preferencias
  const canSeeConfig = hasAccess("/config");
  const canSeeConfigPersonal = hasAccess("/configuracion/personal");
  const canSeeConfigGerencias = hasAccess("/configuracion/gerencias");
  const canSeeConfigSedes = hasAccess("/configuracion/sedes");
  const canSeeConfigCentrales = hasAccess("/configuracion/centrales-cctv");
  const canSeeAppsCelular = hasAccess("/configuracion/aplicativos-celular"); // 👈 NUEVO

  // Seguridad
  const canSeeSeg_Programacion = hasAccess("/seguridad/programacion");
  const canSeeSeg_Recursos = hasAccess("/seguridad/recursos");
  const canSeeSeg_ChecklistCamaras = hasAccess("/seguridad/checklist-camaras");
  const canSeeSeg_InventarioCamaras = hasAccess("/seguridad/inventario-camaras");
  const canSeeSeg_MonitoreoPT = hasAccess("/seguridad/monitoreo-pt");
  const canSeeSeg_ReportingManager = hasAccess("/seguridad/reporting-manager");
  const canSeeSeg_AgentReport = hasAccess("/seguridad/agent-report");

  // Show section if any subsection is visible
  const showSeguridad = showAny(
    "/seguridad/programacion",
    "/seguridad/recursos",
    "/seguridad/checklist-camaras",
    "/seguridad/inventario-camaras",
    "/seguridad/monitoreo-pt",
    "/seguridad/reporting-manager",
    "/seguridad/agent-report"
  );

  const canSeeAyuda = hasAccess("/ayuda");

  // ======= Estados de apertura de submenús =======

  const [openCamionetas, setOpenCamionetas] = React.useState(
    location.pathname.startsWith("/camionetas")
  );
  const [openPasajes, setOpenPasajes] = React.useState(
    location.pathname.startsWith("/pasajes")
  );
  const [openTelefonia, setOpenTelefonia] = React.useState(
    location.pathname.startsWith("/telefonia")
  );
  const [openConfigMenu, setOpenConfigMenu] = React.useState(
    location.pathname.startsWith("/configuracion") ||
    location.pathname.startsWith("/config")
  );
  const [openSeguridad, setOpenSeguridad] = React.useState(
    location.pathname.startsWith("/seguridad")
  );

  React.useEffect(() => {
    const inCam = location.pathname.startsWith("/camionetas");
    const inPas = location.pathname.startsWith("/pasajes");
    const inTel = location.pathname.startsWith("/telefonia");
    const inConfig =
      location.pathname.startsWith("/config") ||
      location.pathname.startsWith("/configuracion");
    const inSeg = location.pathname.startsWith("/seguridad");

    setOpenCamionetas(inCam);
    setOpenPasajes(inPas);
    setOpenTelefonia(inTel);
    setOpenConfigMenu(inConfig);
    setOpenSeguridad(inSeg);
  }, [location.pathname]);

  // Fix: Maintain exact vertical height to prevent content jumping
  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    if (collapsed) {
      // Matches expanded state: mt-3 mb-2 + h-[17px] (approx line-height of text-[11px])
      return (
        <div className="mx-3 mt-3 mb-2 flex h-[17px] items-center">
          <div className="h-px w-full bg-gray-200" />
        </div>
      );
    }
    return (
      <div className="mx-2 mb-2 mt-3 flex h-[17px] items-center select-none px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {children}
      </div>
    );
  };

  // ======= Estilos =======

  const baseItem =
    "group mb-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 font-medium";
  const activeClass = "bg-gray-600/10 text-gray-700";
  const idleClass = "text-gray-600 hover:bg-gray-100";

  const submenuItem = (isActive: boolean) =>
    [
      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
      isActive ? "bg-gray-600/10 text-gray-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
    ].join(" ");

  const iconIdle = "h-5 w-5 text-gray-500 group-hover:text-gray-700";
  const iconActive = "h-5 w-5 text-gray-700";

  const inConfigSection =
    location.pathname.startsWith("/config") ||
    location.pathname.startsWith("/configuracion");

  const SidebarBody = (
    <div className={`flex h-full flex-col bg-white transition-all duration-300 ${collapsed ? "w-20" : "w-72"}`}>
      {/* Brand */}
      {/* Brand - Fixed height to prevent layout shifts */}
      <div className={`flex items-center h-16 shrink-0 ${collapsed ? "justify-center" : "justify-between px-4"} border-b border-gray-100`}>
        {collapsed ? (
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Expandir barra lateral"
          >
            <PanelLeft className="h-5 w-5 rotate-180" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <img src="/logo-rojo.svg" alt="Danper" className="h-8 w-auto" />
            </div>

            {/* Desktop Toggle Button (only if passed) */}
            {onToggle && (
              <button
                onClick={onToggle}
                className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Ocultar barra lateral"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}

            {/* Cerrar (móvil) - Only shown if !collapsed (which is implied here inside !collapsed block, but logic is shared. Wait, mobile uses 'open' prop, logic above handles collapsed state for desktop.
               The original code had the Close button inside the main div but distinct.
               My replacement above handles the DESKTOP collapsed logic.
               The MOBILE CLOSE button was previously:
               {!collapsed && ( <button ... hidden md:inline-flex ... /> )}
               Wait, mobile drawer is "fixed inset 0".
               Let's re-verify where the Mobile Close button was.
               It was checking !collapsed.
               Actually, for mobile, 'collapsed' prop might be false (default), but 'open' is true.
               The mobile drawer uses the SAME content 'SidebarBody'.
               So in mobile view, 'collapsed' is usually false.
               So we need to make sure the "Mobile Close" button is also rendered here or preserved.
            */}
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={onClose}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50"
            >
              <X className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Inicio */}
        {canSeeDashboard && (
          <>
            <SectionLabel>Inicio</SectionLabel>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [baseItem, isActive ? activeClass : idleClass].join(" ")
              }
              onClick={onClose}
            >
              {({ isActive }) => (
                <>
                  <Home className={isActive ? iconActive : iconIdle} />
                  {!collapsed && <span className="font-medium">Dashboard</span>}
                </>
              )}
            </NavLink>
          </>
        )}

        {/* ===== Tickets ===== */}
        {(showAny(
          "/camionetas/*",
          "/camionetas/solicitar",
          "/camionetas/administrar",
          "/camionetas/inventario",
          "/camionetas/conductores",
          "/camionetas/registros/gastos",
          "/camionetas/registros/checklist",
          "/camionetas/mantenimiento",
          "/camionetas/garita", // 👈 NUEVO
          "/camionetas/mi-camioneta" // 👈 NUEVO
        ) ||
          showAny(
            "/pasajes/*",
            "/pasajes/solicitar",
            "/pasajes/proveedor",
            "/pasajes/gerencia",
            "/pasajes/gestion",
            "/pasajes/proveedores"
          )) && <SectionLabel>Tickets</SectionLabel>}

        {/* Camionetas */}
        {showAny(
          "/camionetas/*",
          "/camionetas/solicitar",
          "/camionetas/administrar",
          "/camionetas/inventario",
          "/camionetas/conductores",
          "/camionetas/registros/gastos",
          "/camionetas/registros/checklist",
          "/camionetas/mantenimiento",
          "/camionetas/garita", // 👈 NUEVO
          "/camionetas/mi-camioneta" // 👈 NUEVO
        ) && (
            <>
              <button
                type="button"
                onClick={() => setOpenCamionetas((v) => !v)}
                className={[
                  baseItem,
                  location.pathname.startsWith("/camionetas")
                    ? activeClass
                    : idleClass,
                ].join(" ")}
                aria-expanded={openCamionetas}
                aria-controls="submenu-camionetas"
              >
                <Truck
                  className={
                    location.pathname.startsWith("/camionetas")
                      ? iconActive
                      : iconIdle
                  }
                />
                {!collapsed && (
                  <>
                    <span className="font-medium">Camionetas</span>
                    <span className="ml-auto transition-transform">
                      {openCamionetas ? (
                        <ChevronDown
                          className={
                            location.pathname.startsWith("/camionetas")
                              ? "h-4 w-4 text-white"
                              : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                          }
                        />
                      ) : (
                        <ChevronRight
                          className={
                            location.pathname.startsWith("/camionetas")
                              ? "h-4 w-4 text-white"
                              : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                          }
                        />
                      )}
                    </span>
                  </>
                )}
              </button>

              <AnimatePresence initial={false}>
                {openCamionetas && (
                  <motion.div
                    id="submenu-camionetas"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                  >
                    {canSeeCam_Solicitar && (
                      <NavLink
                        to="/camionetas/solicitar"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Solicitar (Creación de ticket)"
                      >
                        <FilePlus2 className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Solicitar (Creación de ticket)"}
                      </NavLink>
                    )}
                    {canSeeCam_Admin && (
                      <NavLink
                        to="/camionetas/administrar"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Administrar solicitudes"
                      >
                        <ListChecks className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Administrar solicitudes"}
                      </NavLink>
                    )}

                    {/* 👇 NUEVO ENLACE GARITA */}
                    {canSeeCam_Garita && (
                      <NavLink
                        to="/camionetas/garita"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Garita (Control QR)"
                      >
                        <ClipboardList className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Garita (Control QR)"}
                      </NavLink>
                    )}
                    {canSeeCam_MiCamioneta && (
                      <NavLink
                        to="/camionetas/mi-camioneta"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Mi Camioneta"
                      >
                        <Truck className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Mi Camioneta"}
                      </NavLink>
                    )}

                    {canSeeCam_Inventario && (
                      <NavLink
                        to="/camionetas/inventario"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Inventario Flota"
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Inventario Flota"}
                      </NavLink>
                    )}
                    {canSeeCam_Conductores && (
                      <NavLink
                        to="/camionetas/conductores"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Conductores"
                      >
                        <Users className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Conductores"}
                      </NavLink>
                    )}
                    {canSeeCam_RegGastos && (
                      <NavLink
                        to="/camionetas/registros/gastos"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Registros Gastos"
                      >
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Registros Gastos"}
                      </NavLink>
                    )}
                    {canSeeCam_RegChecklist && (
                      <NavLink
                        to="/camionetas/registros/checklist"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Registros Checklist"
                      >
                        <ClipboardList className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Registros Checklist"}
                      </NavLink>
                    )}
                    {canSeeCam_Mantenimiento && (
                      <NavLink
                        to="/camionetas/mantenimiento"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Programación mantenimiento"
                      >
                        <CalendarDays className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Programación mantenimiento"}
                      </NavLink>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

        {/* Pasajes & Hospedaje */}
        {showAny(
          "/pasajes/*",
          "/pasajes/solicitar",
          "/pasajes/proveedor",
          "/pasajes/gerencia",
          "/pasajes/gestion",
          "/pasajes/proveedores"
        ) && (
            <>
              <button
                type="button"
                onClick={() => setOpenPasajes((v) => !v)}
                className={[
                  baseItem,
                  location.pathname.startsWith("/pasajes")
                    ? activeClass
                    : idleClass,
                  "mt-1",
                ].join(" ")}
                aria-expanded={openPasajes}
                aria-controls="submenu-pasajes"
              >
                <Plane
                  className={
                    location.pathname.startsWith("/pasajes")
                      ? iconActive
                      : iconIdle
                  }
                />
                {!collapsed && (
                  <>
                    <span className="font-medium">Pasajes &amp; Hospedaje</span>
                    <span className="ml-auto transition-transform">
                      {openPasajes ? (
                        <ChevronDown
                          className={
                            location.pathname.startsWith("/pasajes")
                              ? "h-4 w-4 text-white"
                              : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                          }
                        />
                      ) : (
                        <ChevronRight
                          className={
                            location.pathname.startsWith("/pasajes")
                              ? "h-4 w-4 text-white"
                              : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                          }
                        />
                      )}
                    </span>
                  </>
                )}
              </button>

              <AnimatePresence initial={false}>
                {openPasajes && (
                  <motion.div
                    id="submenu-pasajes"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                  >
                    {canSeePas_Solicitar && (
                      <NavLink
                        to="/pasajes/solicitar"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Solicitar"
                      >
                        <FilePlus2 className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Solicitar"}
                      </NavLink>
                    )}
                    {canSeePas_Proveedor && (
                      <NavLink
                        to="/pasajes/proveedor"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Proveedor"
                      >
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Proveedor"}
                      </NavLink>
                    )}
                    {canSeePas_Gerencia && (
                      <NavLink
                        to="/pasajes/gerencia"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Gerencia (Aprobación)"
                      >
                        <ListChecks className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Gerencia (Aprobación)"}
                      </NavLink>
                    )}
                    {canSeePas_Gestion && (
                      <NavLink
                        to="/pasajes/gestion"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Gestión"
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Gestión"}
                      </NavLink>
                    )}
                    {canSeePas_Proveedores && (
                      <NavLink
                        to="/pasajes/proveedores"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Proveedores"
                      >
                        <Users className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Proveedores"}
                      </NavLink>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

        {/* Telefonia */}
        {showAny(
          "/telefonia/*",
          "/telefonia/solicitar",
          "/telefonia/inventario",
          "/telefonia/gestion",
          "/telefonia/aprobacion-it",
          "/telefonia/aprobacion-gerencia",
          "/telefonia/aprobacion-admin"
        ) && (
            <>
              <button
                type="button"
                onClick={() => setOpenTelefonia((v) => !v)}
                className={[
                  baseItem,
                  location.pathname.startsWith("/telefonia")
                    ? activeClass
                    : idleClass,
                  "mt-1",
                ].join(" ")}
                aria-expanded={openTelefonia}
                aria-controls="submenu-telefonia"
              >
                <Smartphone
                  className={
                    location.pathname.startsWith("/telefonia")
                      ? iconActive
                      : iconIdle
                  }
                />
                {!collapsed && (
                  <>
                    <span className="font-medium">Telefonía</span>
                    <span className="ml-auto transition-transform">
                      {openTelefonia ? (
                        <ChevronDown
                          className={
                            location.pathname.startsWith("/telefonia")
                              ? "h-4 w-4 text-white"
                              : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                          }
                        />
                      ) : (
                        <ChevronRight
                          className={
                            location.pathname.startsWith("/telefonia")
                              ? "h-4 w-4 text-white"
                              : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                          }
                        />
                      )}
                    </span>
                  </>
                )}
              </button>

              <AnimatePresence initial={false}>
                {openTelefonia && (
                  <motion.div
                    id="submenu-telefonia"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                  >
                    {canSeeTel_Solicitar && (
                      <NavLink
                        to="/telefonia/solicitar"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Solicitar"
                      >
                        <FilePlus2 className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Solicitar"}
                      </NavLink>
                    )}
                    {canSeeTel_Inventario && (
                      <NavLink
                        to="/telefonia/inventario"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Inventario"
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Inventario"}
                      </NavLink>
                    )}
                    {canSeeTel_AprobIT && (
                      <NavLink
                        to="/telefonia/aprobacion-it"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Aprobación IT"
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Aprobación IT"}
                      </NavLink>
                    )}
                    {canSeeTel_AprobGerencia && (
                      <NavLink
                        to="/telefonia/aprobacion-gerencia"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Aprobación Gerencia"
                      >
                        <ListChecks className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Aprobación Gerencia"}
                      </NavLink>
                    )}
                    {canSeeTel_AprobAdmin && (
                      <NavLink
                        to="/telefonia/aprobacion-admin"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Aprobación Admin"
                      >
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Aprobación Admin"}
                      </NavLink>
                    )}
                    {canSeeTel_Gestion && (
                      <NavLink
                        to="/telefonia/gestion"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                        title="Entregas / Historial"
                      >
                        <Truck className="h-4 w-4 text-gray-600" />
                        {!collapsed && "Entregas / Historial"}
                      </NavLink>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

        {/* Seguridad Patrimonial */}
        {showSeguridad && (
          <>
            <SectionLabel>Seguridad Patrimonial</SectionLabel>
            <button
              type="button"
              onClick={() => setOpenSeguridad((v) => !v)}
              className={[
                baseItem,
                location.pathname.startsWith("/seguridad")
                  ? activeClass
                  : idleClass,
                "mt-1",
              ].join(" ")}
              aria-expanded={openSeguridad}
              aria-controls="submenu-seguridad"
            >
              <ShieldCheck
                className={
                  location.pathname.startsWith("/seguridad")
                    ? iconActive
                    : iconIdle
                }
              />
              {!collapsed && (
                <>
                  <span className="font-medium">Seguridad Patrimonial</span>
                  <span className="ml-auto transition-transform">
                    {openSeguridad ? (
                      <ChevronDown
                        className={
                          location.pathname.startsWith("/seguridad")
                            ? "h-4 w-4 text-white"
                            : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        }
                      />
                    ) : (
                      <ChevronRight
                        className={
                          location.pathname.startsWith("/seguridad")
                            ? "h-4 w-4 text-white"
                            : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        }
                      />
                    )}
                  </span>
                </>
              )}
            </button>

            <AnimatePresence initial={false}>
              {openSeguridad && (
                <motion.div
                  id="submenu-seguridad"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                >
                  {canSeeSeg_Programacion && (
                    <NavLink
                      to="/seguridad/programacion"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Programación de Puestos"
                    >
                      <CalendarDays className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Programación de Puestos"}
                    </NavLink>
                  )}
                  {canSeeSeg_Recursos && (
                    <NavLink
                      to="/seguridad/recursos"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Gestión de Recursos"
                    >
                      <Users className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Gestión de Recursos"}
                    </NavLink>
                  )}
                  {canSeeSeg_ChecklistCamaras && (
                    <NavLink
                      to="/seguridad/checklist-camaras"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Checklist de Cámaras"
                    >
                      <ClipboardList className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Checklist de Cámaras"}
                    </NavLink>
                  )}
                  {canSeeSeg_InventarioCamaras && (
                    <NavLink
                      to="/seguridad/inventario-camaras"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Inventario de Cámaras"
                    >
                      <Wrench className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Inventario de Cámaras"}
                    </NavLink>
                  )}
                  {canSeeSeg_MonitoreoPT && (
                    <NavLink
                      to="/seguridad/monitoreo-pt"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Monitoreo PT"
                    >
                      <Monitor className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Monitoreo PT"}
                    </NavLink>
                  )}
                  {canSeeSeg_ReportingManager && (
                    <NavLink
                      to="/seguridad/reporting-manager"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Reporte Puestos"
                    >
                      <ShieldCheck className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Reporte Puestos"}
                    </NavLink>
                  )}
                  {canSeeSeg_AgentReport && (
                    <NavLink
                      to="/seguridad/agent-report"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Terminal Agente"
                    >
                      <Smartphone className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Terminal Agente"}
                    </NavLink>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Preferencias / Configuración (agrupado) */}
        {(canSeeConfig || canSeeConfigPersonal || canSeeConfigGerencias || canSeeConfigSedes || canSeeConfigCentrales) && (
          <>
            <SectionLabel>Preferencias</SectionLabel>

            <button
              type="button"
              onClick={() => setOpenConfigMenu((v) => !v)}
              className={[
                baseItem,
                inConfigSection ? activeClass : idleClass,
              ].join(" ")}
              aria-expanded={openConfigMenu}
              aria-controls="submenu-config"
            >
              <Settings className={inConfigSection ? iconActive : iconIdle} />
              {!collapsed && (
                <>
                  <span className="font-medium">Configuración</span>
                  <span className="ml-auto transition-transform">
                    {openConfigMenu ? (
                      <ChevronDown
                        className={
                          inConfigSection
                            ? "h-4 w-4 text-white"
                            : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        }
                      />
                    ) : (
                      <ChevronRight
                        className={
                          inConfigSection
                            ? "h-4 w-4 text-white"
                            : "h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        }
                      />
                    )}
                  </span>
                </>
              )}
            </button>

            <AnimatePresence initial={false}>
              {openConfigMenu && (
                <motion.div
                  id="submenu-config"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                >
                  {canSeeConfig && (
                    <NavLink
                      to="/config"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="General"
                    >
                      <Settings className="h-4 w-4 text-gray-600" />
                      {!collapsed && "General"}
                    </NavLink>
                  )}

                  {canSeeConfigPersonal && (
                    <NavLink
                      to="/configuracion/personal"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Personal"
                    >
                      <Users className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Personal"}
                    </NavLink>
                  )}

                  {canSeeConfigGerencias && (
                    <NavLink
                      to="/configuracion/gerencias"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Gerencias"
                    >
                      <ClipboardList className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Gerencias"}
                    </NavLink>
                  )}

                  {canSeeConfigSedes && (
                    <NavLink
                      to="/configuracion/sedes"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Sedes"
                    >
                      <MapPin className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Sedes"}
                    </NavLink>
                  )}

                  {canSeeConfigCentrales && (
                    <NavLink
                      to="/configuracion/centrales-cctv"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Centrales CCTV"
                    >
                      <Building2 className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Centrales CCTV"}
                    </NavLink>
                  )}

                  <NavLink
                    to="/configuracion/supervisores"
                    className={({ isActive }) => submenuItem(isActive)}
                    onClick={onClose}
                    title="Supervisores ST"
                  >
                    <Briefcase className="h-4 w-4 text-gray-600" />
                    {!collapsed && "Supervisores ST"}
                  </NavLink>

                  {canSeeAppsCelular && (
                    <NavLink
                      to="/configuracion/aplicativos-celular"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                      title="Aplicativos MDM"
                    >
                      <Smartphone className="h-4 w-4 text-gray-600" />
                      {!collapsed && "Aplicativos MDM"}
                    </NavLink>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Ayuda */}
        {canSeeAyuda && (
          <NavLink
            to="/ayuda"
            className={({ isActive }) =>
              [baseItem, isActive ? activeClass : idleClass].join(" ")
            }
            onClick={onClose}
          >
            {({ isActive }) => (
              <>
                <HelpCircle className={isActive ? iconActive : iconIdle} />
                {!collapsed && <span className="font-medium">Ayuda</span>}
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Usuario / footer - REMOVED MOVED TO HEADER */}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`fixed left-0 top-0 hidden h-screen border-r border-gray-100 bg-white md:block z-30 transition-all duration-300 ${collapsed ? "w-20" : "w-72"}`}>
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/30"
              onClick={onClose}
              aria-hidden
            />
            <motion.aside
              className="absolute left-0 top-0 h-full w-72 border-r bg-white"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {SidebarBody}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
