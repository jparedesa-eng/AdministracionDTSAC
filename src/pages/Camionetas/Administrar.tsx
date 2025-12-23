// src/pages/Camionetas/Administrar.tsx
import React from "react";
import { camionetasStore } from "../../store/camionetasStore";
import type { Solicitud, Vehiculo } from "../../store/camionetasStore";
import {
  Search,
  CheckCircle,
  RotateCcw,
  Truck,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Loader2,
} from "lucide-react";

// UI propios
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

/* =========================================================
 * Tipos locales / utilidades
 * ======================================================= */
type Tab = "Reservada" | "enUso" | "Cancelado" | "Cerrada";

/* =========================================================
 * Página: Administrar
 * ======================================================= */
export default function AdministrarSolicitudes() {
  // Toast global
  const [toast, setToast] = React.useState<ToastState>(null);

  // Estado de datos
  const [loading, setLoading] = React.useState(true);
  const [loadingMsg, setLoadingMsg] = React.useState<string | null>(null);

  // forzar re-render cuando el store cambie
  const [, setTick] = React.useState(0);
  const refresh = React.useCallback(() => setTick((x) => x + 1), []);

  // Filtros / tabs / paginación
  const [tab, setTab] = React.useState<Tab>("Reservada");
  const [qPlaca, setQPlaca] = React.useState("");
  const [qSol, setQSol] = React.useState("");
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;

  // Modal de confirmación
  const [confirm, setConfirm] = React.useState<{
    open: boolean;
    kind: "rechazar" | "devolucion" | null;
    payload?: { id?: string; placa?: string };
  }>({ open: false, kind: null });

  // Carga inicial desde Supabase
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLoadingMsg("Cargando solicitudes y flota…");
        await Promise.all([
          camionetasStore.syncInventario(),
          camionetasStore.syncSolicitudes(),
        ]);
        refresh();
      } catch (e: any) {
        console.error(e);
        const msg =
          e?.message ?? "Error al cargar las solicitudes desde el servidor.";
        setLoadingMsg(msg);
        setToast({ type: "error", message: msg });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const solicitudes: Solicitud[] = camionetasStore.solicitudes;
  const inventario: Vehiculo[] = camionetasStore.inventario;

  const asignadas = solicitudes.filter((s) => s.estado === "Reservada");
  const enUso = solicitudes.filter((s) => s.estado === "En uso");
  const canceladas = solicitudes.filter((s) => s.estado === "Cancelado");
  const cerradas = solicitudes.filter((s) => s.estado === "Cerrada");
  const disponiblesAll = inventario.filter((v) => v.estado === "Disponible");

  const filtro = (s: Solicitud) => {
    const placa = (s.vehiculo ?? "").toUpperCase();
    const nombre = (s.nombre ?? "").toUpperCase();
    const dni = (s.dni ?? "").toUpperCase();
    const fPlaca = qPlaca.trim().toUpperCase();
    const fSol = qSol.trim().toUpperCase();
    return (
      (!fPlaca || placa.includes(fPlaca)) &&
      (!fSol || nombre.includes(fSol) || dni.includes(fSol))
    );
  };

  const baseData =
    tab === "Reservada"
      ? asignadas
      : tab === "enUso"
        ? enUso
        : tab === "Cancelado"
          ? canceladas
          : cerradas;

  const data = baseData.filter(filtro);

  React.useEffect(() => {
    setPage(1);
  }, [qPlaca, qSol, tab]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageData = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pedirRechazo = (id: string) =>
    setConfirm({ open: true, kind: "rechazar", payload: { id } });

  const pedirDevolucion = (placa: string) =>
    setConfirm({ open: true, kind: "devolucion", payload: { placa } });

  const ejecutarConfirm = async () => {
    try {
      if (confirm.kind === "rechazar" && confirm.payload?.id) {
        await camionetasStore.rechazar(confirm.payload.id);
        setToast({
          type: "success",
          message: "Solicitud rechazada correctamente.",
        });
        refresh();
      }
      if (confirm.kind === "devolucion" && confirm.payload?.placa) {
        await camionetasStore.registrarDevolucion(confirm.payload.placa);
        setToast({
          type: "success",
          message: "Devolución registrada. La unidad quedó disponible.",
        });
        refresh();
      }
    } catch (e: any) {
      setToast({
        type: "error",
        message: e?.message ?? "Ocurrió un error al procesar la acción.",
      });
    }
  };

  // Píldoras de estado (modificado para aceptar Vencido)
  const pill = (label: string) => {
    const styles: Record<string, string> = {
      Reservada:
        "bg-emerald-50 text-emerald-800 ring-emerald-200 font-semibold",
      "En uso": "bg-sky-50 text-sky-800 ring-sky-200 font-semibold",
      Cancelado: "bg-rose-50 text-rose-800 ring-rose-200",
      Cerrada: "bg-slate-50 text-slate-800 ring-slate-200",
      Vencido: "bg-neutral-100 text-neutral-600 ring-neutral-200 font-semibold",
    };
    const cls = styles[label] ?? "bg-slate-50 text-slate-700 ring-slate-200";
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] ring-1 ${cls}`}
      >
        {label}
      </span>
    );
  };

  const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-full transition border ${active
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
        }`}
    >
      {children}
    </button>
  );

  const EstadoIcon: React.FC<{ estado: string }> = ({ estado }) =>
    estado === "En uso" ? (
      <Hourglass className="h-4 w-4" />
    ) : (
      <Truck className="h-4 w-4" />
    );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Encabezado */}
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Centro de control
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Administrar solicitudes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gestiona reservas, devoluciones y el uso de las camionetas con
              filtros por estado y búsqueda.
            </p>
          </div>
        </header>

        {/* Resumen (KPIs) */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {/* Reservadas */}
          <div className="rounded-2xl bg-white px-4 py-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reservadas
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {asignadas.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tickets con estado <span className="font-medium">Reservada</span>.
                </p>
              </div>
            </div>
          </div>

          {/* En uso */}
          <div className="rounded-2xl bg-white px-4 py-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                <Hourglass className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  En uso
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {enUso.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Unidades actualmente{" "}
                  <span className="font-medium">en circulación</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Inventario disponible */}
          <div className="rounded-2xl bg-white px-4 py-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Flota disponible
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {disponiblesAll.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Camionetas con estado{" "}
                  <span className="font-medium">Disponible</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de estados + filtros */}
        <div className="mb-6 rounded-2xl bg-white px-4 py-4 border border-gray-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={tab === "Reservada"}
                onClick={() => setTab("Reservada")}
              >
                Reservadas ({asignadas.length})
              </TabButton>
              <TabButton
                active={tab === "enUso"}
                onClick={() => setTab("enUso")}
              >
                En uso ({enUso.length})
              </TabButton>
              <TabButton
                active={tab === "Cancelado"}
                onClick={() => setTab("Cancelado")}
              >
                Canceladas ({canceladas.length})
              </TabButton>
              <TabButton
                active={tab === "Cerrada"}
                onClick={() => setTab("Cerrada")}
              >
                Cerradas ({cerradas.length})
              </TabButton>
            </div>

            {/* Filtros */}
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={qPlaca}
                  onChange={(e) => setQPlaca(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 px-9 py-2 text-sm outline-none focus:bg-white focus:border-gray-400 transition-colors"
                  placeholder="Filtrar por placa"
                />
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={qSol}
                  onChange={(e) => setQSol(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 px-9 py-2 text-sm outline-none focus:bg-white focus:border-gray-400 transition-colors"
                  placeholder="Filtrar por DNI o nombre"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setQPlaca("");
                  setQSol("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                title="Limpiar filtros"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 border border-gray-200 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span>{loadingMsg ?? "Cargando información…"}</span>
          </div>
        )}

        {/* Listado (10 por página) */}
        {!loading && (
          <div className="space-y-4">
            {pageData.map((s) => {
              const estadoLower = (s.estado ?? "").toString().toLowerCase();

              const now = new Date();
              const inicio = new Date(s.usoInicio);
              const fin = new Date(s.usoFin);
              const isVencido = !estadoLower.startsWith("cancel") && !estadoLower.startsWith("cerrada") && now > fin;

              let estadoDisplay: string = s.estado;
              if (isVencido) estadoDisplay = "Vencido";

              let accentBar = "bg-slate-300";
              let iconBg = "bg-slate-700";

              if (isVencido) {
                accentBar = "bg-neutral-400";
                iconBg = "bg-neutral-600";
              } else if (estadoLower.startsWith("reserv")) {
                accentBar = "bg-emerald-400";
                iconBg = "bg-emerald-600";
              } else if (estadoLower === "en uso") {
                accentBar = "bg-sky-400";
                iconBg = "bg-sky-600";
              } else if (estadoLower.startsWith("cancel")) {
                accentBar = "bg-rose-400";
                iconBg = "bg-rose-600";
              } else if (estadoLower === "cerrada") {
                accentBar = "bg-slate-400";
                iconBg = "bg-slate-600";
              }

              const creadoPorNombre =
                (s as any).creadoPorNombre ??
                (s as any).creado_por_nombre ??
                null;
              const creadoPorArea =
                (s as any).creadoPorArea ?? (s as any).creado_por_area ?? null;

              // Nuevos tiempos de garita (ya vienen mapeados en el store)
              const entregaGaritaRaw =
                (s as any).entregaGaritaAt ??
                (s as any).entrega_garita_at ??
                null;
              const terminoUsoGaritaRaw =
                (s as any).terminoUsoGaritaAt ??
                (s as any).termino_uso_garita_at ??
                null;

              const entregaGarita = entregaGaritaRaw
                ? new Date(entregaGaritaRaw)
                : null;
              const terminoUsoGarita = terminoUsoGaritaRaw
                ? new Date(terminoUsoGaritaRaw)
                : null;



              return (
                <div
                  key={s.id}
                  className="rounded-2xl bg-white px-5 py-4 border border-gray-200"
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),auto] md:items-stretch">
                    {/* Columna izquierda */}
                    <div className="flex gap-3">
                      {/* Barra lateral a toda la altura */}
                      <div
                        className={`w-1 self-stretch rounded-full ${accentBar}`}
                      />
                      <div className="flex-1 space-y-2">
                        {/* Línea 1: placa + estado */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white ${iconBg}`}
                            >
                              <EstadoIcon estado={s.estado} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {s.vehiculo ?? "Sin asignar"}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Ticket ID: {s.id}
                              </p>
                            </div>
                          </div>
                          <div>{pill(estadoDisplay)}</div>
                        </div>

                        {/* Línea 2: solicitante + creador */}
                        <div className="grid gap-1 text-[11px] text-slate-600 sm:grid-cols-2">
                          <div>
                            <span className="font-semibold text-slate-800">
                              Solicitante:&nbsp;
                            </span>
                            <span>
                              {s.nombre} ({s.dni})
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">
                              Registrado por:&nbsp;
                            </span>
                            {creadoPorNombre ? (
                              <span>
                                {creadoPorNombre}
                                {creadoPorArea && (
                                  <span className="text-slate-400">
                                    {" "}
                                    · {creadoPorArea}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                No disponible
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Línea 3: tiempos (uso + garita) */}
                        <div className="grid gap-2 text-[11px] text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <span className="font-semibold text-slate-800">
                              Uso programado:
                            </span>
                            <div>
                              {inicio.toLocaleDateString()} ·{" "}
                              {inicio.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              —{" "}
                              {fin.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>

                          {entregaGarita && (
                            <div>
                              <span className="font-semibold text-slate-800">
                                Entrega en garita:
                              </span>
                              <div>
                                {entregaGarita.toLocaleDateString()} ·{" "}
                                {entregaGarita.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          )}

                          {terminoUsoGarita && (
                            <div>
                              <span className="font-semibold text-slate-800">
                                Término uso en garita:
                              </span>
                              <div>
                                {terminoUsoGarita.toLocaleDateString()} ·{" "}
                                {terminoUsoGarita.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Columna derecha: acciones */}
                    <div className="flex items-end justify-end gap-2 md:items-center">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {((s.estado === "Pendiente" ||
                          s.estado === "Reservada") && !isVencido) && (
                            <button
                              type="button"
                              onClick={() => pedirRechazo(s.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                              title="Rechazar solicitud"
                            >
                              Rechazar
                            </button>
                          )}

                        {s.estado === "En uso" && s.vehiculo && (
                          <button
                            type="button"
                            onClick={() => pedirDevolucion(s.vehiculo!)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            title="Registrar devolución"
                          >
                            Devolución
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {pageData.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 border border-gray-200">
                No hay registros para los filtros seleccionados.
              </div>
            )}
          </div>
        )}

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Página <strong>{page}</strong> de{" "}
              <strong>{totalPages}</strong>
              <span className="text-slate-400">
                {" "}
                · Mostrando {pageData.length} de {data.length} registros
              </span>
            </span>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 border border-gray-200 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 border border-gray-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      <Modal
        open={confirm.open}
        title={
          confirm.kind === "rechazar"
            ? "Rechazar solicitud"
            : "Registrar devolución"
        }
        size="sm"
        onClose={() => setConfirm({ open: false, kind: null })}
      >
        <p className="text-sm text-slate-600">
          {confirm.kind === "rechazar"
            ? "¿Seguro que deseas rechazar esta solicitud? Esta acción liberará la camioneta."
            : "¿Confirmas registrar la devolución de la unidad? Se cerrará el ticket asociado."}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirm({ open: false, kind: null })}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              await ejecutarConfirm();
              setConfirm({ open: false, kind: null });
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold text-white ${confirm.kind === "rechazar"
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-slate-900 hover:bg-slate-800"
              }`}
          >
            {confirm.kind === "rechazar" ? "Rechazar" : "Confirmar"}
          </button>
        </div>
      </Modal>

      {/* Toast global */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
