import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Espera a que termine la carga de sesión, y sólo entonces decide.
 * - Si no hay user => /login (guardando from)
 * - Si hay user => deja pasar al layout protegido (Outlet)
 */
export default function RequireAuth() {
  const { user, loadingSession } = useAuth();
  const loc = useLocation();

  // Aún inicializando la sesión (getSession + onAuthStateChange)
  if (loadingSession) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-gray-500">
        Cargando sesión…
      </div>
    );
  }

  // Sin sesión => a login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  // Con sesión => continúa a la app protegida
  return <Outlet />;
}
