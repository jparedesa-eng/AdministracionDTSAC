// src/pages/Camionetas/Inventario.tsx
import React from "react";
import {
  PencilLine,
  Save,
  Search,
  Plus,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  UserPlus,
  History,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { camionetasStore, type HistorialResponsable } from "../../store/camionetasStore";
import { searchByDni } from "../../store/personalStore";
import { supabase } from "../../supabase/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";
import { notificationsStore } from "../../store/notificationsStore";
import { useAuth } from "../../auth/AuthContext";

/* =========================
   Tipos y utilidades
========================= */
// Estados permitidos en UI (los únicos que se pueden asignar manualmente)
type EstadoVehiculoUI = "Disponible" | "Mantenimiento" | "Inactivo";
// Estado que puede venir desde la BD (por compatibilidad si quedaron registros viejos)
type EstadoVehiculoDB = EstadoVehiculoUI | "En uso";

type FiltroTipo = EstadoVehiculoUI | "Todos" | "DocVencida";

type VolanteTipo = "Si" | "No";

type Vehiculo = {
  id: string;
  placa: string; // 6 alfanuméricos sin guiones
  marca: string;
  modelo: string;
  traccion: "4x2" | "4x4";
  color: string;
  responsable: string;
  dniResponsable: string; // NUEVO
  proveedor: string;
  revTecnica: string; // YYYY-MM-DD
  soat: string; // YYYY-MM-DD
  fechaIngreso?: string; // NUEVO
  estado: EstadoVehiculoDB;
  volante: VolanteTipo;
  zona?: "Arequipa" | "Trujillo" | "Olmos" | "Lima" | null;
};

/* Mapas DB <-> UI */
const fromDb = (r: any): Vehiculo => ({
  id: r.id,
  placa: r.placa,
  marca: r.marca,
  modelo: r.modelo,
  traccion: r.traccion,
  color: r.color,
  responsable: r.responsable ?? "",
  dniResponsable: r.dni_responsable ?? "",
  proveedor: r.proveedor ?? "",
  revTecnica: r.rev_tecnica,
  soat: r.soat,
  fechaIngreso: r.fecha_ingreso,
  estado: r.estado as EstadoVehiculoDB,
  volante:
    r.volante === "Si" || r.volante === "No"
      ? (r.volante as VolanteTipo)
      : "No",
  zona: r.zona,
});

const toDb = (v: Vehiculo) => ({
  // OJO: en CREATE no enviaremos id para que lo genere la DB
  id: v.id,
  placa: v.placa,
  marca: v.marca,
  modelo: v.modelo,
  traccion: v.traccion,
  color: v.color,
  responsable: v.responsable || null,
  dni_responsable: v.dniResponsable || null,
  proveedor: v.proveedor || null,
  rev_tecnica: v.revTecnica,
  soat: v.soat,
  fecha_ingreso: v.fechaIngreso,
  estado: v.estado,
  volante: v.volante,
  zona: v.zona || null,
});

// Solo A-Z y 0-9, mayúsculas, máximo 6
const sanitizePlaca = (val: string) =>
  val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);

