import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { LoadingScreen } from "../components/ui/LoadingScreen";

/**
 * Protege una ruta por sesión + permisos de vista.
 * - Si no hay sesión: envía a /login y recuerda desde dónde venía.
 * - Si el perfil aún no carga: muestra un placeholder con timeout.
 * - Si no tiene permiso para `path`: redirige a la PRIMERA vista permitida.
 *   (Si no hay ninguna, envía a /403)
 */
export default function ProtectedRoute({
  children,
  path,
}: {
  children: React.ReactElement;
  path: string;
}) {
  const { user, profile, canView, loadingSession } = useAuth();
  const loc = useLocation();
  const [profileTimeout, setProfileTimeout] = React.useState(false);

  // Sin sesión → login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // Timeout para evitar carga infinita del perfil
  React.useEffect(() => {
    if (!profile && !loadingSession) {
      const timer = setTimeout(() => {
        console.warn("[ProtectedRoute] Profile loading timeout - proceeding with limited access");
        setProfileTimeout(true);
      }, 5000); // 5 segundos de timeout

      return () => clearTimeout(timer);
    }
  }, [profile, loadingSession]);

  // Cargando perfil (con mejor UI)
  if (!profile && !profileTimeout) {
    return <LoadingScreen text="Cargando perfil..." />;
  }

  // Si hubo timeout del perfil, redirigir a dashboard con advertencia
  if (!profile && profileTimeout) {
    console.error("[ProtectedRoute] Failed to load profile - redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Permiso OK → render
  if (typeof canView === "function" && canView(path)) {
    return children;
  }

  // No tiene permiso: escoger fallback según allowed_views
  const allowed = profile ? (Array.isArray(profile.allowed_views) ? profile.allowed_views : []) : [];
  // normaliza prefijos '/ruta/*' → '/ruta'
  const firstAllowed =
    allowed
      .map(v => (typeof v === "string" ? (v.endsWith("/*") ? v.slice(0, -2) : v) : ""))
      .find(Boolean) || "/403";

  return <Navigate to={firstAllowed} replace />;
}
