import React, { useState, useEffect, useRef } from "react";
import {
  Truck,
  Settings,
  HelpCircle,
  X,
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
  ChevronsLeft,
  ChevronsRight,
  Monitor,
  Route,
  SignalHigh,
  User,
  Activity,
  LayoutDashboard,
  Folder
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AnimatePresence, motion } from "framer-motion";

// Helper for conditional classes
function clsx(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface SidebarProps {
  open?: boolean; // Drawer en móvil
  onClose?: () => void; // Cerrar drawer en móvil
  collapsed?: boolean; // Desktop collapsed state
  onToggle?: () => void; // Toggle desktop sidebar
}

interface NavItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  path?: string;
  badge?: string | number;
  badgeColor?: 'red' | 'blue' | 'green';
  subItems?: NavItem[];
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

export default function Sidebar({ open, onClose, collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // NOTE: If logout is not in useAuth based on previous code (it wasn't used), we can't add it yet.
  // The previous code didn't have logout in the Sidebar. I will stick to what was there or check AuthContext if I could.
  // For now I will omit logout action if not present in previous usage, but add the button UI.
  // Actually, previous code didn't show logout. User reference has it. I'll add the button but maybe just console log if logout fn is missing.

  // ======= PERMISOS desde profiles.allowed_views =======
  const isAdmin = profile?.rol === "admin";
  const views = Array.isArray(profile?.allowed_views)
    ? (profile!.allowed_views as string[])
    : [];

  const hasAccess = (path: string) => {
    if (isAdmin) return true;
    return views.some(
      (p) =>
        p === path ||
        (typeof p === "string" &&
          p.endsWith("/*") &&
          path.startsWith(p.slice(0, -2)))
    );
  };

  // ======= Visibilidad por ítem (Logic copied from previous Sidebar) =======
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
  const canSeeTel_Historial = hasAccess("/telefonia/historial");
  const canSeeTel_AprobGerencia = hasAccess("/telefonia/aprobacion-gerencia");
  const canSeeTel_AprobAdmin = hasAccess("/telefonia/aprobacion-admin");

  // Configuración

  const canSeeConfigPersonal = hasAccess("/configuracion/personal");
  const canSeeConfigGerencias = hasAccess("/configuracion/gerencias");
  const canSeeConfigSedes = hasAccess("/configuracion/sedes");
  const canSeeConfigCentrales = hasAccess("/configuracion/centrales-cctv");
  const canSeeAppsCelular = hasAccess("/configuracion/aplicativos-celular");
  const canSeeCoberturaOperadores = hasAccess("/configuracion/cobertura-operadores");

  // Seguridad
  const canSeeSeg_Programacion = hasAccess("/seguridad/programacion");
  const canSeeSeg_Recursos = hasAccess("/seguridad/recursos");
  const canSeeSeg_ChecklistCamaras = hasAccess("/seguridad/checklist-camaras");
  const canSeeSeg_InventarioCamaras = hasAccess("/seguridad/inventario-camaras");
  const canSeeSeg_MonitoreoPT = hasAccess("/seguridad/monitoreo-pt");
  const canSeeSeg_Destinos = hasAccess("/seguridad/destinos");
  const canSeeSeg_TiemposViaje = hasAccess("/seguridad/tiempos-viaje");
  const canSeeSeg_ReportingManager = hasAccess("/seguridad/reporting-manager");
  const canSeeSeg_AgentReport = hasAccess("/seguridad/agent-report");
  const canSeeAyuda = hasAccess("/ayuda");


  // Construct Navigation Data
  const getNavGroups = (): NavGroup[] => {
    const groups: NavGroup[] = [];

    // --- Tickets Group ---
    // If any tickets sections are visible
    // Note: The previous logic had a generic 'Tickets' header for both Camionetas and Pasajes. 
    // I'll create a "Tickets" group if either is visible.

    // Actually, in the new design, keeping distinct groups is better.
    // Let's mimic the structure: Camionetas, Pasajes, etc.

    // 1. Camionetas
    const camionetasSubItems: NavItem[] = [];
    if (canSeeCam_Solicitar) camionetasSubItems.push({ id: 'cam-solicitar', label: 'Solicitar', path: '/camionetas/solicitar', icon: FilePlus2 });
    if (canSeeCam_Admin) camionetasSubItems.push({ id: 'cam-admin', label: 'Administrar', path: '/camionetas/administrar', icon: ListChecks });
    if (canSeeCam_Garita) camionetasSubItems.push({ id: 'cam-garita', label: 'Garita', path: '/camionetas/garita', icon: ClipboardList });
    if (canSeeCam_MiCamioneta) camionetasSubItems.push({ id: 'cam-mim', label: 'Mi Camioneta', path: '/camionetas/mi-camioneta', icon: Truck });
    if (canSeeCam_Inventario) camionetasSubItems.push({ id: 'cam-inv', label: 'Inventario', path: '/camionetas/inventario', icon: Wrench });
    if (canSeeCam_Conductores) camionetasSubItems.push({ id: 'cam-cond', label: 'Conductores', path: '/camionetas/conductores', icon: Users });
    if (canSeeCam_RegGastos) camionetasSubItems.push({ id: 'cam-gastos', label: 'Registros G.', path: '/camionetas/registros/gastos', icon: DollarSign });
    if (canSeeCam_RegChecklist) camionetasSubItems.push({ id: 'cam-check', label: 'Checklists', path: '/camionetas/registros/checklist', icon: ClipboardList });
    if (canSeeCam_Mantenimiento) camionetasSubItems.push({ id: 'cam-mant', label: 'Mantenimiento', path: '/camionetas/mantenimiento', icon: CalendarDays });

    const pasajesSubItems: NavItem[] = [];
    if (canSeePas_Solicitar) pasajesSubItems.push({ id: 'pas-sol', label: 'Solicitar', path: '/pasajes/solicitar', icon: FilePlus2 });
    if (canSeePas_Proveedor) pasajesSubItems.push({ id: 'pas-prov', label: 'Proveedor', path: '/pasajes/proveedor', icon: DollarSign });
    if (canSeePas_Gerencia) pasajesSubItems.push({ id: 'pas-ger', label: 'Gerencia', path: '/pasajes/gerencia', icon: ListChecks });
    if (canSeePas_Gestion) pasajesSubItems.push({ id: 'pas-ges', label: 'Gestión', path: '/pasajes/gestion', icon: Wrench });
    if (canSeePas_Proveedores) pasajesSubItems.push({ id: 'pas-list', label: 'Proveedores', path: '/pasajes/proveedores', icon: Users });

    const ticketItems: NavItem[] = [];
    if (camionetasSubItems.length > 0) {
      ticketItems.push({ id: 'camionetas', label: 'Camionetas', icon: Truck, subItems: camionetasSubItems });
    }
    if (pasajesSubItems.length > 0) {
      ticketItems.push({ id: 'pasajes', label: 'Pasajes & Hospedaje', icon: Plane, subItems: pasajesSubItems });
    }

    // --- Telefonia (Merged into Administracion) ---
    const telefoniaSubItems: NavItem[] = [];
    if (canSeeTel_Solicitar) telefoniaSubItems.push({ id: 'tel-mis-equipos', label: 'Mis Equipos', path: '/telefonia/mis-equipos', icon: User });
    if (canSeeTel_Solicitar) telefoniaSubItems.push({ id: 'tel-sol', label: 'Solicitar', path: '/telefonia/solicitar', icon: FilePlus2 });
    if (canSeeTel_Inventario) telefoniaSubItems.push({ id: 'tel-inv', label: 'Inventario', path: '/telefonia/inventario', icon: Wrench });
    if (canSeeTel_AprobGerencia) telefoniaSubItems.push({ id: 'tel-ger', label: 'Aprobación Ger.', path: '/telefonia/aprobacion-gerencia', icon: ListChecks });
    if (canSeeTel_AprobAdmin) telefoniaSubItems.push({ id: 'tel-admin', label: 'Aprobación Admin', path: '/telefonia/aprobacion-admin', icon: DollarSign });
    if (canSeeTel_Gestion) telefoniaSubItems.push({ id: 'tel-ges', label: 'Gestión', path: '/telefonia/gestion', icon: ListChecks });
    if (canSeeTel_Historial) telefoniaSubItems.push({ id: 'tel-hist', label: 'Historial', path: '/telefonia/historial', icon: ClipboardList });

    // Catalogos (Using AprobAdmin permission for now as likely only admins should see this)
    if (canSeeTel_AprobAdmin) {
      telefoniaSubItems.push({ id: 'tel-modelos', label: 'Catálogo Modelos', path: '/telefonia/modelos', icon: Smartphone });
      telefoniaSubItems.push({ id: 'tel-puestos', label: 'Catálogo Puestos', path: '/telefonia/puestos', icon: Briefcase });
      telefoniaSubItems.push({ id: 'tel-proyectos', label: 'Catálogo Proyectos', path: '/telefonia/proyectos', icon: Folder });
    }

    if (telefoniaSubItems.length > 0) {
      ticketItems.push({ id: 'telefonia', label: 'Telefonía', icon: Smartphone, subItems: telefoniaSubItems });
    }

    if (ticketItems.length > 0) {
      groups.push({ id: 'admin', title: 'ADMINISTRACIÓN', items: ticketItems });
    }

    // --- Seguridad Patrimonial ---
    const seguridadItems: NavItem[] = [];

    // 1. Programacion de puestos
    const progSubItems: NavItem[] = [];
    if (canSeeSeg_Programacion) progSubItems.push({ id: 'seg-prog', label: 'Programación', path: '/seguridad/programacion', icon: CalendarDays });
    if (canSeeSeg_Recursos) progSubItems.push({ id: 'seg-rec', label: 'Recursos', path: '/seguridad/recursos', icon: Users });

    if (progSubItems.length > 0) {
      seguridadItems.push({ id: 'seg-puestos', label: 'Programación de Puestos', icon: CalendarDays, subItems: progSubItems });
    }

    // 2. Checklist CCTV
    const checklistSubItems: NavItem[] = [];
    if (canSeeSeg_ChecklistCamaras) checklistSubItems.push({ id: 'seg-dash', label: 'Dashboard', path: '/seguridad/dashboard', icon: LayoutDashboard });
    if (hasAccess("/seguridad/eventos")) checklistSubItems.push({ id: 'seg-evts', label: 'Eventos CCTV', path: '/seguridad/eventos', icon: Settings });
    if (canSeeSeg_ChecklistCamaras) checklistSubItems.push({ id: 'seg-check', label: 'Checklist Cam.', path: '/seguridad/checklist-camaras', icon: ClipboardList });
    if (canSeeSeg_InventarioCamaras) checklistSubItems.push({ id: 'seg-inv', label: 'Inventario Cam.', path: '/seguridad/inventario-camaras', icon: Wrench });
    if (hasAccess("/seguridad/pantallas")) checklistSubItems.push({ id: 'seg-pant', label: 'Inventario Pan.', path: '/seguridad/pantallas', icon: Monitor });
    if (hasAccess("/seguridad/nvr")) checklistSubItems.push({ id: 'seg-nvr', label: 'Inventario NVR', path: '/seguridad/nvr', icon: Building2 });
    if (hasAccess("/seguridad/sensores")) checklistSubItems.push({ id: 'seg-sens', label: 'Inventario Sens.', path: '/seguridad/sensores', icon: Activity });

    if (checklistSubItems.length > 0) {
      seguridadItems.push({ id: 'seg-camaras', label: 'Checklist CCTV', icon: ClipboardList, subItems: checklistSubItems });
    }

    // 3. Monitoreo de Unidades
    const monitoreoSubItems: NavItem[] = [];
    if (canSeeSeg_MonitoreoPT) monitoreoSubItems.push({ id: 'seg-mon', label: 'Monitoreo PT', path: '/seguridad/monitoreo-pt', icon: Monitor });
    if (canSeeSeg_Destinos) monitoreoSubItems.push({ id: 'seg-dest', label: 'Lugares de Destino', path: '/seguridad/destinos', icon: MapPin });
    if (canSeeSeg_TiemposViaje) monitoreoSubItems.push({ id: 'seg-viaje', label: 'Tiempos de Viaje', path: '/seguridad/tiempos-viaje', icon: Truck });

    if (monitoreoSubItems.length > 0) {
      seguridadItems.push({ id: 'seg-unidades', label: 'Monitoreo de Unidades', icon: Route, subItems: monitoreoSubItems });
    }

    // 4. Seguimiento Agentes
    const agentesSubItems: NavItem[] = [];
    if (canSeeSeg_ReportingManager) agentesSubItems.push({ id: 'seg-rep', label: 'Reporte de Puestos', path: '/seguridad/reporting-manager', icon: ShieldCheck });
    if (canSeeSeg_AgentReport) agentesSubItems.push({ id: 'seg-agent', label: 'Terminal de Agente', path: '/seguridad/agent-report', icon: Smartphone });

    if (agentesSubItems.length > 0) {
      seguridadItems.push({ id: 'seg-agentes', label: 'Seguimiento Agentes', icon: Users, subItems: agentesSubItems }); // Changed icon to Users regarding 'Agentes'
    }

    if (seguridadItems.length > 0) {
      groups.push({
        id: 'seguridad-group',
        title: 'SEGURIDAD PATRIMONIAL',
        items: seguridadItems
      });
    }

    // --- Configuración ---
    const configSubItems: NavItem[] = [];

    if (canSeeConfigPersonal) configSubItems.push({ id: 'conf-pers', label: 'Personal', path: '/configuracion/personal', icon: Users });
    if (canSeeConfigGerencias) configSubItems.push({ id: 'conf-ger', label: 'Gerencias', path: '/configuracion/gerencias', icon: ClipboardList });
    if (canSeeConfigSedes) configSubItems.push({ id: 'conf-sedes', label: 'Sedes', path: '/configuracion/sedes', icon: MapPin });
    if (canSeeConfigCentrales) configSubItems.push({ id: 'conf-cctv', label: 'Centrales CCTV', path: '/configuracion/centrales-cctv', icon: Building2 });
    const canSeeConfigSupervisores = hasAccess("/configuracion/supervisores");
    if (canSeeConfigSupervisores) configSubItems.push({ id: 'conf-sup', label: 'Supervisores ST', path: '/configuracion/supervisores', icon: Briefcase });
    if (canSeeCoberturaOperadores) configSubItems.push({ id: 'conf-cob-ops', label: 'Cobertura Operadores', path: '/configuracion/cobertura-operadores', icon: SignalHigh });
    if (canSeeAppsCelular) configSubItems.push({ id: 'conf-apps', label: 'Aplicativos MDM', path: '/configuracion/aplicativos-celular', icon: Smartphone });

    if (configSubItems.length > 0) {
      groups.push({
        id: 'config-group',
        title: 'Preferencias',
        items: [{ id: 'config', label: 'Configuración', icon: Settings, subItems: configSubItems }]
      });
    }

    // --- Ayuda ---
    if (canSeeAyuda) {
      groups.push({
        id: 'help-group',
        title: 'Soporte',
        items: [{ id: 'ayuda', label: 'Ayuda', icon: HelpCircle, path: '/ayuda' }]
      });
    }

    return groups;
  };

  const navGroups = getNavGroups();

  // --- State ---
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState<number>(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync expanded state with URL
  useEffect(() => {
    // Logic: find which item contains the current path and expand it
    const activePaths = new Set<string>();
    navGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.subItems) {
          // Check if any subitem matches current path
          if (item.subItems.some(sub => location.pathname.startsWith(sub.path || '###'))) {
            activePaths.add(item.id);
          }
        } else if (item.path && location.pathname.startsWith(item.path)) {
          // Single item, no strict expansion needed usually but good to know
        }
      });
    });
    // OLD: setExpandedMenus(prev => Array.from(new Set([...prev, ...Array.from(activePaths)])));
    // NEW: Reset to only the active group when navigating
    setExpandedMenus(Array.from(activePaths));
  }, [location.pathname]);

  const handleItemClick = (item: NavItem) => {
    if (item.subItems && item.subItems.length > 0) {
      if (collapsed) return; // Hover handles this
      setExpandedMenus(prev =>
        prev.includes(item.id)
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    } else if (item.path) {
      navigate(item.path);
      if (onClose) onClose();
    }
  };

  const handleMouseEnterItem = (item: NavItem, e: React.MouseEvent) => {
    if (!collapsed) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    // Position logic
    const rect = e.currentTarget.getBoundingClientRect();
    // We want the menu to align roughly with the top of the item, but handled by fixed positioning
    setMenuTop(rect.top);
    if (item.subItems && item.subItems.length > 0) {
      setHoveredItem(item.id);
    } else {
      // Show tooltip logic if needed, or just highlight. Use simplistic approach for now.
      // Actually for single items we might want a simple tooltip.
      // For now, let's only handle submenus popping out as that was the main request.
      // If single item, maybe just set hoveredItem to null?
      setHoveredItem(null);
    }
  };

  const handleMouseLeave = () => {
    if (!collapsed) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 300);
  };

  // Active item check
  const isItemActive = (item: NavItem) => {
    if (item.path && location.pathname.startsWith(item.path)) return true;
    if (item.subItems) {
      return item.subItems.some(sub => sub.path && location.pathname.startsWith(sub.path));
    }
    return false;
  };

  // Find the hovered item object for the floating menu
  const activePopupItem = collapsed && hoveredItem
    ? navGroups.flatMap(g => g.items).find(i => i.id === hoveredItem)
    : null;

  const SidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Brand */}
      <div className={clsx(
        "flex items-center h-16 shrink-0 border-b border-slate-200 transition-all duration-300",
        collapsed ? "justify-center" : "justify-between px-4"
      )}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2">
              <img src="/logo-rojo.svg" alt="Danper" className="h-8 w-auto" />
            </div>
            {onToggle && (
              <button onClick={onToggle} className="hidden md:flex p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <ChevronsLeft className="h-6 w-6" />
              </button>
            )}
            {/* Mobile Close */}
            <button onClick={onClose} className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <X className="h-6 w-6" />
            </button>
          </>
        ) : (
          <button onClick={onToggle} className="flex p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
            <ChevronsRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
        {navGroups.map(group => (
          <div key={group.id}>
            {collapsed ? (
              <div className="my-2 mx-4 border-t border-slate-100" />
            ) : (
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2 transition-all">
                {group.title}
              </h3>
            )}

            <div className="space-y-1">
              {group.items.map(item => {
                const isActive = isItemActive(item);
                const isExpanded = expandedMenus.includes(item.id);
                // Single item logic vs Submenu logic
                const hasSub = item.subItems && item.subItems.length > 0;

                return (
                  <React.Fragment key={item.id}>
                    <button
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                      onMouseLeave={handleMouseLeave}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                        isActive
                          ? "bg-red-50 text-red-700 font-medium shadow-sm ring-1 ring-red-200"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {item.icon && (
                        <item.icon
                          className={clsx(
                            "h-6 w-6 flex-shrink-0 transition-colors",
                            isActive ? "text-red-600" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                      )}

                      <div className={clsx("flex-1 text-left whitespace-nowrap overflow-hidden transition-all", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                        {item.label}
                      </div>

                      {!collapsed && hasSub && (
                        <ChevronDown className={clsx("h-4 w-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                      )}
                    </button>

                    {/* Accordion for Expanded Mode */}
                    {!collapsed && hasSub && (
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 mt-1 space-y-0.5 relative">
                              <div className="absolute left-[22px] top-0 bottom-2 w-px bg-slate-200" />
                              {item.subItems?.map(sub => {
                                return <NavLink
                                  key={sub.id}
                                  to={sub.path!}
                                  onClick={onClose}
                                  className={({ isActive }) => clsx(
                                    "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm relative z-10 ml-2 transition-colors",
                                    isActive
                                      ? "text-red-700 bg-red-50/50 font-medium"
                                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                  )}
                                >
                                  {({ isActive }) => (
                                    <>
                                      {/* Replaced dot with Icon */}
                                      {sub.icon ? (
                                        <sub.icon className={clsx(
                                          "h-4 w-4 transition-colors",
                                          isActive ? "text-red-600" : "text-slate-400"
                                        )} />
                                      ) : (
                                        <div className={clsx(
                                          "w-1.5 h-1.5 rounded-full transition-colors",
                                          isActive ? "bg-red-600 ring-2 ring-red-100" : "bg-slate-300 group-hover:bg-slate-400"
                                        )} />
                                      )}
                                      <span className="truncate">{sub.label}</span>
                                    </>
                                  )}
                                </NavLink>;
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-100">
        {/* We can simply put a logout button or user profile link here if needed, or leave empty/minimal */}
        {/* If collapsed show icon only */}
      </div>
    </div>
  );

  return (
    <>
      <aside className={clsx(
        "fixed left-0 top-0 z-30 h-screen border-r border-slate-200 bg-white transition-all duration-300 hidden md:block",
        collapsed ? "w-20" : "w-72"
      )}>
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <motion.aside
              className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {SidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Popover Portal/Overlay */}
      {/* We render this outside the overflow container, fixed position */}
      {activePopupItem && (
        <div
          className="fixed z-50 left-[84px] bg-white rounded-xl shadow-xl border border-slate-100 w-64 py-2 animate-in fade-in zoom-in-95 duration-200"
          style={{ top: menuTop }}
          onMouseEnter={() => {
            // Clear timeout so it stays open
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Bridge element to prevent gap issues */}
          <div className="absolute -left-4 top-0 w-4 h-full bg-transparent" />

          <div className="px-4 py-2 border-b border-slate-50 mb-1">
            <span className="text-sm font-bold text-slate-800">{activePopupItem.label}</span>
          </div>
          <div className="flex flex-col p-1">
            {activePopupItem.subItems?.map(sub => {
              const isSubActive = sub.path && location.pathname.startsWith(sub.path);
              return (
                <NavLink
                  key={sub.id}
                  to={sub.path!}
                  onClick={() => setHoveredItem(null)}
                  className={clsx(
                    "text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                    isSubActive
                      ? "bg-red-50 text-red-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {sub.icon && <sub.icon className="h-4 w-4 opacity-70" />}
                  {sub.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
