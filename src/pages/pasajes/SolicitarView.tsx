// src/pages/pasajes/SolicitarView.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  crear,
  getState,
  subscribe,
  loadSolicitudes,
  type Solicitud,
  type EstadoSolicitud,
} from "../../store/pasajeStore";

import {
  getProvidersState,
  subscribeProviders,
  seedIfEmpty as seedProvidersIfEmpty,
  type Provider,
} from "../../store/providersStore";

import {
  getPersonalState,
  subscribePersonal,
  reloadPersonal,
  type Personal,
} from "../../store/personalStore";

import { getGerenciasState } from "../../store/gerenciasStore";

import { supabase } from "../../supabase/supabaseClient";

import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastType, ToastState } from "../../components/ui/Toast";

import { Plane, Hotel, Eye, EyeOff } from "lucide-react";

/* ---------------------------
   Utils
--------------------------- */
function EmptyHint() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center text-slate-600">
        <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
          <svg
            className="h-8 w-8 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0l-8 5-8-5"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">No hay tickets todavía</h3>
        <p className="text-sm">
          Cuando registres tus tickets de pasajes u hospedaje aparecerán aquí.
        </p>
      </div>
    </div>
  );
}

function fmt(dt?: Date | null) {
  if (!dt) return "";
  const d = new Date(dt);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  )}`;
}

/* ---------------------------
   Mini progreso
--------------------------- */

const STAGES: EstadoSolicitud[] = [
  "Pendiente",
  "En proceso",
  "Costo aprobado",
  "Con pase",
  "Facturado",
  "Cerrado",
];

function getStageIndexFromEstado(estado: string): number {
  const idx = STAGES.indexOf(estado as EstadoSolicitud);
  return idx === -1 ? 0 : idx;
}

function getStatusLabel(estado: string) {
  return estado || "Pendiente";
}

function getStatusMeta(estado: string): { bar: string; text: string } {
  switch (estado) {
    case "Pendiente":
      return { bar: "bg-amber-500", text: "text-amber-700" };
    case "En proceso":
      return { bar: "bg-sky-500", text: "text-sky-700" };
    case "Costo aprobado":
      return { bar: "bg-emerald-500", text: "text-emerald-700" };
    case "Con pase":
      return { bar: "bg-indigo-500", text: "text-indigo-700" };
    case "Facturado":
      return { bar: "bg-violet-500", text: "text-violet-700" };
    case "Cerrado":
      return { bar: "bg-slate-500", text: "text-slate-700" };
    default:
      return { bar: "bg-slate-300", text: "text-slate-600" };
  }
}

function MiniProgress({ estado }: { estado: string }) {
  const idx = getStageIndexFromEstado(estado);
  const total = STAGES.length;
  const pct = (idx / (total - 1 || 1)) * 100;
  const meta = getStatusMeta(estado);

  const clamped = Math.min(100, Math.max(8, isNaN(pct) ? 0 : pct));

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-start text-[11px]">
        <span className={["font-semibold", meta.text].join(" ")}>
          {getStatusLabel(estado)}
        </span>
        <span className="text-slate-500">
          Paso {idx + 1}/{total}
        </span>
      </div>
      <div className="relative h-1.5 w-32 rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full ${meta.bar}`}
          style={{ width: `${clamped}%` }}
        />
        <span
          className="absolute h-3 w-3 rounded-full border border-slate-300 bg-white"
          style={{
            top: "50%",
            left: `${clamped}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  );
}

/* ---------------------------
   Vista principal
--------------------------- */
export default function SolicitarView({
  currentUserDni,
}: {
  currentUserDni?: string;
}) {
  // Toast global
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  // Confirmación de registro
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // store de tickets
  const [, forceSolicitudes] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        await loadSolicitudes();
      } catch (err) {
        console.error("Error cargando tickets", err);
      }
    })();

    const unsubscribe = subscribe(() => {
      forceSolicitudes((x) => x + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // store de proveedores
  const [provVersion, setProvVersion] = useState(0);
  useEffect(() => {
    seedProvidersIfEmpty();
    return subscribeProviders(() => setProvVersion((v) => v + 1));
  }, []);

  // store de personal (para buscar por DNI)
  const [, forcePersonal] = useState(0);
  useEffect(() => {
    // Carga inicial
    reloadPersonal().catch((err) =>
      console.error("Error recargando personal", err)
    );
    const unsub = subscribePersonal(() => {
      forcePersonal((v) => v + 1);
    });
    return unsub;
  }, []);

  // usuario logueado
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string | null;
    fullName: string | null;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error obteniendo usuario actual", error);
        return;
      }
      const user = data?.user;
      if (!user) {
        setCurrentUser(null);
        return;
      }
      setCurrentUser({
        id: user.id,
        email: user.email ?? null,
        fullName:
          (user.user_metadata as any)?.full_name ??
          (user.user_metadata as any)?.name ??
          null,
      });
    })();
  }, []);

  const [dni, setDni] = useState(currentUserDni ?? "");
  const [nombre, setNombre] = useState("");
  const [gerencia, setGerencia] = useState("");
  const [personalFound, setPersonalFound] = useState<Personal | null>(null);

  const [tipo, setTipo] = useState<"Pasaje" | "Hospedaje">("Pasaje");
  const [subtipo, setSubtipo] = useState<"Aéreo" | "Terrestre">("Aéreo");

  const [salida, setSalida] = useState<Date | null>(null);
  const [retorno, setRetorno] = useState<Date | null>(null);

  const [proveedorPasaje, setProveedorPasaje] = useState("");
  const [lugar, setLugar] = useState("");
  const [inicio, setInicio] = useState<Date | null>(null);
  const [fin, setFin] = useState<Date | null>(null);

  const [traslado, setTraslado] = useState(false);
  const [alimentacion, setAlimentacion] = useState("");
  const [motivo, setMotivo] = useState("");

  const [step, setStep] = useState<number>(1);
  const totalSteps = 3;

  const solicitudesCount = getState().solicitudes.length;

  /* ---------------------------
     Tus tickets
  --------------------------- */
  const tusSolicitudes = useMemo(() => {
    const all = [...getState().solicitudes];

    const filtroDni = (currentUserDni ?? dni).trim();
    const dniValido = /^\d{8}$/.test(filtroDni);

    return all
      .filter((e) => {
        const byUser = currentUser ? e.createdBy === currentUser.id : false;
        const byDni = dniValido ? (e.dni ?? "") === filtroDni : false;
        return byUser || byDni;
      })
      .sort((a, b) => +b.creado - +a.creado);
  }, [dni, currentUserDni, solicitudesCount, currentUser]);

  /* ---------------------------
     Proveedores activos
  --------------------------- */
  const allProviders = useMemo(
    () => getProvidersState().providers,
    [provVersion]
  );

  const proveedoresPasaje = useMemo(
    () => allProviders.filter((p) => p.activo && p.kind === "Pasaje"),
    [allProviders]
  );

  const proveedoresHospedaje = useMemo(
    () => allProviders.filter((p) => p.activo && p.kind === "Hospedaje"),
    [allProviders]
  );

  const selectedPasajeProvider: Provider | null = useMemo(
    () =>
      proveedoresPasaje.find((p) => p.nombre === proveedorPasaje) ?? null,
    [proveedorPasaje, proveedoresPasaje]
  );

  const selectedHospedajeProvider: Provider | null = useMemo(
    () => proveedoresHospedaje.find((p) => p.nombre === lugar) ?? null,
    [lugar, proveedoresHospedaje]
  );

  const providerForServicios =
    tipo === "Hospedaje" ? selectedHospedajeProvider : null;

  useEffect(() => {
    if (tipo !== "Hospedaje") return;
    const prov = providerForServicios;
    if (!prov) return;
    if (!prov.traslado && traslado) setTraslado(false);
    if (!prov.alimentacion && alimentacion === "Sí") setAlimentacion("No");
  }, [tipo, providerForServicios, traslado, alimentacion]);

  /* ---------------------------
     Helpers UI
  --------------------------- */
  const getTipoBtn = (value: "Pasaje" | "Hospedaje") => {
    const base =
      "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border transition";
    if (tipo === value) {
      return base + " bg-slate-900 text-white border-slate-900 shadow-sm";
    }
    return base + " bg-white text-slate-700 border-slate-300 hover:bg-slate-50";
  };

  const getYesNoBtn = (selected: any, value: any) => {
    const base =
      "flex-1 inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition";
    if (selected === value) {
      return base + " bg-slate-900 text-white border-slate-900 shadow-sm";
    }
    return base + " bg-white text-slate-700 border-slate-300 hover:bg-slate-50";
  };

  const showError = (msg: string) => {
    showToast("error", msg);
    return false;
  };

  /* ---------------------------
     Búsqueda de personal por DNI
  --------------------------- */
  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setDni(value);

    // Si el usuario borra o aún no completa los 8 dígitos, limpiamos datos
    if (value.length < 8) {
      setPersonalFound(null);
      setNombre("");
      setGerencia("");
      return;
    }

    if (value.length === 8) {
      const { personal } = getPersonalState();
      const found = personal.find(
        (p) => p.dni === value && p.estado === "ACTIVO"
      );

      if (found) {
        // 1) Tomamos el gerencia_id del registro de personal
        const gerenciaId =
          (found as any).gerencia_id ?? (found as any).gerenciaId ?? null;

        // 2) Buscamos el nombre en el store de gerencias
        let gerenciaNombre = "";
        if (gerenciaId) {
          const { gerencias } = getGerenciasState();
          const g = gerencias.find((gg) => gg.id === gerenciaId);
          gerenciaNombre = g?.nombre ?? "";
        }

        setPersonalFound(found);
        setNombre(found.nombre);
        setGerencia(gerenciaNombre);
      } else {
        setPersonalFound(null);
        setNombre("");
        setGerencia("");
        showToast(
          "error",
          "El DNI ingresado no está registrado como personal ACTIVO. Solicita primero el registro en el módulo de Personal."
        );
      }
    }
  };

  /* ---------------------------
     Validación por paso
  --------------------------- */
  const validateStep = (s: number): boolean => {
    const now = new Date();

    switch (s) {
      case 1:
        if (!/^\d{8}$/.test(dni)) return showError("DNI inválido (8 dígitos).");
        if (!nombre.trim())
          return showError("Ingresa el nombre del beneficiario.");
        if (!personalFound) {
          return showError(
            "El DNI debe existir como personal ACTIVO en el módulo de Personal."
          );
        }
        return true;

      case 2:
        if (tipo === "Pasaje") {
          if (!proveedorPasaje)
            return showError("Selecciona un proveedor de pasaje.");
          if (!salida || !retorno)
            return showError(
              "Selecciona la fecha y hora de salida y de retorno."
            );
          if (salida < now) {
            return showError(
              "La fecha y hora de salida no puede ser anterior a la fecha y hora actual."
            );
          }
          if (retorno < salida) {
            return showError(
              "La fecha y hora de retorno no puede ser anterior a la fecha y hora de salida."
            );
          }
        } else {
          if (!lugar)
            return showError("Selecciona el proveedor (lugar) de hospedaje.");
          if (!inicio || !fin)
            return showError(
              "Selecciona la fecha y hora de inicio y de fin del hospedaje."
            );
          if (inicio < now) {
            return showError(
              "La fecha y hora de inicio no puede ser anterior a la fecha y hora actual."
            );
          }
          if (fin < inicio) {
            return showError(
              "La fecha y hora de fin no puede ser anterior a la fecha y hora de inicio."
            );
          }
        }
        return true;

      case 3:
        if (!motivo.trim())
          return showError("Describe brevemente el motivo del ticket.");
        return true;

      default:
        return true;
    }
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const goPrev = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  /* ---------------------------
     Submit (2 pasos: validar + confirmar)
  --------------------------- */
  const handlePrepareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1)) return;
    if (!validateStep(2)) return;
    if (!validateStep(3)) return;
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    const payload: Partial<Solicitud> = {
      dni,
      nombre,
      gerencia,
      tipo,
      subtipo: tipo === "Pasaje" ? subtipo : undefined,
      salida,
      retorno,
      lugar: tipo === "Hospedaje" ? lugar : undefined,
      inicio,
      fin,
      traslado,
      alimentacion,
      motivo,
      proveedor: tipo === "Pasaje" ? proveedorPasaje || null : lugar || null,
    };

    setIsSubmitting(true);
    try {
      const codigo = await crear(payload);

      showToast("success", `Ticket ${codigo} registrado correctamente.`);

      // reset mínimo (dejamos DNI/nombre/gerencia para seguir creando tickets)
      setMotivo("");
      setAlimentacion("");
      setTraslado(false);
      setProveedorPasaje("");
      setLugar("");
      setSalida(null);
      setRetorno(null);
      setInicio(null);
      setFin(null);
      setStep(1);
    } catch (err: any) {
      console.error("Error al registrar ticket", err);
      showToast(
        "error",
        "No se pudo registrar el ticket.\n\nDetalle técnico: " +
          (err?.message ?? "Error desconocido")
      );
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
    }
  };

  /* ---------------------------
     Expandir / colapsar detalle
  --------------------------- */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  };

  /* ---------------------------
     Contenido por paso
  --------------------------- */
  const renderStep = () => {
    switch (step) {
      // PASO 1
      case 1:
        return (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paso 1 de {totalSteps} · Tipo y colaborador
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">
                Tipo de ticket
              </label>
              <p className="text-xs text-slate-500">
                Define si este ticket es para un <b>pasaje</b> o un{" "}
                <b>hospedaje</b>.
              </p>
              <div className="mt-1 inline-flex gap-2 rounded-2xl bg-slate-50 p-1">
                <button
                  type="button"
                  className={getTipoBtn("Pasaje")}
                  onClick={() => {
                    setTipo("Pasaje");
                    setLugar("");
                    setTraslado(false);
                    setAlimentacion("");
                  }}
                >
                  Pasaje
                </button>
                <button
                  type="button"
                  className={getTipoBtn("Hospedaje")}
                  onClick={() => {
                    setTipo("Hospedaje");
                    setProveedorPasaje("");
                    setTraslado(false);
                    setAlimentacion("");
                  }}
                >
                  Hospedaje
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">DNI</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={dni}
                  onChange={handleDniChange}
                  placeholder="########"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Nombre del beneficiario
                </label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre completo"
                  disabled={!!personalFound}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Gerencia</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-slate-50"
                  value={gerencia}
                  readOnly
                  placeholder="Se completará según el DNI (desde el maestro de Personal)"
                />
              </div>
            </div>
          </section>
        );

      // PASO 2
      case 2:
        return (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paso 2 de {totalSteps} · Detalle
              </p>
            </div>

            {tipo === "Pasaje" ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  Detalle del pasaje
                </h3>
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium">Subtipo</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={subtipo}
                      onChange={(e) =>
                        setSubtipo(e.target.value as "Aéreo" | "Terrestre")
                      }
                    >
                      <option>Aéreo</option>
                      <option>Terrestre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Proveedor (pasaje)
                    </label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={proveedorPasaje}
                      onChange={(e) => setProveedorPasaje(e.target.value)}
                    >
                      <option value="">Selecciona proveedor...</option>
                      {proveedoresPasaje.length === 0 && (
                        <option disabled>
                          No hay proveedores configurados (pasaje)
                        </option>
                      )}
                      {proveedoresPasaje.map((p) => (
                        <option key={p.id} value={p.nombre}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                    {selectedPasajeProvider && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Traslado:{" "}
                        {selectedPasajeProvider.traslado ? "Sí" : "No"} ·
                        Alimentación:{" "}
                        {selectedPasajeProvider.alimentacion ? "Sí" : "No"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Salida</label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      onChange={(e) =>
                        setSalida(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Retorno</label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      onChange={(e) =>
                        setRetorno(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Detalle del hospedaje
                </h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium">
                      Lugar (proveedor)
                    </label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                    >
                      <option value="">Selecciona proveedor...</option>
                      {proveedoresHospedaje.length === 0 && (
                        <option disabled>
                          No hay proveedores configurados (hospedaje)
                        </option>
                      )}
                      {proveedoresHospedaje.map((p) => (
                        <option key={p.id} value={p.nombre}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                    {selectedHospedajeProvider && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Traslado:{" "}
                        {selectedHospedajeProvider.traslado ? "Sí" : "No"} ·
                        Alimentación:{" "}
                        {selectedHospedajeProvider.alimentacion ? "Sí" : "No"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Inicio</label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      onChange={(e) =>
                        setInicio(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Fin</label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      onChange={(e) =>
                        setFin(
                          e.target.value ? new Date(e.target.value) : null
                        )
                      }
                    />
                  </div>
                </div>

                {providerForServicios && (
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Servicios adicionales
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {/* TRASLADO */}
                      <div>
                        <label className="block text-sm font-medium text-slate-800">
                          Traslado
                        </label>
                        {providerForServicios.traslado ? (
                          <>
                            <p className="mt-1 text-xs text-slate-500">
                              Este proveedor ofrece traslado. Elige si el ticket
                              lo incluye.
                            </p>
                            <div className="mt-2 inline-flex w-full max-w-xs gap-2 rounded-2xl bg-slate-50 p-1">
                              <button
                                type="button"
                                className={getYesNoBtn(traslado, true)}
                                onClick={() => setTraslado(true)}
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                className={getYesNoBtn(traslado, false)}
                                onClick={() => setTraslado(false)}
                              >
                                No
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">
                            Este proveedor no ofrece traslado. Se registrará
                            como &quot;No&quot;.
                          </p>
                        )}
                      </div>

                      {/* ALIMENTACIÓN */}
                      <div>
                        <label className="block text-sm font-medium text-slate-800">
                          Alimentación
                        </label>
                        {providerForServicios.alimentacion ? (
                          <>
                            <p className="mt-1 text-xs text-slate-500">
                              Este proveedor ofrece alimentación. Elige si el
                              ticket la incluye.
                            </p>
                            <div className="mt-2 inline-flex w-full max-w-xs gap-2 rounded-2xl bg-slate-50 p-1">
                              <button
                                type="button"
                                className={getYesNoBtn(alimentacion, "Sí")}
                                onClick={() => setAlimentacion("Sí")}
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                className={getYesNoBtn(alimentacion, "No")}
                                onClick={() => setAlimentacion("No")}
                              >
                                No
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">
                            Este proveedor no ofrece alimentación. Se
                            registrará como &quot;No&quot;.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        );

      // PASO 3
      case 3:
        return (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paso 3 de {totalSteps} · Motivo y confirmación
              </p>
            </div>

            <div className="space-y-1 border-b border-slate-200 pb-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Resumen rápido</p>
              <p>
                <span className="font-semibold">Tipo:</span> {tipo}
                {tipo === "Pasaje" && subtipo ? ` · ${subtipo}` : ""}
              </p>
              <p>
                <span className="font-semibold">Beneficiario:</span>{" "}
                {nombre || "—"} ({dni || "—"})
              </p>
              {gerencia && (
                <p>
                  <span className="font-semibold">Gerencia:</span> {gerencia}
                </p>
              )}
              {tipo === "Pasaje" ? (
                <>
                  <p>
                    <span className="font-semibold">Proveedor pasaje:</span>{" "}
                    {proveedorPasaje || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Fechas:</span> {fmt(salida)}{" "}
                    → {fmt(retorno)}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <span className="font-semibold">Proveedor hospedaje:</span>{" "}
                    {lugar || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Fechas:</span> {fmt(inicio)}{" "}
                    → {fmt(fin)}
                  </p>
                  <p>
                    <span className="font-semibold">Traslado:</span>{" "}
                    {traslado ? "Sí" : "No"}{" "}
                    <span className="ml-2 font-semibold">Alimentación:</span>{" "}
                    {alimentacion || "No indicado"}
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">
                Motivo del ticket
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe brevemente el motivo del viaje o hospedaje"
              />
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  /* ---------------------------
     Render
  --------------------------- */
  return (
    <>
      <div className="space-y-6">
        {/* WIZARD */}
        <form
          onSubmit={handlePrepareSubmit}
          className="space-y-5 rounded-2xl bg-white p-5 shadow-sm"
        >
          <header className="space-y-2">
            <h2 className="text-xl font-bold">Nuevo ticket</h2>
            <p className="text-sm text-slate-500">
              Completa la información paso a paso. Puedes volver atrás si
              necesitas corregir algo.
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-indigo-600 transition-all"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </header>

          <div>{renderStep()}</div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 1}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              ⟵ Anterior
            </button>

            {step < totalSteps ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Siguiente ⟶
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Registrar ticket
              </button>
            )}
          </div>
        </form>

        {/* LISTA DE TICKETS */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tus tickets</h3>
            <span className="text-xs text-slate-500">
              {tusSolicitudes.length} registro(s)
            </span>
          </div>
          {tusSolicitudes.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="space-y-3">
              {tusSolicitudes.map((s) => {
                const creador =
                  s.createdByName || s.createdByEmail || "No disponible";
                const isPasaje = s.tipo === "Pasaje";
                const icon = isPasaje ? (
                  <Plane className="h-4 w-4" />
                ) : (
                  <Hotel className="h-4 w-4" />
                );
                const isExpanded = expanded[s.id] ?? false;
                const meta = getStatusMeta(s.estado);

                return (
                  <article
                    key={s.id}
                    className="relative overflow-hidden rounded-2xl bg-white p-4 pl-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-lg"
                  >
                    {/* barra de estado a la izquierda */}
                    <div
                      className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`}
                    />

                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">
                        {icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold leading-tight">
                            {s.nombre} ({s.dni || "—"})
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            ID: {s.id}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {isPasaje
                            ? "Solicitud de Pasaje"
                            : "Solicitud de Hospedaje"}{" "}
                          · {fmt(s.creado)} · Creado por {creador}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-right">
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-100">
                          {s.gerencia || "Sin gerencia"}
                        </span>
                        <div className="flex items-center gap-2">
                          <MiniProgress estado={s.estado} />
                          <button
                            type="button"
                            onClick={() => toggleExpanded(s.id)}
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                            title={isExpanded ? "Ver menos" : "Ver más"}
                          >
                            {isExpanded ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Detalle compacto colapsable */}
                    {isExpanded && (
                      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                        {isPasaje ? (
                          <>
                            <div>
                              <span className="font-semibold">Proveedor:</span>{" "}
                              {s.proveedor || "Proveedor no asignado"}
                            </div>
                            <div>
                              <span className="font-semibold">Subtipo:</span>{" "}
                              {s.subtipo || "—"}
                            </div>
                            <div>
                              <span className="font-semibold">Fechas:</span>{" "}
                              {fmt(s.salida)} → {fmt(s.retorno)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="font-semibold">Lugar:</span>{" "}
                              {s.lugar || "—"}
                            </div>
                            <div>
                              <span className="font-semibold">Fechas:</span>{" "}
                              {fmt(s.inicio)} → {fmt(s.fin)}
                            </div>
                            <div>
                              <span className="font-semibold">Traslado:</span>{" "}
                              {s.traslado ? "Sí" : "No"}{" "}
                              <span className="ml-2 font-semibold">
                                Alimentación:
                              </span>{" "}
                              {s.alimentacion || "No indicado"}
                            </div>
                          </>
                        )}
                        {s.motivo && (
                          <div className="pt-1">
                            <span className="font-semibold">Motivo:</span>{" "}
                            <span className="text-slate-700">{s.motivo}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN REGISTRO */}
      <Modal
        open={confirmOpen}
        onClose={() => (isSubmitting ? undefined : setConfirmOpen(false))}
        title="Confirmar registro de ticket"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            ¿Confirmas el registro de este ticket para{" "}
            <span className="font-semibold">
              {nombre || "—"} ({dni || "—"})
            </span>{" "}
            de tipo{" "}
            <span className="font-semibold">
              {tipo}
              {tipo === "Pasaje" && subtipo ? ` · ${subtipo}` : ""}
            </span>
            ?
          </p>
          <p className="text-xs text-slate-500">
            Podrás hacer seguimiento desde la sección &quot;Tus tickets&quot;.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Registrando..." : "Sí, registrar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* TOAST GLOBAL */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
