// src/pages/pasajes/GestionView.tsx
import React, { useEffect, useMemo, useState } from "react";
import { cerrar, getState, setProveedor, subscribe } from "../../store/pasajeStore";
import { getProvidersState } from "../../store/providersStore";
import {
  CalendarDays,
  User2,
  Plane,
  Hotel,
  BadgeCheck,
  CheckCircle2,
  Ticket,
  Eye,
  EyeOff,
  Clock3,
  Loader2,
  FileText,
  XCircle,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastType } from "../../components/ui/Toast";

/* =========================
   Tipos / Utils
========================= */

type ToastState = { type: ToastType; message: string } | null;

function EmptyHint() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center text-slate-600">
        <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
          <Ticket className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold">
          No hay registros en el rango seleccionado
        </h3>
        <p className="text-sm">
          Ajusta el rango de fechas para ver resultados.
        </p>
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

function ticketDate(s: any): Date {
  if (s.tipo === "Pasaje") return new Date(s.salida ?? s.creado);
  return new Date(s.inicio ?? s.creado);
}

function hasCostoVigente(s: any): boolean {
  const vence = s.costoVenceEn ? new Date(s.costoVenceEn) : null;
  return !!(s.costo && vence && new Date() < vence);
}

function addMonths(base: Date, delta: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
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

/* =========================
   Progreso simple (Paso X/Y)
========================= */

const STAGES = [
  "Pendiente",
  "En proceso",
  "Costo aprobado",
  "Con pase",
  "Facturado",
  "Cerrado",
] as const;
type Stage = (typeof STAGES)[number];

function getStageIndexFromEstado(estado: string): number {
  const idx = STAGES.indexOf(estado as Stage);
  return idx === -1 ? 0 : idx;
}

function getStatusLabel(estado: string): string {
  switch (estado) {
    case "Pendiente":
      return "Pendiente de asignación";
    default:
      return estado;
  }
}

function getStatusMeta(estado: string) {
  switch (estado) {
    case "Pendiente":
      return {
        accent: "bg-rose-500",
        text: "text-rose-600",
        pill: "bg-rose-50 text-rose-700 border-rose-200",
        bar: "bg-rose-500",
        softBg: "bg-rose-50",
      };
    case "En proceso":
      return {
        accent: "bg-sky-500",
        text: "text-sky-600",
        pill: "bg-sky-50 text-sky-700 border-sky-200",
        bar: "bg-sky-500",
        softBg: "bg-sky-50",
      };
    case "Costo aprobado":
      return {
        accent: "bg-emerald-500",
        text: "text-emerald-600",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
        bar: "bg-emerald-500",
        softBg: "bg-emerald-50",
      };
    case "Con pase":
      return {
        accent: "bg-indigo-500",
        text: "text-indigo-600",
        pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
        bar: "bg-indigo-500",
        softBg: "bg-indigo-50",
      };
    case "Facturado":
      return {
        accent: "bg-violet-500",
        text: "text-violet-600",
        pill: "bg-violet-50 text-violet-700 border-violet-200",
        bar: "bg-violet-500",
        softBg: "bg-violet-50",
      };
    case "Cerrado":
      return {
        accent: "bg-slate-400",
        text: "text-slate-600",
        pill: "bg-slate-100 text-slate-700 border-slate-200",
        bar: "bg-slate-500",
        softBg: "bg-slate-100",
      };
    case "Rechazado":
      return {
        accent: "bg-red-500",
        text: "text-red-600",
        pill: "bg-red-50 text-red-700 border-red-200",
        bar: "bg-red-500",
        softBg: "bg-red-50",
      };
    default:
      return {
        accent: "bg-slate-400",
        text: "text-slate-600",
        pill: "bg-slate-50 text-slate-700 border-slate-200",
        bar: "bg-slate-500",
        softBg: "bg-slate-50",
      };
  }
}

function MiniProgress({ estado }: { estado: string }) {
  const idx = getStageIndexFromEstado(estado);
  const total = STAGES.length;

  const rawPct = (idx / (total - 1 || 1)) * 100;
  const progressPct = Math.max(8, rawPct);
  const dotPct = Math.min(100, Math.max(0, progressPct));

  const meta = getStatusMeta(estado);

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
          style={{ width: `${progressPct}%` }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-slate-300 bg-white shadow-sm"
          style={{ left: `calc(${dotPct}% - 6px)` }}
        />
      </div>
    </div>
  );
}

/* =========================
   Tarjeta de ticket
========================= */

function TicketRow({
  s,
  canAssign,
  canClose,
  onAssign,
  onClose,
}: {
  s: any;
  canAssign: boolean;
  canClose: boolean;
  onAssign: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isPasaje = s.tipo === "Pasaje";
  const icon = isPasaje ? <Plane className="h-4 w-4" /> : <Hotel className="h-4 w-4" />;
  const meta = getStatusMeta(s.estado);
  const gerenciaLabel = s.gerencia || "Sin gerencia";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300 hover:shadow-md">
      {/* Barra lateral de color según estado */}
      <div className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />

      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-stretch">
        {/* Columna: persona / ticket */}
        <div className="flex flex-1 items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <User2 className="h-5 w-5 text-slate-500" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {s.nombre}
              </p>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                ID Ticket: #{s.id}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              DNI: {s.dni ?? "—"} · {gerenciaLabel}
            </p>
            <p className="text-[11px] text-slate-500">
              Registrado: {fmt(ticketDate(s))}
            </p>
          </div>
        </div>

        {/* Separador vertical */}
        <div className="hidden w-px bg-slate-100 md:block" />

        {/* Columna: detalle solicitud + flujo */}
        <div className="flex flex-[1.3] flex-col gap-2 md:px-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                {icon}
              </span>
              Solicitud de {isPasaje ? "Pasaje" : "Hospedaje"}
            </div>
            {isPasaje && s.subtipo && (
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                Tipo: {s.subtipo}
              </span>
            )}
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              Proveedor: {s.proveedor ?? "No asignado"}
            </span>
          </div>

          <MiniProgress estado={s.estado} />
        </div>

        {/* Columna: estado + acciones */}
        <div className="flex w-full flex-col justify-between gap-2 md:w-52">
          <div className="flex items-start justify-end gap-2">
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                meta.pill,
              ].join(" ")}
            >
              {s.estado}
            </span>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
              aria-expanded={open}
              aria-controls={`det-${s.id}`}
              title={open ? "Ocultar detalle" : "Ver detalle"}
            >
              {open ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Ver detalle
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {canAssign && (
              <button
                type="button"
                onClick={onAssign}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Asignar proveedor →
              </button>
            )}
            {canClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Cerrar ticket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detalle colapsable */}
      {open && (
        <div
          id={`det-${s.id}`}
          className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 text-xs text-slate-700"
        >
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <div>
              <span className="font-medium">Proveedor:</span>{" "}
              {s.proveedor ?? "—"}
            </div>
            <div>
              <span className="font-medium">Costo:</span>{" "}
              {s.costo ? s.costo.toFixed(2) : "—"}
            </div>
            <div>
              <span className="font-medium">Aprob. Gerencia:</span>{" "}
              {s.costoAprobado == null
                ? "—"
                : s.costoAprobado
                ? "Aprobado"
                : "Rechazado"}
            </div>
            <div>
              <span className="font-medium">Pase compra:</span>{" "}
              {s.paseCompra ? "Sí" : "No"}
            </div>
            <div>
              <span className="font-medium">Factura:</span>{" "}
              {s.factura ?? "—"}
            </div>
            <div>
              <span className="font-medium">Vigencia costo:</span>{" "}
              {s.costoVenceEn ? fmt(s.costoVenceEn) : "—"}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* =========================
   Vista principal
========================= */

export default function GestionView() {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((x) => x + 1)), []);

  const [toast, setToast] = useState<ToastState>(null);
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  // Por defecto: hoy -> +1 mes
  const today = useMemo(() => new Date(), []);
  const defaultTo = useMemo(() => addMonths(new Date(), 1), []);
  const [rangeFrom, setRangeFrom] = useState<Date | null>(today);
  const [rangeTo, setRangeTo] = useState<Date | null>(defaultTo);

  const [fromInput, setFromInput] = useState<string>(dateToInput(today));
  const [toInput, setToInput] = useState<string>(dateToInput(defaultTo));

  const aplicarRango = () => {
    const f = parseInputDate(fromInput);
    const t = parseInputDate(toInput);
    if (!f || !t || f > t) {
      showToast("error", "Rango inválido. Verifica las fechas (desde ≤ hasta).");
      return;
    }
    const from = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0);
    const to = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
    setRangeFrom(from);
    setRangeTo(to);
  };

  const base = useMemo(() => {
    const from = rangeFrom
      ? new Date(
          rangeFrom.getFullYear(),
          rangeFrom.getMonth(),
          rangeFrom.getDate(),
          0,
          0,
          0,
          0
        )
      : null;
    const to = rangeTo
      ? new Date(
          rangeTo.getFullYear(),
          rangeTo.getMonth(),
          rangeTo.getDate(),
          23,
          59,
          59,
          999
        )
      : null;

    return [...getState().solicitudes]
      .filter((s) => {
        if (!from || !to) return true;
        const d = ticketDate(s);
        return d >= from && d <= to;
      })
      .sort((a, b) => +ticketDate(a) - +ticketDate(b));
  }, [getState().solicitudes.length, rangeFrom, rangeTo]);

  const gerencias = useMemo(() => {
    const set = new Set<string>();
    base.forEach((s) => s.gerencia && set.add(String(s.gerencia)));
    return ["Todas", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [base]);

  const [estadoFilter, setEstadoFilter] = useState<string>("Todos");
  const [dniFilter, setDniFilter] = useState("");
  const [gerenciaFilter, setGerenciaFilter] = useState<string>("Todas");
  const [tipoFilter, setTipoFilter] = useState<"Todos" | "Pasaje" | "Hospedaje">(
    "Todos"
  );

  const counters = useMemo(() => {
    const map = {
      Pendiente: 0,
      "En proceso": 0,
      "Costo aprobado": 0,
      "Con pase": 0,
      Facturado: 0,
      Cerrado: 0,
      Rechazado: 0,
    } as Record<Stage | "Rechazado", number>;
    base.forEach((s) => {
      const st = (s.estado as Stage) || "Pendiente";
      if (st in map) map[st] += 1;
      if (s.estado === "Rechazado") map["Rechazado"] += 1;
    });
    return map;
  }, [base]);

  const filtered = useMemo(() => {
    return base.filter((s) => {
      const okEstado = estadoFilter === "Todos" || s.estado === estadoFilter;
      const okDni =
        !dniFilter.trim() || (s.dni ?? "").includes(dniFilter.trim());
      const okGer =
        gerenciaFilter === "Todas" || String(s.gerencia) === gerenciaFilter;
      const okTipo = tipoFilter === "Todos" || s.tipo === tipoFilter;
      return okEstado && okDni && okGer && okTipo;
    });
  }, [base, estadoFilter, dniFilter, gerenciaFilter, tipoFilter]);

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [estadoFilter, dniFilter, gerenciaFilter, tipoFilter, rangeFrom, rangeTo]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const current = filtered.slice(start, start + PAGE_SIZE);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    idx: number | null;
    label: string;
  }>({
    open: false,
    idx: null,
    label: "",
  });

  const [assignDlg, setAssignDlg] = useState<{
    open: boolean;
    idx: number | null;
    tipo: "Pasaje" | "Hospedaje";
    nombre: string;
  }>({
    open: false,
    idx: null,
    tipo: "Pasaje",
    nombre: "",
  });

  const allProviders = getProvidersState().providers;

  const askClose = (idx: number, label: string) =>
    setConfirm({ open: true, idx, label });

  const doClose = () => {
    if (!confirm.open || confirm.idx == null) return;
    cerrar(confirm.idx);
    showToast("success", "Ticket cerrado correctamente.");
    setConfirm({ open: false, idx: null, label: "" });
  };

  const openAssign = (
    idx: number,
    tipo: "Pasaje" | "Hospedaje",
    currentName?: string | null
  ) =>
    setAssignDlg({
      open: true,
      idx,
      tipo,
      nombre: currentName ?? "",
    });

  const Pagination = () => {
    if (filtered.length === 0) return null;
    const go = (p: number) =>
      setPage(Math.max(1, Math.min(totalPages, p)));

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
      )
        pages.push(p);
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

  /* Config de tarjetas de conteo */
  const counterConfig = [
    { key: "Pendiente", label: "Pendiente", icon: Clock3 },
    { key: "En proceso", label: "En proceso", icon: Loader2 },
    { key: "Costo aprobado", label: "Costo aprobado", icon: BadgeCheck },
    { key: "Con pase", label: "Con pase", icon: Ticket },
    { key: "Facturado", label: "Facturado", icon: FileText },
    { key: "Cerrado", label: "Cerrado", icon: CheckCircle2 },
    { key: "Rechazado", label: "Rechazado", icon: XCircle },
  ] as const;

  return (
    <>
      <div className="space-y-6">
        {/* Título limpio */}
        <div className="px-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Gestión de tickets
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Filtra por rango de fechas, tipo, estado, gerencia o DNI para
            gestionar las solicitudes de pasajes y hospedajes.
          </p>
        </div>

        {/* Contadores por estado con color e icono */}
        <section className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
          {counterConfig.map(({ key, label, icon: Icon }) => {
            const meta = getStatusMeta(key);
            const count = (counters as any)[key] ?? 0;

            return (
              <div
                key={key}
                className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <div
                  className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`}
                />
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    meta.softBg,
                    meta.text,
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className={["text-xs font-medium", meta.text].join(" ")}>
                    {label}
                  </span>
                  <span className="text-xl font-semibold text-slate-900">
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Filtros con rango de fechas */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span className="font-medium">Filtros avanzados</span>
            <span>
              {base.length} ticket(s) en el rango · {current.length} visibles
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,3fr)] items-start">
            {/* Bloque 1: Rango de fechas (primer filtro lógico) */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <CalendarDays className="h-4 w-4" />
                <span>Rango de fechas</span>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[150px]">
                  <label className="mb-1 block text-[11px] font-medium text-gray-600">
                    Desde
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={fromInput}
                      onChange={(e) => setFromInput(e.target.value)}
                      className="w-full rounded-lg border bg-white px-9 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="mb-1 block text-[11px] font-medium text-gray-600">
                    Hasta
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      className="w-full rounded-lg border bg-white px-9 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={aplicarRango}
                  className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Aplicar
                </button>
              </div>

              <p className="text-[11px] text-gray-500">
                Rango aplicado:&nbsp;
                {rangeFrom && rangeTo
                  ? `${rangeFrom.toLocaleDateString()} – ${rangeTo.toLocaleDateString()}`
                  : "Todos los registros"}
              </p>
            </div>

            {/* Bloque 2: Otros filtros, ordenados por lógica de uso */}
            <div className="space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Detalle de filtros
              </p>

              {/* Fila 1: Estado + Tipo */}
              <div className="grid gap-3 md:grid-cols-2">
                {/* Estado */}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    Estado
                  </span>
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  >
                    {[
                      "Todos",
                      "Pendiente",
                      "En proceso",
                      "Costo aprobado",
                      "Con pase",
                      "Facturado",
                      "Cerrado",
                      "Rechazado",
                    ].map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </label>

                {/* Tipo */}
                <div className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    Tipo
                  </span>
                  <div className="inline-flex w-full overflow-hidden rounded-lg border">
                    {(["Todos", "Pasaje", "Hospedaje"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipoFilter(t)}
                        className={[
                          "flex-1 px-3 py-2 text-sm hover:bg-gray-50",
                          tipoFilter === t
                            ? "bg-gray-900 text-white hover:bg-gray-900"
                            : "",
                          t !== "Hospedaje" ? "border-r border-gray-200" : "",
                        ].join(" ")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fila 2: Gerencia + DNI */}
              <div className="grid gap-3 md:grid-cols-2">
                {/* Gerencia */}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    Gerencia
                  </span>
                  <select
                    value={gerenciaFilter}
                    onChange={(e) => setGerenciaFilter(e.target.value)}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  >
                    {gerencias.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>

                {/* DNI */}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600">
                    DNI
                  </span>
                  <input
                    value={dniFilter}
                    onChange={(e) => setDniFilter(e.target.value)}
                    placeholder="Filtro por DNI"
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Lista de tickets */}
        <section className="space-y-3">
          {current.length === 0 ? (
            <EmptyHint />
          ) : (
            current.map((s) => {
              const idx = getState().solicitudes.indexOf(s);

              // Reglas:
              // - Asignar proveedor se oculta cuando el costo está aprobado
              // - Cerrar ticket solo cuando está facturado y no está ya cerrado
              const canAssign =
                s.costoAprobado !== true && s.estado !== "Cerrado";
              const canClose = !!s.factura && s.estado !== "Cerrado";

              return (
                <TicketRow
                  key={s.id}
                  s={s}
                  canAssign={canAssign}
                  canClose={canClose}
                  onAssign={() =>
                    openAssign(
                      idx,
                      s.tipo as "Pasaje" | "Hospedaje",
                      s.proveedor ?? ""
                    )
                  }
                  onClose={() => askClose(idx, `${s.nombre} (${s.dni})`)}
                />
              );
            })
          )}

          <Pagination />
        </section>
      </div>

      {/* MODAL: Confirmar cierre */}
      <Modal
        open={confirm.open}
        onClose={() =>
          setConfirm({ open: false, idx: null, label: "" })
        }
        title="Confirmar cierre"
      >
        <div className="space-y-4">
          <p className="whitespace-pre-line text-sm text-gray-700">
            ¿Deseas cerrar este ticket?
            {confirm.label ? `\n${confirm.label}` : ""}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setConfirm({ open: false, idx: null, label: "" })
              }
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={doClose}
              className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Sí, cerrar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Asignar proveedor */}
      <Modal
        open={assignDlg.open}
        onClose={() =>
          setAssignDlg((prev) => ({ ...prev, open: false }))
        }
        title={`Asignar proveedor (${assignDlg.tipo})`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Proveedor
            </label>
            <select
              value={assignDlg.nombre}
              onChange={(e) =>
                setAssignDlg((prev) => ({
                  ...prev,
                  nombre: e.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
            >
              <option value="">Selecciona un proveedor</option>
              {allProviders
                .filter((p: any) => p.kind === assignDlg.tipo)
                .map((p: any) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                setAssignDlg((prev) => ({ ...prev, open: false }))
              }
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!assignDlg.nombre || assignDlg.idx == null}
              onClick={() => {
                if (assignDlg.idx != null && assignDlg.nombre) {
                  setProveedor(assignDlg.idx, assignDlg.nombre);
                  showToast(
                    "success",
                    `Proveedor asignado correctamente (${assignDlg.nombre}).`
                  );
                }
                setAssignDlg((prev) => ({ ...prev, open: false }));
              }}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Asignar proveedor
            </button>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
