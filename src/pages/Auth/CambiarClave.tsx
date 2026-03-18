import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../supabase/supabaseClient";

export default function CambiarClave() {
  const { profile, logout } = useAuth();
  const [nuevaClave, setNuevaClave] = React.useState("");
  const [confirmarClave, setConfirmarClave] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit =
    nuevaClave.length >= 6 &&
    nuevaClave === confirmarClave;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Cambiamos la clave en Supabase Auth
      const { error: resetError } = await supabase.auth.updateUser({
        password: nuevaClave,
      });

      if (resetError) throw resetError;

      // 2. Quitamos el flag en profiles
      if (profile?.id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ requiere_cambio_clave: false })
          .eq("id", profile.id);

        if (profileError) throw profileError;
      }

      // 3. Forzamos recargar la ventana para actualizar el app (el routing lo llevará a /home)
      window.location.href = "/home";

    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <img src="/danper.svg" alt="Logo" className="h-12 w-auto mx-auto mb-6" />
          <h2 className="text-3xl font-normal tracking-tight text-gray-900">
            Cambio Obligatorio
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Debes establecer una nueva contraseña para continuar.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm" autoComplete="off">
          
          <div>
            <label className="text-sm font-normal text-gray-700">Nueva Contraseña</label>
            <input
              type="password"
              value={nuevaClave}
              onChange={(e) => setNuevaClave(e.target.value)}
              placeholder="Min. 6 caracteres"
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-full border border-gray-300 px-5 py-2.5 text-base outline-none transition-all focus:border-red-600 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="text-sm font-normal text-gray-700">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmarClave}
              onChange={(e) => setConfirmarClave(e.target.value)}
              placeholder="Confirma la clave"
              autoComplete="new-password"
              className="mt-1 w-full rounded-full border border-gray-300 px-5 py-2.5 text-base outline-none transition-all focus:border-red-600 focus:ring-2 focus:ring-red-100"
            />
          </div>
          
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full rounded-full bg-[#FF0000] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:brightness-95 disabled:opacity-50 disabled:bg-gray-400"
            >
              {loading ? "Actualizando..." : "Guardar y Continuar"}
            </button>
            <button
              type="button"
              onClick={() => logout()}
              disabled={loading}
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-gray-700 border border-gray-300 transition-all hover:bg-gray-50 disabled:opacity-50"
            >
              Cerrar Sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
