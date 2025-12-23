// src/components/Sidebar.tsx
import React from "react";
import {
  Home,
  Truck,
  Settings,
  HelpCircle,
  X,
  LogOut,
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
  MoreVertical,
  Smartphone,
  ShieldCheck,
  MapPin, // For Sedes
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface SidebarProps {
  open?: boolean; // Drawer en móvil
  onClose?: () => void; // Cerrar drawer en móvil
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, profile } = useAuth();

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

  // Seguridad
  const canSeeSeg_Programacion = hasAccess("/seguridad/programacion");
  const canSeeSeg_Recursos = hasAccess("/seguridad/recursos");
  const canSeeSeg_ChecklistCamaras = hasAccess("/seguridad/checklist-camaras");
  const canSeeSeg_InventarioCamaras = hasAccess("/seguridad/inventario-camaras");

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

  const [showUserMenu, setShowUserMenu] = React.useState(false);

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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    onClose?.();
  };

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => (
    <div className="mx-2 mb-2 mt-3 select-none px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {children}
    </div>
  );

  const inConfigSection =
    location.pathname.startsWith("/config") ||
    location.pathname.startsWith("/configuracion");

  const SidebarBody = (
    <div className="flex h-full w-72 flex-col bg-white">
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 md:justify-center">
        <div className="flex items-center gap-2">
          <img src="/logo-rojo.svg" alt="Danper" className="h-8 w-auto" />
        </div>

        {/* Cerrar (móvil) */}
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50"
        >
          <X className="h-5 w-5" />
        </button>
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
                  <span className="font-medium">Dashboard</span>
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
                      >
                        <FilePlus2 className="h-4 w-4 text-gray-600" />
                        Solicitar (Creación de ticket)
                      </NavLink>
                    )}
                    {canSeeCam_Admin && (
                      <NavLink
                        to="/camionetas/administrar"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <ListChecks className="h-4 w-4 text-gray-600" />
                        Administrar solicitudes
                      </NavLink>
                    )}

                    {/* 👇 NUEVO ENLACE GARITA */}
                    {canSeeCam_Garita && (
                      <NavLink
                        to="/camionetas/garita"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <ClipboardList className="h-4 w-4 text-gray-600" />
                        Garita (Control QR)
                      </NavLink>
                    )}
                    {canSeeCam_MiCamioneta && (
                      <NavLink
                        to="/camionetas/mi-camioneta"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Truck className="h-4 w-4 text-gray-600" />
                        Mi Camioneta
                      </NavLink>
                    )}

                    {canSeeCam_Inventario && (
                      <NavLink
                        to="/camionetas/inventario"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        Inventario Flota
                      </NavLink>
                    )}
                    {canSeeCam_Conductores && (
                      <NavLink
                        to="/camionetas/conductores"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Users className="h-4 w-4 text-gray-600" />
                        Conductores
                      </NavLink>
                    )}
                    {canSeeCam_RegGastos && (
                      <NavLink
                        to="/camionetas/registros/gastos"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        Registros Gastos
                      </NavLink>
                    )}
                    {canSeeCam_RegChecklist && (
                      <NavLink
                        to="/camionetas/registros/checklist"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <ClipboardList className="h-4 w-4 text-gray-600" />
                        Registros Checklist
                      </NavLink>
                    )}
                    {canSeeCam_Mantenimiento && (
                      <NavLink
                        to="/camionetas/mantenimiento"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <CalendarDays className="h-4 w-4 text-gray-600" />
                        Programación mantenimiento
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
                      >
                        <FilePlus2 className="h-4 w-4 text-gray-600" />
                        Solicitar
                      </NavLink>
                    )}
                    {canSeePas_Proveedor && (
                      <NavLink
                        to="/pasajes/proveedor"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        Proveedor
                      </NavLink>
                    )}
                    {canSeePas_Gerencia && (
                      <NavLink
                        to="/pasajes/gerencia"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <ListChecks className="h-4 w-4 text-gray-600" />
                        Gerencia (Aprobación)
                      </NavLink>
                    )}
                    {canSeePas_Gestion && (
                      <NavLink
                        to="/pasajes/gestion"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        Gestión
                      </NavLink>
                    )}
                    {canSeePas_Proveedores && (
                      <NavLink
                        to="/pasajes/proveedores"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Users className="h-4 w-4 text-gray-600" />
                        Proveedores
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
                      >
                        <FilePlus2 className="h-4 w-4 text-gray-600" />
                        Solicitar
                      </NavLink>
                    )}
                    {canSeeTel_Inventario && (
                      <NavLink
                        to="/telefonia/inventario"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        Inventario
                      </NavLink>
                    )}
                    {canSeeTel_AprobIT && (
                      <NavLink
                        to="/telefonia/aprobacion-it"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        Aprobación IT
                      </NavLink>
                    )}
                    {canSeeTel_AprobGerencia && (
                      <NavLink
                        to="/telefonia/aprobacion-gerencia"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <ListChecks className="h-4 w-4 text-gray-600" />
                        Aprobación Gerencia
                      </NavLink>
                    )}
                    {canSeeTel_AprobAdmin && (
                      <NavLink
                        to="/telefonia/aprobacion-admin"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <DollarSign className="h-4 w-4 text-gray-600" />
                        Aprobación Admin
                      </NavLink>
                    )}
                    {canSeeTel_Gestion && (
                      <NavLink
                        to="/telefonia/gestion"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Truck className="h-4 w-4 text-gray-600" />
                        Entregas / Historial
                      </NavLink>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

        {/* Seguridad Patrimonial */}
        {showAny(
          "/seguridad/*",
          "/seguridad/programacion",
          "/seguridad/recursos",
          "/seguridad/checklist-camaras",
          "/seguridad/inventario-camaras"
        ) && (
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
                      >
                        <CalendarDays className="h-4 w-4 text-gray-600" />
                        Programación de Puestos
                      </NavLink>
                    )}
                    {canSeeSeg_Recursos && (
                      <NavLink
                        to="/seguridad/recursos"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Users className="h-4 w-4 text-gray-600" />
                        Gestión de Recursos
                      </NavLink>
                    )}
                    {canSeeSeg_ChecklistCamaras && (
                      <NavLink
                        to="/seguridad/checklist-camaras"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <ClipboardList className="h-4 w-4 text-gray-600" />
                        Checklist de Cámaras
                      </NavLink>
                    )}
                    {canSeeSeg_InventarioCamaras && (
                      <NavLink
                        to="/seguridad/inventario-camaras"
                        className={({ isActive }) => submenuItem(isActive)}
                        onClick={onClose}
                      >
                        <Wrench className="h-4 w-4 text-gray-600" />
                        Inventario de Cámaras
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
                    >
                      <Settings className="h-4 w-4 text-gray-600" />
                      General
                    </NavLink>
                  )}

                  {canSeeConfigPersonal && (
                    <NavLink
                      to="/configuracion/personal"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                    >
                      <Users className="h-4 w-4 text-gray-600" />
                      Personal
                    </NavLink>
                  )}

                  {canSeeConfigGerencias && (
                    <NavLink
                      to="/configuracion/gerencias"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                    >
                      <ClipboardList className="h-4 w-4 text-gray-600" />
                      Gerencias
                    </NavLink>
                  )}

                  {canSeeConfigSedes && (
                    <NavLink
                      to="/configuracion/sedes"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                    >
                      <MapPin className="h-4 w-4 text-gray-600" />
                      Sedes
                    </NavLink>
                  )}

                  {canSeeConfigCentrales && (
                    <NavLink
                      to="/configuracion/centrales-cctv"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                    >
                      <Building2 className="h-4 w-4 text-gray-600" />
                      Centrales CCTV
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
                <span className="font-medium">Ayuda</span>
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Usuario / footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="relative flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 transition-colors">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ff0000] text-white font-bold text-lg flex-shrink-0">
            {profile?.nombre ? profile.nombre.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {profile?.nombre ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-gray-500 font-medium">
              {profile?.area ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white hover:shadow-sm hover:text-gray-900 transition-all"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {/* Menú desplegable "3 puntos" */}
          <AnimatePresence>
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-full right-2 mb-2 z-20 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
                >
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-gray-100 bg-white md:block z-30">
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
