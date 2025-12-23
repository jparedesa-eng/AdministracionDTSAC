// src/pages/Camionetas/Solicitar.tsx
import React from "react";
import { camionetasStore } from "../../store/camionetasStore";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Car,
  X,
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";
import { useAuth } from "../../auth/AuthContext";
import QRCode from "react-qr-code";

// UI propios
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

function toISO(dtLocal: string): string {
  if (!dtLocal) return "";
  const d = new Date(dtLocal);
  return d.toISOString();
}

/* =========================
   Helpers extra
========================= */

// Sólo vehículos con volante = "Si"
function filtrarPlacasConVolante(placas: string[]): string[] {
  return placas.filter((placa) => {
    const v: any = camionetasStore.inventario.find((x) => x.placa === placa);
    return v?.volante === "Si";
  });
}

// Horario permitido: 08:00 a 20:00 del mismo día
const HORARIO_MIN_MIN = 8 * 60; // 08:00
const HORARIO_MAX_MIN = 20 * 60; // 20:00

function minutosDelDia(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function esHorarioPermitido(d: Date) {
  const m = minutosDelDia(d);
  return m >= HORARIO_MIN_MIN && m <= HORARIO_MAX_MIN;
}

/* =========================
   Componente principal
========================= */
export default function Solicitar() {
  const { user, profile } = useAuth();

  const [dni, setDni] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [origen, setOrigen] = React.useState("");
  const [destino, setDestino] = React.useState("");
  const [motivo, setMotivo] = React.useState("");

  const [buscandoConductor, setBuscandoConductor] = React.useState(false);
  const [nombreFromDB, setNombreFromDB] = React.useState(false);

  const [showForm, setShowForm] = React.useState(false);

  function defaultDateTimeLocal(hours: number, minutes: number) {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  const [usoInicioLocal, setUsoInicioLocal] = React.useState<string>(() =>
    defaultDateTimeLocal(8, 0) // 08:00
  );

  const [usoFinLocal, setUsoFinLocal] = React.useState<string>(() =>
    defaultDateTimeLocal(20, 0) // 10:00
  );

  // disponibilidad
  const [checking, setChecking] = React.useState(false);
  const [availableCount, setAvailableCount] =
    React.useState<number | null>(null);
  const [availablePlacas, setAvailablePlacas] = React.useState<string[]>([]);
  const [selectedPlaca, setSelectedPlaca] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  // Tickets en estado local (para que carguen bien al entrar)
  const [tickets, setTickets] = React.useState<any[]>([]);

  // Popup de QR
  const [qrTicket, setQrTicket] = React.useState<{
    id: string;
    vehiculo?: string | null;
  } | null>(null);

  // Toast global
  const [toast, setToast] = React.useState<ToastState>(null);

  // Modal para confirmar cancelación
  const [ticketToCancel, setTicketToCancel] = React.useState<any | null>(null);

  // Filtro y paginación local
  const [ticketFilter, setTicketFilter] =
    React.useState<"reservados" | "todos">("reservados");
  const [ticketsToShow, setTicketsToShow] = React.useState(10);

  const handleOpenQr = (ticket: any) => {
    const estadoLower = (ticket.estado ?? "").toString().toLowerCase();
    // Mostrar QR para estados Reservada y En uso
    if (!(estadoLower.startsWith("reserv") || estadoLower === "en uso")) return;
    setQrTicket({ id: ticket.id, vehiculo: ticket.vehiculo });
  };

  const handleCloseQr = () => setQrTicket(null);

  const calcDisponibilidad = React.useCallback(async () => {
    setMsg(null);
    setChecking(true);
    try {
      const inicioISO = toISO(usoInicioLocal);
      const finISO = toISO(usoFinLocal);

      if (!inicioISO || !finISO) {
        setAvailableCount(null);
        setAvailablePlacas([]);
        setSelectedPlaca("");
        setChecking(false);
        return;
      }

      const dInicio = new Date(inicioISO);
      const dFin = new Date(finISO);

      if (dInicio >= dFin) {
        setAvailableCount(0);
        setAvailablePlacas([]);
        setSelectedPlaca("");
        setChecking(false);
        setMsg({
          type: "err",
          text: "La fecha/hora de fin debe ser mayor al inicio.",
        });
        return;
      }

      // VALIDACIÓN: mismo día
      if (dInicio.toDateString() !== dFin.toDateString()) {
        setAvailableCount(0);
        setAvailablePlacas([]);
        setSelectedPlaca("");
        setChecking(false);
        setMsg({
          type: "err",
          text: "El inicio y fin de uso deben ser el mismo día.",
        });
        return;
      }

      // VALIDACIÓN: horario 08:00–20:00
      if (!esHorarioPermitido(dInicio) || !esHorarioPermitido(dFin)) {
        setAvailableCount(0);
        setAvailablePlacas([]);
        setSelectedPlaca("");
        setChecking(false);
        setMsg({
          type: "err",
          text: "El horario permitido es de 08:00 a 20:00 horas del mismo día.",
        });
        return;
      }

      const { placas } = await camionetasStore.disponibilidadRango(
        inicioISO,
        finISO
      );

      // Filtrar sólo las que tienen volante = "Si"
      const placasConVolante = filtrarPlacasConVolante(placas);

      setAvailableCount(placasConVolante.length);
      setAvailablePlacas(placasConVolante);

      if (
        placasConVolante.length === 0 ||
        (selectedPlaca && !placasConVolante.includes(selectedPlaca))
      ) {
        setSelectedPlaca("");
      }
    } catch (e: any) {
      console.error(e);
      setAvailableCount(null);
      setAvailablePlacas([]);
      setSelectedPlaca("");
      setMsg({
        type: "err",
        text: e?.message ?? "Error verificando disponibilidad.",
      });
    } finally {
      setChecking(false);
    }
  }, [usoInicioLocal, usoFinLocal, selectedPlaca]);

  // Carga inicial: inventario + solicitudes + disponibilidad
  React.useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          camionetasStore.syncInventario(),
          camionetasStore.syncSolicitudes(),
        ]);
        // Pasamos las solicitudes al estado local para que se vean al entrar
        setTickets([...camionetasStore.solicitudes]);
        await calcDisponibilidad();
      } catch (e: any) {
        console.error(e);
        setMsg({ type: "err", text: "Error inicial sincronizando datos." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    calcDisponibilidad();
  }, [usoInicioLocal, usoFinLocal, calcDisponibilidad]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!dni.trim() || !/^[0-9]{8}$/.test(dni.trim())) {
      setMsg({ type: "err", text: "DNI inválido. Debe tener 8 dígitos." });
      return;
    }
    if (!nombre.trim()) {
      setMsg({ type: "err", text: "Ingrese el nombre." });
      return;
    }
    if (!origen.trim() || !destino.trim()) {
      setMsg({ type: "err", text: "Ingrese origen y destino." });
      return;
    }

    const inicioISO = toISO(usoInicioLocal);
    const finISO = toISO(usoFinLocal);
    if (!inicioISO || !finISO) {
      setMsg({ type: "err", text: "Seleccione fechas válidas." });
      return;
    }

    const dInicio = new Date(inicioISO);
    const dFin = new Date(finISO);

    if (dInicio >= dFin) {
      setMsg({
        type: "err",
        text: "La fecha/hora de fin debe ser mayor al inicio.",
      });
      return;
    }

    // VALIDACIÓN: mismo día
    if (dInicio.toDateString() !== dFin.toDateString()) {
      setMsg({
        type: "err",
        text: "El inicio y fin de uso deben ser el mismo día.",
      });
      return;
    }

    // VALIDACIÓN: horario 08:00–20:00
    if (!esHorarioPermitido(dInicio) || !esHorarioPermitido(dFin)) {
      setMsg({
        type: "err",
        text: "El horario permitido es de 08:00 a 20:00 horas del mismo día.",
      });
      return;
    }

    if (!selectedPlaca) {
      setMsg({
        type: "err",
        text: "Selecciona una camioneta disponible.",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Revalidamos disponibilidad + volante en el momento de grabar
      const { placas } = await camionetasStore.disponibilidadRango(
        inicioISO,
        finISO
      );
      const placasConVolante = filtrarPlacasConVolante(placas);

      if (!placasConVolante.includes(selectedPlaca)) {
        setMsg({
          type: "err",
          text: "La placa seleccionada ya no está disponible o no tiene volante habilitado. Elige otra.",
        });
        setSubmitting(false);
        return;
      }

      const insertPayload = {
        dni: dni.trim(),
        nombre: nombre.trim(),
        origen: origen.trim(),
        destino: destino.trim(),
        motivo: (motivo || null) as string | null,
        uso_inicio: new Date(inicioISO).toISOString(),
        uso_fin: new Date(finISO).toISOString(),
        estado: "Reservada" as const,
        vehiculo: selectedPlaca,
        recojo: inicioISO,
        creado_por_id: user?.id ?? null,
        creado_por_nombre: profile?.nombre ?? null,
        creado_por_area: profile?.area ?? null,
      };

      const { data: sRow, error: e1 } = await supabase
        .from("solicitudes")
        .insert([insertPayload])
        .select("*")
        .single();
      if (e1) throw e1;

      await camionetasStore.crearReserva({
        placa: selectedPlaca,
        inicioISO,
        finISO,
        solicitudId: (sRow as any).id as string,
      });

      await camionetasStore.syncSolicitudes();
      setTickets([...camionetasStore.solicitudes]);

      setMsg({
        type: "ok",
        text: `Ticket reservado para la placa ${selectedPlaca}.`,
      });

      setDni("");
      setNombre("");
      setOrigen("");
      setDestino("");
      setMotivo("");
      setSelectedPlaca("");
      setNombreFromDB(false);

      await calcDisponibilidad();
      setShowForm(false);
    } catch (e: any) {
      console.error(e);
      setMsg({
        type: "err",
        text: e?.message ?? "No se pudo crear el ticket.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const puedeCancelar = (estado: string) => estado === "Reservada";

  // Cancelación real (se llama desde el Modal)
  const cancelarTicket = async (id: string) => {
    try {
      setCancellingId(id);

      const idx = camionetasStore.solicitudes.findIndex((x) => x.id === id);
      if (idx >= 0) {
        camionetasStore.solicitudes[idx] = {
          ...camionetasStore.solicitudes[idx],
          estado: "Cancelado" as any,
        };
      }

      await camionetasStore.cancelar(id);
      await camionetasStore.syncSolicitudes();
      setTickets([...camionetasStore.solicitudes]);
      await calcDisponibilidad();

      setToast({
        type: "success",
        message: "El ticket fue cancelado correctamente.",
      });
    } catch (e: any) {
      console.error(e);
      setToast({
        type: "error",
        message: e?.message ?? "No se pudo cancelar el ticket.",
      });
    } finally {
      setCancellingId(null);
    }
  };

  // Helper para mostrar meta (marca/modelo) en el dropdown
  const metaDePlaca = React.useCallback((placa: string) => {
    const v = camionetasStore.inventario.find(
      (x) => x.placa === placa
    ) as any;
    const marca = v?.marca ? ` • ${v.marca}` : "";
    const modelo = v?.modelo ? ` ${v?.modelo}` : "";
    return `${placa}${marca}${modelo}`;
  }, []);

  const dniValido = /^[0-9]{8}$/.test(dni.trim());
  const areaUsuario = profile?.area ?? null;

  const ticketsUsuario = React.useMemo(() => {
    const base = tickets;
    const filtrados = base.filter((s) => {
      const area =
        (s as any).creadoPorArea ?? (s as any).creado_por_area ?? null;
      const porArea = areaUsuario ? area === areaUsuario : true;
      const porDni = dniValido ? s.dni === dni.trim() : true;
      return porArea && porDni;
    });

    return filtrados.sort(
      (a, b) => +new Date(b.createdAt as any) - +new Date(a.createdAt as any)
    );
  }, [tickets, areaUsuario, dniValido, dni]);

  // Filtro: "Reservados / En uso" en un solo filtro
  const filteredTickets = React.useMemo(() => {
    if (ticketFilter === "reservados") {
      return ticketsUsuario.filter((s) => {
        const estadoLower = (s.estado ?? "").toString().toLowerCase();
        return estadoLower.startsWith("reserv") || estadoLower === "en uso";
      });
    }
    return ticketsUsuario;
  }, [ticketsUsuario, ticketFilter]);

  React.useEffect(() => {
    setTicketsToShow(10);
  }, [ticketFilter, dniValido, dni, areaUsuario]);

  const visibleTickets = filteredTickets.slice(0, ticketsToShow);

  // Autocompletar nombre por DNI
  React.useEffect(() => {
    const v = dni.trim();

    if (v.length !== 8) {
      setBuscandoConductor(false);
      setNombreFromDB(false);
      return;
    }

    let cancelado = false;

    (async () => {
      try {
        setBuscandoConductor(true);
        setNombreFromDB(false);

        const { data, error } = await supabase
          .from("conductores")
          .select("nombre, activo")
          .eq("dni", v)
          .eq("activo", true)
          .limit(1)
          .single();

        if (cancelado) return;

        if (error) {
          console.warn(
            "No se pudo buscar conductor por DNI:",
            error.message
          );
          setNombreFromDB(false);
          return;
        }

        if (data && data.nombre) {
          setNombre(data.nombre);
          setNombreFromDB(true);
        } else {
          setNombreFromDB(false);
        }
      } catch (e: any) {
        if (!cancelado) {
          console.error(
            "Error buscando conductor por DNI:",
            e?.message ?? e
          );
          setNombreFromDB(false);
        }
      } finally {
        if (!cancelado) {
          setBuscandoConductor(false);
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [dni]);

  /* =========================
     JSX
  ========================== */

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Título + botón nuevo ticket */}
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Solicitar Camioneta
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Elige primero el rango de uso y la camioneta disponible; luego
              completa los datos del solicitante.
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#cc0000] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuevo ticket
            </button>
          )}
        </header>

        {/* Estado / mensajes */}
        {msg && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${msg.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
          >
            {msg.type === "ok" ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {msg.text}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {msg.text}
              </span>
            )}
          </div>
        )}

        {/* Indicador de disponibilidad */}
        <div className="mb-6 rounded-2xl bg-white p-4 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gray-900 text-white">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  Disponibilidad para el rango
                </p>
                {checking ? (
                  <p className="text-sm font-medium text-gray-800 inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando…
                  </p>
                ) : availableCount === null ? (
                  <p className="text-sm font-medium text-gray-800">—</p>
                ) : availableCount > 0 ? (
                  <p className="text-sm font-medium text-emerald-700">
                    {availableCount} camioneta(s) disponible(s)
                  </p>
                ) : (
                  <p className="text-sm font-medium text-rose-700">
                    Sin disponibilidad
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl bg-white p-4 border border-gray-200 grid gap-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Inicio de uso
                </label>
                <div className="relative mt-1">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={usoInicioLocal}
                    onChange={(e) => setUsoInicioLocal(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-10 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Fin de uso
                </label>
                <div className="relative mt-1">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={usoFinLocal}
                    onChange={(e) => setUsoFinLocal(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-10 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Camioneta disponible
              </label>
              <select
                value={selectedPlaca}
                onChange={(e) => setSelectedPlaca(e.target.value)}
                disabled={checking || (availableCount ?? 0) <= 0}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors disabled:opacity-60"
              >
                <option value="">
                  {checking
                    ? "Verificando disponibilidad…"
                    : (availableCount ?? 0) > 0
                      ? "— Selecciona una placa —"
                      : "Sin disponibilidad en el rango"}
                </option>
                {availablePlacas.map((p) => (
                  <option key={p} value={p}>
                    {metaDePlaca(p)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  DNI Conductor
                </label>
                <input
                  inputMode="numeric"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D+/g, "").slice(0, 8);
                    setDni(v);
                    if (v.length !== 8) setNombreFromDB(false);
                    if (v.length === 0) setNombre("");
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                  placeholder="00000000"
                />
                {buscandoConductor && (
                  <p className="mt-1 text-xs text-gray-500">
                    Buscando conductor…
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Nombre Conductor
                </label>
                <input
                  value={nombre}
                  readOnly={nombreFromDB}
                  onChange={(e) => {
                    if (!nombreFromDB) setNombre(e.target.value);
                  }}
                  className={
                    "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors " +
                    (nombreFromDB
                      ? "bg-gray-100 cursor-not-allowed"
                      : "")
                  }
                  placeholder="Nombre y apellidos"
                />
                {nombreFromDB && (
                  <p className="mt-1 text-xs text-gray-500">
                    Nombre cargado desde la base de conductores (no
                    editable).
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Origen
                </label>
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                >
                  <option value="">— Selecciona origen —</option>
                  <option value="TRUJILLO">TRUJILLO</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Destino
                </label>
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                >
                  <option value="">— Selecciona destino —</option>
                  <option value="F. AGROMORIN">F. AGROMORIN</option>
                  <option value="F. COMPOSITAN">F. COMPOSITAN</option>
                  <option value="F. CASA VERDE">F. CASA VERDE</option>
                  <option value="F. MUCHIK">F. MUCHIK</option>
                  <option value="F. SAN PEDRO">F. SAN PEDRO</option>
                  <option value="F. PALMAR">F. PALMAR</option>
                  <option value="F. MARIA DEL ROSARIO">F. MARIA DEL ROSARIO</option>
                  <option value="F. SANTO DOMINGO">F. SANTO DOMINGO</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Motivo (opcional)
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors resize-y"
                  placeholder="Describe brevemente el motivo del uso"
                />
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || checking || !selectedPlaca}
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#cc0000] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando ticket…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Crear ticket
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tickets del usuario */}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {dniValido ? "Tus tickets" : "Tickets tu área"}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Lista de tickets recientes. Usa el filtro para ver sólo
                reservados/en uso o todos.
              </p>
            </div>

            {/* Filtro Reservados / En uso / Todos */}
            <div className="inline-flex rounded-full bg-gray-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTicketFilter("reservados")}
                className={
                  "px-3 py-1 rounded-full font-medium transition " +
                  (ticketFilter === "reservados"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500")
                }
              >
                Reservados / En uso
              </button>
              <button
                type="button"
                onClick={() => setTicketFilter("todos")}
                className={
                  "px-3 py-1 rounded-full font-medium transition " +
                  (ticketFilter === "todos"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500")
                }
              >
                Todos
              </button>
            </div>
          </div>

          {visibleTickets.length === 0 ? (
            <div className="mt-4 rounded-xl bg-white p-3 border border-gray-100">
              <p className="text-sm text-gray-500">
                {ticketFilter === "reservados"
                  ? "No hay tickets reservados o en uso con los filtros actuales."
                  : "No hay tickets con los filtros actuales."}
              </p>
            </div>
          ) : (
            <>
              <ul className="mt-4 space-y-2">
                {visibleTickets.map((s) => {
                  const creadoPorNombre =
                    (s as any).creadoPorNombre ??
                    (s as any).creado_por_nombre ??
                    null;
                  const creadoPorArea =
                    (s as any).creadoPorArea ??
                    (s as any).creado_por_area ??
                    null;
                  const conductorNombre = (s as any).nombre ?? null;

                  const inicio = new Date(s.usoInicio);
                  const fin = new Date(s.usoFin);

                  // tiempos extra desde garita
                  const entregaGaritaRaw =
                    (s as any).entrega_garita_at ??
                    (s as any).entregaGaritaAt ??
                    null;
                  const terminoUsoGaritaRaw =
                    (s as any).termino_uso_garita_at ??
                    (s as any).terminoUsoGaritaAt ??
                    null;

                  const entregaGarita = entregaGaritaRaw
                    ? new Date(entregaGaritaRaw)
                    : null;
                  const terminoUsoGarita = terminoUsoGaritaRaw
                    ? new Date(terminoUsoGaritaRaw)
                    : null;

                  const estado = (s.estado ?? "").toString();
                  const estadoLower = estado.toLowerCase();

                  const now = new Date();
                  const isVencido = !estadoLower.startsWith("cancel") && now > fin;

                  let estadoDisplay = estado;
                  if (isVencido) estadoDisplay = "Vencido";

                  let estadoDot = "bg-gray-400";
                  if (isVencido) estadoDot = "bg-neutral-500";
                  else if (estadoLower.startsWith("reserv"))
                    estadoDot = "bg-emerald-500";
                  else if (estadoLower.startsWith("cancel"))
                    estadoDot = "bg-rose-500";
                  else if (estadoLower === "en uso")
                    estadoDot = "bg-sky-500";

                  let estadoPill =
                    "bg-gray-100 text-gray-700 ring-gray-200";
                  if (isVencido)
                    estadoPill = "bg-neutral-100 text-neutral-600 ring-neutral-200";
                  else if (estadoLower.startsWith("reserv"))
                    estadoPill =
                      "bg-emerald-50 text-emerald-800 ring-emerald-200";
                  else if (estadoLower.startsWith("cancel"))
                    estadoPill =
                      "bg-rose-50 text-rose-800 ring-rose-200";
                  else if (estadoLower === "en uso")
                    estadoPill =
                      "bg-sky-50 text-sky-800 ring-sky-200";
                  else if (estadoLower)
                    estadoPill =
                      "bg-slate-50 text-slate-800 ring-slate-200";

                  return (
                    <li
                      key={s.id}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                    >
                      {/* fila superior compacta */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-700 text-white">
                          <Car className="h-4 w-4" />
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {s.vehiculo ?? "—"}
                              </p>
                              {s.origen && s.destino && (
                                <p className="mt-0.5 inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 ring-1 ring-gray-100">
                                  {s.origen}
                                  <span className="mx-1 text-gray-400">
                                    →
                                  </span>
                                  {s.destino}
                                </p>
                              )}
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${estadoPill}`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${estadoDot}`}
                              />
                              {estadoDisplay || "—"}
                            </span>
                          </div>

                          {conductorNombre && (
                            <p className="text-[11px] text-gray-600">
                              Conductor{" "}
                              <span className="font-semibold text-gray-800">
                                {conductorNombre}
                              </span>
                            </p>
                          )}
                          {(creadoPorNombre ?? "").trim() && (
                            <p className="text-[11px] text-gray-500">
                              Reservado por{" "}
                              <span className="font-semibold text-gray-800">
                                {creadoPorNombre}
                              </span>
                              {creadoPorArea && (
                                <span className="text-gray-400">
                                  {" "}
                                  · {creadoPorArea}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* fila inferior: horario + acciones */}
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-dashed border-gray-200 pt-2 text-[11px] text-gray-600">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-800">
                            Horario
                          </span>{" "}
                          <span>
                            {inicio.toLocaleDateString()} ·{" "}
                            {inicio.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {fin.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <div className="mt-0.5 text-[10px] text-gray-400">
                            Creado el{" "}
                            {inicio.toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                            })}
                          </div>

                          {entregaGarita && (
                            <div className="mt-0.5 text-[10px] text-gray-500">
                              Entrega en garita:{" "}
                              {entregaGarita.toLocaleDateString()} ·{" "}
                              {entregaGarita.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                          {terminoUsoGarita && (
                            <div className="mt-0.5 text-[10px] text-gray-500">
                              Término de uso en garita:{" "}
                              {terminoUsoGarita.toLocaleDateString()} ·{" "}
                              {terminoUsoGarita.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {((estadoLower.startsWith("reserv") ||
                            estadoLower === "en uso") && !isVencido) && (
                              <button
                                type="button"
                                onClick={() => handleOpenQr(s)}
                                className="inline-flex min-w-[120px] items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 active:bg-sky-800"
                              >
                                Ver QR
                              </button>
                            )}
                          {(puedeCancelar(s.estado) && !isVencido) && (
                            <button
                              type="button"
                              onClick={() => setTicketToCancel(s)}
                              disabled={cancellingId === s.id}
                              className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                              {cancellingId === s.id
                                ? "Cancelando…"
                                : "Cancelar"}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {visibleTickets.length < filteredTickets.length && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setTicketsToShow((prev) => prev + 10)}
                    className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cargar 10 más
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Modal de confirmación de cancelación */}
        <Modal
          open={!!ticketToCancel}
          title="Cancelar ticket"
          size="sm"
          onClose={() => setTicketToCancel(null)}
        >
          <p className="text-sm text-slate-600">
            ¿Seguro que deseas cancelar el ticket de la placa{" "}
            <span className="font-semibold">
              {ticketToCancel?.vehiculo ?? "—"}
            </span>
            ? Esta acción liberará la camioneta.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTicketToCancel(null)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              No, volver
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!ticketToCancel) return;
                await cancelarTicket(ticketToCancel.id);
                setTicketToCancel(null);
              }}
              disabled={
                !!ticketToCancel && cancellingId === ticketToCancel.id
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {ticketToCancel && cancellingId === ticketToCancel.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelando…
                </>
              ) : (
                "Sí, cancelar"
              )}
            </button>
          </div>
        </Modal>

        {/* Popup de QR a pantalla completa */}
        {qrTicket && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/70">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <button
                onClick={handleCloseQr}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
              >
                Cerrar
              </button>
              <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Ticket {qrTicket.vehiculo ?? ""}
              </span>
              <div className="w-[60px]" />
            </div>

            <div className="flex flex-1 items-center justify-center px-6 pb-10">
              <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Escanear QR del ticket
                </p>
                <div className="flex items-center justify-center rounded-2xl bg-gray-50 p-4">
                  <QRCode
                    value={String(qrTicket.id)}
                    size={260}
                    style={{ height: "260px", width: "260px" }}
                  />
                </div>
                <p className="mt-4 text-center text-[11px] text-gray-500">
                  Muestra este código a la persona que verificará tu ticket en
                  la otra página del aplicativo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Toast global */}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </div>
  );
}