/* =========================
   UI peque
========================= */
function EstadoBadge({ estado }: { estado: EstadoVehiculoDB }) {
  const styles: Record<EstadoVehiculoDB, string> = {
    Disponible: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    // Mantengo estilo para "En uso" por compatibilidad (si existen registros viejos)
    "En uso": "bg-blue-100 text-blue-800 ring-blue-200",
    Mantenimiento: "bg-amber-100 text-amber-800 ring-amber-200",
    Inactivo: "bg-rose-100 text-rose-800 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[estado] || "bg-gray-100 text-gray-700 ring-gray-200"
        }`}
    >
      {estado}
    </span>
  );
}

function FechaVencimiento({ dateStr }: { dateStr: string }) {
  if (!dateStr) return <span className="text-gray-400">-</span>;

  const today = new Date();
  const target = new Date(dateStr);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Lógica de alerta
  // Vencido: < 0
  // Por vencer: < 30 días
  let colorClass = "text-gray-600";
  let icon = null;

  if (diffDays < 0) {
    colorClass = "text-rose-600 font-bold";
    icon = <AlertCircle className="mr-1 h-3 w-3" />;
  } else if (diffDays < 30) {
    colorClass = "text-amber-600 font-bold";
    icon = <AlertTriangle className="mr-1 h-3 w-3" />;
  }

  // Formato compacto DD/MM/YY
  const formatted = target.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  return (
    <div className={`inline-flex items-center text-xs ${colorClass}`}>
      {icon}
      <span>{formatted}</span>
    </div>
  );
}

/* =========================
   APIs Supabase (robustas)
========================= */
async function apiFetchVehiculos({
  q,
  estado,
  page,
  pageSize,
  soloVolantes,
  zona,
}: {
  q: string;
  estado: FiltroTipo;
  page: number;
  pageSize: number;
  soloVolantes?: boolean;
  zona?: string;
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("vehiculos")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q.trim()) {
    const term = q.trim();
    query = query.or(
      `placa.ilike.%${term}%,marca.ilike.%${term}%,modelo.ilike.%${term}%,responsable.ilike.%${term}%,dni_responsable.ilike.%${term}%,proveedor.ilike.%${term}%`
    );
  }
  if (estado === "DocVencida") {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    // Usar OR: (rev_tecnica < today) OR (soat < today)
    query = query.or(`rev_tecnica.lt.${today},soat.lt.${today}`);
  } else if (estado !== "Todos") {
    query = query.eq("estado", estado);
  }

  if (soloVolantes) {
    query = query.eq("volante", "Si");
  }

  if (zona && zona !== "Todas") {
    query = query.eq("zona", zona);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Error(error.message || "Error al cargar inventario");
  }
  return {
    rows: (data || []).map(fromDb),
    total: count ?? 0,
  };
}

// CREATE robusto: la DB genera el id
async function apiCreateVehiculo(v: Vehiculo) {
  const { id: _omit, ...rest } = toDb(v); // omitimos id
  const { data, error } = await supabase
    .from("vehiculos")
    .insert([rest])
    .select("*")
    .single();
  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error(error.message || "Error al crear el vehículo");
  }
  return fromDb(data);
}

async function apiUpdateVehiculo(v: Vehiculo) {
  const { data, error } = await supabase
    .from("vehiculos")
    .update(toDb(v))
    .eq("id", v.id)
    .select("*")
    .single();
  if (error) {
    console.error("Supabase update error:", error);
    throw new Error(error.message || "Error al guardar cambios");
  }
  return fromDb(data);
}

async function apiUpdateEstado(id: string, estado: EstadoVehiculoUI) {
  const { data, error } = await supabase
    .from("vehiculos")
    .update({ estado })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    console.error("Supabase estado error:", error);
    throw new Error(error.message || "Error al cambiar estado");
  }
  return fromDb(data);
}

async function apiUpdateVolante(id: string, volante: VolanteTipo) {
  const { data, error } = await supabase
    .from("vehiculos")
    .update({ volante })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    console.error("Supabase volante error:", error);
    throw new Error(error.message || "Error al cambiar volante");
  }
  return fromDb(data);
}

// Nueva función para obtener contadores totales
async function apiFetchVehiculoStats() {
  // Pedimos solo la columna estado de TODOS los vehículos
  const { data, error } = await supabase
    .from("vehiculos")
    // Traemos estado, rev_tecnica y soat para calcular estadísticas
    .select("estado, rev_tecnica, soat");

  if (error) {
    console.error("Error fetching stats:", error);
    return { disponible: 0, mantenimiento: 0, inactivo: 0, docVencida: 0 };
  }

  const rows = data || [];
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const disponible = rows.filter((r) => r.estado === "Disponible").length;
  const mantenimiento = rows.filter((r) => r.estado === "Mantenimiento").length;
  const inactivo = rows.filter((r) => r.estado === "Inactivo").length;

  // Contar registros con CUALQUIERA de los documentos vencidos
  const docVencida = rows.filter((r) => {
    const revVencida = r.rev_tecnica && r.rev_tecnica < today;
    const soatVencido = r.soat && r.soat < today;
    return revVencida || soatVencido;
  }).length;

  return { disponible, mantenimiento, inactivo, docVencida };
}

/* =========================
   Página principal
========================= */
export default function Inventario() {
  // const PAGE_SIZE = 10; // Removed constant
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Filtros / control
  const [q, setQ] = React.useState("");
  const [estadoFiltro, setEstadoFiltro] =
    React.useState<FiltroTipo>("Todos");
  const [zonaFiltro, setZonaFiltro] = React.useState<string>("Todas");
  const [page, setPage] = React.useState(1);

  // Datos de backend
  const [rows, setRows] = React.useState<Vehiculo[]>([]);
  const [total, setTotal] = React.useState(0);

  // Modales
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<Vehiculo | null>(null);

  const [statusOpen, setStatusOpen] = React.useState(false);
  const [statusLoading, setStatusLoading] = React.useState(false);
  const [statusVeh, setStatusVeh] = React.useState<Vehiculo | null>(null);
  const [statusDraft, setStatusDraft] =
    React.useState<EstadoVehiculoUI>("Disponible");

  const [soloVolantes, setSoloVolantes] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createLoading, setCreateLoading] = React.useState(false);
  const [createDraft, setCreateDraft] = React.useState<Vehiculo>({
    id: "",
    placa: "",
    marca: "",
    modelo: "",
    traccion: "4x2",
    color: "",
    responsable: "",
    dniResponsable: "",
    proveedor: "",
    revTecnica: "",
    soat: "",
    fechaIngreso: "",
    estado: "Disponible",
    volante: "No",
    zona: null,
  });

  // Confirmación de cambio de volante
  const [volanteModalVeh, setVolanteModalVeh] = React.useState<Vehiculo | null>(null);
  const [volanteNuevoValor, setVolanteNuevoValor] =
    React.useState<VolanteTipo>("Si");
  const [volanteSaving, setVolanteSaving] = React.useState(false);
  const [volanteLoadingId, setVolanteLoadingId] =
    React.useState<string | null>(null);

  // Carga
  const [loading, setLoading] = React.useState(false);
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  // KPIs globales
  const [kpiStats, setKpiStats] = React.useState({
    disponible: 0,
    mantenimiento: 0,
    inactivo: 0,
    docVencida: 0,
  });

  // Estado para Asignación
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignLoading, setAssignLoading] = React.useState(false);
  const [assignDraft, setAssignDraft] = React.useState({
    vehiculoId: "",
    placa: "",
    responsable: "",
    dniResponsable: "",
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaFin: "",
    tipoAsignacion: "Indefinida" as "Indefinida" | "Rango",
    observacion: "",
    zona: "",
    isLocked: false, // New state for locking name
  });

  // Estado para Historial
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyData, setHistoryData] = React.useState<HistorialResponsable[]>([]);
  const [historyVehiculo, setHistoryVehiculo] = React.useState<Vehiculo | null>(null);

  // Toast global
  const [toast, setToast] = React.useState<ToastState>(null);

  const PAGE_TOTAL_MIN = 1;
  const totalPages = rowsPerPage === 0 ? 1 : Math.max(PAGE_TOTAL_MIN, Math.ceil(total / rowsPerPage));
  const pageSafe = Math.min(page, totalPages);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await apiFetchVehiculos({
        q,
        estado: estadoFiltro,
        page,
        pageSize: rowsPerPage === 0 ? 10000 : rowsPerPage, // Handle "All"
        soloVolantes,
        zona: zonaFiltro,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      const msg = e?.message || "Error al cargar inventario";
      setErrMsg(msg);
      setToast({
        type: "error",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [q, estadoFiltro, page, rowsPerPage, soloVolantes, zonaFiltro]);

  const loadStats = React.useCallback(async () => {
    try {
      const stats = await apiFetchVehiculoStats();
      setKpiStats(stats);
    } catch (error) {
      console.error(error);
    }
  }, []);

  React.useEffect(() => {
    setPage(1);
  }, [q, estadoFiltro, soloVolantes, zonaFiltro]);

  React.useEffect(() => {
    load();
    loadStats(); // Cargamos stats al inicio también
  }, [load, loadStats]);

  // Trigger Notification: Expired Docs
  const { user } = useAuth() as any; // Cast simple para evitar líos de tipos si AuthContext no exporta exacto
  React.useEffect(() => {
    if (kpiStats.docVencida > 0 && user?.id) {
      // Throttle: Notify once per day per user using localStorage
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const key = `notified_expired_${user.id}_${today}`;

      if (!localStorage.getItem(key)) {
        notificationsStore.createNotification(
          user.id,
          "Documentos Vencidos",
          `Atención: Existen ${kpiStats.docVencida} vehículos con documentos vencidos o por vencer. Revisa el inventario.`,
          "warning"
        );
        localStorage.setItem(key, "true");
      }
    }
  }, [kpiStats.docVencida, user]);

  /* Acciones */
  const openEdit = (v: Vehiculo) => {
    setEditDraft({ ...v });
    setEditOpen(true);
  };

  const handleEditChange = <K extends keyof Vehiculo>(
    key: K,
    value: Vehiculo[K]
  ) => {
    setEditDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft) return;
    setEditLoading(true);
    try {
      const updated = await apiUpdateVehiculo(editDraft);
      setRows((arr) => arr.map((it) => (it.id === updated.id ? updated : it)));
      // Actualizamos stats por si cambió estado via edit (aunque raro)
      loadStats();
      setToast({
        type: "success",
        message: "Vehículo actualizado correctamente.",
      });
    } catch (e: any) {
      setToast({
        type: "error",
        message: e?.message ?? "Error al guardar cambios.",
      });
    } finally {
      setEditLoading(false);
      setEditOpen(false);
      setEditDraft(null);
    }
  };

  const openChangeStatus = (v: Vehiculo) => {
    setStatusVeh(v);
    const safe =
      v.estado === "En uso" ? "Disponible" : (v.estado as EstadoVehiculoUI);
    setStatusDraft(safe);
    setStatusOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusVeh) return;
    setStatusLoading(true);
    try {
      const updated = await apiUpdateEstado(statusVeh.id, statusDraft);
      setRows((arr) => arr.map((it) => (it.id === updated.id ? updated : it)));
      loadStats();
      setToast({
        type: "success",
        message: "Estado actualizado correctamente.",
      });
    } catch (e: any) {
      setToast({
        type: "error",
        message: e?.message ?? "Error al cambiar el estado.",
      });
    } finally {
      setStatusLoading(false);
      setStatusOpen(false);
      setStatusVeh(null);
    }
  };

  const openCreate = () => {
    setCreateOpen(true);
  };

  const resetCreateDraft = () => {
    setCreateDraft({
      id: "",
      placa: "",
      marca: "",
      modelo: "",
      traccion: "4x2",
      color: "",
      responsable: "",
      dniResponsable: "",
      proveedor: "",
      revTecnica: "",
      soat: "",
      estado: "Disponible",
      volante: "No",
      zona: null,
    });
  };

  const handleCreateChange = <K extends keyof Vehiculo>(
    key: K,
    value: Vehiculo[K]
  ) => {
    setCreateDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await apiCreateVehiculo(createDraft);
      setToast({
        type: "success",
        message: "Camioneta creada correctamente.",
      });
      resetCreateDraft();
      setCreateOpen(false);
      setPage(1);
      await load();
      loadStats();
    } catch (e: any) {
      setToast({
        type: "error",
        message: e?.message ?? "Error al crear la camioneta.",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Abrir modal para confirmar cambio de volante
  const openVolanteModal = (veh: Vehiculo) => {
    const nuevo: VolanteTipo = veh.volante === "Si" ? "No" : "Si";
    setVolanteModalVeh(veh);
    setVolanteNuevoValor(nuevo);
  };

  const handleConfirmVolante = async () => {
    if (!volanteModalVeh) return;
    const veh = volanteModalVeh;
    setVolanteSaving(true);
    setVolanteLoadingId(veh.id);
    try {
      const updated = await apiUpdateVolante(veh.id, volanteNuevoValor);
      setRows((arr) => arr.map((it) => (it.id === updated.id ? updated : it)));
      setToast({
        type: "success",
        message: `Volante actualizado a "${volanteNuevoValor}".`,
      });
    } catch (e: any) {
      setToast({
        type: "error",
        message: e?.message ?? "No se pudo cambiar el volante.",
      });
    } finally {
      setVolanteSaving(false);
      setVolanteLoadingId(null);
      setVolanteModalVeh(null);
    }
  };

  /* Asignación y Historial Handlers */
  const openAssign = (v: Vehiculo) => {
    setAssignDraft({
      vehiculoId: v.id,
      placa: v.placa,
      responsable: "",
      dniResponsable: "",
      fechaInicio: new Date().toISOString().slice(0, 10),
      fechaFin: "",
      tipoAsignacion: "Indefinida",
      observacion: "",
      zona: v.zona || "",
      isLocked: false,
    });
    setAssignOpen(true);
  };

  const handleAssignDniChange = async (val: string) => {
    // 1. Update DNI in draft
    setAssignDraft((prev) => ({ ...prev, dniResponsable: val }));

    // 2. Logic: if 8 digits, search. If delete, clear name/unlock.
    if (val.length === 8) {
      setAssignLoading(true); // Reuse loading or add searching state? Reuse for now implies blocking.
      try {
        const found = await searchByDni(val);
        if (found) {
          setAssignDraft((prev) => ({
            ...prev,
            dniResponsable: val,
            responsable: found.nombre,
            isLocked: true
          }));
          setToast({ type: "success", message: "Personal encontrado." });
        } else {
          // Not found: let user type name
          setAssignDraft((prev) => ({ ...prev, isLocked: false }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAssignLoading(false);
      }
    } else {
      // If user deletes any digit (length < 8), clear name and unlock
      // "si se borra un numero del dni borra el nombre"
      // Check if we are coming from a locked state or just typing?
      // Strict interpretation: if invalid DNI, clear name.
      // But maybe user is typing... let's just unlock and clear if it WAS locked?
      // Or just always clear if length < 8? That might be annoying if typing manually.
      // "si se borra un numero del dni borra el nombre" -> implies if I had a full DNI and I delete one, clear name.
      // To be safe and compliant: if length changed and is < 8, unlock.
      // If it WAS 8 and now is 7 (deletion), clear name.
      // Simpler: If length < 8, unlock. If locked, clear name.
      setAssignDraft((prev) => {
        if (prev.isLocked) {
          return { ...prev, dniResponsable: val, responsable: "", isLocked: false };
        }
        return { ...prev, dniResponsable: val, isLocked: false };
      });
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignLoading(true);
    try {
      if (!assignDraft.zona) {
        setToast({ type: "error", message: "Debe indicar una zona." });
        setAssignLoading(false);
        return;
      }

      await camionetasStore.asignarResponsable({
        vehiculoId: assignDraft.vehiculoId,
        responsable: assignDraft.responsable,
        dniResponsable: assignDraft.dniResponsable,
        fechaInicio: new Date(assignDraft.fechaInicio).toISOString(),
        fechaFin: assignDraft.fechaFin ? new Date(assignDraft.fechaFin).toISOString() : null,
        tipoAsignacion: assignDraft.tipoAsignacion,
        observacion: assignDraft.observacion,
        zona: assignDraft.zona as "Arequipa" | "Trujillo" | "Olmos" | "Lima",
      });

      setToast({ type: "success", message: "Responsable asignado correctamente." });
      setAssignOpen(false);
      load(); // Reload table to show new responsible
    } catch (error: any) {
      setToast({ type: "error", message: error.message || "Error al asignar responsable." });
    } finally {
      setAssignLoading(false);
    }
  };

  const openHistory = async (v: Vehiculo) => {
    setHistoryVehiculo(v);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await camionetasStore.fetchHistorial(v.id);
      setHistoryData(data);
    } catch (error: any) {
      setToast({ type: "error", message: "Error cargando historial." });
    } finally {
      setHistoryLoading(false);
    }
  };

  // KPI: usar kpiStats en lugar de rows.filter
  const { disponible, mantenimiento, inactivo, docVencida } = kpiStats;

  return (
    <div className="space-y-5">
      {/* Título */}
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Inventario de vehículos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Administra las camionetas. La visibilidad se controla con el estado
          (Disponible, Mantenimiento, Inactivo).
        </p>
      </div>


      {/* KPIs Simplificados */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Disponibles */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Disponibles</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {disponible}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Mantenimiento */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Mantenimiento
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {mantenimiento}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Inactivos */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Inactivos</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{inactivo}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Doc Vencida */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Doc. Vencida</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{docVencida}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros / Acciones - Diseño Limpio */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            placeholder="Buscar vehículo..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Solo Volantes */}
          <button
            onClick={() => setSoloVolantes(!soloVolantes)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${soloVolantes
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
          >
            {soloVolantes ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-gray-400" />
            )}
            Solo Volantes
          </button>

          {/* Filtro de Zonas */}
          <select
            value={zonaFiltro}
            onChange={(e) => setZonaFiltro(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="Todas">Todas Zonas</option>
            <option value="Arequipa">Arequipa</option>
            <option value="Trujillo">Trujillo</option>
            <option value="Olmos">Olmos</option>
            <option value="Lima">Lima</option>
          </select>

          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            {(
              ["Todos", "Disponible", "Mantenimiento", "Inactivo", "DocVencida"] as FiltroTipo[]
            ).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setEstadoFiltro(opt)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${estadoFiltro === opt
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {opt === "DocVencida" ? "Doc. Vencida" : opt}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#ff0000] px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Placa / Info</th>
                <th className="px-4 py-3">Marca / Modelo</th>
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3">Volante</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Fecha Ingreso</th>
                <th className="px-4 py-3">Rev. Técnica</th>
                <th className="px-4 py-3">SOAT</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando inventario...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    {errMsg ?? "No se encontraron vehículos."}
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((v) => (
                  <tr
                    key={v.id}
                    className="group hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-base">
                          {v.placa}
                        </span>
                        <span className="text-xs text-gray-500">
                          {v.color} • {v.traccion}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">
                          {v.marca}
                        </span>
                        <span className="text-xs text-gray-500">{v.modelo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {v.zona || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {v.volante === "Si" ? "Sí" : "No"}
                    </td>
                    <td className="px-4 py-3">
                      {v.responsable ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {v.responsable}
                          </span>
                          {v.dniResponsable && (
                            <span className="text-xs text-gray-400 font-mono">
                              DNI: {v.dniResponsable}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs italic">- Sin asignar -</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {v.proveedor || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {v.fechaIngreso || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <FechaVencimiento dateStr={v.revTecnica} />
                    </td>
                    <td className="px-4 py-3">
                      <FechaVencimiento dateStr={v.soat} />
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={v.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <div className="flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-100 p-1">
                          <button
                            type="button"
                            onClick={() => openAssign(v)}
                            className="rounded p-1.5 text-indigo-600 hover:bg-white hover:shadow-sm transition-all"
                            title="Asignar Responsable"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                          <div className="h-4 w-px bg-gray-200" />
                          <button
                            type="button"
                            onClick={() => openHistory(v)}
                            className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all"
                            title="Ver Historial"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-100 p-1">
                          <button
                            type="button"
                            onClick={() => openVolanteModal(v)}
                            disabled={volanteLoadingId === v.id}
                            className="rounded p-1.5 text-violet-600 hover:bg-white hover:shadow-sm transition-all disabled:opacity-50"
                            title="Cambiar volante"
                          >
                            {volanteLoadingId === v.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </button>
                          <div className="h-4 w-px bg-gray-200" />
                          <button
                            type="button"
                            onClick={() => openChangeStatus(v)}
                            className="rounded p-1.5 text-orange-600 hover:bg-white hover:shadow-sm transition-all"
                            title="Cambiar estado"
                          >
                            <Shuffle className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => openEdit(v)}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-blue-600 hover:bg-white hover:shadow-sm transition-all ml-1"
                          title="Editar"
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación - Telefonia Style */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium uppercase">
              Filas:
            </span>
            <select
              className="rounded border-none text-gray-500 py-1 pl-2 pr-6 text-sm focus:ring-0 bg-transparent cursor-pointer hover:text-gray-700"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={pageSafe === 1 || loading}
              className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Primera Página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1 || loading}
              className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Página Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-medium px-4 text-gray-400">
              {pageSafe} / {Math.max(PAGE_TOTAL_MIN, totalPages)}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages || loading}
              className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Página Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={pageSafe === totalPages || loading}
              className="p-2 rounded hover:bg-gray-50 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Última Página"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Editar */}
      <Modal
        open={editOpen && !!editDraft}
        title="Editar vehículo"
        size="lg"
        onClose={() => {
          if (editLoading) return;
          setEditOpen(false);
          setEditDraft(null);
        }}
      >
        {editDraft && (
          <form onSubmit={handleEditSubmit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Placa (6 alfanuméricos)
                </label>
                <input
                  pattern="[A-Za-z0-9]{0,6}"
                  maxLength={6}
                  value={editDraft.placa}
                  onChange={(e) =>
                    handleEditChange("placa", sanitizePlaca(e.target.value))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="ABC123"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Marca
                </label>
                <input
                  value={editDraft.marca}
                  onChange={(e) =>
                    handleEditChange("marca", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Toyota"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Modelo
                </label>
                <input
                  value={editDraft.modelo}
                  onChange={(e) =>
                    handleEditChange("modelo", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Hilux 2.4"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Tracción
                </label>
                <select
                  value={editDraft.traccion}
                  onChange={(e) =>
                    handleEditChange(
                      "traccion",
                      e.target.value as "4x2" | "4x4"
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="4x2">4x2</option>
                  <option value="4x4">4x4</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Volante
                </label>
                <select
                  value={editDraft.volante}
                  onChange={(e) =>
                    handleEditChange("volante", e.target.value as VolanteTipo)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Zona
                </label>
                <select
                  value={editDraft.zona || ""}
                  onChange={(e) =>
                    handleEditChange("zona", e.target.value as any)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">- Seleccionar -</option>
                  <option value="Arequipa">Arequipa</option>
                  <option value="Trujillo">Trujillo</option>
                  <option value="Olmos">Olmos</option>
                  <option value="Lima">Lima</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Color
                </label>
                <input
                  value={editDraft.color}
                  onChange={(e) =>
                    handleEditChange("color", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Blanco"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Responsable asignado (Lectura)
                </label>
                <input
                  value={editDraft.responsable}
                  readOnly
                  disabled
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 shadow-sm outline-none"
                  placeholder="Sin asignar"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Gestione desde la tabla.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  DNI Responsable (Lectura)
                </label>
                <input
                  value={editDraft.dniResponsable}
                  readOnly
                  disabled
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 shadow-sm outline-none"
                  placeholder="-"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Proveedor (tercero)
                </label>
                <input
                  value={editDraft.proveedor}
                  onChange={(e) =>
                    handleEditChange("proveedor", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Empresa de alquiler"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={editDraft.fechaIngreso || ""}
                  onChange={(e) =>
                    handleEditChange("fechaIngreso", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Rev. técnica
                </label>
                <input
                  type="date"
                  value={editDraft.revTecnica}
                  onChange={(e) =>
                    handleEditChange("revTecnica", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  SOAT
                </label>
                <input
                  type="date"
                  value={editDraft.soat}
                  onChange={(e) =>
                    handleEditChange("soat", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (editLoading) return;
                  setEditOpen(false);
                  setEditDraft(null);
                }}
                className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              >
                {editLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Cambiar estado */}
      <Modal
        open={statusOpen && !!statusVeh}
        title={
          statusVeh ? `Cambiar estado — ${statusVeh.placa}` : "Cambiar estado"
        }
        size="sm"
        onClose={() => {
          if (statusLoading) return;
          setStatusOpen(false);
          setStatusVeh(null);
        }}
      >
        {statusVeh && (
          <form onSubmit={handleStatusSubmit}>
            <label className="text-sm font-medium text-gray-700">
              Nuevo estado
            </label>
            <select
              value={statusDraft}
              onChange={(e) =>
                setStatusDraft(e.target.value as EstadoVehiculoUI)
              }
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Disponible">Disponible</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Inactivo">Inactivo</option>
            </select>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (statusLoading) return;
                  setStatusOpen(false);
                  setStatusVeh(null);
                }}
                className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={statusLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              >
                {statusLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4" />
                    Cambiar
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Crear */}
      <Modal
        open={createOpen}
        title="Añadir camioneta"
        size="lg"
        onClose={() => {
          if (createLoading) return;
          setCreateOpen(false);
        }}
      >
        <form onSubmit={handleCreateSubmit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Placa (6 alfanuméricos)
              </label>
              <input
                pattern="[A-Za-z0-9]{0,6}"
                maxLength={6}
                value={createDraft.placa}
                onChange={(e) =>
                  handleCreateChange("placa", sanitizePlaca(e.target.value))
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="ABC123"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Marca
              </label>
              <input
                value={createDraft.marca}
                onChange={(e) =>
                  handleCreateChange("marca", e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Toyota"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Modelo
              </label>
              <input
                value={createDraft.modelo}
                onChange={(e) =>
                  handleCreateChange("modelo", e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Hilux 2.4"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Tracción
              </label>
              <select
                value={createDraft.traccion}
                onChange={(e) =>
                  handleCreateChange(
                    "traccion",
                    e.target.value as "4x2" | "4x4"
                  )
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="4x2">4x2</option>
                <option value="4x4">4x4</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Volante
              </label>
              <select
                value={createDraft.volante}
                onChange={(e) =>
                  handleCreateChange("volante", e.target.value as VolanteTipo)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Zona
              </label>
              <select
                value={createDraft.zona || ""}
                onChange={(e) =>
                  handleCreateChange("zona", e.target.value as any)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">- Seleccionar -</option>
                <option value="Arequipa">Arequipa</option>
                <option value="Trujillo">Trujillo</option>
                <option value="Olmos">Olmos</option>
                <option value="Lima">Lima</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Color
              </label>
              <input
                value={createDraft.color}
                onChange={(e) =>
                  handleCreateChange("color", e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Blanco"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Responsable asignado
              </label>
              <input
                value={createDraft.responsable}
                readOnly
                disabled
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 shadow-sm outline-none"
                placeholder="Se asigna después de crear"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                DNI Responsable
              </label>
              <input
                value={createDraft.dniResponsable}
                readOnly
                disabled
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 shadow-sm outline-none"
                placeholder="-"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Proveedor (tercero)
              </label>
              <input
                value={createDraft.proveedor}
                onChange={(e) =>
                  handleCreateChange("proveedor", e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Empresa de alquiler"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                F. Ingreso
              </label>
              <input
                type="date"
                value={createDraft.fechaIngreso || ""}
                onChange={(e) =>
                  handleCreateChange("fechaIngreso", e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Rev. técnica
              </label>
              <input
                type="date"
                value={createDraft.revTecnica}
                onChange={(e) =>
                  handleCreateChange("revTecnica", e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                SOAT
              </label>
              <input
                type="date"
                value={createDraft.soat}
                onChange={(e) =>
                  handleCreateChange("soat", e.target.value)
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                value={createDraft.estado as EstadoVehiculoUI}
                onChange={(e) =>
                  handleCreateChange(
                    "estado",
                    e.target.value as EstadoVehiculoUI
                  )
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Disponible">Disponible</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (createLoading) return;
                setCreateOpen(false);
              }}
              className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            >
              {createLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmación Volante */}
      <Modal
        open={!!volanteModalVeh}
        title="Cambiar volante"
        size="sm"
        onClose={() => {
          if (volanteSaving) return;
          setVolanteModalVeh(null);
        }}
      >
        {volanteModalVeh && (
          <>
            <p className="text-sm text-slate-700">
              ¿Deseas marcar el volante de la placa{" "}
              <span className="font-semibold">{volanteModalVeh.placa}</span> como{" "}
              <span className="font-semibold">
                {volanteNuevoValor === "Si" ? "Sí" : "No"}
              </span>
              ?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={volanteSaving}
                onClick={() => {
                  if (volanteSaving) return;
                  setVolanteModalVeh(null);
                }}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVolante}
                disabled={volanteSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff0000] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
              >
                {volanteSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Asignar Responsable */}
      <Modal
        open={assignOpen}
        title="Asignar Responsable"
        size="md"
        onClose={() => setAssignOpen(false)}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            Asignando a: <span className="font-bold">{assignDraft.placa}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">DNI Responsable</label>
              <input
                value={assignDraft.dniResponsable}
                maxLength={8}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                  handleAssignDniChange(val);
                }}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Responsable</label>
              <input
                value={assignDraft.responsable}
                disabled={assignDraft.isLocked}
                readOnly={assignDraft.isLocked}
                onChange={(e) =>
                  setAssignDraft({ ...assignDraft, responsable: e.target.value })
                }
                className={`mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${assignDraft.isLocked ? "bg-gray-100 text-gray-500" : ""
                  }`}
                placeholder="Nombre completo"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Zona</label>
              <select
                value={assignDraft.zona}
                onChange={(e) => setAssignDraft({ ...assignDraft, zona: e.target.value })}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              >
                <option value="">- Seleccionar -</option>
                <option value="Arequipa">Arequipa</option>
                <option value="Trujillo">Trujillo</option>
                <option value="Olmos">Olmos</option>
                <option value="Lima">Lima</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Tipo Asignación</label>
              <select
                value={assignDraft.tipoAsignacion}
                onChange={(e) =>
                  setAssignDraft({
                    ...assignDraft,
                    tipoAsignacion: e.target.value as "Indefinida" | "Rango",
                  })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Indefinida">Indefinida</option>
                <option value="Rango">Rango de Fechas</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha Inicio</label>
              <input
                type="date"
                value={assignDraft.fechaInicio}
                onChange={(e) =>
                  setAssignDraft({ ...assignDraft, fechaInicio: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {assignDraft.tipoAsignacion === "Rango" && (
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha Fin</label>
              <input
                type="date"
                value={assignDraft.fechaFin}
                onChange={(e) =>
                  setAssignDraft({ ...assignDraft, fechaFin: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Observación</label>
            <textarea
              value={assignDraft.observacion}
              onChange={(e) =>
                setAssignDraft({ ...assignDraft, observacion: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              rows={2}
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssignOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={assignLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff0000] px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {assignLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Asignación"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Historial Responsables */}
      <Modal
        open={historyOpen}
        title={`Historial: ${historyVehiculo?.placa || ""}`}
        size="lg"
        onClose={() => setHistoryOpen(false)}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : historyData.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No hay historial registrado.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2">DNI</th>
                  <th className="px-3 py-2">Inicio</th>
                  <th className="px-3 py-2">Fin</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Obs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                {historyData.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {h.responsable}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{h.dniResponsable || "-"}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(h.fechaInicio).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {h.fechaFin ? new Date(h.fechaFin).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{h.tipoAsignacion}</td>
                    <td className="px-3 py-2 text-gray-500 italic">
                      {h.observacion || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Toast global */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div >
  );
}
