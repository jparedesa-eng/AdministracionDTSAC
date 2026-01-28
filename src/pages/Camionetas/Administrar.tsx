// src/pages/Camionetas/Administrar.tsx
import React from "react";
import { camionetasStore } from "../../store/camionetasStore";
import type { Solicitud, Vehiculo } from "../../store/camionetasStore";
import {
  Search,
  CheckCircle,
  RotateCcw,
  Truck,
  Hourglass,
  Loader2,
  TriangleAlert,
} from "lucide-react";

// UI propios
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

/* =========================================================
 * Página: Administrar
 * ======================================================= */
export default function AdministrarSolicitudes() {
  // Toast global
  const [toast, setToast] = React.useState<ToastState>(null);

  // Estado de carga
  const [loading, setLoading] = React.useState(true);
  const [loadingMsg, setLoadingMsg] = React.useState<string | null>(null);

  // forzar re-render cuando el store cambie
  const [, setTick] = React.useState(0);
  const refresh = React.useCallback(() => setTick((x) => x + 1), []);

  // Filtros / tabs / paginación
  const [qPlaca, setQPlaca] = React.useState("");
  const [qSol, setQSol] = React.useState("");

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
        // Carga inicial
        await Promise.all([
          camionetasStore.syncInventario(),
          camionetasStore.syncSolicitudes(),
        ]);
        // Verificar vencidos (limpieza automática)
        await camionetasStore.verificarVencidos();
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

  /* =========================================================
   * Componente Tarjeta (Kanban Card) - Inner Component
   * ======================================================= */
  const TicketCard = ({
    s,
    isVencido,
    pedirRechazo,
    pedirDevolucion,
  }: {
    s: Solicitud;
    isVencido: boolean;
    pedirRechazo: (id: string) => void;
    pedirDevolucion: (placa: string) => void;
  }) => {
    const estadoLower = (s.estado ?? "").toString().toLowerCase();
    const inicio = new Date(s.usoInicio);
    const fin = new Date(s.usoFin);

    // Variables no usadas eliminadas para evitar lints

    // Card Colors based on state
    let borderClass = "border-gray-200 hover:border-gray-300";
    if (isVencido) borderClass = "border-neutral-200 hover:border-neutral-300";
    else if (estadoLower.startsWith("reserv"))
      borderClass = "border-emerald-200 hover:border-emerald-300";
    else if (estadoLower === "en uso")
      borderClass = "border-sky-200 hover:border-sky-300";

    return (
      <div
        className={`bg-white rounded-xl p-2.5 border ${borderClass} transition-all group`}
      >
        <div className="flex justify-between items-start mb-1.5">
          <span className="text-[9px] text-gray-400 font-mono">
            #{s.id.slice(0, 6)}
          </span>
          {isVencido && (
            <span className="px-1 py-px rounded text-[9px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
              Vencido
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          {estadoLower === "en uso" ? (
            <div className="p-1 rounded-md bg-sky-50 text-sky-600">
              <Hourglass className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <Truck className="h-3.5 w-3.5" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-gray-900 leading-tight">
              {s.vehiculo ?? "Sin Asignar"}
            </h4>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-2 text-[10px] space-y-1 mb-2 border border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500">Solicitante:</span>
            <span className="font-medium text-gray-800 truncate max-w-[100px]" title={s.nombre}>
              {s.nombre.split(" ")[0]} {s.nombre.split(" ")[1]?.charAt(0)}.
            </span>
          </div>
          <div className="pt-1 mt-1 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-500">Inicio:</span>
              <span className="font-mono text-gray-700">
                {inicio.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })} {inicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fin:</span>
              <span className="font-mono text-gray-700">
                {fin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-1.5 border-t border-gray-100 gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
          {((s.estado === "Pendiente" || s.estado === "Reservada") && !isVencido) && (
            <button
              onClick={() => pedirRechazo(s.id)}
              className="text-[9px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-colors"
            >
              Rechazar
            </button>
          )}
          {s.estado === "En uso" && s.vehiculo && (
            <button
              onClick={() => pedirDevolucion(s.vehiculo!)}
              className="text-[9px] font-bold text-sky-600 hover:text-sky-800 hover:bg-sky-50 px-1.5 py-0.5 rounded transition-colors"
            >
              Devolución
            </button>
          )}
          {isVencido && (
            <span className="text-[9px] text-gray-400 italic">Sin acciones</span>
          )}
        </div>

      </div>
    );
  };


  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* Encabezado + KPIs */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Administrar Solicitudes
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Centro de control de flota y reservas
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Reservadas</p>
                <p className="text-lg font-bold text-gray-900">{asignadas.length}</p>
              </div>
            </div>

            <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 flex items-center gap-3">
              <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                <Hourglass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">En uso</p>
                <p className="text-lg font-bold text-gray-900">{enUso.length}</p>
              </div>
            </div>

            <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Flota Disp.</p>
                <p className="text-lg font-bold text-gray-900">{disponiblesAll.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Filtros (Estilo Telefónica) - Sin Shadows */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 mb-4">
          <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">Tablero de Control</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                {asignadas.length + enUso.length} Activos
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Búsqueda */}
              <div className="relative flex-1 min-w-[300px]">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-slate-500 focus:border-slate-500 block w-full pl-10 p-2.5 outline-none transition-colors"
                  placeholder="Buscar ticket..."
                  value={qSol}
                  onChange={(e) => {
                    setQSol(e.target.value);
                    setQPlaca(e.target.value);
                  }}
                />
              </div>

              {(qSol || qPlaca) && (
                <button
                  onClick={() => { setQSol(""); setQPlaca(""); }}
                  className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors border border-gray-200"
                  title="Limpiar filtros"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 border border-gray-200 flex items-center gap-3 mb-6">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span>{loadingMsg ?? "Cargando información…"}</span>
          </div>
        )}

        {/* KANBAN BOARD + SECCIONES (Layout 60/40) */}
        {!loading && (
          <div className="grid grid-cols-1 xl:grid-cols-[60%_40%] gap-6 items-start">

            {/* COLUMNA IZQUIERDA (60%) - KANBAN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* RESERVADAS */}
              <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200">
                <div className="p-2 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-gray-50 rounded-t-2xl z-10">
                  <h3 className="font-bold text-gray-700 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    RESERVADAS
                  </h3>
                  <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-bold text-gray-600">
                    {asignadas.length}
                  </span>
                </div>

                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {asignadas.filter(filtro).map(s => (
                    <TicketCard
                      key={s.id}
                      s={s}
                      isVencido={false}
                      pedirRechazo={pedirRechazo}
                      pedirDevolucion={pedirDevolucion}
                    />
                  ))}
                  {asignadas.filter(filtro).length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs italic">
                      No hay reservas
                    </div>
                  )}
                </div>
              </div>

              {/* EN USO */}
              <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200">
                <div className="p-2 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-gray-50 rounded-t-2xl z-10">
                  <h3 className="font-bold text-gray-700 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    EN USO
                  </h3>
                  <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px] font-bold text-gray-600">
                    {enUso.length}
                  </span>
                </div>

                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {enUso.filter(filtro).map(s => {
                    const now = new Date();
                    const fin = new Date(s.usoFin);
                    const isVencido = now > fin;
                    return (
                      <TicketCard
                        key={s.id}
                        s={s}
                        isVencido={isVencido}
                        pedirRechazo={pedirRechazo}
                        pedirDevolucion={pedirDevolucion}
                      />
                    );
                  })}
                  {enUso.filter(filtro).length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs italic">
                      No hay unidades en uso
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA (40%) - INFO EXTRA */}
            <div className="flex flex-col gap-6">

              {/* SLOT 1: CAMIONETAS VOLANTE */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Camionetas Volante</h3>
                    <p className="text-[10px] text-gray-500">Unidades asignadas como reemplazo temporal</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {inventario.filter(v => v.volante === 'Si').map(v => (
                    <div key={v.placa} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                          {v.placa.slice(-2)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">{v.placa}</p>
                          <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{v.modelo}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                        Volante
                      </span>
                    </div>
                  ))}
                  {inventario.filter(v => v.volante === 'Si').length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-xs italic border border-dashed border-gray-200 rounded-lg">
                      No hay camionetas volante
                    </div>
                  )}
                </div>
              </div>

              {/* SLOT 2: RANKING USUARIOS (Max Tickets) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Ranking de Solicitantes</h3>
                    <p className="text-[10px] text-gray-500">Usuarios con mayor cantidad de tickets creados</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(
                    solicitudes.reduce((acc, curr) => {
                      const name = curr.nombre || "Desconocido";
                      acc[name] = (acc[name] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10) // Top 10
                    .map(([nombre, count], index) => (
                      <div key={nombre} className="flex items-center gap-3">
                        <div className={`
                             w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                             ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-500 border border-gray-100'}
                           `}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full ${index < 3 ? 'bg-slate-800' : 'bg-slate-300'}`}
                              style={{ width: `${Math.min(100, (count / (solicitudes.length || 1)) * 500)}%` }} // Escala visual simple
                            ></div>
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                            <p className="text-[10px] font-medium text-gray-700 truncate max-w-[150px]">{nombre}</p>
                            <span className="text-[10px] font-bold text-gray-900">{count} tickets</span>
                          </div>
                        </div>
                      </div>
                    ))}

                  {solicitudes.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-xs italic">
                      Sin datos suficientes
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Modal de confirmación Custom (Rechazar - Fondo Oscuro sin Blur, Modal Blanco/Rojo) */}
      {confirm.open && confirm.kind === "rechazar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 transform transition-all scale-100 bg-white">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="p-4 bg-rose-50 rounded-full mb-5">
                <TriangleAlert className="h-10 w-10 text-rose-600" strokeWidth={2.5} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">¿Rechazar solicitud?</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Esta acción es irreversible y liberará la camioneta para otras reservas. ¿Estás seguro?
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirm({ open: false, kind: null })}
                  className="flex-1 py-2.5 rounded-xl font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await ejecutarConfirm();
                    setConfirm({ open: false, kind: null });
                  }}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                >
                  Sí, Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación Estándar (Devolución) */}
      <Modal
        open={confirm.open && confirm.kind === "devolucion"}
        title="Registrar devolución"
        size="sm"
        onClose={() => setConfirm({ open: false, kind: null })}
      >
        <p className="text-sm text-slate-600">
          ¿Confirmas registrar la devolución de la unidad? Se cerrará el ticket asociado.
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
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </Modal>

      {/* Toast global */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
