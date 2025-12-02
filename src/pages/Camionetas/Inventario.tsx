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
} from "lucide-react";
import { supabase } from "../../supabase/supabaseClient";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import type { ToastState } from "../../components/ui/Toast";

/* =========================
   Tipos y utilidades
========================= */
// Estados permitidos en UI (los únicos que se pueden asignar manualmente)
type EstadoVehiculoUI = "Disponible" | "Mantenimiento" | "Inactivo";
// Estado que puede venir desde la BD (por compatibilidad si quedaron registros viejos)
type EstadoVehiculoDB = EstadoVehiculoUI | "En uso";

type VolanteTipo = "Si" | "No";

type Vehiculo = {
  id: string;
  placa: string; // 6 alfanuméricos sin guiones
  marca: string;
  modelo: string;
  traccion: "4x2" | "4x4";
  color: string;
  responsable: string;
  proveedor: string;
  revTecnica: string; // YYYY-MM-DD
  soat: string; // YYYY-MM-DD
  estado: EstadoVehiculoDB;
  volante: VolanteTipo; // NUEVO
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
  proveedor: r.proveedor ?? "",
  revTecnica: r.rev_tecnica,
  soat: r.soat,
  estado: r.estado as EstadoVehiculoDB,
  volante:
    r.volante === "Si" || r.volante === "No"
      ? (r.volante as VolanteTipo)
      : "No",
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
  proveedor: v.proveedor || null,
  rev_tecnica: v.revTecnica,
  soat: v.soat,
  estado: v.estado,
  volante: v.volante,
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        styles[estado] || "bg-gray-100 text-gray-700 ring-gray-200"
      }`}
    >
      {estado}
    </span>
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
}: {
  q: string;
  estado: EstadoVehiculoUI | "Todos";
  page: number;
  pageSize: number;
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
      `placa.ilike.%${term}%,marca.ilike.%${term}%,modelo.ilike.%${term}%,responsable.ilike.%${term}%,proveedor.ilike.%${term}%`
    );
  }
  if (estado !== "Todos") {
    query = query.eq("estado", estado);
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

/* =========================
   Página principal
========================= */
export default function Inventario() {
  const PAGE_SIZE = 10;

  // Filtros / control
  const [q, setQ] = React.useState("");
  const [estadoFiltro, setEstadoFiltro] =
    React.useState<EstadoVehiculoUI | "Todos">("Todos");
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
    proveedor: "",
    revTecnica: "",
    soat: "",
    estado: "Disponible",
    volante: "No",
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

  // Toast global
  const [toast, setToast] = React.useState<ToastState>(null);

  const PAGE_TOTAL_MIN = 1;
  const totalPages = Math.max(PAGE_TOTAL_MIN, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await apiFetchVehiculos({
        q,
        estado: estadoFiltro,
        page,
        pageSize: PAGE_SIZE,
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
  }, [q, estadoFiltro, page]);

  React.useEffect(() => {
    setPage(1);
  }, [q, estadoFiltro]);

  React.useEffect(() => {
    load();
  }, [load]);

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
      proveedor: "",
      revTecnica: "",
      soat: "",
      estado: "Disponible",
      volante: "No",
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

  // KPI: solo los estados vigentes (no contamos "En uso")
  const disponibles = rows.filter((d) => d.estado === "Disponible").length;
  const mantenimiento = rows.filter((d) => d.estado === "Mantenimiento")
    .length;
  const inactivos = rows.filter((d) => d.estado === "Inactivo").length;

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

      {/* KPIs (sin "En uso") */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Disponibles</p>
          <p className="mt-1 text-2xl font-semibold">{disponibles}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Mantenimiento</p>
          <p className="mt-1 text-2xl font-semibold">{mantenimiento}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Inactivos</p>
          <p className="mt-1 text-2xl font-semibold">{inactivos}</p>
        </div>
      </div>

      {/* Filtros / Acciones */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value.toUpperCase())}
                placeholder="Buscar por placa (6 alfanuméricos), marca, modelo, responsable o proveedor"
                className="w-full rounded-xl border px-10 py-2.5 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-start lg:justify-end">
            <div className="inline-flex rounded-xl border bg-gray-50 p-1">
              {(
                ["Todos", "Disponible", "Mantenimiento", "Inactivo"] as (
                  | EstadoVehiculoUI
                  | "Todos"
                )[]
              ).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setEstadoFiltro(opt)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${
                    estadoFiltro === opt
                      ? "bg-white shadow-sm border"
                      : "text-gray-600"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white shadow-sm hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Añadir camioneta
          </button>
        </div>
      </div>

      {/* Tabla */}
      <section className="rounded-2xl border bg-white p-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Tracción</th>
                <th className="px-4 py-3">Volante</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Rev. Técnica</th>
                <th className="px-4 py-3">SOAT</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    Cargando...
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    {errMsg ?? "Sin resultados."}
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium">{v.placa}</td>
                    <td className="px-4 py-3">{v.marca}</td>
                    <td className="px-4 py-3">{v.modelo}</td>
                    <td className="px-4 py-3">{v.traccion}</td>
                    <td className="px-4 py-3">
                      {v.volante === "Si" ? "Sí" : "No"}
                    </td>
                    <td className="px-4 py-3">{v.color}</td>
                    <td className="px-4 py-3">
                      {v.responsable || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {v.proveedor || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{v.revTecnica}</td>
                    <td className="px-4 py-3">{v.soat}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={v.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botón cambiar volante */}
                        <button
                          type="button"
                          onClick={() => openVolanteModal(v)}
                          disabled={volanteLoadingId === v.id}
                          className="rounded-lg border p-2 hover:bg-gray-50 disabled:opacity-60"
                          title="Cambiar volante"
                          aria-label="Cambiar volante"
                        >
                          {volanteLoadingId === v.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>

                        {/* Botón cambiar estado */}
                        <button
                          type="button"
                          onClick={() => openChangeStatus(v)}
                          className="rounded-lg border p-2 hover:bg-gray-50"
                          title="Cambiar estado"
                          aria-label="Cambiar estado"
                        >
                          <Shuffle className="h-4 w-4" />
                        </button>

                        {/* Botón editar */}
                        <button
                          type="button"
                          onClick={() => openEdit(v)}
                          className="rounded-lg border p-2 hover:bg-gray-50"
                          title="Editar"
                          aria-label="Editar"
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

        {/* Paginación */}
        <div className="flex items-center justify-between border-t bg-white px-4 py-3 text-sm text-gray-600">
          <div>
            Página <span className="font-medium">{pageSafe}</span> de{" "}
            <span className="font-medium">
              {Math.max(PAGE_TOTAL_MIN, totalPages)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-1.5 disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages || loading}
              className="inline-flex items-center gap-1 rounded-xl border bg-white px-3 py-1.5 disabled:opacity-50 hover:bg-gray-50"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

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
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                >
                  <option value="Si">Si</option>
                  <option value="No">No</option>
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
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  placeholder="Blanco"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Responsable asignado
                </label>
                <input
                  value={editDraft.responsable}
                  onChange={(e) =>
                    handleEditChange("responsable", e.target.value)
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  placeholder="Juan Pérez"
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
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                  placeholder="Empresa de alquiler"
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
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
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
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
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
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
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
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                onChange={(e) =>
                  handleCreateChange("responsable", e.target.value)
                }
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                placeholder="Juan Pérez"
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
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
                placeholder="Empresa de alquiler"
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
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent focus:ring-gray-300"
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
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

      {/* Toast global */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
