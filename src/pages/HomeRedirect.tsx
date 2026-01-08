
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LoadingScreen } from "../components/ui/LoadingScreen";

/**
 * Priority list of paths to check for redirection.
 * The user will be redirected to the first path they have access to.
 */
const PRIORITY_PATHS = [
    // Camionetas
    "/camionetas/solicitar",
    "/camionetas/administrar",
    "/camionetas/inventario",
    "/camionetas/garita",
    "/camionetas/mi-camioneta",
    "/camionetas/conductores",
    "/camionetas/registros/gastos",
    "/camionetas/registros/checklist",
    "/camionetas/mantenimiento",

    // Pasajes
    "/pasajes/solicitar",
    "/pasajes/proveedor",
    "/pasajes/gerencia",
    "/pasajes/gestion",
    "/pasajes/proveedores",

    // Telefonia
    "/telefonia/solicitar",
    "/telefonia/inventario",
    "/telefonia/aprobacion-it",
    "/telefonia/aprobacion-gerencia",
    "/telefonia/aprobacion-admin",
    "/telefonia/gestion",

    // Seguridad
    "/seguridad/checklist-camaras",
    "/seguridad/inventario-camaras",
    "/seguridad/programacion",
    "/seguridad/recursos",
    "/seguridad/monitoreo-pt",
    "/seguridad/reporting-manager",
    "/seguridad/agent-report",

    // Configuración (Last resort)
    "/configuracion/personal",
    "/configuracion/gerencias",
    "/configuracion/sedes",
    "/configuracion/centrales-cctv",
    "/configuracion/supervisores",
    "/configuracion/aplicativos-celular",
    // Old config path if still relevant, though we removed it from App.tsx routes,
    // we keep specific sub-routes if they exist.
];

export default function HomeRedirect() {
    const { user, profile, loadingSession, canView } = useAuth();
    // 1. Wait for session
    if (loadingSession) {
        return <LoadingScreen text="Iniciando..." />;
    }

    // 2. No session -> Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Wait for profile (if logged in)
    if (!profile) {
        return <LoadingScreen text="Cargando permisos..." />;
    }

    // 4. Find first allowed path
    const target = PRIORITY_PATHS.find((path) => canView(path));

    if (target) {
        return <Navigate to={target} replace />;
    }

    // 5. Fallback if no paths allowed (403 or specific help page)
    // If they have literally no permissions, send to 403 or a generic "Prohibited" page.
    // We'll send to /403 as defined in App.tsx
    return <Navigate to="/403" replace />;
}
