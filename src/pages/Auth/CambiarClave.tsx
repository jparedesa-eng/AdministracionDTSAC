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
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Desktop Curve */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[50%] bg-[#FF0000] lg:block"
        style={{
          clipPath: "ellipse(85% 120% at 0% 50%)",
        }}
      />

      {/* Mobile Curve */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 block h-[45%] bg-[#FF0000] lg:hidden"
        style={{
          clipPath: "ellipse(100% 85% at 50% 0%)",
        }}
      />

      {/* Layout: móvil apilado (rojo arriba), desktop 2 columnas */}
      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Panel rojo (móvil rojo sólido, desktop texto sobre capa inclinada) */}
        <section
          className="
            relative flex items-center justify-center px-8 py-12 text-white
            lg:justify-start lg:items-center lg:pl-32
          "
        >
          <div
            className="
              relative w-full max-w-md h-full
              flex flex-col items-center justify-center text-center
              lg:items-start lg:text-left
            "
          >
            {/* Contenedor central para Logo y Bienvenida */}
            <div className="flex flex-1 flex-col justify-center">
              {/* Logo */}
              <div className="mb-8 flex w-full items-center justify-center lg:justify-start">
                <img
                  src="/danper.svg"
                  alt="Logo"
                  className="
                    h-12 md:h-16
                    w-auto
                    object-contain
                  "
                />
              </div>

              <h1 className="text-4xl font-normal leading-tight tracking-tight md:text-5xl">
                Actualizar Clave
              </h1>
              <p className="mt-2 text-base font-normal opacity-90 uppercase tracking-[0.2em]">
                Portal de Administración
              </p>
            </div>

            {/* Texto de políticas/créditos - Absoluto al fondo (Oculto en móvil) */}
            <div className="hidden lg:block absolute bottom-4 left-0">
              <p className="text-[10px] opacity-60 font-light leading-relaxed uppercase tracking-widest">
                Políticas de Seguridad & Privacidad<br />
                © 2025</p>
            </div>
          </div>
        </section>

        {/* Panel blanco (formulario) */}
        <section className="flex flex-col pt-32 pb-12 items-center justify-center px-6 lg:py-12 lg:pr-20">
          <div className="w-full max-w-sm">
            <div className="mb-10 text-center">
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

            <form onSubmit={onSubmit} className="grid gap-4" autoComplete="off">
              <div>
                <label className="text-sm font-normal text-gray-700">Nueva Contraseña</label>
                <input
                  type="password"
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  minLength={6}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-full border border-gray-300 px-5 py-2.5 text-base outline-none transition-all focus:border-red-600 focus:ring-4 focus:ring-red-100 placeholder:text-gray-400"
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
                  className="mt-1 w-full rounded-full border border-gray-300 px-5 py-2.5 text-base outline-none transition-all focus:border-red-600 focus:ring-4 focus:ring-red-100 placeholder:text-gray-400"
                />
              </div>
              
              <div className="mt-10 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="
                    w-full rounded-full bg-[#FF0000] px-6 py-3
                    text-base font-medium text-white shadow-sm transition-all
                    hover:brightness-95 hover:shadow-md disabled:opacity-50 disabled:bg-gray-400
                  "
                >
                  {loading ? "Actualizando..." : "Guardar y Continuar"}
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  disabled={loading}
                  className="
                    w-full rounded-full bg-white px-6 py-3
                    text-base font-medium text-gray-700 border border-gray-300 transition-all
                    hover:bg-gray-50 disabled:opacity-50 disabled:bg-white
                  "
                >
                  Cerrar Sesión
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
