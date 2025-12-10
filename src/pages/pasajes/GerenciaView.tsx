// src/pages/pasajes/GerenciaView.tsx

import { useEffect, useMemo, useState } from "react";
import {
  aprobarCosto,
  seleccionarPropuestasGerencia,
  getPropuestaSeleccion,
  getState,
  subscribe,
  loadSolicitudes,
  type EstadoSolicitud,
  type Solicitud,
} from "../../store/pasajeStore";
import {
  ClipboardList,
  CalendarDays,
  Plane,
  Hotel,
  BadgeCheck,
  XCircle,
  Filter,
  Eye,
  EyeOff,
  Files,
  Bus,
} from "lucide-react";

import { Modal } from "../../components/ui/Modal";
import { PropuestasModal } from "../../components/propuestas/PropuestasModal";
import { Toast } from "../../components/ui/Toast";
import type { ToastType, ToastState } from "../../components/ui/Toast";

/* ---------------------------
   Utils
--------------------------- */
function EmptyHint() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center text-slate-600">
        <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
          <ClipboardList className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold">
          No hay registros en el rango seleccionado
        </h3>
        <p className="text-sm">Ajusta el rango y presiona “Aplicar”.</p>
      </div>
    </div>
  );
}

function fmt(dt?: Date | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${dd}/${mm}/${yyyy} ${time}`;
}

function dateToInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseInputDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function ticketDate(s: Solicitud): Date {
  if (s.tipo === "Pasaje") return new Date(s.salida ?? s.creado);
  return new Date(s.inicio ?? s.creado);
}

/** Intenta resolver la gerencia del usuario desde window o localStorage */
function getUserGerencia(): string | null {
  const w: any = typeof window !== "undefined" ? window : {};
  const fromWin =
    w?.authProfile?.gerencia ||
    w?.profile?.gerencia ||
    w?.DANPER_PROFILE?.gerencia;
  if (fromWin && typeof fromWin === "string") return fromWin;
  try {
    const ls =
      localStorage.getItem("profile.gerencia") ||
      localStorage.getItem("user.gerencia");
    if (ls && typeof ls === "string") return ls;
  } catch {
    // ignore
  }
  return null;
}

/* ---------------------------
   Flujo / MiniProgress
--------------------------- */

const STATUS_STEPS: EstadoSolicitud[] = [
  "Pendiente",
  "En proceso",
  "Costo aprobado",
  "Con pase",
  "Facturado",
  "Cerrado",
];

function getStageIndexFromEstado(estado: EstadoSolicitud): number {
  const idx = STATUS_STEPS.indexOf(estado);
  return idx === -1 ? 0 : idx;
}

function getStatusLabel(estado: EstadoSolicitud): string {
  return estado;
}

function getStatusMeta(estado: EstadoSolicitud) {
  switch (estado) {
    case "Pendiente":
      return { bar: "bg-amber-500", text: "text-amber-700" };
    case "En proceso":
      return { bar: "bg-sky-500", text: "text-sky-700" };
    case "Costo aprobado":
      return { bar: "bg-emerald-600", text: "text-emerald-700" };
    case "Con pase":
      return { bar: "bg-indigo-600", text: "text-indigo-700" };
    case "Facturado":
      return { bar: "bg-violet-600", text: "text-violet-700" };
    case "Cerrado":
      return { bar: "bg-slate-600", text: "text-slate-700" };
    default:
      return { bar: "bg-slate-400", text: "text-slate-700" };
  }
}

function MiniProgress({ estado }: { estado: EstadoSolicitud }) {
  const idx = getStageIndexFromEstado(estado);
  const total = STATUS_STEPS.length;
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
          className="absolute h-3 w-3 rounded-full border border-slate-300 bg-white shadow-sm"
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
   Tipos UI
--------------------------- */
type EstadoFiltro =
  | "pendAprob"
  | "todos"
  | "aprobados"
  | "rechazados"
  | "cerrados"
  | "conFactura"
  | "sinCosto";


/* ---------------------------
   Helpers de negocio
--------------------------- */

function tieneCosto(s: Solicitud): boolean {
  return s.costo != null && s.costo > 0;
}

function esPasajeAereo(s: Solicitud): boolean {
  return s.tipo === "Pasaje" && s.subtipo === "Aéreo";
}

function pendienteAprobacionGerencia(s: Solicitud): boolean {
  // 🔹 Ahora: Gerencia aprueba APENAS se crea el ticket (no importa el costo)
  // Solo aplica a pasaje terrestre y hospedaje.
  // PARA AÉREO: Se considera pendiente si no ha seleccionado propuesta.
  if (esPasajeAereo(s)) {
    const seleccion = getPropuestaSeleccion(s.id);
    return (
      s.estado !== "Cerrado" &&
      s.estado !== "Rechazado" &&
      !seleccion?.propuestaIdaGerencia &&
      !seleccion?.propuestaVueltaGerencia && // Falta selección
      !s.paseCompra // Aún no tiene pase final
    );
  }

  return (
    !esPasajeAereo(s) &&      // no aéreo
    s.estado === "Pendiente" && // recién creado / sin visto bueno
    !s.factura                // por seguridad (no debería tener)
  );
}

/* ---------------------------
   Vista principal
--------------------------- */
export default function GerenciaView() {
  // re-render al cambiar el store de solicitudes
  const [, force] = useState(0);
  useEffect(() => {
    // Load solicitudes on mount
    loadSolicitudes().catch((err) => {
      console.error("Error loading solicitudes", err);
    });

    // Subscribe to changes
    const unsubscribe = subscribe(() => {
      force((x) => x + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Toast global
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  // Defaults rango: hoy -> +30 días (1 mes)
  const today = useMemo(() => new Date(), []);
  const plus30 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  const [fromInput, setFromInput] = useState<string>(dateToInput(today));
  const [toInput, setToInput] = useState<string>(dateToInput(plus30));
  const [range, setRange] = useState<{ from: Date; to: Date }>(() => ({
    from: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    ),
    to: new Date(
      plus30.getFullYear(),
      plus30.getMonth(),
      plus30.getDate(),
      23,
      59,
      59,
      999
    ),
  }));

  const aplicarRango = () => {
    const f = parseInputDate(fromInput);
    const t = parseInputDate(toInput);
    if (!f || !t || f > t) {
      showToast(
        "error",
        "Rango inválido. Verifica las fechas (desde ≤ hasta)."
      );
      return;
    }
    const from = new Date(
      f.getFullYear(),
      f.getMonth(),
      f.getDate(),
      0,
      0,
      0,
      0
    );
    const to = new Date(
      t.getFullYear(),
      t.getMonth(),
      t.getDate(),
      23,
      59,
      59,
      999
    );
    setRange({ from, to });
  };

  // Filtro por estado
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("pendAprob");

  // Filtro “Solo mi gerencia”
  const myGerencia = getUserGerencia();
  const [soloMiGerencia, setSoloMiGerencia] = useState<boolean>(!!myGerencia);

  // Tomamos siempre el estado actual del store
  const solicitudes = getState().solicitudes;

  // Base: filtro por rango y gerencia (sin useMemo)
  const base: Solicitud[] = [...solicitudes]
    .filter((s) => {
      const d = ticketDate(s);
      return d >= range.from && d <= range.to;
    })
    .filter((s) => {
      if (!soloMiGerencia || !myGerencia) return true;
      return (s.gerencia || "").toLowerCase() === myGerencia.toLowerCase();
    })
    .sort((a, b) => +ticketDate(a) - +ticketDate(b));

  // Filtro de estado (sin useMemo)
  const filtered: Solicitud[] = (() => {
    switch (estadoFiltro) {
      case "pendAprob":
        return base.filter((s) => pendienteAprobacionGerencia(s));
      case "aprobados":
        return base.filter((s) => s.costoAprobado === true);
      case "rechazados":
        return base.filter((s) => s.costoAprobado === false);
      case "cerrados":
        return base.filter((s) => s.estado === "Cerrado");
      case "conFactura":
        return base.filter((s) => !!s.factura);
      case "sinCosto":
        return base.filter(
          (s) =>
            s.estado !== "Cerrado" && !tieneCosto(s) && !esPasajeAereo(s)
        );
      case "todos":
      default:
        return base;
    }
  })();

  // Paginación
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [estadoFiltro, range, soloMiGerencia]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const current = filtered.slice(start, start + PAGE_SIZE);

  // Condición para aprobar / rechazar costo (no aplica a pasajes aéreos)
  const puedeAprobarRechazar = (s: Solicitud) => {
    const cerrado = s.estado === "Cerrado";
    const tieneFactura = !!s.factura;

    // 🔹 Habilita los botones inmediatamente después de creado:
    // - No aéreo
    // - Estado Pendiente
    // - No cerrado / no facturado
    return (
      !esPasajeAereo(s) &&
      s.estado === "Pendiente" &&
      !cerrado &&
      !tieneFactura
    );
  };


  /* ---------------------------
     Estado del modal de confirmación
  --------------------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"approve" | "reject">(
    "approve"
  );
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);
  const [confirmName, setConfirmName] = useState<string>("");

  const askConfirm = (
    kind: "approve" | "reject",
    idx: number,
    label: string
  ) => {
    setConfirmKind(kind);
    setConfirmIdx(idx);
    setConfirmName(label);
    setConfirmOpen(true);
  };

  const handleConfirmAccion = async () => {
    if (confirmIdx == null) return;

    const ok = await aprobarCosto(confirmIdx, confirmKind === "approve");

    setConfirmOpen(false);
    setConfirmIdx(null);

    if (!ok) {
      showToast(
        "error",
        "No se pudo actualizar el costo. Verifica el estado del ticket."
      );
      return;
    }

    showToast(
      "success",
      confirmKind === "approve"
        ? "Costo aprobado correctamente."
        : "Costo rechazado correctamente."
    );
  };

  /* ---------------------------
     Modal Selección Propuesta (Aéreo)
  --------------------------- */
  const [selPropSolicitudId, setSelPropSolicitudId] = useState<string | null>(
    null
  );

  // Nuevo estado para la confirmación de selección de propuesta
  const [selPropConfirm, setSelPropConfirm] = useState<{
    open: boolean;
    solicitudId: string | null;
    idaId: number | null;
    vueltaId: number | null;
  }>({ open: false, solicitudId: null, idaId: null, vueltaId: null });

  // 1. Al hacer clic en "Seleccionar" en el modal
  const handleSelectPropuestaRequest = (idaId: number | null, vueltaId: number | null) => {
    // Abrir confirmación guardando también el solicitudId
    setSelPropConfirm({ open: true, solicitudId: selPropSolicitudId, idaId, vueltaId });
  };

  // 2. Al confirmar en el segundo modal
  const confirmSelectPropuesta = async () => {
    console.log("🔵 confirmSelectPropuesta iniciado");
    const { solicitudId, idaId, vueltaId } = selPropConfirm;
    console.log("🔵 IDs:", { solicitudId, idaId, vueltaId });

    if (!solicitudId) {
      console.log("❌ No hay solicitudId en selPropConfirm");
      return;
    }

    // Validar que al menos una propuesta esté seleccionada
    if (!idaId && !vueltaId) {
      console.log("❌ No hay IDA ni VUELTA seleccionadas");
      showToast("error", "Debes seleccionar al menos una propuesta (IDA o VUELTA).");
      return;
    }

    try {
      console.log("🔵 Llamando a seleccionarPropuestasGerencia...");
      const ok = await seleccionarPropuestasGerencia(solicitudId, idaId, vueltaId);
      console.log("🔵 Resultado:", ok);

      if (ok) {
        console.log("✅ Selección exitosa");
        showToast("success", "Propuesta seleccionada correctamente.");
        setSelPropConfirm({ open: false, solicitudId: null, idaId: null, vueltaId: null });
        setSelPropSolicitudId(null); // Cerrar también el modal de propuestas
      } else {
        console.log("❌ seleccionarPropuestasGerencia retornó false");
        showToast("error", "Error al seleccionar propuesta.");
      }
    } catch (error) {
      console.error("❌ Error en confirmSelectPropuesta:", error);
      showToast("error", "Error al seleccionar propuesta: " + error);
    }
  };

  const currentSolicitudForModal = useMemo(
    () => solicitudes.find((s) => s.id === selPropSolicitudId),
    [solicitudes, selPropSolicitudId]
  );


  /* ---------------------------
     Expandir / colapsar detalle por ticket
  --------------------------- */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  };

  /* ---------------------------
     Pagination UI
  --------------------------- */
  const Pagination = () => {
    if (filtered.length === 0) return null;
    const go = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

    const build = () => {
      const pages: (number | "dots")[] = [];
      const max = totalPages;
      const window = 1;
      pages.push(1);
      if (page - window > 2) pages.push("dots");
      for (
        let p = Math.max(2, page - window);
        p <= Math.min(max - 1, page + window);
        p++
      ) {
        pages.push(p);
      }
      if (page + window < max - 1) pages.push("dots");
      if (max > 1) pages.push(max);
      return pages;
    };

    return (
      <nav className="flex items-center justify-between gap-2 py-3 text-sm text-gray-600">
        <div>
          Página <span className="font-medium">{page}</span> de{" "}
          <span className="font-medium">{totalPages}</span>
        </div>
        <ul className="inline-flex items-center overflow-hidden rounded-lg border bg-white">
          <li>
            <button
              type="button"
              onClick={() => go(page - 1)}
              disabled={page <= 1}
              className="flex h-9 items-center gap-2 px-3 disabled:opacity-50 hover:bg-gray-50"
              aria-label="Anterior"
            >
              ‹ Anterior
            </button>
          </li>
          {build().map((it, idx) =>
            it === "dots" ? (
              <li
                key={`dots-${idx}`}
                className="px-3 text-gray-400 select-none"
              >
                …
              </li>
            ) : (
              <li key={it}>
                <button
                  type="button"
                  onClick={() => go(it)}
                  className={[
                    "h-9 px-3 hover:bg-gray-50",
                    it === page
                      ? "bg-gray-900 text-white hover:bg-gray-900"
                      : "",
                  ].join(" ")}
                  aria-current={it === page ? "page" : undefined}
                >
                  {it}
                </button>
              </li>
            )
          )}
          <li>
            <button
              type="button"
              onClick={() => go(page + 1)}
              disabled={page >= totalPages}
              className="flex h-9 items-center gap-2 px-3 disabled:opacity-50 hover:bg-gray-50"
              aria-label="Siguiente"
            >
              Siguiente ›
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  /* ---------------------------
     Render
  --------------------------- */
  return (
    <>
      <div className="space-y-5">
        {/* Título y subtítulo */}
        <div className="px-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Panel de Gerencia
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Visualiza el <b>flujo completo</b> de tickets y gestiona la
            aprobación de costos para pasajes terrestres y hospedajes. Por
            defecto se muestran los <b>pendientes de aprobación</b> dentro del
            rango y tu gerencia.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Los pasajes aéreos se manejarán mediante{" "}
            <b>propuestas del proveedor</b>. En esta vista solo se aprueban
            costos directos (no aéreos).
          </p>
        </div>

        {/* Filtros */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-500">
            <Filter className="h-4 w-4" />
            Filtros
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            {/* Rango */}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Desde
              </span>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  className="w-full rounded-lg border bg-white px-9 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Hasta
              </span>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  className="w-full rounded-lg border bg-white px-9 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                />
              </div>
            </label>

            {/* Estado */}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Estado
              </span>
              <select
                value={estadoFiltro}
                onChange={(e) =>
                  setEstadoFiltro(e.target.value as EstadoFiltro)
                }
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              >
                <option value="pendAprob">
                  Pend. aprobación (por defecto)
                </option>
                <option value="todos">Todos</option>
                <option value="aprobados">Aprobados</option>
                <option value="rechazados">Rechazados</option>
                <option value="cerrados">Cerrados</option>
                <option value="conFactura">Con factura</option>
                <option value="sinCosto">Sin costo (no aéreo)</option>
              </select>
            </label>

            {/* Aplicar */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={aplicarRango}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* Solo mi gerencia */}
          <div className="mt-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={soloMiGerencia}
                onChange={(e) => setSoloMiGerencia(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
              />
              <span>
                Solo mi gerencia {myGerencia ? `(${myGerencia})` : ""}
              </span>
            </label>
          </div>
        </section>

        {/* Lista */}
        {current.length === 0 ? (
          <EmptyHint />
        ) : (
          <>
            <div className="space-y-3">
              {current.map((s) => {
                const idx = solicitudes.indexOf(s);
                const proveedorAsignado = !!s.proveedor;
                const isPasaje = s.tipo === "Pasaje";
                const isAereo = isPasaje && s.subtipo === "Aéreo";
                let icon = <Hotel className="h-4 w-4" />;

                if (isPasaje) {
                  if (isAereo) icon = <Plane className="h-4 w-4" />;
                  else icon = <Bus className="h-4 w-4" />;
                }

                const canAct = puedeAprobarRechazar(s);
                const isExpanded = expanded[s.id] ?? false;
                const meta = getStatusMeta(s.estado as EstadoSolicitud);
                const tieneCostoAsignado = tieneCosto(s);

                return (
                  <article
                    key={s.id}
                    className="relative overflow-hidden rounded-2xl bg-white p-4 pl-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-lg"
                  >
                    {/* barra lateral según estado */}
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
                            {s.nombre} ({s.dni})
                          </h3>
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                            ID: {s.id}
                          </span>
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {isPasaje
                            ? s.subtipo === "Aéreo"
                              ? "Solicitud de Pasaje Aéreo"
                              : "Solicitud de Pasaje Terrestre"
                            : "Solicitud de Hospedaje"}{" "}
                          · {fmt(ticketDate(s))} · {s.gerencia || "Sin gerencia"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {proveedorAsignado && (
                          <span className="hidden rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 sm:inline">
                            Proveedor asignado
                          </span>
                        )}

                        {tieneCostoAsignado && !esPasajeAereo(s) && (
                          <span className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline">
                            Costo cargado
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleExpanded(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                          title={
                            isExpanded ? "Ocultar detalle" : "Ver detalle"
                          }
                        >
                          {isExpanded ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          {isExpanded ? "Ocultar" : "Ver"}
                        </button>
                      </div>
                    </div>

                    {/* Línea con MiniProgress + acciones */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <MiniProgress estado={s.estado as EstadoSolicitud} />

                      <div className="flex flex-wrap gap-2">
                        {/* Para pasajes aéreos: Ver propuestas */}
                        {esPasajeAereo(s) && (
                          <button
                            onClick={() => setSelPropSolicitudId(s.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Files className="h-4 w-4" />
                            {(() => {
                              const seleccion = getPropuestaSeleccion(s.id);
                              return (seleccion?.propuestaIdaGerencia || seleccion?.propuestaVueltaGerencia)
                                ? "Ver selección"
                                : "Ver propuestas";
                            })()}
                          </button>
                        )}

                        {/* Para pasajes NO aéreos: Aprobar / Rechazar costo */}
                        {!esPasajeAereo(s) && (
                          <>
                            <button
                              disabled={!canAct}
                              onClick={() =>
                                askConfirm(
                                  "reject",
                                  idx,
                                  `${s.nombre} (${s.dni}) — ${s.proveedor ?? "Sin proveedor"
                                  }`
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              title="Rechazar costo"
                            >
                              <XCircle className="h-4 w-4" />
                              Rechazar
                            </button>
                            <button
                              disabled={!canAct}
                              onClick={() =>
                                askConfirm(
                                  "approve",
                                  idx,
                                  `${s.nombre} (${s.dni}) — ${s.proveedor ?? "Sin proveedor"
                                  }`
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                              title="Aprobar costo"
                            >
                              <BadgeCheck className="h-4 w-4" />
                              Aprobar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Detalle colapsable */}
                    {isExpanded && (
                      <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 text-sm lg:grid-cols-3">
                        <div className="space-y-1">
                          <div>
                            <b>Proveedor:</b> {s.proveedor ?? "—"}
                          </div>
                          <div>
                            <b>Costo:</b>{" "}
                            {s.costo != null ? s.costo.toFixed(2) : "—"}
                          </div>
                          <div>
                            <b>Pase compra:</b> {s.paseCompra ? "Sí" : "No"}
                          </div>
                          <div>
                            <b>Factura:</b> {s.factura ?? "—"}
                          </div>
                        </div>

                        <div className="space-y-1">
                          {isPasaje ? (
                            <>
                              <div>
                                <b>Subtipo:</b> {s.subtipo ?? "—"}
                              </div>
                              <div>
                                <b>Salida:</b> {fmt(s.salida)}
                              </div>
                              <div>
                                <b>Retorno:</b> {fmt(s.retorno)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <b>Lugar:</b> {s.lugar ?? "—"}
                              </div>
                              <div>
                                <b>Inicio:</b> {fmt(s.inicio)}
                              </div>
                              <div>
                                <b>Fin:</b> {fmt(s.fin)}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div>
                            <b>Motivo:</b>{" "}
                            <span className="text-slate-600">
                              {s.motivo || "—"}
                            </span>
                          </div>
                          <div>
                            <b>Creado:</b> {fmt(s.creado)}
                          </div>
                          <div>
                            <b>Estado actual:</b>{" "}
                            <span className="font-medium text-slate-800">
                              {s.estado}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Paginación */}
            <Pagination />
          </>
        )}
      </div>

      {/* MODAL CONFIRMACIÓN APROBAR / RECHAZAR */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={
          confirmKind === "approve"
            ? "Confirmar aprobación de costo"
            : "Confirmar rechazo de costo"
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 whitespace-pre-line">
            {confirmKind === "approve"
              ? "¿Deseas APROBAR el costo de este ticket?"
              : "¿Deseas RECHAZAR el costo de este ticket?"}
            {confirmName && (
              <span className="mt-2 block text-xs text-slate-500">
                {confirmName}
              </span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmAccion}
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white ${confirmKind === "approve"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
                }`}
            >
              {confirmKind === "approve" ? "Sí, aprobar" : "Sí, rechazar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL SELECCIÓN PROPUESTA (Shared) */}
      {selPropSolicitudId && (
        <PropuestasModal
          open={!!selPropSolicitudId}
          onClose={() => setSelPropSolicitudId(null)}
          solicitudId={selPropSolicitudId}
          showGerenciaSelection={true}
          showAdminSelection={true}
          onSelect={
            (() => {
              if (!currentSolicitudForModal) return undefined;
              const seleccion = getPropuestaSeleccion(currentSolicitudForModal.id);
              return (seleccion?.propuestaIdaAdmin || seleccion?.propuestaVueltaAdmin)
                ? undefined
                : handleSelectPropuestaRequest;
            })()
          }
        />
      )}

      {/* MODAL CONFIRMACIÓN SELECCIÓN PROPUESTA */}
      <Modal
        open={selPropConfirm.open}
        onClose={() => setSelPropConfirm({ open: false, solicitudId: null, idaId: null, vueltaId: null })}
        title="Confirmar selección"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de seleccionar{" "}
            {selPropConfirm.idaId && selPropConfirm.vueltaId ? (
              <>
                la opción <b>#{selPropConfirm.idaId}</b> (IDA) y{" "}
                <b>#{selPropConfirm.vueltaId}</b> (VUELTA)
              </>
            ) : selPropConfirm.idaId ? (
              <>
                la opción <b>#{selPropConfirm.idaId}</b> (IDA)
              </>
            ) : (
              <>
                la opción <b>#{selPropConfirm.vueltaId}</b> (VUELTA)
              </>
            )}? Esta acción registrará tu elección en el sistema.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setSelPropConfirm({ open: false, solicitudId: null, idaId: null, vueltaId: null })}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmSelectPropuesta}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      {/* TOAST GLOBAL */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
