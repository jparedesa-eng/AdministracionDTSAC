import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Protege una ruta por sesión + permisos de vista.
 * - Si no hay sesión: envía a /login y recuerda desde dónde venía.
 * - Si el perfil aún no carga: muestra un placeholder.
 * - Si no tiene permiso para `path`: redirige a la PRIMERA vista permitida.
 *   (Si no hay ninguna, envía a /403)
 */
export default function ProtectedRoute({
  children,
  path,
}: {
  children: React.ReactElement;   // JSX.Element también vale, uso React.ReactElement para más precisión
  path: string;
}) {
  const { user, profile, canView } = useAuth();
  const loc = useLocation();

  // Sin sesión → login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // Cargando perfil
  if (!profile) {
    return (
      <div className="grid place-items-center py-10 text-sm text-gray-500">
        Cargando…
      </div>
    );
  }

  // Permiso OK → render
  if (typeof canView === "function" && canView(path)) {
    return children;
  }

  // No tiene permiso: escoger fallback según allowed_views
  const allowed = Array.isArray(profile.allowed_views) ? profile.allowed_views : [];
  // normaliza prefijos '/ruta/*' → '/ruta'
  const firstAllowed =
    allowed
      .map(v => (typeof v === "string" ? (v.endsWith("/*") ? v.slice(0, -2) : v) : ""))
      .find(Boolean) || "/403";

  return <Navigate to={firstAllowed} replace />;
}
