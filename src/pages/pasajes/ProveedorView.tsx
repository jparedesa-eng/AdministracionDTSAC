// src/pages/pasajes/ProveedorView.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getState,
  subscribe,
  registrarCompraUnificada,
  loadSolicitudes,
  type Solicitud,
} from "../../store/pasajeStore";
import {
  ClipboardList,
  Filter,
  CalendarDays,
  Plane,
  Hotel,
  ShieldAlert,
  Plus,
  X,
  Bus,
} from "lucide-react";

import { Modal } from "../../components/ui/Modal";
import { PropuestasModal } from "../../components/propuestas/PropuestasModal";
import { Toast } from "../../components/ui/Toast";
import type { ToastType, ToastState } from "../../components/ui/Toast";

// 👇 IMPORT DEL STORE DE PROPUESTAS (ajusta la ruta/nombre si lo tienes distinto)
import {
  crearPropuestaAerea,
} from "../../store/propuestasStore";

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
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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

/** Determina la fecha “relevante” para el ticket (para filtrar por rango) */
function ticketDate(s: Solicitud): Date {
  if (s.tipo === "Pasaje") {
    return new Date(s.salida ?? s.creado);
  }
  // Hospedaje
  return new Date(s.inicio ?? s.creado);
}

/* ---------------------------
   Tipos UI
--------------------------- */
type Filtro = "pendientes" | "pendCompra" | "todos";

/** Formato de un tramo de propuesta en el front */
type TramoForm = {
  origen: string;
  destino: string;
  fechaSalida: string; // yyyy-mm-dd
  horaSalida: string; // hh:mm
  fechaLlegada: string; // yyyy-mm-dd
  horaLlegada: string; // hh:mm
  aerolinea: string;
  vuelo: string;
  clase: string;
};

