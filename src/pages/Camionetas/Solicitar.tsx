// src/pages/Camionetas/Solicitar.tsx
import React from "react";
import { camionetasStore } from "../../store/camionetasStore";
import { getSedesState, subscribeSedes } from "../../store/sedesStore";
import { notificationsStore } from "../../store/notificationsStore";
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

function toLocalString(dtLocal: string): string {
  if (!dtLocal) return "";
  return dtLocal.length === 16 ? `${dtLocal}:00` : dtLocal;
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

function minutosDelDiaStr(timeStr: string) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function minutosDelDiaDate(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

/* =========================
   Componente principal
========================= */
export default function Solicitar({ isPopup = false }: { isPopup?: boolean }) {
  const { user, profile } = useAuth();

  const [dni, setDni] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [origen, setOrigen] = React.useState("");
  const [destino, setDestino] = React.useState("");
  const [otroDestino, setOtroDestino] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [ceco, setCeco] = React.useState("");
  const [sedes, setSedes] = React.useState<any[]>(getSedesState().sedes);

  const [dniError, setDniError] = React.useState<string | null>(null);
  const [cecoError, setCecoError] = React.useState<string | null>(null);

  const [buscandoConductor, setBuscandoConductor] = React.useState(false);


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
    defaultDateTimeLocal(16, 0) // 16:00
  );

  // disponibilidad
  const [checking, setChecking] = React.useState(false);
  const [selectedPlaca, setSelectedPlaca] = React.useState<string>(""); const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = subscribeSedes(() => {
      setSedes(getSedesState().sedes);
    });
    setSedes(getSedesState().sedes);
    return unsub;
  }, []);

  // Tickets en estado local (para que carguen bien al entrar)
  const [tickets, setTickets] = React.useState<any[]>([]);

  // Popup de QR
  const [qrTicket, setQrTicket] = React.useState<{
    id: string;
    vehiculo?: string | null;
  } | null>(null);

  // Toast global
  const [toast, setToast] = React.useState<ToastState>(null);

  React.useEffect(() => {
    if (isPopup) {
      setShowForm(true);
    }
  }, [isPopup]);

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

  // Placas pre-cargadas (estado = Disponible y volante = Si)
  const placasDisponibles = React.useMemo(() => {
    return camionetasStore.inventario
      .filter((v) => v.estado === "Disponible" && v.volante === "Si")
      .map((v) => v.placa);
  }, [camionetasStore.inventario]);

  const calcDisponibilidad = React.useCallback(async () => {
    setMsg(null);
    if (!selectedPlaca) {
      // Don't check availability until a truck is explicitly selected
      targetChecking(false);
      return;
    }

    setChecking(true);
    try {
      const inicioISO = toLocalString(usoInicioLocal);
      const finISO = toLocalString(usoFinLocal);

      if (!inicioISO || !finISO) {
        setChecking(false);
        return;
      }

      const dInicio = new Date(inicioISO);
      const dFin = new Date(finISO);

      if (dInicio >= dFin) {
        setChecking(false);
        setMsg({
          type: "err",
          text: "La fecha/hora de fin debe ser mayor al inicio.",
        });
        return;
      }

      // VALIDACIÓN: horario volante del vehiculo seleccionado
      const vehSeleccionado: any = camionetasStore.inventario.find((v) => v.placa === selectedPlaca);
      if (vehSeleccionado && vehSeleccionado.volanteInicio && vehSeleccionado.volanteFin) {
        const vInicioMin = minutosDelDiaStr(vehSeleccionado.volanteInicio);
        const vFinMin = minutosDelDiaStr(vehSeleccionado.volanteFin);
        const iMin = minutosDelDiaDate(dInicio);
        const fMin = minutosDelDiaDate(dFin);

        if (iMin < vInicioMin || fMin > vFinMin) {
          setChecking(false);
          setMsg({
            type: "err",
            text: `El horario permitido para la placa ${selectedPlaca} es de ${vehSeleccionado.volanteInicio} a ${vehSeleccionado.volanteFin} horas.`,
          });
          return;
        }
      }

      const { placas } = await camionetasStore.disponibilidadRango(
        inicioISO,
        finISO
      );

      if (!placas.includes(selectedPlaca)) {
        setMsg({ type: "err", text: `La camioneta ${selectedPlaca} ya está ocupada en ese horario.` });
      } else {
        setMsg({ type: "ok", text: `La camioneta ${selectedPlaca} se encuentra libre en el horario indicado.` });
      }

    } catch (e: any) {
      console.error(e);
      setMsg({
        type: "err",
        text: e?.message ?? "Error verificando disponibilidad.",
      });
    } finally {
      setChecking(false);
    }
    function targetChecking(v: boolean) { setChecking(v); }
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

    // Validar si existen errores en DNI o CECO antes de enviar
    if (dniError) {
      setMsg({ type: "err", text: "Corrija el error en el DNI antes de continuar." });
      return;
    }
    if (cecoError) {
      setMsg({ type: "err", text: "Corrija el error en el CECO antes de continuar." });
      return;
    }
    if (!ceco.trim()) {
      setMsg({ type: "err", text: "Ingrese el CECO." });
      return;
    }

    const inicioISO = toLocalString(usoInicioLocal);
    const finISO = toLocalString(usoFinLocal);
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

    // VALIDACIÓN: horario volante del vehiculo seleccionado
    const vehSeleccionado: any = camionetasStore.inventario.find((v) => v.placa === selectedPlaca);
    if (vehSeleccionado && vehSeleccionado.volanteInicio && vehSeleccionado.volanteFin) {
      const vInicioMin = minutosDelDiaStr(vehSeleccionado.volanteInicio);
      const vFinMin = minutosDelDiaStr(vehSeleccionado.volanteFin);
      const iMin = minutosDelDiaDate(dInicio);
      const fMin = minutosDelDiaDate(dFin);

      if (iMin < vInicioMin || fMin > vFinMin) {
        setMsg({
          type: "err",
          text: `El horario permitido para la placa ${selectedPlaca} es de ${vehSeleccionado.volanteInicio} a ${vehSeleccionado.volanteFin} horas.`,
        });
        return;
      }
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
        destino: destino === "Otros" ? otroDestino.trim() : destino.trim(),
        motivo: (motivo || null) as string | null,
        ceco: ceco.trim(),
        uso_inicio: inicioISO,
        uso_fin: finISO,
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

      // Trigger Notification: New Request (Manual from Solicitar.tsx)
      try {
        await notificationsStore.notifyUsersByRoleAndArea(
          "jefe",
          "ADMINISTRACION",
          "Nueva Solicitud de Camioneta",
          `El usuario ${nombre.trim()} ha generado una solicitud (origen: ${origen}, destino: ${destino}).`,
          "info"
        );
      } catch (e) {
        console.warn("Error enviando notificación automática:", e);
      }

      setMsg({
        type: "ok",
        text: `Ticket reservado para la placa ${selectedPlaca}.`,
      });

      setDni("");
      setNombre("");
      setOrigen("");
      setDestino("");
      setOtroDestino("");
      setMotivo("");
      setSelectedPlaca("");
      setSelectedPlaca("");
      setCeco("");
      setCeco("");

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



  const ticketsUsuario = React.useMemo(() => {
    const base = tickets;
    const filtrados = base.filter((s) => {
      // Filtrar solo los registros realizados por el mismo usuario logeado
      return (s as any).creado_por_id === user?.id || (s as any).creadoPorId === user?.id;
    });

    return filtrados.sort(
      (a, b) => +new Date(b.createdAt as any) - +new Date(a.createdAt as any)
    );
  }, [tickets, user?.id]);

  // Filtro: "Reservados / En uso" en un solo filtro
  const filteredTickets = React.useMemo(() => {
    if (ticketFilter === "reservados") {
      return ticketsUsuario.filter((s) => {
        const estadoLower = (s.estado ?? "").toString().toLowerCase();
        const matchesEstado =
          estadoLower.startsWith("reserv") || estadoLower === "en uso";

        if (!matchesEstado) return false;

        // Filtrar vencidos (si ya pasó la fecha fin)
        const finStr = (s as any).uso_fin ?? (s as any).usoFin;
        if (finStr) {
          const finDate = new Date(finStr);
          if (finDate < new Date()) {
            return false;
          }
        }

        return true;
      });
    }
    return ticketsUsuario;
  }, [ticketsUsuario, ticketFilter]);

  React.useEffect(() => {
    setTicketsToShow(10);
  }, [ticketFilter, user?.id]);

  const visibleTickets = filteredTickets.slice(0, ticketsToShow);

  // Autocompletar nombre por DNI
  React.useEffect(() => {
    const v = dni.trim();

    if (v.length !== 8) {
      setBuscandoConductor(false);
      setDniError(null);
      return;
    }

    let cancelado = false;

    (async () => {
      try {
        setBuscandoConductor(true);

        const { data, error } = await supabase
          .from("conductores")
          .select("nombre, activo")
          .eq("dni", v)
          .eq("activo", true)

          .limit(1)
          .maybeSingle();

        if (cancelado) return;

        if (error) {
          console.warn(
            "No se pudo buscar conductor por DNI:",
            error.message
          );
          // No retornamos aquí para permitir que el flujo continúe y limpie si es error de red
        }

        if (data && data.nombre) {
          setNombre(data.nombre);
          setDniError(null);
        } else {
          // Si no se encuentra, error estricto
          setNombre("");
          setDniError("El DNI no está registrado como conductor.");
        }
      } catch (e: any) {
        if (!cancelado) {
          console.error(
            "Error buscando conductor por DNI:",
            e?.message ?? e
          );
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

  // Validar CECO
  const validateCeco = async () => {
    if (!ceco.trim()) {
      setCecoError("El CECO es obligatorio.");
      return;
    }
    if (ceco.trim().length !== 10) {
      setCecoError("El CECO debe tener 10 dígitos.");
      return;
    }
    try {
      setCecoError(null);
      const { data, error } = await supabase
        .from("cecos")
        .select("id")
        .eq("codigo", ceco.trim())
        .single();

      if (error || !data) {
        setCecoError("El CECO no existe en la base de datos.");
      }
    } catch (err) {
      setCecoError("Error validando CECO.");
    }
  };

  /* =========================
     JSX
  ========================== */

  return (
    <div className={isPopup ? "" : "min-h-screen"}>
      <div className={isPopup ? "py-2" : "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10"}>
        {/* Título + botón nuevo ticket */}
        {!isPopup && (
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
        )}

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

        {/* Línea de tiempo de reservas para camioneta seleccionada */}
        {showForm && (
          selectedPlaca && usoInicioLocal ? (
            <div className="mb-6 rounded-2xl bg-white p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Ocupación para {selectedPlaca}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {usoInicioLocal.slice(0, 10) === usoFinLocal.slice(0, 10)
                        ? usoInicioLocal.slice(0, 10).split('-').reverse().join('/')
                        : `${usoInicioLocal.slice(0, 10).split('-').reverse().join('/')} al ${usoFinLocal.slice(0, 10).split('-').reverse().join('/')}`
                      }
                    </p>
                  </div>
                </div>

                {/* Leyenda */}
                <div className="flex items-center gap-4 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300"></div>
                    <span>Fuera de horario</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300"></div>
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-rose-500 border border-rose-600"></div>
                    <span>Ocupado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-400/40 border-y-[2px] border-blue-500"></div>
                    <span className="font-bold text-blue-700">Tu selección</span>
                  </div>
                </div>
              </div>

              <div className="relative h-12 bg-gray-200 rounded-lg border border-gray-300 ml-2 mr-2 overflow-hidden shadow-inner">
                {/* Bloque verde de horario volante */}
                {(() => {
                  const veh: any = camionetasStore.inventario.find((v) => v.placa === selectedPlaca);
                  if (veh && veh.volante === "Si" && veh.volanteInicio && veh.volanteFin) {
                    const [hIni, mIni] = veh.volanteInicio.split(':').map(Number);
                    const [hFin, mFin] = veh.volanteFin.split(':').map(Number);
                    const volStart = hIni + (mIni / 60);
                    const volEnd = hFin + (mFin / 60);

                    const iDateStr = usoInicioLocal.slice(0, 10);
                    const fDateStr = usoFinLocal.slice(0, 10);
                    const diffDays = Math.round((new Date(fDateStr).getTime() - new Date(iDateStr).getTime()) / (1000 * 60 * 60 * 24));
                    const totalDays = Math.max(1, diffDays + 1);
                    const totalHours = totalDays * 24;

                    return Array.from({ length: totalDays }).map((_, dayIdx) => {
                      const tStart = dayIdx * 24 + volStart;
                      const tEnd = dayIdx * 24 + volEnd;
                      const left = (tStart / totalHours) * 100;
                      const width = ((tEnd - tStart) / totalHours) * 100;

                      if (width > 0) {
                        return (
                          <div
                            key={dayIdx}
                            className="absolute top-0 bottom-0 bg-emerald-100 border-x border-emerald-300 pointer-events-none"
                            style={{ left: `${left}%`, width: `${width}%` }}
                          ></div>
                        );
                      }
                      return null;
                    });
                  }
                  return null;
                })()}

                {/* Marcas de horas */}
                {(() => {
                  const iDateStr = usoInicioLocal.slice(0, 10);
                  const fDateStr = usoFinLocal.slice(0, 10);
                  const diffDays = Math.round((new Date(fDateStr).getTime() - new Date(iDateStr).getTime()) / (1000 * 60 * 60 * 24));
                  const totalDays = Math.max(1, diffDays + 1);
                  const totalHours = totalDays * 24;

                  const step = totalDays > 3 ? 12 : (totalDays > 1 ? 6 : 1);

                  return Array.from({ length: totalHours + 1 }).map((_, i) => {
                    if (i % step !== 0 && i !== totalHours) return null;
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 border-l ${i % 24 === 0 ? 'border-gray-400 z-0' : 'border-gray-300/60'}`}
                        style={{ left: `${(i / totalHours) * 100}%` }}
                      >
                      </div>
                    );
                  });
                })()}

                {/* Bloques de reservas */}
                {(() => {
                  const iDateStr = usoInicioLocal.slice(0, 10);
                  const fDateStr = usoFinLocal.slice(0, 10);
                  const baseTime = new Date(iDateStr + "T00:00:00").getTime();
                  const totalDays = Math.max(1, Math.round((new Date(fDateStr).getTime() - baseTime) / (1000 * 60 * 60 * 24)) + 1);
                  const totalHours = totalDays * 24;

                  return camionetasStore.solicitudes
                    .filter(s => {
                      if (s.vehiculo !== selectedPlaca) return false;
                      const activeStates = ["Pendiente", "Asignada", "Reservada", "En uso"];
                      if (!activeStates.includes(s.estado)) return false;

                      const sD = s.usoInicio.slice(0, 10);
                      const eD = s.usoFin.slice(0, 10);
                      return sD <= fDateStr && eD >= iDateStr;
                    })
                    .map(s => {
                      const sD = s.usoInicio.slice(0, 10);
                      const sHour = parseInt(s.usoInicio.slice(11, 13), 10);
                      const sMin = parseInt(s.usoInicio.slice(14, 16), 10);
                      const daysDiffS = Math.round((new Date(sD + "T00:00:00").getTime() - baseTime) / (1000 * 60 * 60 * 24));
                      let tStart = daysDiffS * 24 + sHour + (sMin / 60);
                      if (tStart < 0) tStart = 0;

                      const eD = s.usoFin.slice(0, 10);
                      const eHour = parseInt(s.usoFin.slice(11, 13), 10);
                      const eMin = parseInt(s.usoFin.slice(14, 16), 10);
                      const daysDiffE = Math.round((new Date(eD + "T00:00:00").getTime() - baseTime) / (1000 * 60 * 60 * 24));
                      let tEnd = daysDiffE * 24 + eHour + (eMin / 60);
                      if (tEnd > totalHours) tEnd = totalHours;

                      const left = (tStart / totalHours) * 100;
                      const width = ((tEnd - tStart) / totalHours) * 100;

                      if (width <= 0) return null;

                      return (
                        <div
                          key={s.id}
                          className="absolute top-1 bottom-1 bg-rose-500 rounded-md border border-rose-600 group cursor-default transition-transform hover:scale-y-105 shadow-md flex items-center justify-center overflow-hidden"
                          style={{ left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` }}
                        >
                          {width > (400 / totalHours) && (
                            <span className="text-[10px] font-bold text-white truncate px-1 drop-shadow-md">
                              {totalDays > 1
                                ? `${s.usoInicio.slice(5, 10)} a ${s.usoFin.slice(5, 10)}`
                                : `${s.usoInicio.slice(11, 16)} - ${s.usoFin.slice(11, 16)}`}
                            </span>
                          )}
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20 transition-opacity">
                            {s.nombre.split(' ')[0]} ({s.usoInicio.slice(5, 16).replace('T', ' ')} a {s.usoFin.slice(5, 16).replace('T', ' ')})
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-t-gray-900 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"></div>
                          </div>
                        </div>
                      );
                    });
                })()}

                {/* Bloque de selección actual (overlay) */}
                {(() => {
                  if (!usoInicioLocal || !usoFinLocal) return null;
                  const iDateStr = usoInicioLocal.slice(0, 10);
                  const fDateStr = usoFinLocal.slice(0, 10);
                  const baseTime = new Date(iDateStr + "T00:00:00").getTime();
                  const totalDays = Math.max(1, Math.round((new Date(fDateStr).getTime() - baseTime) / (1000 * 60 * 60 * 24)) + 1);
                  const totalHours = totalDays * 24;

                  const iH = new Date(usoInicioLocal).getTime();
                  const fH = new Date(usoFinLocal).getTime();

                  let tStart = (iH - baseTime) / (1000 * 60 * 60);
                  let tEnd = (fH - baseTime) / (1000 * 60 * 60);

                  if (tEnd <= tStart) return null;

                  const left = (tStart / totalHours) * 100;
                  const width = ((tEnd - tStart) / totalHours) * 100;

                  return (
                    <div
                      className="absolute top-0 bottom-0 bg-blue-400/40 border-y-[3px] border-blue-500 z-10 pointer-events-none flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {width > (600 / totalHours) && (
                        <span className="text-[10px] font-bold text-blue-900 truncate px-1.5 py-0.5 drop-shadow-sm bg-white/70 rounded shadow-sm">
                          Tu selección
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Eje de tiempo base */}
              <div className="relative h-6 mt-2 mx-2">
                {(() => {
                  const iDateStr = usoInicioLocal.slice(0, 10);
                  const fDateStr = usoFinLocal.slice(0, 10);
                  const baseTime = new Date(iDateStr + "T00:00:00").getTime();
                  const diffDays = Math.round((new Date(fDateStr).getTime() - baseTime) / (1000 * 60 * 60 * 24));
                  const totalDays = Math.max(1, diffDays + 1);
                  const totalHours = totalDays * 24;

                  const step = totalDays > 3 ? 24 : (totalDays > 1 ? 12 : 4);

                  return Array.from({ length: totalHours + 1 }).map((_, i) => {
                    if (i % step !== 0 && i !== totalHours) return null;

                    // if it's a multiple of 24, show the date or "00:00"
                    let label = `${(i % 24).toString().padStart(2, '0')}:00`;
                    if (totalDays > 1 && i % 24 === 0) {
                      const d = new Date(baseTime + i * 1000 * 60 * 60);
                      label = d.toISOString().slice(5, 10).split('-').reverse().join('/');
                    }

                    return (
                      <div
                        key={i}
                        className="absolute text-[11px] font-bold text-gray-500 -translate-x-1/2"
                        style={{ left: `${(i / totalHours) * 100}%` }}
                      >
                        {label}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl bg-white p-4 border border-gray-200 border-dashed text-center">
              <Calendar className="h-6 w-6 text-gray-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-gray-500">Selecciona una placa e inicio de uso para ver su ocupación aquí.</p>
            </div>
          )
        )}

        {/* Formulario */}
        {showForm && (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl bg-white p-4 border border-gray-200 grid gap-4"
          >
            <div>
              <label className="text-sm font-medium text-gray-700">
                Camioneta disponible <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPlaca}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPlaca(val);
                  if (val) {
                    const veh: any = camionetasStore.inventario.find((v) => v.placa === val);
                    if (veh && veh.volanteInicio && veh.volanteFin) {
                      const datePart = usoInicioLocal.slice(0, 10);
                      setUsoInicioLocal(`${datePart}T${veh.volanteInicio}`);
                      setUsoFinLocal(`${datePart}T${veh.volanteFin}`);
                    }
                  }
                }}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                required
              >
                <option value="">— Selecciona una placa —</option>
                {placasDisponibles.map((p) => (
                  <option key={p} value={p}>
                    {metaDePlaca(p)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Inicio de uso <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={usoInicioLocal}
                    onChange={(e) => {
                      setUsoInicioLocal(e.target.value);
                    }}
                    className="w-full rounded-xl border border-gray-200 px-10 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Fin de uso <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={usoFinLocal}
                    onChange={(e) => {
                      setUsoFinLocal(e.target.value);
                    }}
                    className="w-full rounded-xl border border-gray-200 px-10 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  DNI Conductor <span className="text-red-500">*</span>
                </label>
                <input
                  inputMode="numeric"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D+/g, "").slice(0, 8);
                    setDni(v);
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
                {dniError && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {dniError}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Nombre Conductor <span className="text-red-500">*</span>
                </label>
                <input
                  value={nombre}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none bg-gray-100 cursor-not-allowed transition-colors"
                  placeholder="Se completará automáticamente"
                />
              </div>
            </div>

            {/* Nuevo campo CECO */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                CECO <span className="text-red-500">*</span>
              </label>
              <input
                inputMode="numeric"
                maxLength={10}
                value={ceco}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setCeco(val);
                  setCecoError(null);
                }}
                onBlur={validateCeco}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${cecoError ? "border-rose-300 focus:border-rose-500" : "border-gray-200 focus:border-gray-400"
                  }`}
                placeholder="Centro de Costo (Numérico)"
              />
              {cecoError && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{cecoError}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Origen <span className="text-red-500">*</span>
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
                  Destino <span className="text-red-500">*</span>
                </label>
                <select
                  value={destino}
                  onChange={(e) => {
                    setDestino(e.target.value);
                    if (e.target.value !== "Otros") setOtroDestino("");
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                  required
                >
                  <option value="">— Selecciona destino —</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.nombre}>
                      {s.nombre}
                    </option>
                  ))}
                  <option value="Otros">Otros</option>
                </select>
                {destino === "Otros" && (
                  <input
                    type="text"
                    value={otroDestino}
                    onChange={(e) => setOtroDestino(e.target.value)}
                    placeholder="Especifique el destino"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
                    required
                  />
                )}
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
              {!isPopup && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setMsg(null);
                    setSelectedPlaca("");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || checking || !selectedPlaca || msg?.type === "err" || !!cecoError}
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#cc0000] disabled:opacity-60 w-full md:w-auto justify-center"
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
        {!isPopup && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Tus tickets
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

                    const inicio = new Date(s.usoInicio.slice(0, 16));
                    const fin = new Date(s.usoFin.slice(0, 16));

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
                      ? new Date(entregaGaritaRaw.slice(0, 16))
                      : null;
                    const terminoUsoGarita = terminoUsoGaritaRaw
                      ? new Date(terminoUsoGaritaRaw.slice(0, 16))
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
        )}

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
    </div >
  );
}
