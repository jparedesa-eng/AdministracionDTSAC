// src/pages/Camionetas/Garita.tsx
import React from "react";
import { Calendar, Car, Loader2 } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../../supabase/supabaseClient";
import { camionetasStore } from "../../store/camionetasStore";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";

type TicketRow = any; // luego puedes tiparlo con tu interfaz real

export default function Garita() {
  const [scanActive, setScanActive] = React.useState(true);
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
        },
        false // verbose off
      );

      scanner.render(
        (decodedText) => {
          // ✅ Éxito: obtuve texto del QR
          handleScanId(decodedText);
          // Detengo el escáner para que no siga leyendo
          scanner
            ?.clear()
            .then(() => {
              scanner = null;
            })
            .catch((err) => console.error("Error limpiando scanner:", err));
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
          .then(() => {
            scanner = null;
          })
          .catch((err) => console.error("Error al limpiar scanner:", err));
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setScanActive((prev) => !prev);
                  if (!scanActive) {
                    // al reactivar, permito escanear otro
                    setTicket(null);
                    setTicketId(null);
                  }
                }}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                {scanActive ? "Pausar" : "Escanear"}
              </button>

              {/* Botón de prueba (puedes quitarlo en producción) */}
              <button
                type="button"
                onClick={() =>
                  handleScanId("fc2e3608-2480-4f73-ae42-33acd4c26da0")
                }
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Probar ticket demo
              </button>
            </div>
          </div>

          {scanActive && (
            <div className="overflow-hidden rounded-2xl bg-black/80">
              {/* html5-qrcode monta aquí el video */}
              <div id="qr-reader" className="aspect-square w-full" />
            </div>
          )}

          {!scanActive && !ticket && !loadingTicket && (
            <p className="mt-3 text-xs text-gray-500">
              Escaneo pausado. Pulsa <strong>Escanear</strong> para leer un QR.
            </p>
          )}

          {loadingTicket && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando información del ticket…
            </div>
          )}
        </section>

        {/* Datos del ticket */}
        {ticket && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            {/* Cabecera placa + estado */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-700 text-white">
                <Car className="h-5 w-5" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {ticket.vehiculo ?? "—"}
                    </p>
                    {ticket.origen && ticket.destino && (
                      <p className="mt-0.5 inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 ring-1 ring-gray-100">
                        {ticket.origen}
                        <span className="mx-1 text-gray-400">→</span>
                        {ticket.destino}
                      </p>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${estadoPill}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${estadoDot}`} />
                    {estadoActual || "—"}
                  </span>
                </div>

                {ticket.nombre && (
                  <p className="text-[11px] text-gray-600">
                    Conductor{" "}
                    <span className="font-semibold text-gray-800">
                      {ticket.nombre}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Horario planificado + tiempos en garita */}
            <div className="mt-3 border-t border-dashed border-gray-200 pt-2 text-[11px] text-gray-600">
              <p className="mb-0.5 font-semibold text-gray-800">
                Fecha y horario de uso
              </p>
              {inicio && fin ? (
                <p>
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
                </p>
              ) : (
                <p>—</p>
              )}

              {entregaGarita && (
                <p className="mt-1">
                  <span className="font-semibold">Entregada en garita:</span>{" "}
                  {entregaGarita.toLocaleDateString()} ·{" "}
                  {entregaGarita.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {terminoUsoGarita && (
                <p className="mt-0.5">
                  <span className="font-semibold">Término de uso:</span>{" "}
                  {terminoUsoGarita.toLocaleDateString()} ·{" "}
                  {terminoUsoGarita.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            {/* Acciones de estado */}
            <div className="mt-4 space-y-2">
              {siguienteEstado ? (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={updating}
                  className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-sm ${
                    puedePasarAEnUso
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-sky-600 hover:bg-sky-700"
                  } disabled:opacity-60`}
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando estado…
                    </>
                  ) : (
                    etiquetaAccion
                  )}
                </button>
              ) : (
                <p className="text-xs text-gray-500">
                  Este ticket no puede cambiar de estado desde garita.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setTicket(null);
                  setTicketId(null);
                  setScanActive(true);
                }}
                className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Escanear otro ticket
              </button>
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
          <p className="text-sm text-slate-700">
            Vas a <span className="font-semibold">{etiquetaAccion}</span>{" "}
            para la camioneta{" "}
            <span className="font-semibold">{ticket?.vehiculo ?? "—"}</span>.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Confirma únicamente cuando la camioneta esté físicamente entregada o
            haya terminado realmente su uso.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={updating}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
              className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {updating && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Confirmar
            </button>
          </div>
        </Modal>

        {/* Toast global */}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </div>
  );
}
