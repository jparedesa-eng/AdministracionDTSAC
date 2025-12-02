// src/components/Sidebar.tsx
import React from "react";
import {
  Home,
  Truck,
  Settings,
  HelpCircle,
  X,
  LogOut,
  User,
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
  const canSeeCam_Garita = hasAccess("/camionetas/garita"); // 👈 NUEVO

  // Pasajes & Hospedaje
  const canSeePas_Solicitar = hasAccess("/pasajes/solicitar");
  const canSeePas_Proveedor = hasAccess("/pasajes/proveedor");
  const canSeePas_Gerencia = hasAccess("/pasajes/gerencia");
  const canSeePas_Gestion = hasAccess("/pasajes/gestion");
  const canSeePas_Proveedores = hasAccess("/pasajes/proveedores");

  // Configuración / Preferencias
  const canSeeConfig = hasAccess("/config");
  const canSeeConfigPersonal = hasAccess("/configuracion/personal");
  const canSeeConfigGerencias = hasAccess("/configuracion/gerencias");

  const canSeeAyuda = hasAccess("/ayuda");

  // ======= Estados de apertura de submenús =======

  const [openCamionetas, setOpenCamionetas] = React.useState(
    location.pathname.startsWith("/camionetas")
  );
  const [openPasajes, setOpenPasajes] = React.useState(
    location.pathname.startsWith("/pasajes")
  );
  const [openConfigMenu, setOpenConfigMenu] = React.useState(
    location.pathname.startsWith("/config") ||
      location.pathname.startsWith("/configuracion")
  );

  React.useEffect(() => {
    const inCam = location.pathname.startsWith("/camionetas");
    const inPas = location.pathname.startsWith("/pasajes");
    const inConfig =
      location.pathname.startsWith("/config") ||
      location.pathname.startsWith("/configuracion");

    setOpenCamionetas(inCam);
    setOpenPasajes(inPas);
    setOpenConfigMenu(inConfig);
  }, [location.pathname]);

  // ======= Estilos =======

  const baseItem =
    "group mb-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 font-medium";
  const activeClass = "bg-gray-900 text-white";
  const idleClass = "text-gray-700 hover:bg-gray-100";

  const submenuItem = (isActive: boolean) =>
    [
      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
      isActive ? "bg-white text-gray-900" : "text-gray-700 hover:bg-white",
    ].join(" ");

  const iconIdle = "h-5 w-5 text-gray-600 group-hover:text-gray-900";
  const iconActive = "h-5 w-5 text-white";

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
      <div className="flex items-center justify-between border-b px-4 py-3 md:justify-center">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gray-900 text-white">
            <span className="text-sm font-bold">D</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Administración
          </span>
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
          "/camionetas/garita" // 👈 NUEVO
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
          "/camionetas/garita" // 👈 NUEVO
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

                  {canSeeCam_Inventario && (
                    <NavLink
                      to="/camionetas/inventario"
                      className={({ isActive }) => submenuItem(isActive)}
                      onClick={onClose}
                    >
                      <Wrench className="h-4 w-4 text-gray-600" />
                      Inventario
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

        {/* Preferencias / Configuración (agrupado) */}
        {(canSeeConfig || canSeeConfigPersonal || canSeeConfigGerencias) && (
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
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-200">
            <User className="h-5 w-5 text-gray-700" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {profile?.nombre ?? "Usuario"}
            </p>
            <p className="truncate text-xs text-gray-500">
              {profile?.area ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r bg-white md:block z-30">
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
