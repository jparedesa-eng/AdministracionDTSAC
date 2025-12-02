// src/auth/RequireAuth.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Protege las rutas internas:
 * - Espera a que termine la carga de sesión (loadingSession).
 * - Si no hay usuario => redirige a /login y guarda la ruta origen en state.from.
 * - Si hay usuario => deja pasar al árbol de rutas protegidas (<Outlet />).
 */
export default function RequireAuth() {
  const { user, loadingSession } = useAuth();
  const location = useLocation();

  // Mientras inicializa la sesión (ej: Supabase getSession/onAuthStateChange)
  if (loadingSession) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-gray-500">
        Cargando sesión…
      </div>
    );
  }

  // Sin sesión => a /login, guardando la ruta desde donde venía
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search + location.hash,
        }}
      />
    );
  }

  // Con sesión => deja pasar a las rutas hijas protegidas
  return <Outlet />;
}
