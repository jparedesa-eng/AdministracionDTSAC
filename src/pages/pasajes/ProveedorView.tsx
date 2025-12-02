import React, { useEffect, useMemo, useState } from "react";
import {
  getState,
  setCostoConVigencia,
  subscribe,
  subirFactura,
} from "../../store/pasajeStore";
import {
  ClipboardList,
  Receipt,
  Filter,
  CalendarDays,
  Plane,
  Hotel,
  ShieldAlert,
} from "lucide-react";

import { Modal } from "../../components/ui/Modal";
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

function hasCostoVigente(s: any): boolean {
  const vence = s.costoVenceEn ? new Date(s.costoVenceEn) : null;
  return !!(s.costo && vence && new Date() < vence);
}

function isPendienteFactura(s: any): boolean {
  return s.estado !== "Cerrado" && !!s.paseCompra && !s.factura;
}

/** Determina la fecha “relevante” para el ticket (para filtrar por rango) */
function ticketDate(s: any): Date {
  if (s.tipo === "Pasaje") {
    return new Date(s.salida ?? s.creado);
  }
  // Hospedaje
  return new Date(s.inicio ?? s.creado);
}

/* ---------------------------
   Tipos UI
--------------------------- */
type Filtro = "sinCosto" | "pendFactura" | "todos";

