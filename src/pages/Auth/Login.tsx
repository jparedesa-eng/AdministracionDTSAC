// src/pages/Auth/Login.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

type LocationState = {
  from?: string;
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Leemos el "from" si existe
  const state = (location.state as LocationState | null) ?? {};
  const rawFrom = state.from;

  // Decidimos a dónde redirigir después del login:
  // - si no hay from, o es "/" o apunta a /login, mandamos a /dashboard
  // - si hay from válido, lo usamos
  const redirectTo =
    !rawFrom || rawFrom === "/" || rawFrom.startsWith("/login")
      ? "/home"
      : rawFrom;

  const [username, setUsername] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = username.trim().length >= 3 && pass.trim().length > 0;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      await login(username.trim(), pass);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "No se pudo iniciar sesión.");
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
                Bienvenido
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
        <section className="flex pt-32 pb-12 items-center justify-center px-6 lg:py-12 lg:pr-20">
          <div className="w-full max-w-sm">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-normal tracking-tight text-gray-900">
                Iniciar sesión
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Usa tu cuenta de Administración
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form
              onSubmit={onSubmit}
              className="grid gap-4"
              autoComplete="off"
              spellCheck={false}
            >
              {/* Usuario */}
              <div>
                <label className="text-sm font-normal text-gray-700">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="mt-1 w-full rounded-full border border-gray-300 px-5 py-2.5 text-base outline-none transition-all focus:border-red-600 focus:ring-4 focus:ring-red-100 placeholder:text-gray-400"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="text-sm font-normal text-gray-700">
                  Contraseña
                </label>
                <div className="relative mt-1">
                  <input
                    type={show ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="Contraseña"
                    className="w-full rounded-full border border-gray-300 px-5 py-2.5 pr-14 text-base outline-none transition-all focus:border-red-600 focus:ring-4 focus:ring-red-100 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                  >
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {/* Botón de Iniciar Sesión */}
              <div className="mt-10 flex justify-center">
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="
                    w-full sm:w-auto sm:min-w-[240px]
                    rounded-full bg-[#FF0000] px-10 py-3
                    text-base font-medium text-white shadow-sm transition-all
                    hover:brightness-95 hover:shadow-md disabled:opacity-50 disabled:bg-gray-400
                  "
                >
                  {loading ? "Entrando..." : "Acceder"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