/* ---------------------------
   Vista principal
--------------------------- */
export default function ProveedorView() {
  // Forzar re-render cuando cambie el store
  const [, force] = useState(0);
  useEffect(() => {
    // Load solicitudes on mount
    loadSolicitudes().catch((err) => {
      console.error("Error loading solicitudes", err);
    });

    // Subscribe to changes
    const unsubscribe = subscribe(() => force((x) => x + 1));
    return () => {
      unsubscribe();
    };
  }, []);

  // Toast
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  // Defaults: hoy -> +30 días (1 mes)
  const today = useMemo(() => new Date(), []);
  const plus30 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  // Inputs controlados (no aplican hasta pulsar botón)
  const [fromInput, setFromInput] = useState<string>(dateToInput(today));
  const [toInput, setToInput] = useState<string>(dateToInput(plus30));

  // Rango efectivo aplicado
  const [range, setRange] = useState<{ from: Date; to: Date }>({
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
  });

  const aplicarRango = () => {
    const f = parseInputDate(fromInput);
    const t = parseInputDate(toInput);
    if (!f || !t || f > t) {
      showToast("error", "Rango inválido. Verifica las fechas (desde ≤ hasta).");
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

  // Base: tickets dentro del rango aplicado, ordenados por fecha relevante asc
  const base = useMemo(() => {
    return [...getState().solicitudes]
      .filter((s) => {
        const d = ticketDate(s);
        // Debe tener proveedor asignado para aparecer aquí
        if (!s.proveedor) return false;
        return d >= range.from && d <= range.to;
      })
      .sort((a, b) => +ticketDate(a) - +ticketDate(b));
  }, [getState().solicitudes.length, range]);

  // Contadores (sobre el rango aplicado)
  const countPendientes = useMemo(
    () =>
      base.filter(
        (s) =>
          s.estado !== "Cerrado" &&
          s.estado !== "Rechazado" &&
          !s.paseCompra // Aún no tiene pase (Proposals, etc)
      ).length,
    [base]
  );

  const countPendCompra = useMemo(
    () =>
      base.filter(
        (s) =>
          s.estado !== "Cerrado" &&
          s.estado === "Pendiente de compra"
      ).length,
    [base]
  );

  // Filtros (por defecto: Pendientes)
  const [filtro, setFiltro] = useState<Filtro>("pendientes");

  // Lista filtrada
  const filtered = useMemo(() => {
    switch (filtro) {
      case "pendientes":
        // Tickets con estado "Pendiente propuesta" (aéreos esperando propuestas)
        return base.filter(
          (s) =>
            s.estado !== "Cerrado" &&
            s.estado !== "Rechazado" &&
            s.estado === "Pendiente propuesta"
        );
      case "pendCompra":
        // Tickets con estado "Pendiente de compra" (esperando registro de compra)
        return base.filter(
          (s) =>
            s.estado !== "Cerrado" &&
            s.estado === "Pendiente de compra"
        );
      default:
        return base;
    }
  }, [base, filtro]);

  // Paginación 10 en 10
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [filtro, range]); // al cambiar filtro o rango, vuelve a pág 1
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const current = filtered.slice(start, start + PAGE_SIZE);

  /* ---------------------------
     Estado: Modal COMPRA
  --------------------------- */
  const [compraModalOpen, setCompraModalOpen] = useState(false);
  const [compraIndex, setCompraIndex] = useState<number | null>(null);

  // Campos comunes

  const [compraCosto, setCompraCosto] = useState("");
  const [compraDetalleServ, setCompraDetalleServ] = useState("");

  // N° Factura (Unified)
  const [factRef, setFactRef] = useState("");

  const resetCompraState = () => {
    setCompraIndex(null);
    setCompraCosto("");
    setCompraDetalleServ("");
    setFactRef("");
  };

  const openCompraModal = (index: number) => {
    const s = getState().solicitudes[index];
    setCompraIndex(index);
    // Pre-llenar costo/detalle/factura si ya existen, para "editar"
    setCompraCosto(s.costo != null ? String(s.costo) : "");
    setCompraDetalleServ(s.detalleServicios ?? "");
    setFactRef(s.factura ?? "");
    setCompraModalOpen(true);
  };

  const handleSaveCompra = async () => {
    if (compraIndex == null) return;

    // const s = getState().solicitudes[compraIndex];
    const costo = parseFloat(compraCosto);
    if (Number.isNaN(costo) || costo <= 0) {
      showToast("error", "Costo inválido. Ingresa un valor mayor a 0.");
      return;
    }

    try {
      const ok = await registrarCompraUnificada({
        index: compraIndex,
        costo: costo,
        detalle: compraDetalleServ.trim() || undefined,
        factura: factRef.trim() || undefined,
      });

      if (!ok) {
        showToast("error", "No se pudo registrar la compra.");
        return;
      }

      showToast("success", "Compra registrada correctamente.");
      setCompraModalOpen(false);
      resetCompraState();
    } catch (err) {
      console.error("Error al registrar compra", err);
      showToast(
        "error",
        "Ocurrió un error al registrar la compra. Revisa la consola."
      );
    }
  };

  /* ---------------------------
     Estado: Modal FACTURA
  --------------------------- */


  /* ---------------------------
     Estado: Modal PROPUESTAS AÉREAS
     (solo para Pasaje Aéreo, antes de paseCompra)
  --------------------------- */
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [propSolicitudCodigo, setPropSolicitudCodigo] = useState<string | null>(
    null
  );
  // Nuevo: sentido de la propuesta
  const [propSentido, setPropSentido] = useState<"IDA" | "VUELTA" | "AMBOS">("AMBOS");
  const [returnToProposalList, setReturnToProposalList] = useState(false);

  const [propMoneda, setPropMoneda] = useState<"PEN" | "USD">("PEN");
  const [propTotal, setPropTotal] = useState("");
  const [propObs, setPropObs] = useState("");
  const [propTramos, setPropTramos] = useState<TramoForm[]>([]);
  const [propSaving, setPropSaving] = useState(false);

  const resetPropuestaState = () => {
    setPropSolicitudCodigo(null);
    setPropMoneda("PEN");
    setPropSentido("AMBOS");
    setPropTotal("");
    setPropObs("");
    setPropTramos([]);
    setPropSaving(false);
    setReturnToProposalList(false);
  };

  const openPropuestaModal = (s: Solicitud, overrideSentido?: "IDA" | "VUELTA" | "AMBOS") => {
    setPropSolicitudCodigo(s.id);
    setPropMoneda("PEN");
    setPropTotal("");
    setPropObs("");

    // Determinar defecto: si tiene retorno, por defecto "IDA", si no "AMBOS" (ida única)
    if (overrideSentido) {
      setPropSentido(overrideSentido);
    } else if (s.retorno) {
      setPropSentido("IDA");
    } else {
      setPropSentido("AMBOS");
    }

    // Inicializamos con 1 tramo base
    // Si es VUELTA, invertimos origen y destino
    const esVuelta = overrideSentido === "VUELTA";
    const baseTramo: TramoForm = {
      origen: esVuelta ? (s.destino ?? "") : (s.origen ?? ""),
      destino: esVuelta ? (s.origen ?? "") : (s.destino ?? ""),
      fechaSalida: "",
      horaSalida: "",
      fechaLlegada: "",
      horaLlegada: "",
      aerolinea: "",
      vuelo: "",
      clase: "",
    };

    setPropTramos([baseTramo]);
    setPropModalOpen(true);
  };

  const addTramo = () => {
    setPropTramos((prev) => [
      ...prev,
      {
        origen: "",
        destino: "",
        fechaSalida: "",
        horaSalida: "",
        fechaLlegada: "",
        horaLlegada: "",
        aerolinea: "",
        vuelo: "",
        clase: "",
      },
    ]);
  };

  const removeTramo = (index: number) => {
    setPropTramos((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTramo = (
    index: number,
    field: keyof TramoForm,
    value: string
  ) => {
    setPropTramos((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const handleSavePropuesta = async () => {
    if (!propSolicitudCodigo) return;

    const total = parseFloat(propTotal);
    if (Number.isNaN(total) || total <= 0) {
      showToast("error", "Monto total inválido. Ingresa un valor mayor a 0.");
      return;
    }

    if (propTramos.length === 0) {
      showToast("error", "Agrega al menos un tramo a la propuesta.");
      return;
    }

    // Validaciones simples por tramo
    for (let i = 0; i < propTramos.length; i++) {
      const t = propTramos[i];
      if (!t.origen.trim() || !t.destino.trim()) {
        showToast(
          "error",
          `Completa origen y destino en el tramo ${i + 1}.`
        );
        return;
      }
      if (!t.fechaSalida || !t.horaSalida) {
        showToast(
          "error",
          `Completa fecha/hora de salida en el tramo ${i + 1}.`
        );
        return;
      }
      if (!t.fechaLlegada || !t.horaLlegada) {
        showToast(
          "error",
          `Completa fecha/hora de llegada en el tramo ${i + 1}.`
        );
        return;
      }
    }

    try {
      setPropSaving(true);

      const ok = await crearPropuestaAerea({
        solicitudCodigo: propSolicitudCodigo,
        total,
        moneda: propMoneda,
        observaciones: propObs.trim() || undefined,
        sentido: propSentido, // Pasamos el sentido
        tramos: propTramos.map((t, idx) => ({
          orden: idx + 1,
          origen: t.origen.trim(),
          destino: t.destino.trim(),
          fechaSalida: t.fechaSalida,
          horaSalida: t.horaSalida,
          fechaLlegada: t.fechaLlegada,
          horaLlegada: t.horaLlegada,
          aerolinea: t.aerolinea.trim(),
          vuelo: t.vuelo.trim(),
          clase: t.clase.trim(),
        })),
      });

      if (!ok) {
        showToast(
          "error",
          "No se pudo registrar la propuesta aérea. Revisa el estado del ticket."
        );
        setPropSaving(false);
        return;
      }

      showToast("success", "Propuesta aérea registrada correctamente.");
      showToast("success", "Propuesta aérea registrada correctamente.");
      setPropModalOpen(false);

      const currentId = propSolicitudCodigo;
      const shouldReturn = returnToProposalList;

      resetPropuestaState();

      if (shouldReturn && currentId) {
        setViewPropSolicitudId(currentId);
      }
    } catch (err) {
      console.error("Error al registrar propuesta aérea", err);
      showToast(
        "error",
        "Ocurrió un error al registrar la propuesta. Revisa la consola."
      );
      setPropSaving(false);
    }
  };

  /* ---------------------------
     Estado: Modal VER PROPUESTAS
  --------------------------- */
  const [viewPropSolicitudId, setViewPropSolicitudId] = useState<string | null>(
    null
  );

  /* ---------------------------
     UI helpers
  --------------------------- */
  const FilterButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
        active
          ? "bg-gray-900 text-white border border-gray-900"
          : "bg-white border border-slate-200 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );

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
                className="select-none px-3 text-gray-400"
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
            Panel del Proveedor
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Revisa y gestiona tickets del rango seleccionado. Usa los filtros
            para priorizar las compras, propuestas aéreas y facturas
            pendientes.
          </p>
        </div>

        {/* 2 tarjetas de conteo */}
        {/* 2 tarjetas de conteo */}
        <section className="grid gap-4 sm:grid-cols-2">
          {/* Pendientes (Sin Pase) */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
              <ClipboardList className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Pendientes (Sin Pase)
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {countPendientes}
              </p>
            </div>
          </div>

          {/* Pendientes de Compra */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Pendientes de compra
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {countPendCompra}
              </p>
            </div>
          </div>
        </section>

        {/* Filtros simples dentro de un contenedor */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            {/* Rango + aplicar */}
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600">
                  Desde
                </label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={fromInput}
                    onChange={(e) => setFromInput(e.target.value)}
                    className="w-[180px] rounded-lg border bg-white px-9 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600">
                  Hasta
                </label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    className="w-[180px] rounded-lg border bg-white px-9 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={aplicarRango}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                title="Aplicar rango"
              >
                Aplicar
              </button>
            </div>

            {/* Filtro por estado */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                <Filter className="h-4 w-4" /> Ver:
              </span>
              <FilterButton
                active={filtro === "pendientes"}
                onClick={() => setFiltro("pendientes")}
              >
                Pendientes
              </FilterButton>
              <FilterButton
                active={filtro === "pendCompra"}
                onClick={() => setFiltro("pendCompra")}
              >
                Pend. compra
              </FilterButton>
              <FilterButton
                active={filtro === "todos"}
                onClick={() => setFiltro("todos")}
              >
                Todos
              </FilterButton>
            </div>
          </div>
        </section>

        {/* Lista */}
        {current.length === 0 ? (
          <EmptyHint />
        ) : (
          <>
            <div className="space-y-3">
              {current.map((s) => {
                const idx = getState().solicitudes.indexOf(s);
                const cerrado = s.estado === "Cerrado";
                const tieneFactura = !!s.factura;
                const compraRegistrada = s.estado === "Compra realizada";

                const puedeRegistrarCompra =
                  !cerrado && s.estado === "Pendiente de compra";

                const isPasaje = s.tipo === "Pasaje";
                const isAereo = s.tipo === "Pasaje" && s.subtipo === "Aéreo";
                const isTerrestre = s.tipo === "Pasaje" && s.subtipo === "Terrestre";

                let icon = <Hotel className="h-4 w-4" />;
                if (isAereo) icon = <Plane className="h-4 w-4" />;
                else if (isTerrestre) icon = <Bus className="h-4 w-4" />;

                // Lógica de botones para Aéreos
                const puedeVerPropuestas = isAereo;

                return (
                  <article
                    key={s.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    {/* Barra lateral según situación de compra */}
                    <span
                      className={[
                        "absolute inset-y-0 left-0 w-1.5",
                        compraRegistrada ? "bg-emerald-500" : "bg-amber-500",
                      ].join(" ")}
                    />

                    {/* Header */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3 pl-2">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100">
                          {icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold leading-tight">
                              {s.nombre} ({s.dni})
                            </h3>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              #{s.id}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {isPasaje
                              ? `Pasaje · ${s.subtipo ?? "—"}`
                              : "Hospedaje"}{" "}
                            · {fmt(ticketDate(s))}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-2">
                        {s.proveedor && (
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                            Proveedor: {s.proveedor}
                          </span>
                        )}
                        {s.estado === "Compra realizada" ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            Compra realizada
                          </span>
                        ) : s.estado === "Pendiente de compra" ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            Pendiente de compra
                          </span>
                        ) : s.estado === "Pendiente propuesta" ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                            Pendiente propuesta
                          </span>
                        ) : s.estado === "Propuesta realizada" ? (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                            Propuesta realizada
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                            {s.estado}
                          </span>
                        )}
                        {tieneFactura && (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                            Factura registrada
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 lg:grid-cols-3">
                      <div className="space-y-1 text-sm">
                        <div>
                          <b>Empresa:</b> {s.empresa ?? "—"}
                        </div>
                        <div>
                          <b>CECO:</b> {s.ceco ?? "—"}
                        </div>
                        <div>
                          <b>Origen:</b> {s.origen ?? "—"}
                        </div>
                        <div>
                          <b>Destino:</b> {s.destino ?? "—"}
                        </div>
                        <div>
                          <b>Costo:</b>{" "}
                          {s.costo != null ? s.costo.toFixed(2) : "—"}
                        </div>
                      </div>

                      <div className="space-y-1 text-sm">
                        {isPasaje ? (
                          <>
                            <div>
                              <b>Salida:</b> {fmt(s.salida)}
                            </div>
                            <div>
                              <b>Retorno:</b> {fmt(s.retorno)}
                            </div>
                            {s.subtipo === "Terrestre" && (
                              <div>
                                <b>Asiento:</b> {s.asiento ?? "—"}
                              </div>
                            )}
                            {s.subtipo === "Aéreo" && (
                              <>
                                <div>
                                  <b>Código viaje:</b> {s.codigoViaje ?? "—"}
                                </div>
                                <div>
                                  <b>Clase:</b> {s.clase ?? "—"}
                                </div>
                                <div>
                                  <b>Tarifa:</b> {s.tarifa ?? "—"}
                                </div>
                                <div>
                                  <b>Escalas:</b>{" "}
                                  {s.tieneEscalas == null
                                    ? "—"
                                    : s.tieneEscalas
                                      ? "Con escalas"
                                      : "Directo"}
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <b>Lugar:</b> {s.lugar ?? "—"}
                            </div>
                            <div>
                              <b>Ingreso:</b> {fmt(s.inicio)}
                            </div>
                            <div>
                              <b>Salida:</b> {fmt(s.fin)}
                            </div>
                            <div>
                              <b>Noches:</b>{" "}
                              {s.noches != null ? s.noches : "—"}
                            </div>
                            <div>
                              <b>Habitación:</b> {s.habitacion ?? "—"}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-end justify-end gap-2">
                        {/* Botón VER PROPUESTAS */}
                        {puedeVerPropuestas && (
                          <button
                            type="button"
                            onClick={() => setViewPropSolicitudId(s.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Ver propuestas
                          </button>
                        )}



                        <button
                          type="button"
                          disabled={!puedeRegistrarCompra}
                          onClick={() => openCompraModal(idx)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                        >
                          Registrar Compra
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Paginación */}
            <Pagination />
          </>
        )}
      </div>

      {/* MODAL: COMPRA UNIFICADA */}
      <Modal
        open={compraModalOpen}
        onClose={() => {
          setCompraModalOpen(false);
          resetCompraState();
        }}
        title="Registrar Compra"
      >
        {(() => {
          if (compraIndex == null) return null;
          // const s = getState().solicitudes[compraIndex]; // No necesario si no mostramos campos específicos

          return (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Ingresa el costo final y detalles de la compra para completar el registro.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Costo total (S/.)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={compraCosto}
                  onChange={(e) => setCompraCosto(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Detalle / Observaciones (Opcional)
                </label>
                <textarea
                  value={compraDetalleServ}
                  onChange={(e) => setCompraDetalleServ(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
                  rows={3}
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Referencia Factura (Opcional)
                </label>
                <input
                  type="text"
                  value={factRef}
                  onChange={(e) => setFactRef(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
                  placeholder="N° Factura / Recibo"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompraModalOpen(false);
                    resetCompraState();
                  }}
                  className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCompra}
                  className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Guardar compra
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* MODAL: Propuesta Aérea */}
      <Modal
        open={propModalOpen}
        onClose={() => {
          setPropModalOpen(false);
          resetPropuestaState();
        }}
        title="Registrar propuesta de pasaje aéreo"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Registra una propuesta de vuelo con uno o varios tramos (ej. TRU →
            LIM → TPP). Esta información será visible para Gerencia y
            Administración para su aprobación.
          </p>



          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Monto total
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={propTotal}
                onChange={(e) => setPropTotal(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Moneda
              </label>
              <select
                value={propMoneda}
                onChange={(e) =>
                  setPropMoneda(e.target.value as "PEN" | "USD")
                }
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Observaciones (opcional)
            </label>
            <textarea
              value={propObs}
              onChange={(e) => setPropObs(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
              placeholder="Ej. Incluye equipaje de 23kg, cambio sin penalidad, etc."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Tramos de la propuesta
              </span>
              <button
                type="button"
                onClick={addTramo}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50"
              >
                <Plus className="h-3 w-3" />
                Agregar tramo
              </button>
            </div>

            {propTramos.length === 0 ? (
              <p className="text-xs text-slate-400">
                Aún no hay tramos. Agrega al menos uno.
              </p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {propTramos.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Tramo {i + 1}
                      </span>
                      {propTramos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTramo(i)}
                          className="inline-flex items-center rounded-full bg-white/80 p-1 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Origen
                        </label>
                        <input
                          type="text"
                          value={t.origen}
                          onChange={(e) =>
                            updateTramo(i, "origen", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                          placeholder="Ej. TRU - Trujillo"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Destino
                        </label>
                        <input
                          type="text"
                          value={t.destino}
                          onChange={(e) =>
                            updateTramo(i, "destino", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                          placeholder="Ej. LIM - Lima"
                        />
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Fecha salida
                        </label>
                        <input
                          type="date"
                          value={t.fechaSalida}
                          onChange={(e) =>
                            updateTramo(i, "fechaSalida", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Hora salida
                        </label>
                        <input
                          type="time"
                          value={t.horaSalida}
                          onChange={(e) =>
                            updateTramo(i, "horaSalida", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                        />
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Fecha llegada
                        </label>
                        <input
                          type="date"
                          value={t.fechaLlegada}
                          onChange={(e) =>
                            updateTramo(i, "fechaLlegada", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Hora llegada
                        </label>
                        <input
                          type="time"
                          value={t.horaLlegada}
                          onChange={(e) =>
                            updateTramo(i, "horaLlegada", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                        />
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Aerolínea
                        </label>
                        <input
                          type="text"
                          value={t.aerolinea}
                          onChange={(e) =>
                            updateTramo(i, "aerolinea", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                          placeholder="Latam Airlines, Sky..."
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Vuelo
                        </label>
                        <input
                          type="text"
                          value={t.vuelo}
                          onChange={(e) =>
                            updateTramo(i, "vuelo", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                          placeholder="LA2365"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700">
                          Clase
                        </label>
                        <input
                          type="text"
                          value={t.clase}
                          onChange={(e) =>
                            updateTramo(i, "clase", e.target.value)
                          }
                          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-xs outline-none ring-1 ring-transparent focus:ring-slate-300"
                          placeholder="S, X..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                const currentId = propSolicitudCodigo;
                const shouldReturn = returnToProposalList;
                setPropModalOpen(false);
                resetPropuestaState();
                if (shouldReturn && currentId) {
                  setViewPropSolicitudId(currentId);
                }
              }}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={propSaving}
              onClick={handleSavePropuesta}
              className="inline-flex items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {propSaving ? "Guardando..." : "Guardar propuesta"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Ver Propuestas (Listado) - Shared */}
      <PropuestasModal
        solicitudId={viewPropSolicitudId}
        open={!!viewPropSolicitudId}
        onClose={() => setViewPropSolicitudId(null)}
        showGerenciaSelection={false}
        showAdminSelection={true}
        readOnly={true}
        onAdd={(sentido) => {
          if (!viewPropSolicitudId) return;
          const s = getState().solicitudes.find((x) => x.id === viewPropSolicitudId);
          if (s) {
            setReturnToProposalList(true);
            setViewPropSolicitudId(null); // Cerrar listado
            openPropuestaModal(s, sentido); // Abrir formulario
          }
        }}
      />


      {/* TOAST GLOBAL */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
