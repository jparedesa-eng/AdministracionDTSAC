// src/pages/Auth/Login.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Normaliza el "from": si apunta a /login, redirige a "/"
  const location = useLocation() as unknown as { state?: { from?: string } };
  const rawFrom = location.state?.from || "/";
  const redirectTo = !rawFrom || rawFrom.startsWith("/login") ? "/" : rawFrom;

  const [dni, setDni] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = /^\d{8}$/.test(dni) && pass.trim().length > 0;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Importante: login resuelve rápido; no bloqueamos por perfil
      await login(dni.trim(), pass);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Capa roja inclinada SOLO desktop (reducida) */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[78%] bg-[#FF0000] lg:block"
        style={{
          clipPath: "polygon(0 0, 58% 0, 48% 100%, 0% 100%)",
        }}
      />

      {/* Layout: móvil apilado (rojo arriba), desktop 2 columnas */}
      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Panel rojo (móvil rojo sólido, desktop texto sobre capa inclinada) */}
        <section
          className="
            flex items-center justify-center bg-[#FF0000] px-8 py-12 text-white
            lg:bg-transparent lg:justify-start lg:items-center lg:pl-50
          "
        >
          <div
            className="
              w-full max-w-md
              flex flex-col items-center text-center
              lg:items-start lg:text-left
            "
          >
            {/* Logo */}
            <div className="mb-25 flex w-full items-center justify-center">
              <img
                src="/danper.svg"
                alt="Logo"
                className="
                  h-15 md:h-30 lg:h-28
                  w-auto
                  object-contain
                  drop-shadow-md
                "
              />
            </div>

            <h1 className="text-5xl font-normal leading-tight tracking-tight md:text-7xl">
              Bienvenido
            </h1>
            <p className="mt-3 text-lg font-normal opacity-95">Portal de Administración</p>
          </div>
        </section>

        {/* Panel blanco (formulario) */}
        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md lg:-translate-x-20">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-medium tracking-tight text-gray-500">Iniciar sesión</h2>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="grid gap-4" autoComplete="off" spellCheck={false}>
              {/* DNI */}
              <div>
                <label className="text-sm font-medium text-gray-700">DNI</label>
                <input
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="Ingresa tu DNI (8 dígitos)"
                  className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent placeholder:text-gray-400 focus:ring-gray-300"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="text-sm font-medium text-gray-700">Contraseña</label>
                <div className="relative mt-1">
                  <input
                    type={show ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border px-3 py-2.5 pr-14 text-sm shadow-sm outline-none ring-1 ring-transparent placeholder:text-gray-400 focus:ring-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {/* Botón rojo */}
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="
                  mt-2 mx-auto inline-flex items-center justify-center
                  w-full max-w-xs sm:max-w-sm lg:max-w-md
                  rounded-xl bg-[#FF0000]
                  px-8 py-4 md:py-4.5 lg:py-3.5
                  text-base md:text-lg lg:text-base
                  font-medium text-white shadow-sm transition
                  hover:brightness-90 disabled:opacity-60
                "
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
