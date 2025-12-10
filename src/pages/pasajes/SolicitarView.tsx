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
  getPersonalState,
  subscribePersonal,
  reloadPersonal,
  type Personal,
} from "../../store/personalStore";

import { getGerenciasState } from "../../store/gerenciasStore";
import {
  loadPropuestasBySolicitud,
  subscribe as subscribePropuestas,
} from "../../store/propuestasStore";


import { supabase } from "../../supabase/supabaseClient";

import { Modal } from "../../components/ui/Modal";
import { PropuestasModal } from "../../components/propuestas/PropuestasModal";
import { Toast } from "../../components/ui/Toast";
import type { ToastType, ToastState } from "../../components/ui/Toast";

import { Plane, Hotel, Eye, EyeOff, Bus } from "lucide-react";

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

  const [empresa, setEmpresa] = useState("");
  const [ceco, setCeco] = useState("");

  const [tipo, setTipo] = useState<"Pasaje" | "Hospedaje">("Pasaje");
  const [subtipo, setSubtipo] = useState<"Aéreo" | "Terrestre">("Aéreo");

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");

  const [salida, setSalida] = useState<Date | null>(null);
  const [retorno, setRetorno] = useState<Date | null>(null);

  const [lugar, setLugar] = useState("");
  const [inicio, setInicio] = useState<Date | null>(null);
  const [fin, setFin] = useState<Date | null>(null);

  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(null);
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  const [motivo, setMotivo] = useState("");

  const [step, setStep] = useState<number>(1);
  const totalSteps = 3;

  const solicitudesCount = getState().solicitudes.length;

  /* ---------------------------
     Estado UI
  --------------------------- */
  const [showForm, setShowForm] = useState(false);

  /* ---------------------------
     Estado Propuestas
  --------------------------- */
  const [viewPropuestasId, setViewPropuestasId] = useState<string | null>(null);
  const [, forcePropuestas] = useState(0);

  useEffect(() => {
    const unsub = subscribePropuestas(() => forcePropuestas((n) => n + 1));
    return () => {
      unsub();
    };
  }, []);

  const handleOpenPropuestas = async (ticketId: string) => {
    setViewPropuestasId(ticketId);
    try {
      await loadPropuestasBySolicitud(ticketId);
    } catch (err) {
      console.error("Error cargando propuestas", err);
      showToast("error", "No se pudieron cargar las propuestas.");
    }
  };



  /* ---------------------------
     Tus tickets
  --------------------------- */
  /* ---------------------------
     Tus tickets (Filtrado por Area/Gerencia)
  --------------------------- */
  const tusSolicitudes = useMemo(() => {
    const all = [...getState().solicitudes];

    // 1. Identificar mi gerencia
    let miGerenciaNombre = "";
    if (currentUserDni && currentUserDni.length === 8) {
      const { personal } = getPersonalState();
      const me = personal.find((p) => p.dni === currentUserDni && p.estado === "ACTIVO");
      if (me) {
        const gId = (me as any).gerencia_id ?? (me as any).gerenciaId;
        if (gId) {
          const { gerencias } = getGerenciasState();
          const g = gerencias.find((gg) => gg.id === gId);
          if (g) miGerenciaNombre = g.nombre;
        }
      }
    }

    // 2. Filtrar
    return all
      .filter((e) => {
        // Filtro base: creado por mí (fallback)
        const byUser = currentUser ? e.createdBy === currentUser.id : false;

        // Filtro principal: mi area (Gerencia)
        // Si tengo gerencia identificada, veo tickets de esa gerencia.
        // Si no, veo solo los míos.
        const byArea = miGerenciaNombre
          ? (e.gerencia === miGerenciaNombre)
          : byUser;

        return byArea;
      })
      .sort((a, b) => +b.creado - +a.creado);
  }, [dni, currentUserDni, solicitudesCount, currentUser, forcePersonal]); // Agregamos forcePersonal para recalcular si cambia personal

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
      case 1: {
        if (!/^\d{8}$/.test(dni)) return showError("DNI inválido (8 dígitos).");
        if (!nombre.trim())
          return showError("Ingresa el nombre del beneficiario.");
        // if (!personalFound) {
        //   return showError(
        //     "El DNI debe existir como personal ACTIVO en el módulo de Personal."
        //   );
        // }
        if (!empresa.trim()) {
          return showError("Ingresa la empresa.");
        }
        if (!ceco.trim()) {
          return showError("Ingresa el CECO (solo números).");
        }
        if (!/^\d+$/.test(ceco.trim())) {
          return showError("El CECO debe contener solo números.");
        }
        return true;
      }

      case 2: {
        if (tipo === "Pasaje") {
          if (!origen.trim())
            return showError("Ingresa el origen del viaje (ciudad / punto).");
          if (!destino.trim())
            return showError("Ingresa el destino del viaje (ciudad / punto).");
          if (!salida || !retorno)
            return showError(
              "Selecciona la fecha y hora de viaje y de retorno."
            );
          if (salida < now) {
            return showError(
              "La fecha y hora de viaje no puede ser anterior a la fecha y hora actual."
            );
          }
          if (retorno < salida) {
            return showError(
              "La fecha y hora de retorno no puede ser anterior a la fecha y hora de viaje."
            );
          }

          // Validaciones adicionales para pasaje aéreo
          if (subtipo === "Aéreo") {
            if (!fechaNacimiento) {
              return showError("Ingresa la fecha de nacimiento.");
            }
            if (!telefono.trim()) {
              return showError("Ingresa el teléfono de contacto.");
            }
            if (!correo.trim()) {
              return showError("Ingresa el correo electrónico.");
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(correo.trim())) {
              return showError("Ingresa un correo electrónico válido.");
            }
          }
        } else {
          // Hospedaje
          if (!lugar.trim())
            return showError("Ingresa el lugar de hospedaje.");
          if (!inicio || !fin)
            return showError(
              "Selecciona la fecha y hora de ingreso y de salida."
            );
          if (inicio < now) {
            return showError(
              "La fecha y hora de ingreso no puede ser anterior a la fecha y hora actual."
            );
          }
          if (fin < inicio) {
            return showError(
              "La fecha y hora de salida no puede ser anterior a la fecha y hora de ingreso."
            );
          }
        }
        return true;
      }

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
      empresa,
      ceco,
      tipo,
      subtipo: tipo === "Pasaje" ? subtipo : undefined,
      origen: tipo === "Pasaje" ? origen || null : null,
      destino: tipo === "Pasaje" ? destino || null : null,
      salida: tipo === "Pasaje" ? salida : null,
      retorno: tipo === "Pasaje" ? retorno : null,
      lugar: tipo === "Hospedaje" ? lugar || null : null,
      inicio: tipo === "Hospedaje" ? inicio : null,
      fin: tipo === "Hospedaje" ? fin : null,
      fechaNacimiento:
        tipo === "Pasaje" && subtipo === "Aéreo" ? fechaNacimiento : null,
      telefono:
        tipo === "Pasaje" && subtipo === "Aéreo" ? telefono || null : null,
      correo:
        tipo === "Pasaje" && subtipo === "Aéreo" ? correo || null : null,
      motivo,
      // proveedor se asignará luego por Administración
      proveedor: null,
    };

    setIsSubmitting(true);
    try {
      const codigo = await crear(payload);

      showToast("success", `Ticket ${codigo} registrado correctamente.`);

      // Reset mínimo (dejamos DNI/nombre/gerencia/empresa/CECO para seguir creando tickets)
      setMotivo("");
      setOrigen("");
      setDestino("");
      setSalida(null);
      setRetorno(null);
      setLugar("");
      setInicio(null);
      setFin(null);
      setFechaNacimiento(null);
      setTelefono("");
      setCorreo("");
      setCorreo("");
      setStep(1);
      setShowForm(false); // Ocultar formulario al terminar

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
                Paso 1 de {totalSteps} · Tipo y datos del colaborador
              </p>
            </div>

            {/* Tipo de ticket */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-800">
                Tipo de ticket
              </label>
              <p className="text-xs text-slate-500">
                Define si este ticket es para un <b>pasaje</b> (terrestre o
                aéreo) o un <b>hospedaje</b>.
              </p>
              <div className="mt-1 inline-flex gap-2 rounded-2xl bg-slate-50 p-1">
                <button
                  type="button"
                  className={getTipoBtn("Pasaje")}
                  onClick={() => {
                    setTipo("Pasaje");
                  }}
                >
                  Pasaje
                </button>
                <button
                  type="button"
                  className={getTipoBtn("Hospedaje")}
                  onClick={() => {
                    setTipo("Hospedaje");
                  }}
                >
                  Hospedaje
                </button>
              </div>
            </div>

            {/* Datos del colaborador */}
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

            {/* Empresa y CECO */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Empresa</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Ej. DANPER"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  CECO (número)
                </label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={ceco}
                  onChange={(e) =>
                    setCeco(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="Ej. 123456"
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
                Paso 2 de {totalSteps} · Detalle del servicio
              </p>
            </div>

            {tipo === "Pasaje" ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Detalle del pasaje
                </h3>

                {/* Subtipo */}
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
                    <label className="block text-sm font-medium">Origen</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={origen}
                      onChange={(e) => setOrigen(e.target.value)}
                      placeholder="Ciudad / punto de partida"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Destino</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      placeholder="Ciudad / punto de llegada"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Fecha de viaje
                    </label>
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
                    <label className="block text-sm font-medium">
                      Fecha de retorno
                    </label>
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

                {/* Datos adicionales solo para pasaje aéreo */}
                {subtipo === "Aéreo" && (
                  <div className="space-y-3 border-t border-slate-200 pt-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Datos del pasajero para pasaje aéreo
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium">
                          Fecha de nacimiento
                        </label>
                        <input
                          type="date"
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          onChange={(e) =>
                            setFechaNacimiento(
                              e.target.value ? new Date(e.target.value) : null
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">
                          Teléfono
                        </label>
                        <input
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="Teléfono de contacto"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">
                          Correo electrónico
                        </label>
                        <input
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          value={correo}
                          onChange={(e) => setCorreo(e.target.value)}
                          placeholder="ejemplo@empresa.com"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Detalle del hospedaje
                </h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium">Lugar</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                      placeholder="Ciudad / lugar de hospedaje"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Fecha de ingreso
                    </label>
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
                    <label className="block text-sm font-medium">
                      Fecha de salida
                    </label>
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
              <p>
                <span className="font-semibold">Empresa:</span>{" "}
                {empresa || "—"}{" "}
                <span className="ml-2 font-semibold">CECO:</span>{" "}
                {ceco || "—"}
              </p>
              {tipo === "Pasaje" ? (
                <>
                  <p>
                    <span className="font-semibold">Origen/Destino:</span>{" "}
                    {origen || "—"} → {destino || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Fechas:</span> {fmt(salida)}{" "}
                    → {fmt(retorno)}
                  </p>
                  {subtipo === "Aéreo" && (
                    <>
                      <p>
                        <span className="font-semibold">
                          Fecha nacimiento:
                        </span>{" "}
                        {fechaNacimiento ? fmt(fechaNacimiento) : "—"}
                      </p>
                      <p>
                        <span className="font-semibold">Teléfono:</span>{" "}
                        {telefono || "—"}{" "}
                        <span className="ml-2 font-semibold">
                          Correo:
                        </span>{" "}
                        {correo || "—"}
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p>
                    <span className="font-semibold">Lugar:</span>{" "}
                    {lugar || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Fechas:</span> {fmt(inicio)}{" "}
                    → {fmt(fin)}
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
        {/* HEADER & TOGGLE */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Solicitudes de Pasajes y Hospedaje
            </h1>
            <p className="text-slate-500">
              Gestiona tus solicitudes y revisa el estado de tus tickets.
            </p>
          </div>
          <div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all"
              >
                <span>+ Nuevo Ticket</span>
              </button>
            )}
          </div>
        </div>

        {/* WIZARD (Condicional) */}
        {showForm && (
          <div className="relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              title="Cerrar formulario"
            >
              ✕
            </button>
            <form
              onSubmit={handlePrepareSubmit}
              className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            >
              <header className="space-y-2 pr-8">
                <h2 className="text-xl font-bold">Nuevo ticket</h2>
                <p className="text-sm text-slate-500">
                  Completa la información paso a paso.
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

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
                  >
                    Cancelar
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
              </div>
            </form>
          </div>
        )}

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
                const isAereo = isPasaje && s.subtipo === "Aéreo";

                let icon = <Hotel className="h-4 w-4" />;
                if (isPasaje) {
                  if (isAereo) icon = <Plane className="h-4 w-4" />;
                  else icon = <Bus className="h-4 w-4" />;
                }
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
                            ? s.subtipo === "Aéreo"
                              ? "Solicitud de Pasaje Aéreo"
                              : "Solicitud de Pasaje Terrestre"
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
                          {isPasaje && s.subtipo === "Aéreo" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPropuestas(s.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 ring-1 ring-indigo-200"
                            >
                              Ver propuestas
                            </button>
                          )}
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
                        <div>
                          <span className="font-semibold">Empresa:</span>{" "}
                          {s.empresa || "—"}{" "}
                          <span className="ml-2 font-semibold">CECO:</span>{" "}
                          {s.ceco || "—"}
                        </div>
                        {isPasaje ? (
                          <>
                            <div>
                              <span className="font-semibold">Subtipo:</span>{" "}
                              {s.subtipo || "—"}
                            </div>
                            <div>
                              <span className="font-semibold">
                                Origen/Destino:
                              </span>{" "}
                              {s.origen || "—"} → {s.destino || "—"}
                            </div>
                            <div>
                              <span className="font-semibold">Fechas:</span>{" "}
                              {fmt(s.salida)} → {fmt(s.retorno)}
                            </div>
                            <div>
                              <span className="font-semibold">
                                Proveedor asignado:
                              </span>{" "}
                              {s.proveedor || "Pendiente de asignar"}
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
                              <span className="font-semibold">
                                Proveedor asignado:
                              </span>{" "}
                              {s.proveedor || "Pendiente de asignar"}
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

      {/* MODAL PROPUESTAS (Shared) */}
      <PropuestasModal
        open={!!viewPropuestasId}
        onClose={() => setViewPropuestasId(null)}
        solicitudId={viewPropuestasId}
        showGerenciaSelection={true}
        showAdminSelection={true}
        readOnly={true}
      />

      {/* TOAST GLOBAL */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
