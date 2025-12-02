// src/pages/Camionetas/RegistrosIncidentes.tsx
import React from "react";
import {
  AnimatedInput,
  AnimatedTextArea,
  AnimatedSelect,
} from "../../components/ui/AnimatedFields";
import {
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Calendar,
  Filter,
  Search,
  Banknote,
  Edit3,
  FileSignature,
  FileCheck2,
  Ban,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { camionetasStore } from "../../store/camionetasStore";
import {
  incidentesStore,
  type Incidente,
  type TipoIncidente,
  type Categoria,
  type Criticidad,
  type TipoActualizado,
  type Moneda,
} from "../../store/incidentesStore";

/* ----------------- Toasts ----------------- */
type ToastKind = "success" | "info" | "warn" | "error";
type Toast = {
  id: string;
  title: string;
  message?: string;
  kind?: ToastKind;
  ttlMs?: number;
};
function ToastHost({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
}) {
  const color = (k: ToastKind = "success") =>
    ({
      success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
      info: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
      warn: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
      error: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
    }[k]);
  const iconBg = (k: ToastKind = "success") =>
    ({
      success: "bg-emerald-500",
      info: "bg-blue-500",
      warn: "bg-amber-500",
      error: "bg-rose-500",
    }[k]);
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[min(92vw,420px)] flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ${color(
            t.kind
          )}`}
        >
          <span
            className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${iconBg(
              t.kind
            )}`}
          >
            ✓
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{t.title}</div>
            {t.message && (
              <div className="text-sm opacity-90">{t.message}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onClose(t.id)}
            className="rounded p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ----------------- Listas ----------------- */
const CATEGORIAS: Categoria[] = ["Correctivo", "Devolucion", "Infraccion"];
const CRITICIDADES: Criticidad[] = ["Leve", "Moderado", "Grave"];
const TIPOS_BASE: TipoIncidente[] = ["Incidente", "Papeleta", "Daño", "Otros"];
const SUB_TIPOS: TipoActualizado[] = [
  "Robo",
  "Cambio",
  "Reparacion",
  "Devolucion",
  "Duplicados",
  "Papeleta",
];
const MONEDAS: Moneda[] = ["PEN", "USD"];

/* ----------------- Helpers ----------------- */
function hoyYYYYMMDD(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${yy}-${mm}-${dd}`;
}
function hoyMenosDiasYYYYMMDD(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${yy}-${mm}-${dd}`;
}
function toNumDate(yyyy_mm_dd: string): number {
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getTime();
}
// --- helpers para actualización optimista / reemplazo de fila
function replaceRow(
  rows: Incidente[],
  id: string,
  changes: Partial<Incidente>
): Incidente[] {
  return rows.map((r) => (r.id === id ? { ...r, ...changes } : r));
}

/* ----------------- Badges ----------------- */
const tipoBadge: Record<TipoIncidente, string> = {
  Incidente: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Papeleta: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  Daño: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  Otros: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
};
const estadoBadge: Record<Incidente["estado"], string> = {
  Pendiente: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
  Notificado: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Facturado: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Desestimado: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

/* ----------------- Confirm dialog ----------------- */
function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onCancel}
        aria-hidden
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {description && (
            <div className="whitespace-pre-line px-5 py-4 text-sm text-gray-700">
              {description}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
            <button type="button" onClick={onCancel} className="btn-outline">
              {cancelText}
            </button>
            <button type="button" onClick={onConfirm} className="btn-brand">
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Component ----------------- */
type FilterEstado = "Todos" | Incidente["estado"];
type FilterTipo = "Todos" | TipoIncidente;

export default function RegistrosIncidentes({
  placas = [],
}: {
  placas?: string[];
}) {
  /* Toasts */
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const pushToast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = `T${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    const full: Toast = { id, ttlMs: 4200, kind: "success", ...t };
    setToasts((arr) => [full, ...arr]);
    if (full.ttlMs && full.ttlMs > 0)
      setTimeout(
        () => setToasts((arr) => arr.filter((x) => x.id !== id)),
        full.ttlMs
      );
  }, []);
  const closeToast = (id: string) =>
    setToasts((arr) => arr.filter((x) => x.id !== id));

  /* Estado base */
  const [incidentes, setIncidentes] = React.useState<Incidente[]>([]);
  const [placasStore, setPlacasStore] = React.useState<string[]>([]);

  /* Filtros (botón Aplicar) */
  const [fSoloPendientes, setFSoloPendientes] =
    React.useState<boolean>(true);
  const [fPlaca, setFPlaca] = React.useState<string>("Todas");
  const [fEstado, setFEstado] =
    React.useState<FilterEstado>("Todos");
  const [fTipo, setFTipo] = React.useState<FilterTipo>("Todos");
  const [fDesde, setFDesde] = React.useState<string>(
    hoyMenosDiasYYYYMMDD(15)
  );
  const [fHasta, setFHasta] = React.useState<string>(hoyYYYYMMDD());
  const [fQ, setFQ] = React.useState<string>("");

  // UI staging de filtros
  const [uiSoloPendientes, setUiSoloPendientes] =
    React.useState<boolean>(true);
  const [uiPlaca, setUiPlaca] = React.useState<string>("Todas");
  const [uiEstado, setUiEstado] =
    React.useState<FilterEstado>("Todos");
  const [uiTipo, setUiTipo] = React.useState<FilterTipo>("Todos");
  const [uiDesde, setUiDesde] = React.useState<string>(
    hoyMenosDiasYYYYMMDD(15)
  );
  const [uiHasta, setUiHasta] = React.useState<string>(hoyYYYYMMDD());
  const [uiQ, setUiQ] = React.useState<string>("");

  /* Excel (export) */
  const [exportingExcel, setExportingExcel] = React.useState(false);

  /* Cargar placas */
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await camionetasStore.syncInventario();
        if (mounted)
          setPlacasStore(
            camionetasStore.inventario
              .map((v) => v.placa)
              .filter(Boolean)
          );
      } catch (e) {
        console.error("Error al sincronizar inventario:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const opcionesPlacas = React.useMemo(() => {
    if (placas && placas.length > 0) return placas;
    if (placasStore.length > 0) return placasStore;
    const uniques = Array.from(
      new Set(incidentes.map((i) => i.vehiculo).filter(Boolean))
    );
    return uniques as string[];
  }, [placas, placasStore, incidentes]);

  /* Cargar remoto (según filtros activos) */
  const cargarRemoto = React.useCallback(async () => {
    const rows = await incidentesStore.sync({
      desde: fDesde,
      hasta: fHasta,
      placa: fPlaca !== "Todas" ? fPlaca : undefined,
      estado: fEstado === "Todos" ? undefined : fEstado,
      tipo: fTipo === "Todos" ? undefined : (fTipo as TipoIncidente),
      texto: fQ || undefined,
    });
    setIncidentes(rows);
  }, [fDesde, fHasta, fPlaca, fEstado, fTipo, fQ]);

  React.useEffect(() => {
    cargarRemoto();
  }, []); // eslint-disable-line

  const aplicarFiltros = async () => {
    if (uiDesde && uiHasta && toNumDate(uiDesde) > toNumDate(uiHasta)) {
      pushToast({
        title: "Rango inválido",
        message: "Desde no puede ser mayor que Hasta",
        kind: "error",
      });
      return;
    }
    setFSoloPendientes(uiSoloPendientes);
    setFPlaca(uiPlaca);
    setFEstado(uiEstado);
    setFTipo(uiTipo);
    setFDesde(uiDesde);
    setFHasta(uiHasta);
    setFQ(uiQ);
    setPage(1);

    const rows = await incidentesStore.sync({
      desde: uiDesde,
      hasta: uiHasta,
      placa: uiPlaca !== "Todas" ? uiPlaca : undefined,
      estado: uiEstado === "Todos" ? undefined : uiEstado,
      tipo: uiTipo === "Todos" ? undefined : (uiTipo as TipoIncidente),
      texto: uiQ || undefined,
    });
    setIncidentes(rows);
    pushToast({
      title: "Filtros aplicados",
      message: `Rango ${uiDesde} a ${uiHasta}${
        uiPlaca !== "Todas" ? ` · Placa ${uiPlaca}` : ""
      }`,
      kind: "info",
    });
  };

  /* Modales */
  // Nuevo
  const [openNew, setOpenNew] = React.useState(false);
  const nuevoBase: Incidente = {
    id: "",
    fecha: hoyYYYYMMDD(),
    tipo: "Incidente",
    vehiculo: "",
    descripcion: "",
    responsable: "",
    estado: "Pendiente",
    fechaSolucion: undefined,
    descuentoAplicado: false,
    fechaDescuento: undefined,
    monto: null,
    moneda: "PEN",
    categoria: null,
    criticidad: null,
    tipoActualizado: null,
    subTipo: null,
    nroFactura: null,
  };
  const [inc, setInc] = React.useState<Incidente>(nuevoBase);
  const setI = <K extends keyof Incidente>(
    k: K,
    v: Incidente[K]
  ) => setInc((s) => ({ ...s, [k]: v }));
  const abrirNuevo = () => {
    setInc(nuevoBase);
    setOpenNew(true);
  };
  const guardarIncidente = async () => {
    if (!inc.fecha)
      return pushToast({ title: "Fecha requerida", kind: "error" });
    if (!inc.vehiculo)
      return pushToast({ title: "Vehículo requerido", kind: "error" });
    if (!inc.responsable?.toString().trim())
      return pushToast({
        title: "Responsable requerido",
        kind: "error",
      });
    await incidentesStore.crear({
      ...inc,
      responsable: inc.responsable ?? null,
      categoria: (inc.categoria ?? null) as Categoria | null,
      criticidad: (inc.criticidad ?? null) as Criticidad | null,
      tipoActualizado: (inc.tipoActualizado ?? null) as TipoActualizado | null,
      subTipo: (inc.tipoActualizado as any) ?? null,
      nroFactura: null,
    } as Omit<Incidente, "id" | "createdAt">);
    await cargarRemoto();
    setOpenNew(false);
    pushToast({ title: "Incidente registrado", kind: "success" });
  };

  // Editar
  const [openEdit, setOpenEdit] = React.useState<Incidente | null>(null);
  const [eVehiculo, setEVehiculo] = React.useState("");
  const [eResp, setEResp] = React.useState("");
  const [eCat, setECat] = React.useState<Categoria | "">("");
  const [eCri, setECri] = React.useState<Criticidad | "">("");
  const [eTipo, setETipo] =
    React.useState<TipoIncidente>("Incidente");
  const [eSub, setESub] = React.useState<TipoActualizado | "">("");
  const [eDesc, setEDesc] = React.useState("");
  const abrirEditar = (row: Incidente) => {
    if (row.estado === "Facturado" || row.estado === "Desestimado") return;
    setOpenEdit(row);
    setEVehiculo(row.vehiculo);
    setEResp(row.responsable ?? "");
    setECat((row.categoria ?? "") as any);
    setECri((row.criticidad ?? "") as any);
    setETipo(row.tipo);
    setESub((row.tipoActualizado ?? "") as any);
    setEDesc(row.descripcion ?? "");
  };
  const guardarEdicion = async () => {
    if (!openEdit) return;
    await incidentesStore.actualizarCampos(openEdit.id, {
      vehiculo: eVehiculo,
      responsable: (eResp || "").trim() || null,
      categoria: (eCat || null) as any,
      criticidad: (eCri || null) as any,
      tipo: eTipo,
      tipo_actualizado: (eSub || null) as any,
      sub_tipo: (eSub || null) as any,
      descripcion: eDesc,
    });
    await cargarRemoto();
    pushToast({ title: "Registro actualizado", kind: "success" });
    setOpenEdit(null);
  };

  // Costo
  const [openCosto, setOpenCosto] = React.useState<Incidente | null>(
    null
  );
  const [montoTmp, setMontoTmp] = React.useState<string>("");
  const [monedaTmp, setMonedaTmp] =
    React.useState<Moneda>("PEN");
  const onAbrirCosto = (row: Incidente) => {
    if (row.estado === "Facturado" || row.estado === "Desestimado") return;
    setMontoTmp(row.monto != null ? String(row.monto) : "");
    setMonedaTmp((row.moneda ?? "PEN") as Moneda);
    setOpenCosto(row);
  };
  const guardarCosto = async () => {
    if (!openCosto) return;
    const txt = (montoTmp ?? "").trim().replace(",", ".");
    const num = txt === "" ? null : Number(txt);
    if (txt !== "" && Number.isNaN(num)) {
      pushToast({
        kind: "error",
        title: "Monto inválido",
        message: "Usa formato 123.45",
      });
      return;
    }
    await incidentesStore.asignarCosto(openCosto.id, num, monedaTmp ?? null);
    await cargarRemoto();
    pushToast({ title: "Costo actualizado", kind: "success" });
    setOpenCosto(null);
  };

  // Si al cambiar a Notificado/Facturado/Desestimado tenías "solo pendientes", ajusta para mantener visible
  const asegurarVisibilidadTrasCambio = React.useCallback(
    async (nuevoEstado: Incidente["estado"]) => {
      if (fSoloPendientes && nuevoEstado !== "Pendiente") {
        setFSoloPendientes(false);
        setUiSoloPendientes(false);
        const rows = await incidentesStore.sync({
          desde: fDesde,
          hasta: fHasta,
          placa: fPlaca !== "Todas" ? fPlaca : undefined,
          estado: fEstado === "Todos" ? undefined : fEstado,
          tipo: fTipo === "Todos" ? undefined : (fTipo as TipoIncidente),
          texto: fQ || undefined,
        });
        setIncidentes(rows);
        pushToast({
          kind: "info",
          title: "Filtro ajustado",
          message:
            "Se desactivó 'solo pendientes' para mantener el registro visible.",
        });
      }
    },
    [fSoloPendientes, fDesde, fHasta, fPlaca, fEstado, fTipo, fQ, pushToast]
  );

  // Confirmación para Notificar
  const [openConfirmNotificar, setOpenConfirmNotificar] =
    React.useState<Incidente | null>(null);
  const pedirConfirmNotificar = (row: Incidente) => {
    if (row.estado !== "Pendiente") return;
    setOpenConfirmNotificar(row);
  };
  const confirmarNotificar = async () => {
    if (!openConfirmNotificar) return;
    const row = openConfirmNotificar;
    setIncidentes((prev) =>
      replaceRow(prev, row.id, { estado: "Notificado" })
    );
    try {
      await incidentesStore.cambiarEstado(row.id, "Notificado");
      await asegurarVisibilidadTrasCambio("Notificado");
      pushToast({ title: "Caso notificado", kind: "info" });
    } catch {
      setIncidentes((prev) =>
        replaceRow(prev, row.id, { estado: "Pendiente" })
      );
      pushToast({ title: "Error al notificar", kind: "error" });
    } finally {
      setOpenConfirmNotificar(null);
    }
  };

  // Facturar
  const [openFacturar, setOpenFacturar] =
    React.useState<Incidente | null>(null);
  const [nroFacturaTmp, setNroFacturaTmp] = React.useState("");
  const abrirFacturar = (row: Incidente) => {
    if (row.estado !== "Notificado") return;
    setOpenFacturar(row);
    setNroFacturaTmp(row.nroFactura ?? "");
  };
  const facturar = async () => {
    if (!openFacturar) return;
    const curr = incidentes.find((i) => i.id === openFacturar.id);
    if (!curr) return;
    if (
      !curr.responsable?.toString().trim() ||
      curr.monto == null ||
      !(Number(curr.monto) > 0)
    ) {
      pushToast({
        title: "Faltan datos",
        message:
          "Debes tener Responsable y Monto antes de facturar.",
        kind: "error",
      });
      return;
    }
    if (!nroFacturaTmp.trim()) {
      pushToast({
        title: "N° de factura requerido",
        kind: "error",
      });
      return;
    }
    const factura = nroFacturaTmp.trim();
    setIncidentes((prev) =>
      replaceRow(prev, curr.id, { estado: "Facturado", nroFactura: factura })
    );
    try {
      await incidentesStore.cambiarEstado(curr.id, "Facturado", {
        nro_factura: factura,
      });
      setOpenFacturar(null);
      await asegurarVisibilidadTrasCambio("Facturado");
      pushToast({
        title: "Caso facturado",
        message: `Factura: ${factura}`,
        kind: "success",
      });
    } catch {
      setIncidentes((prev) =>
        replaceRow(prev, curr.id, {
          estado: curr.estado,
          nroFactura: curr.nroFactura ?? null,
        })
      );
      pushToast({ title: "Error al facturar", kind: "error" });
    }
  };

  // Desestimar
  const [openDesestimar, setOpenDesestimar] =
    React.useState<Incidente | null>(null);
  const desestimar = async () => {
    if (!openDesestimar) return;
    const id = openDesestimar.id;
    setIncidentes((prev) =>
      replaceRow(prev, id, { estado: "Desestimado" })
    );
    try {
      await incidentesStore.cambiarEstado(id, "Desestimado");
      setOpenDesestimar(null);
      await asegurarVisibilidadTrasCambio("Desestimado");
      pushToast({ title: "Caso desestimado", kind: "warn" });
    } catch {
      setIncidentes((prev) =>
        replaceRow(prev, id, { estado: "Pendiente" })
      );
      pushToast({ title: "Error al desestimar", kind: "error" });
    }
  };

  // Eliminar
  const eliminarIncidente = async (
    id: string,
    estado: Incidente["estado"]
  ) => {
    if (estado === "Facturado" || estado === "Desestimado") return;
    await incidentesStore.eliminar(id);
    setIncidentes((prev) => prev.filter((x) => x.id !== id));
    pushToast({ title: "Registro eliminado", kind: "warn" });
  };

  /* Cliente: filtro “solo pendientes” */
  const dataFiltrada = incidentes.filter((it) => {
    if (fSoloPendientes && it.estado !== "Pendiente") return false;
    return true;
  });

  /* Paginación */
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const total = dataFiltrada.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const startIdx = (pageSafe - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const vista = dataFiltrada.slice(startIdx, endIdx);

  const pendientes = incidentes.filter(
    (i) => i.estado === "Pendiente"
  ).length;
  const notificados = incidentes.filter(
    (i) => i.estado === "Notificado"
  ).length;
  const facturados = incidentes.filter(
    (i) => i.estado === "Facturado"
  ).length;
  const desestimados = incidentes.filter(
    (i) => i.estado === "Desestimado"
  ).length;

  /* ----- NAV HORIZONTAL SOLO DENTRO DE LA TABLA (flexible) ----- */
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = React.useState(0);
  const [scrollMax, setScrollMax] = React.useState(0);

  const recalcScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setScrollMax(max);
    setScrollLeft(Math.min(el.scrollLeft, max));
  }, []);

  React.useEffect(() => {
    recalcScroll();
    const onResize = () => recalcScroll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recalcScroll, vista.length, pageSize]);

  const onScrollArea = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollLeft(el.scrollLeft);
    setScrollMax(Math.max(0, el.scrollWidth - el.clientWidth));
  };

  // Scroll horizontal con rueda del mouse (flexible)
  const onWheelHorizontal = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth) return; // no hay overflow-x

    // Si el usuario NO mantiene Shift, convierte el deltaY a movimiento horizontal
    if (!e.shiftKey) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    // Si mantiene Shift, el navegador ya hace horizontal con la rueda (no tocamos)
  };

  // Drag-to-scroll (clic y arrastrar)
  const isDraggingRef = React.useRef(false);
  const dragStartXRef = React.useRef(0);
  const dragScrollStartRef = React.useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragScrollStartRef.current = el.scrollLeft;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !isDraggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    el.scrollLeft = dragScrollStartRef.current - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    isDraggingRef.current = false;
    if (el) el.style.cursor = "grab";
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(
        e.pointerId
      );
    } catch {}
  };

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(240, Math.round(el.clientWidth * 0.8));
    el.scrollBy({
      left: dir === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  const onRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const val = Number(e.currentTarget.value);
    el.scrollTo({ left: val, behavior: "instant" as ScrollBehavior });
    setScrollLeft(val);
  };

  /* -------- Exportar Excel con datos mostrados (dataFiltrada) -------- */
  const exportExcelIncidentes = () => {
    try {
      setExportingExcel(true);

      if (!dataFiltrada || dataFiltrada.length === 0) {
        pushToast({
          title: "Sin datos para exportar",
          message: "No hay registros con los filtros actuales.",
          kind: "info",
        });
        return;
      }

      const exportData = dataFiltrada.map((g) => ({
        ID: g.id,
        Fecha: g.fecha,
        Tipo: g.tipo,
        Estado: g.estado,
        Vehículo: g.vehiculo,
        Responsable: g.responsable ?? "",
        Categoría: g.categoria ?? "",
        Criticidad: g.criticidad ?? "",
        "Sub tipo": g.tipoActualizado ?? "",
        Monto:
          g.monto != null && Number(g.monto) > 0
            ? Number(g.monto).toFixed(2)
            : "",
        Moneda: g.moneda ?? "",
        "N° Factura": g.nroFactura ?? "",
        Descripción: g.descripcion ?? "",
      }));

      const sheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Incidentes");

      const filename = `Incidentes_${fDesde}_a_${fHasta}${
        fPlaca !== "Todas" ? `_placa_${fPlaca}` : ""
      }${fSoloPendientes ? `_solo_pendientes` : ""}.xlsx`;

      XLSX.writeFile(workbook, filename);
      pushToast({
        title: "Excel generado",
        message: `Se exportaron ${dataFiltrada.length} registros.`,
        kind: "success",
      });
    } catch (e: any) {
      console.error(e);
      pushToast({
        title: "Error al exportar",
        message: e?.message ?? "No se pudo generar el Excel.",
        kind: "error",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  /* ----------------- UI ----------------- */
  return (
    <div className="grid w-full gap-6 overflow-x-hidden">
      <ToastHost toasts={toasts} onClose={closeToast} />

      {/* Encabezado */}
      <div className="px-1 py-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Registro de Incidentes
            </h1>
            <p className="text-sm text-gray-400">
              Flujo: Pendiente → Notificado → Facturado · (Desestimar)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-sm text-gray-500 md:flex md:items-center md:gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs ring-1 ring-gray-200">
                Pendientes: <strong>{pendientes}</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs ring-1 ring-blue-200">
                Notificados: <strong>{notificados}</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs ring-1 ring-emerald-200">
                Facturados: <strong>{facturados}</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200">
                Desestimados: <strong>{desestimados}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={abrirNuevo}
              className="btn-brand"
            >
              <Plus className="h-4 w-4" /> Nuevo
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border bg-white px-6 py-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <Filter className="h-4 w-4 text-gray-400" />
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={uiSoloPendientes}
              onChange={(e) =>
                setUiSoloPendientes(e.currentTarget.checked)
              }
            />
            Ver solo pendientes
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Placa:</span>
            <select
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={uiPlaca}
              onChange={(e) => setUiPlaca(e.currentTarget.value)}
            >
              <option value="Todas">Todas</option>
              {opcionesPlacas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Estado:</span>
            <select
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={uiEstado}
              onChange={(e) =>
                setUiEstado(e.currentTarget.value as FilterEstado)
              }
            >
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Notificado">Notificado</option>
              <option value="Facturado">Facturado</option>
              <option value="Desestimado">Desestimado</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Tipo:</span>
            <select
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={uiTipo}
              onChange={(e) =>
                setUiTipo(e.currentTarget.value as FilterTipo)
              }
            >
              <option value="Todos">Todos</option>
              {TIPOS_BASE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Desde:</span>
            <input
              type="date"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={uiDesde}
              onChange={(e) => setUiDesde(e.currentTarget.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Hasta:</span>
            <input
              type="date"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              value={uiHasta}
              onChange={(e) => setUiHasta(e.currentTarget.value)}
            />
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Buscar por placa, responsable o descripción"
              value={uiQ}
              onChange={(e) => setUiQ(e.currentTarget.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={aplicarFiltros}
              className="btn-brand w-full md:w-auto"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={exportExcelIncidentes}
              disabled={exportingExcel}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 md:w-auto"
              title="Exportar a Excel los registros filtrados"
            >
              {exportingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {exportingExcel ? "Exportando..." : "Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista – scroll solo interno (x/y) */}
      <section
        className="max-w-full rounded-2xl border bg-white shadow-sm"
        style={{ contain: "inline-size" }}
      >
        <div className="border-b px-6 py-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                Lista de Incidentes
              </h2>
              <p className="text-xs text-gray-400">
                Total: {dataFiltrada.length} registro(s) filtrados
              </p>
            </div>
          </div>
        </div>

        {/* Área scrolleable SOLO de la tabla */}
        <div
          ref={scrollRef}
          onScroll={onScrollArea}
          onWheel={onWheelHorizontal}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="relative max-h-[72vh] overflow-y-auto overflow-x-auto overscroll-x-contain rounded-b-2xl cursor-grab"
        >
          <table className="min-w-[1200px] w-full table-auto text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="bg-gray-50 text-gray-600">
                <th className="w-28 px-6 py-3 font-medium">Fecha</th>
                <th className="w-24 px-6 py-3 font-medium">Tipo</th>
                <th className="w-28 px-6 py-3 font-medium">Estado</th>
                <th className="w-28 px-6 py-3 font-medium">Vehículo</th>
                <th className="w-40 px-6 py-3 font-medium">
                  Responsable
                </th>
                <th className="w-28 px-6 py-3 font-medium">
                  Categoría
                </th>
                <th className="w-28 px-6 py-3 font-medium">
                  Criticidad
                </th>
                <th className="w-32 px-6 py-3 font-medium">Sub tipo</th>
                <th className="w-24 px-6 py-3 font-medium">Monto</th>
                <th className="w-20 px-6 py-3 font-medium">Moneda</th>
                <th className="px-6 py-3 font-medium">Descripción</th>
                <th className="w-56 px-6 py-3 text-right font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {vista.map((g, i) => {
                const locked =
                  g.estado === "Facturado" ||
                  g.estado === "Desestimado";
                const canFacturar =
                  g.estado === "Notificado" &&
                  !!g.responsable?.toString().trim() &&
                  !!(g.monto != null && Number(g.monto) > 0);
                return (
                  <tr
                    key={g.id}
                    className={`border-t ${
                      i % 2 ? "bg-gray-50/40" : "bg-white"
                    }`}
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />{" "}
                        {g.fecha}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tipoBadge[g.tipo]}`}
                      >
                        {g.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estadoBadge[g.estado]}`}
                      >
                        {g.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {g.vehiculo}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {g.responsable || (
                        <span className="text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {g.categoria ?? (
                        <span className="text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {g.criticidad ?? (
                        <span className="text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {g.tipoActualizado ?? (
                        <span className="text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {g.monto != null && Number(g.monto) > 0 ? (
                        <span className="font-semibold">
                          {Number(g.monto).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {g.moneda ?? (
                        <span className="text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="max-h-12 max-w-[32rem] overflow-hidden text-ellipsis break-words">
                        {g.descripcion?.trim() ? (
                          g.descripcion
                        ) : (
                          <span className="text-xs text-gray-400">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onAbrirCosto(g)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                            locked
                              ? "border-gray-100 text-gray-300 cursor-not-allowed"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                          title="Agregar monto"
                          aria-label="Agregar monto"
                          disabled={locked}
                        >
                          <Banknote className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEditar(g)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                            locked
                              ? "border-gray-100 text-gray-300 cursor-not-allowed"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                          title="Editar"
                          aria-label="Editar"
                          disabled={locked}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => pedirConfirmNotificar(g)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                            g.estado === "Pendiente"
                              ? "border-gray-200 hover:bg-gray-50"
                              : "border-gray-100 text-gray-300 cursor-not-allowed"
                          }`}
                          title="Notificar"
                          aria-label="Notificar"
                          disabled={g.estado !== "Pendiente"}
                        >
                          <FileSignature className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirFacturar(g)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                            canFacturar
                              ? "border-gray-200 hover:bg-gray-50"
                              : "border-gray-100 text-gray-300 cursor-not-allowed"
                          }`}
                          title="Facturar"
                          aria-label="Facturar"
                          disabled={!canFacturar}
                        >
                          <FileCheck2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!locked) setOpenDesestimar(g);
                          }}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                            locked
                              ? "border-gray-100 text-gray-300 cursor-not-allowed"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                          title="Desestimar"
                          aria-label="Desestimar"
                          disabled={locked}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            eliminarIncidente(g.id, g.estado)
                          }
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                            locked
                              ? "border-gray-100 text-gray-300 cursor-not-allowed"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                          title="Eliminar"
                          aria-label="Eliminar"
                          disabled={locked}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {vista.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    {dataFiltrada.length === 0
                      ? "Aún no hay incidentes registrados."
                      : "No hay resultados en esta página."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginación sticky dentro del área scrolleable */}
          <div className="sticky bottom-0 z-10 border-t bg-white/95 px-6 py-3 text-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-gray-500">
                Mostrando{" "}
                <strong>{total === 0 ? 0 : startIdx + 1}</strong>–
                <strong>{endIdx}</strong> de <strong>{total}</strong>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-gray-600">Filas:</label>
                <select
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.currentTarget.value));
                    setPage(1);
                  }}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    disabled={pageSafe === 1}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 px-2 disabled:opacity-40"
                    title="Primera"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                    disabled={pageSafe === 1}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 px-2 disabled:opacity-40"
                    title="Anterior"
                  >
                    ‹
                  </button>
                  <span className="px-2 text-gray-600">
                    {pageSafe} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={pageSafe === totalPages}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 px-2 disabled:opacity-40"
                    title="Siguiente"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    disabled={pageSafe === totalPages}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 px-2 disabled:opacity-40"
                    title="Última"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL: Nuevo (con FECHA) */}
      {openNew && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpenNew(false)}
            aria-hidden
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-3xl rounded-2xl border bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="text-lg font-semibold">
                  Nuevo incidente
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenNew(false)}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AnimatedInput
                    label="Fecha del incidente"
                    type="date"
                    value={inc.fecha}
                    onChange={(e) =>
                      setI("fecha", (e.target as HTMLInputElement).value)
                    }
                  />

                  <AnimatedSelect
                    label="Categoría"
                    value={inc.categoria ?? ""}
                    onChange={(e) =>
                      setI(
                        "categoria",
                        ((e.target as HTMLSelectElement).value ||
                          null) as any
                      )
                    }
                  >
                    <option value="">—</option>
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </AnimatedSelect>
                  <AnimatedSelect
                    label="Criticidad"
                    value={inc.criticidad ?? ""}
                    onChange={(e) =>
                      setI(
                        "criticidad",
                        ((e.target as HTMLSelectElement).value ||
                          null) as any
                      )
                    }
                  >
                    <option value="">—</option>
                    {CRITICIDADES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </AnimatedSelect>

                  <AnimatedSelect
                    label="Tipo (base)"
                    value={inc.tipo}
                    onChange={(e) =>
                      setI(
                        "tipo",
                        (e.target as HTMLSelectElement)
                          .value as TipoIncidente
                      )
                    }
                  >
                    {TIPOS_BASE.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </AnimatedSelect>
                  <AnimatedSelect
                    label="Sub tipo"
                    value={inc.tipoActualizado ?? ""}
                    onChange={(e) => {
                      const v = (e.target as HTMLSelectElement)
                        .value as any;
                      setI("tipoActualizado", v);
                      setI("subTipo", v || null);
                    }}
                  >
                    <option value="">—</option>
                    {SUB_TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </AnimatedSelect>

                  <AnimatedSelect
                    label="Vehículo/Placa"
                    value={inc.vehiculo}
                    onChange={(e) =>
                      setI("vehiculo", (e.target as HTMLSelectElement).value)
                    }
                  >
                    <option value="" disabled hidden>
                      Selecciona placa
                    </option>
                    {opcionesPlacas.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </AnimatedSelect>
                  <AnimatedInput
                    label="Responsable"
                    value={inc.responsable ?? ""}
                    onChange={(e) =>
                      setI(
                        "responsable",
                        (e.target as HTMLInputElement).value
                      )
                    }
                    placeholder="Nombre o código"
                  />

                  <AnimatedInput
                    label="Monto"
                    type="number"
                    inputMode="decimal"
                    value={String(inc.monto ?? "")}
                    onChange={(e) =>
                      setI(
                        "monto",
                        (e.target as HTMLInputElement).value === ""
                          ? null
                          : Number(
                              (e.target as HTMLInputElement).value
                            )
                      )
                    }
                    placeholder="0.00"
                  />
                  <AnimatedSelect
                    label="Moneda"
                    value={inc.moneda ?? "PEN"}
                    onChange={(e) =>
                      setI(
                        "moneda",
                        (e.target as HTMLSelectElement)
                          .value as Moneda
                      )
                    }
                  >
                    {MONEDAS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </AnimatedSelect>

                  <div className="sm:col-span-2">
                    <AnimatedTextArea
                      label="Descripción"
                      rows={3}
                      value={inc.descripcion ?? ""}
                      onChange={(e) =>
                        setI(
                          "descripcion",
                          (e.target as HTMLTextAreaElement).value
                        )
                      }
                      placeholder="Detalle del incidente (opcional)"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpenNew(false)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarIncidente}
                  className="btn-brand"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar */}
      {openEdit && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpenEdit(null)}
            aria-hidden
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-2xl rounded-2xl border bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="text-lg font-semibold">
                  Editar registro
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenEdit(null)}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <AnimatedSelect
                  label="Categoría"
                  value={eCat}
                  onChange={(e) =>
                    setECat(
                      (e.target as HTMLSelectElement).value as any
                    )
                  }
                >
                  <option value="">—</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </AnimatedSelect>
                <AnimatedSelect
                  label="Criticidad"
                  value={eCri}
                  onChange={(e) =>
                    setECri(
                      (e.target as HTMLSelectElement).value as any
                    )
                  }
                >
                  <option value="">—</option>
                  {CRITICIDADES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </AnimatedSelect>
                <AnimatedSelect
                  label="Tipo (base)"
                  value={eTipo}
                  onChange={(e) =>
                    setETipo(
                      (e.target as HTMLSelectElement).value as any
                    )
                  }
                >
                  {TIPOS_BASE.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </AnimatedSelect>
                <AnimatedSelect
                  label="Sub tipo"
                  value={eSub}
                  onChange={(e) =>
                    setESub(
                      (e.target as HTMLSelectElement).value as any
                    )
                  }
                >
                  <option value="">—</option>
                  {SUB_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </AnimatedSelect>
                <AnimatedSelect
                  label="Vehículo/Placa"
                  value={eVehiculo}
                  onChange={(e) =>
                    setEVehiculo(
                      (e.target as HTMLSelectElement).value
                    )
                  }
                >
                  {opcionesPlacas.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </AnimatedSelect>
                <AnimatedInput
                  label="Responsable"
                  value={eResp}
                  onChange={(e) =>
                    setEResp((e.target as HTMLInputElement).value)
                  }
                />
                <div className="sm:col-span-2">
                  <AnimatedTextArea
                    label="Descripción"
                    rows={3}
                    value={eDesc}
                    onChange={(e) =>
                      setEDesc(
                        (e.target as HTMLTextAreaElement).value
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpenEdit(null)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarEdicion}
                  className="btn-brand"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Costo */}
      {openCosto && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpenCosto(null)}
            aria-hidden
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl border bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="text-lg font-semibold">
                  Asignar costo
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenCosto(null)}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4 px-5 py-4">
                <AnimatedInput
                  label="Monto"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={montoTmp}
                  onChange={(e) =>
                    setMontoTmp(
                      (e.target as HTMLInputElement).value
                    )
                  }
                />
                <AnimatedSelect
                  label="Moneda"
                  value={monedaTmp}
                  onChange={(e) =>
                    setMonedaTmp(
                      (e.target as HTMLSelectElement)
                        .value as Moneda
                    )
                  }
                >
                  {MONEDAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </AnimatedSelect>
              </div>
              <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpenCosto(null)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarCosto}
                  className="btn-brand"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Facturar */}
      {openFacturar && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpenFacturar(null)}
            aria-hidden
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl border bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h3 className="text-lg font-semibold">
                  Facturar caso
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenFacturar(null)}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4 px-5 py-4">
                <AnimatedInput
                  label="N° de factura"
                  value={nroFacturaTmp}
                  onChange={(e) =>
                    setNroFacturaTmp(
                      (e.target as HTMLInputElement).value
                    )
                  }
                  placeholder="F001-000123"
                />
                <p className="text-xs text-gray-500">
                  Requiere <strong>responsable</strong> y{" "}
                  <strong>monto</strong> asignados.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
                <button
                  type="button"
                  onClick={() => setOpenFacturar(null)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={facturar}
                  className="btn-brand"
                >
                  Facturar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM: Desestimar */}
      <ConfirmDialog
        open={!!openDesestimar}
        title="Desestimar caso"
        description="¿Confirmas desestimar este caso? No se podrán realizar más acciones."
        onCancel={() => setOpenDesestimar(null)}
        onConfirm={desestimar}
        confirmText="Desestimar"
      />

      {/* CONFIRM: Notificar */}
      <ConfirmDialog
        open={!!openConfirmNotificar}
        title="Confirmar notificación"
        description="¿Estás seguro de notificar este caso? Pasará de 'Pendiente' a 'Notificado'."
        onCancel={() => setOpenConfirmNotificar(null)}
        onConfirm={confirmarNotificar}
        confirmText="Sí, notificar"
      />
    </div>
  );
}