/* ---------------------------
   Vista principal
--------------------------- */
export default function ProveedorView() {
  // Forzar re-render cuando cambie el store
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((x) => x + 1)), []);

  // Toast
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  // Defaults: hoy -> +7 días
  const today = useMemo(() => new Date(), []);
  const plus7 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }, []);

  // Inputs controlados (no aplican hasta pulsar botón)
  const [fromInput, setFromInput] = useState<string>(dateToInput(today));
  const [toInput, setToInput] = useState<string>(dateToInput(plus7));

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
      plus7.getFullYear(),
      plus7.getMonth(),
      plus7.getDate(),
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
    const from = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0);
    const to = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
    setRange({ from, to });
  };

  // Base: tickets dentro del rango aplicado, ordenados por fecha relevante asc
  const base = useMemo(() => {
    return [...getState().solicitudes]
      .filter((s) => {
        const d = ticketDate(s);
        return d >= range.from && d <= range.to;
      })
      .sort((a, b) => +ticketDate(a) - +ticketDate(b));
  }, [getState().solicitudes.length, range]);

  // Contadores (sobre el rango aplicado)
  const countSinCosto = useMemo(
    () => base.filter((s) => !hasCostoVigente(s) && s.estado !== "Cerrado").length,
    [base]
  );
  const countPendFactura = useMemo(
    () => base.filter((s) => isPendienteFactura(s)).length,
    [base]
  );

  // Filtros (por defecto: Sin costo vigente)
  const [filtro, setFiltro] = useState<Filtro>("sinCosto");

  // Lista filtrada
  const filtered = useMemo(() => {
    switch (filtro) {
      case "sinCosto":
        return base.filter((s) => !hasCostoVigente(s) && s.estado !== "Cerrado");
      case "pendFactura":
        return base.filter((s) => isPendienteFactura(s));
      default:
        return base.filter((s) => s.estado !== "Cerrado");
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
     Estado: Modal Costo
  --------------------------- */
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costModalIndex, setCostModalIndex] = useState<number | null>(null);
  const [costMonto, setCostMonto] = useState("");
  const [costHoras, setCostHoras] = useState("48");

  // Modal de confirmación para costo
  const [confirmCostoOpen, setConfirmCostoOpen] = useState(false);

  const openCostoModal = (index: number) => {
    const s = getState().solicitudes[index];
    setCostModalIndex(index);
    setCostMonto(s.costo ? String(s.costo) : "");
    setCostHoras("48");
    setCostModalOpen(true);
  };

  const handlePrepareSaveCosto = () => {
    const monto = parseFloat(costMonto);
    const horas = parseInt(costHoras, 10);

    if (Number.isNaN(monto) || monto <= 0) {
      showToast("error", "Monto inválido. Ingresa un valor mayor a 0.");
      return;
    }
    if (Number.isNaN(horas) || horas <= 0) {
      showToast("error", "Vigencia inválida. Ingresa un número de horas > 0.");
      return;
    }

    setConfirmCostoOpen(true);
  };

  const handleConfirmSaveCosto = async () => {
    if (costModalIndex == null) return;

    const monto = parseFloat(costMonto);
    const horas = parseInt(costHoras, 10);

    setConfirmCostoOpen(false);

    const ok = await setCostoConVigencia({
      index: costModalIndex,
      monto,
      horasVigencia: horas,
    });

    if (!ok) {
      showToast(
        "error",
        "No se pudo registrar/actualizar el costo en este estado."
      );
      return;
    }

    setCostModalOpen(false);
    showToast("success", "Costo registrado/actualizado correctamente.");
  };

  /* ---------------------------
     Estado: Modal Factura
  --------------------------- */
  const [factModalOpen, setFactModalOpen] = useState(false);
  const [factModalIndex, setFactModalIndex] = useState<number | null>(null);
  const [factRef, setFactRef] = useState("");

  // Modal de confirmación para factura
  const [confirmFacturaOpen, setConfirmFacturaOpen] = useState(false);

  const openFacturaModal = (index: number) => {
    const s = getState().solicitudes[index];
    setFactModalIndex(index);
    setFactRef(s.factura ?? "");
    setFactModalOpen(true);
  };

  const handlePrepareSaveFactura = () => {
    if (!factRef.trim()) {
      showToast("error", "Ingresa la referencia de la factura.");
      return;
    }
    setConfirmFacturaOpen(true);
  };

  const handleConfirmSaveFactura = async () => {
    if (factModalIndex == null) return;

    setConfirmFacturaOpen(false);

    const ok = await subirFactura(factModalIndex, factRef.trim());

    if (!ok) {
      showToast("error", "No se puede subir la factura en este estado.");
      return;
    }

    setFactModalOpen(false);
    showToast("success", "Factura registrada correctamente.");
  };

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
            para priorizar.
          </p>
        </div>

        {/* 2 tarjetas de conteo */}
        <section className="grid gap-4 sm:grid-cols-2">
          {/* Sin costo vigente */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Sin costo vigente
              </p>
              <p className="text-2xl font-semibold">{countSinCosto}</p>
            </div>
          </div>

          {/* Pendiente factura */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
              <Receipt className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">
                Pendiente factura
              </p>
              <p className="text-2xl font-semibold">{countPendFactura}</p>
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
                active={filtro === "sinCosto"}
                onClick={() => setFiltro("sinCosto")}
              >
                Sin costo vigente
              </FilterButton>
              <FilterButton
                active={filtro === "pendFactura"}
                onClick={() => setFiltro("pendFactura")}
              >
                Pendiente factura
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
                const costoVigente = hasCostoVigente(s);

                const puedeCargarCosto =
                  !cerrado &&
                  !tieneFactura &&
                  !(s.costoAprobado === true) &&
                  !costoVigente;
                const puedeSubirFactura = !cerrado && !tieneFactura && s.paseCompra;

                const isPasaje = s.tipo === "Pasaje";
                const icon = isPasaje ? (
                  <Plane className="h-4 w-4" />
                ) : (
                  <Hotel className="h-4 w-4" />
                );

                return (
                  <article
                    key={s.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    {/* Barra lateral de estado */}
                    <span
                      className={[
                        "absolute inset-y-0 left-0 w-1.5",
                        costoVigente ? "bg-emerald-500" : "bg-amber-500",
                      ].join(" ")}
                    />

                    {/* Header */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3 pl-2">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100">
                          {icon}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold leading-tight">
                            {s.nombre} ({s.dni}) • {s.gerencia}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {isPasaje ? "Pasaje" : "Hospedaje"} ·{" "}
                            {fmt(ticketDate(s))}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-2">
                        <span
                          className={[
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
                            costoVigente
                              ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                              : "bg-amber-100 text-amber-700 ring-amber-200",
                          ].join(" ")}
                        >
                          {costoVigente ? "Costo vigente" : "Costo vencido"}
                        </span>
                        {s.paseCompra && !tieneFactura && (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                            Con pase de compra
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 lg:grid-cols-3">
                      <div className="space-y-1 text-sm">
                        <div>
                          <b>Proveedor:</b> {s.proveedor ?? "—"}
                        </div>
                        <div>
                          <b>Costo:</b>{" "}
                          {s.costo != null ? s.costo.toFixed(2) : "—"}
                        </div>
                        <div>
                          <b>Vence:</b>{" "}
                          {s.costoVenceEn ? fmt(s.costoVenceEn) : "—"}
                        </div>
                        <div>
                          <b>Aprob. Gerencia:</b>{" "}
                          {s.costoAprobado == null
                            ? "—"
                            : s.costoAprobado
                            ? "Aprobado"
                            : "Rechazado"}
                        </div>
                      </div>

                      <div className="space-y-1 text-sm">
                        {isPasaje ? (
                          <>
                            <div>
                              <b>Tipo:</b> {s.subtipo ?? "—"}
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
                            <div>
                              <b>Traslado:</b> {s.traslado ? "Sí" : "No"}
                            </div>
                            <div>
                              <b>Alimentación:</b>{" "}
                              {s.alimentacion || "No indicado"}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-end justify-end gap-2">
                        <button
                          type="button"
                          disabled={!puedeCargarCosto}
                          onClick={() => openCostoModal(idx)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cargar/actualizar costo
                        </button>

                        <button
                          type="button"
                          onClick={() => openFacturaModal(idx)}
                          disabled={!puedeSubirFactura}
                          className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                        >
                          Subir factura
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

      {/* MODAL: Costo */}
      <Modal
        open={costModalOpen}
        onClose={() => {
          setCostModalOpen(false);
          setConfirmCostoOpen(false);
        }}
        title="Cargar / actualizar costo"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Monto (S/.)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={costMonto}
              onChange={(e) => setCostMonto(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Vigencia (horas)
            </label>
            <input
              type="number"
              min={1}
              max={720}
              value={costHoras}
              onChange={(e) => setCostHoras(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
              placeholder="48"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Máx. 720 horas (30 días). Se usará el valor dentro de ese rango.
            </p>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setCostModalOpen(false);
                setConfirmCostoOpen(false);
              }}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePrepareSaveCosto}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Guardar costo
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL CONFIRMACIÓN COSTO */}
      <Modal
        open={confirmCostoOpen}
        onClose={() => setConfirmCostoOpen(false)}
        title="Confirmar registro de costo"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            ¿Confirmar registro del costo{" "}
            <span className="font-semibold">
              S/ {Number(costMonto || 0).toFixed(2)}
            </span>{" "}
            con vigencia de{" "}
            <span className="font-semibold">
              {parseInt(costHoras || "0", 10)} hora(s)
            </span>
            ?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmCostoOpen(false)}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSaveCosto}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Factura */}
      <Modal
        open={factModalOpen}
        onClose={() => {
          setFactModalOpen(false);
          setConfirmFacturaOpen(false);
        }}
        title="Subir factura"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Referencia / número de factura
            </label>
            <input
              type="text"
              value={factRef}
              onChange={(e) => setFactRef(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-slate-300"
              placeholder="Ej. F001-123456"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFactModalOpen(false);
                setConfirmFacturaOpen(false);
              }}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePrepareSaveFactura}
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Guardar factura
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL CONFIRMACIÓN FACTURA */}
      <Modal
        open={confirmFacturaOpen}
        onClose={() => setConfirmFacturaOpen(false)}
        title="Confirmar registro de factura"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            ¿Confirmar registro de la factura{" "}
            <span className="font-semibold">{factRef || "—"}</span>?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmFacturaOpen(false)}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSaveFactura}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
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
