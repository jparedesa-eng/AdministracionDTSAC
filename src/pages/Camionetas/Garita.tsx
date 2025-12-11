import React from "react";
import { Calendar, Car, Loader2 } from "lucide-react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { supabase } from "../../supabase/supabaseClient";
import { camionetasStore } from "../../store/camionetasStore";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";

type TicketRow = any; // luego puedes tiparlo con tu interfaz real

export default function Garita() {
  const [scanActive, setScanActive] = React.useState(false);
  const [ticketId, setTicketId] = React.useState<string | null>(null);
  const [ticket, setTicket] = React.useState<TicketRow | null>(null);
  const [loadingTicket, setLoadingTicket] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState>(null);

  // Modal de confirmación
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Leer ticket desde Supabase cuando tengo un ID
  const handleScanId = React.useCallback(
    async (id: string) => {
      if (!id) return;
      if (ticketId === id && ticket) return; // ya cargado

      setTicketId(id);
      setTicket(null);
      setLoadingTicket(true);

      try {
        const { data, error } = await supabase
          .from("solicitudes")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setTicket(null);
          setToast({
            type: "error",
            message: "No se encontró ningún ticket con ese código QR.",
          });
          return;
        }

        setTicket(data);
        setScanActive(false); // ya tengo un ticket, pauso escáner
      } catch (e: any) {
        console.error(e);
        setToast({
          type: "error",
          message: e?.message ?? "No se pudo leer la información del ticket.",
        });
      } finally {
        setLoadingTicket(false);
      }
    },
    [ticketId, ticket]
  );

  // Inicializar / destruir el escáner HTML5
  React.useEffect(() => {
    if (!scanActive) return;

    let scanner: Html5QrcodeScanner | null = null;

    try {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false // verbose off
      );

      scanner.render(
        (decodedText) => {
          // ✅ Éxito: obtuve texto del QR
          handleScanId(decodedText);
          // NO llamamos a scanner.clear() aquí explícitamente.
          // Al actualizar el estado (scanActive=false), el componente se desmonta
          // y el cleanup del effect se encargará de limpiar.
        },
        (_error) => {
          // Errores continuos de lectura (NotFoundException) -> se ignoran
        }
      );

      // Ocultar barra roja / header de html5-qrcode
      const hideStatus = () => {
        const statusSpan = document.querySelector(
          "#qr-reader__status_span, #html5qr-code-full-region__status_span"
        ) as HTMLElement | null;
        if (statusSpan) statusSpan.style.display = "none";

        const header = document.querySelector(
          "#qr-reader__header_message, #html5qr-code-full-region__header_message"
        ) as HTMLElement | null;
        if (header) header.style.display = "none";
      };
      setTimeout(hideStatus, 100);
    } catch (err) {
      console.error("Error iniciando Html5QrcodeScanner:", err);
      setToast({
        type: "error",
        message: "No se pudo iniciar la cámara para el escaneo.",
      });
    }

    return () => {
      if (scanner) {
        scanner
          .clear()
          .catch((err) => console.warn("Error al limpiar scanner (cleanup):", err));
      }
    };
  }, [scanActive, handleScanId]);

  const estadoActual = (ticket?.estado ?? "").toString();
  const estadoLower = estadoActual.toLowerCase();

  const puedePasarAEnUso = estadoActual === "Reservada";
  const puedePasarACerrada = estadoActual === "En uso";

  // Estados internos en BD
  const siguienteEstado = puedePasarAEnUso
    ? "En uso"
    : puedePasarACerrada
      ? "Cerrada"
      : null;

  // Etiqueta del botón para el guardia
  const etiquetaAccion = puedePasarAEnUso
    ? "Entregar camioneta"
    : puedePasarACerrada
      ? "Terminar uso"
      : "";

  // Aplica el cambio de estado (se llama al confirmar en el Modal)
  const aplicarCambioEstado = async () => {
    if (!ticket || !siguienteEstado) return;

    setUpdating(true);
    try {
      const ahoraISO = new Date().toISOString();

      const updates: any = { estado: siguienteEstado };

      // Campos extra de tiempo en garita
      if (puedePasarAEnUso) {
        updates.entrega_garita_at = ahoraISO;
      } else if (puedePasarACerrada) {
        updates.termino_uso_garita_at = ahoraISO;
      }

      const { error } = await supabase
        .from("solicitudes")
        .update(updates)
        .eq("id", ticket.id);

      if (error) throw error;

      setTicket((prev: any) => (prev ? { ...prev, ...updates } : prev));
      await camionetasStore.syncSolicitudes();

      setToast({
        type: "success",
        message: `Estado actualizado a "${siguienteEstado}".`,
      });

      // Después de entregar o terminar uso, volvemos al escáner y ocultamos la tarjeta
      setTicket(null);
      setTicketId(null);
      setScanActive(true);
    } catch (e: any) {
      console.error(e);
      setToast({
        type: "error",
        message: e?.message ?? "No se pudo actualizar el estado del ticket.",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Colores de estado
  let estadoDot = "bg-gray-400";
  let estadoPill = "bg-gray-100 text-gray-700 ring-gray-200";
  if (estadoLower.startsWith("reserv")) {
    estadoDot = "bg-emerald-500";
    estadoPill = "bg-emerald-50 text-emerald-800 ring-emerald-200";
  } else if (estadoLower === "en uso") {
    estadoDot = "bg-sky-500";
    estadoPill = "bg-sky-50 text-sky-800 ring-sky-200";
  } else if (estadoLower.startsWith("cerr")) {
    estadoDot = "bg-slate-500";
    estadoPill = "bg-slate-50 text-slate-800 ring-slate-200";
  } else if (estadoLower.startsWith("cancel")) {
    estadoDot = "bg-rose-500";
    estadoPill = "bg-rose-50 text-rose-800 ring-rose-200";
  }

  const fechaInicio = ticket?.uso_inicio || ticket?.usoInicio;
  const fechaFin = ticket?.uso_fin || ticket?.usoFin;

  const inicio = fechaInicio ? new Date(fechaInicio) : null;
  const fin = fechaFin ? new Date(fechaFin) : null;

  const entregaGarita =
    (ticket as any)?.entrega_garita_at &&
    new Date((ticket as any).entrega_garita_at);
  const terminoUsoGarita =
    (ticket as any)?.termino_uso_garita_at &&
    new Date((ticket as any).termino_uso_garita_at);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Título */}
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Control de garita
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Escanea el QR del ticket para validar y cambiar su estado.
          </p>
        </header>

        {/* Bloque escáner */}
        {!scanActive && !ticket && !loadingTicket && (
          <section className="mb-4 flex min-h-[350px] items-center justify-center rounded-2xl bg-white p-8 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setScanActive(true);
                setTicket(null);
                setTicketId(null);
              }}
              className="flex w-full max-w-xs flex-col items-center justify-center gap-3 rounded-xl bg-emerald-600 px-10 py-8 shadow-lg transition-all hover:bg-emerald-700 hover:shadow-xl active:scale-95"
            >
              <Calendar className="h-16 w-16 text-white" />
              <span className="text-2xl font-bold text-white">Escanear QR</span>
              <span className="text-sm text-emerald-50">Toca para activar la cámara</span>
            </button>
          </section>
        )}

        {scanActive && (
          <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-900 text-white">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Escáner de tickets
                  </p>
                  <p className="text-xs text-gray-500">
                    Apunta la cámara al código QR.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setScanActive(false);
                }}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl bg-black/80">
              {/* html5-qrcode monta aquí el video */}
              <div id="qr-reader" className="min-h-[450px] w-full" />
            </div>
          </section>
        )}

        {loadingTicket && (
          <section className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Cargando información del ticket…</p>
            </div>
          </section>
        )}

        {/* Datos del ticket */}
        {ticket && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {/* Icono grande y Estado */}
              <div className="mb-4 flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <Car className="h-8 w-8" />
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${estadoPill}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${estadoDot}`} />
                  {estadoActual || "—"}
                </span>
              </div>

              {/* Info Vehículo */}
              <div className="mb-6 space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                  {ticket.vehiculo ?? "—"}
                </h2>
                {ticket.origen && ticket.destino && (
                  <p className="inline-flex items-center rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700 ring-1 ring-gray-100">
                    {ticket.origen} <span className="mx-2 text-gray-400">→</span> {ticket.destino}
                  </p>
                )}
              </div>

              {/* Info Conductor (Más grande) */}
              <div className="mb-6 w-full rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Conductor Autorizado
                </p>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-gray-900">
                    {ticket.nombre || "Sin nombre"}
                  </p>
                  <p className="text-lg font-medium text-gray-600">
                    DNI: {ticket.dni || "—"}
                  </p>
                </div>
              </div>

              {/* Tiempos */}
              <div className="w-full space-y-2 border-t border-dashed border-gray-200 pt-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="font-medium">Inicio:</span>
                  <span>{inicio ? inicio.toLocaleString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Fin:</span>
                  <span>{fin ? fin.toLocaleString() : "—"}</span>
                </div>
                {entregaGarita && (
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-medium">Entregada:</span>
                    <span>{entregaGarita.toLocaleString()}</span>
                  </div>
                )}
                {terminoUsoGarita && (
                  <div className="flex justify-between text-sky-700">
                    <span className="font-medium">Término:</span>
                    <span>{terminoUsoGarita.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="mt-8 w-full space-y-3">
                {siguienteEstado ? (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={updating}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-4 text-base font-bold text-white shadow-lg transition-all active:scale-95 ${puedePasarAEnUso
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                      : "bg-sky-600 hover:bg-sky-700 shadow-sky-200"
                      } disabled:opacity-60 disabled:shadow-none`}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      etiquetaAccion
                    )}
                  </button>
                ) : (
                  <div className="rounded-lg bg-gray-100 p-3">
                    <p className="text-sm font-medium text-gray-500">
                      Ticket en estado final o no modificable
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setTicket(null);
                    setTicketId(null);
                    setScanActive(true);
                  }}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95"
                >
                  Escanear otro ticket
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Modal de confirmación */}
        <Modal
          open={confirmOpen}
          title="Confirmar acción"
          onClose={() => {
            if (!updating) setConfirmOpen(false);
          }}
          size="sm"
        >
          <div className="text-center">
            <p className="text-base text-gray-600">
              ¿Confirmas que deseas <span className="font-bold text-gray-900">{etiquetaAccion.toLowerCase()}</span>?
            </p>
            <div className="mt-2 rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">{ticket?.vehiculo}</p>
              <p className="text-xs text-gray-500">{ticket?.nombre}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={updating}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={async () => {
                setConfirmOpen(false);
                await aplicarCambioEstado();
              }}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              {updating ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Confirmar"}
            </button>
          </div>
        </Modal>

        {/* Toast global */}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </div>
  );
}
